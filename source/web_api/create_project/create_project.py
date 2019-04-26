import json
import requests
import urllib
import re
from source.git_etl.constants import git_etl_constants
from source.jira_etl.constants import jira_etl_constants
from utils.redshift_connection.redshift_connection import RedshiftConnection
from utils.constants import web_api_constants
from utils.api_response_helper import ApiResponseError
from utils.api_response_helper import api_response_handler
from utils.api_response_helper import response_formatter


def handler(event, context):
    return api_response_handler(__create_project, event)


def __create_project(event):
    # Validate user input
    vger_project = __validate_user_input(event)

    # Parse team_id from the URL
    team_id = __parse_team_id_from_url(event)

    # Validate Project name
    __validate_project_name(project_name=vger_project.project_name)

    board_id = __fetch_board_id(board_name=vger_project.board_name)

    # Default values
    # This is a first version of insertion/creation of team project
    # Update the logic as you add more inputs into the creation form
    # Or we can keep the initial creation simple and allow user to edit the project later on
    excluded_issue_types = []
    include_subtasks = True
    rolling_time_window_days = 90
    pseudo_end_state_name = 'Pseudo End State'

    # Get board configurations
    fully_qualified_configuration = __fetch_board_configurations(board_id)

    # Create an entry in team_project table
    __create_team_project(project_name=vger_project.project_name,
                          team_id=team_id,
                          board_name=vger_project.board_name,
                          board_id=board_id,
                          issue_filter=fully_qualified_configuration.issue_filter,
                          default_start_state=fully_qualified_configuration.default_start_state,
                          default_end_state=fully_qualified_configuration.default_end_state,
                          rolling_time_window_days=rolling_time_window_days,
                          include_subtasks=include_subtasks,
                          excluded_issue_types=excluded_issue_types)

    # Get project ID
    project_id = __fetch_project_id(project_name=vger_project.project_name)

    # Create entries in team_status_states and team_work_states table
    __create_status_and_work_state_entries(board_config=fully_qualified_configuration.board_config,
                                           default_end_state=fully_qualified_configuration.default_end_state,
                                           pseudo_end_state_name=pseudo_end_state_name,
                                           project_id=project_id)

    # Create entries in team_repo
    if vger_project.git_repos:
        __create_entries_in_team_repo(git_repos=vger_project.git_repos, project_id=project_id)

    payload = {
        'name': vger_project.project_name,
        'id': project_id
    }
    return response_formatter(status_code='201', body=payload)


class VgerProject:
    def __init__(self, project_name, board_name, git_repos):
        self.project_name = project_name
        self.board_name = board_name
        self.git_repos = git_repos


def __validate_user_input(event):
    try:
        # User input
        data = json.loads(event['body'])
        project_name = data['name']
        board_name = data['issues']['boardName']

        # Git repositories are optional input
        git_repos = []
        if 'repoNames' in data:
            git_repos = data['repoNames']
            # Git repositories are optional input, validate if provided
            __validate_git_repositories(git_repos=git_repos)

        return VgerProject(
            project_name=project_name,
            board_name=board_name,
            git_repos=git_repos)
    except Exception:
        payload = {'message': 'Invalid user input'}
        raise ApiResponseError(status_code='404', body=payload)


def __parse_team_id_from_url(event):
    try:
        return event.get('pathParameters').get('id')
    except Exception:
        payload = {"message": "Could not get id path parameter"}
        raise ApiResponseError(status_code='400', body=payload)


def __validate_project_name(project_name):
    redshift = RedshiftConnection()
    try:
        project_exists = redshift.validateProjectName(project_name)
        # If project name already exists:
        if project_exists:
            payload = {'message': 'Project name already exists'}
            raise ApiResponseError(status_code='400', body=payload)
    except Exception:
        redshift.closeConnection()
        payload = {'message': 'Internal error'}
        raise ApiResponseError(status_code='500', body=payload)
    finally:
        redshift.closeConnection()


def __fetch_board_id(board_name):
    # Validate Jira Board
    try:
        # TODO urllib required?
        encoded_board_name = urllib.quote(board_name, safe='')
        # Jira only allows to query board names that contain a string
        # which may result in multiple values returned
        JIRA_BOARD_API = web_api_constants.BOARD_NAME_URL.format(jira_etl_constants.JIRA_BASE_URL, encoded_board_name)
        content = requests.get(JIRA_BOARD_API, auth=(jira_etl_constants.JIRA_USERNAME, jira_etl_constants.JIRA_PASSWORD)).json()
        boards = content['values']
        for board in boards:
            if board['name'] == board_name:
                return board['id']
            else:
                payload = {'message': 'Jira Board Name: {} is missing board_id'.format(board_name)}
                raise ApiResponseError(status_code='500', body=payload)
    except Exception:
        payload = {'message': 'Jira Board Name: {} cannot be found'.format(board_name)}
        raise ApiResponseError(status_code='404', body=payload)


def __validate_git_repositories(git_repos):
    try:
        for repo in git_repos:
            GITHUB_API = git_etl_constants.GIT_REPO_URL.format(repo=repo)
            r = requests.get(GITHUB_API, headers={'Authorization': 'token %s' % git_etl_constants.GIT_API_KEY})
            if r.status_code != 200:
                raise Exception
    except Exception:
        payload = {'message': 'Git Repository Names: {} cannot be found'.format([str(i) for i in git_repos])}
        raise ApiResponseError(status_code='404', body=payload)


def __find_default_start_state(columns):
    default_state = ''
    first_column = ''
    contains_open = False
    for index, column in enumerate(columns):
        state = column['name']
        if index == 0:
            first_column = state
        if contains_open:
            # If open status was found in the previous state, return current state
            default_state = state
            return default_state
        for status in column['mappedStatuses']:
            status_name = status['name']
            if status_name == 'Open':
                contains_open = True
    # After iterating through all columns and the 'Open' status was never found,
    # use the first column as the default lead time start state
    if not contains_open:
        default_state = first_column

    return default_state


def __find_default_end_state(columns):
    default_state = 'Pseudo End State'
    contains_closed = False
    for column in reversed(columns):
        state = column['name']
        for status in column['mappedStatuses']:
            status_name = status['name']
            if status_name == 'Closed':
                contains_closed = True
                break
        if contains_closed:
            default_state = state
            return default_state

    return default_state


class FullyQualifiedBoardConfiguration:
    def __init__(self, board_config, default_start_state, default_end_state, issue_filter):
        self.board_config = board_config
        self.default_start_state = default_start_state
        self.default_end_state = default_end_state
        self.issue_filter = issue_filter


def __fetch_board_configurations(board_id):
    try:
        JIRA_BOARD_CONFIG_API = web_api_constants.CONFIG_API_URL.format(jira_etl_constants.JIRA_BASE_URL, board_id)
        board_config = requests.get(JIRA_BOARD_CONFIG_API, auth=(jira_etl_constants.JIRA_USERNAME, jira_etl_constants.JIRA_PASSWORD)).json()
        default_start_state = __find_default_start_state(board_config['rapidListConfig']['mappedColumns'])
        default_end_state = __find_default_end_state(board_config['rapidListConfig']['mappedColumns'])

        main_query = board_config['filterConfig']['query']
        sub_query = board_config['subqueryConfig']['subqueries'][0]['query']

        has_order_by = re.search("order by", main_query.lower())
        if has_order_by:
            main_query = main_query[:has_order_by.start()]

        if sub_query:
            issue_filter = '(' + main_query + ') AND (' + sub_query + ')'
        else:
            issue_filter = main_query

        return FullyQualifiedBoardConfiguration(board_config=board_config,
                                                default_start_state=default_start_state,
                                                default_end_state=default_end_state,
                                                issue_filter=issue_filter)

    except Exception:
        payload = {'message': 'Service unavailable'}
        raise ApiResponseError(status_code='503', body=payload)


def __create_team_project(project_name,
                          team_id,
                          board_name,
                          board_id,
                          issue_filter,
                          default_start_state,
                          default_end_state,
                          rolling_time_window_days,
                          include_subtasks,
                          excluded_issue_types):
    redshift = RedshiftConnection()
    try:
        excluded_issue_types_string = ",".join(excluded_issue_types)
        redshift.insertTeamProject(project_name, team_id, board_name, board_id, issue_filter,
                                   default_start_state, default_end_state, rolling_time_window_days,
                                   include_subtasks, excluded_issue_types_string)
    except Exception as e:
        redshift.closeConnection()
        payload = {'message': 'Failed to insert {} into team_project {}'.format(project_name, e)}
        raise ApiResponseError(status_code='500', body=payload)
    finally:
        redshift.closeConnection()


def __fetch_project_id(project_name):
    redshift = RedshiftConnection()
    project_id = ''
    try:
        project_id = redshift.getProjectId(project_name)
    except Exception as e:
        redshift.closeConnection()
        payload = {'message': 'Failed to get project id with name {}: {}'.format(project_name, e)}
        raise ApiResponseError(status_code='500', body=payload)
    finally:
        redshift.closeConnection()
        return project_id


def __create_status_and_work_state_entries(board_config, default_end_state, pseudo_end_state_name, project_id):
    redshift = RedshiftConnection()
    status_state_values = []
    work_state_values = []
    seq_number = 0
    try:
        for column in board_config['rapidListConfig']['mappedColumns']:
            state = str(column['name'])  # convert unicode string to regular string
            work_state_values.append((project_id, state, seq_number))
            seq_number += 1
            for status in column['mappedStatuses']:
                status_name = str(status['name'])  # convert unicode string to regular string
                status_state_values.append((project_id, status_name, state))

        # Board requires additional pseudo kanban column to map closed tickets if originally unmapped from all columns
        # Insert pseudo kanban column into team_status_states and team_work_states table
        if default_end_state == pseudo_end_state_name:
            status_state_values.append((project_id, 'Closed', pseudo_end_state_name))
            work_state_values.append((project_id, pseudo_end_state_name, seq_number))

        redshift.updateTeamStatusStates(project_id, status_state_values)
        redshift.updateTeamWorkStates(project_id, work_state_values)
    except Exception as e:
        redshift.closeConnection()
        payload = {'message': 'Failed to insert into team_work_states and team_status_states table {}'.format(e)}
        raise ApiResponseError(status_code='500', body=payload)
    finally:
        redshift.closeConnection()


def __create_entries_in_team_repo(git_repos, project_id):
    redshift = RedshiftConnection()
    insert_repo_list = []
    try:
        for repo in git_repos:
            insert_repo_list.append((project_id, repo))
        redshift.updateTeamRepos(project_id, insert_repo_list)
    except Exception as e:
        redshift.closeConnection()
        payload = {'message': 'Failed to insert into team_repo table {}'.format(e)}
        raise ApiResponseError(status_code='500', body=payload)
    finally:
        redshift.closeConnection()
