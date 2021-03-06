import json
import requests
import urllib
from redshift_connection import RedshiftConnection

from source.web_api.utils.constants import web_api_constants
from source.jira_etl.constants import jira_etl_constants


def response_formatter(status_code='400', body={'message': 'error'}):
    api_response = {
        'statusCode': status_code,
        'headers': {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Credentials': True
        },
        'body': json.dumps(body),
        "isBase64Encoded": False
    }
    return api_response


def handler(event, context):
    # Validate user input
    try:
        # User input
        data = json.loads(event['body'])
        board_name = data['boardName']
        include_subtasks = data['includeSubtasks']
        excluded_issue_types = data['excludedIssueTypes']
        issue_filter = data['issueFilter']
        project_name = data['projectName']
    except:
        payload = {'message': 'Invalid user input'}
        return response_formatter(status_code='400', body=payload)

    # Parse project_id from the URL
    try:
        project_id = int(event.get('pathParameters').get('id'))
    except:
        payload = {"message": "Could not get id path parameter"}
        return response_formatter(status_code='400', body=payload)

    # Validate board_name exists
    try:
        encoded_board_name = urllib.quote(board_name, safe='')
        JIRA_BOARD_API = web_api_constants.BOARD_NAME_URL.format(jira_etl_constants.JIRA_BASE_URL, encoded_board_name)
        content = requests.get(JIRA_BOARD_API, auth=(jira_etl_constants.JIRA_USERNAME, jira_etl_constants.JIRA_PASSWORD)).json()
        boards = content['values']
        for board in boards:
            if board['name'] == board_name:
                board_id = board['id']
        board_id  # raise exception if it does not exist
    except:
        payload = {'message': 'Invalid board name: \'{}\''.format(board_name)}
        return response_formatter(status_code='400', body=payload)

    # Validate Project name change
    try:
        redshift = RedshiftConnection()
        project_exists = redshift.validateProjectNameChange(project_id, project_name)
        # If project name already exists in other projects:
        if project_exists:
            payload = {'message': 'Project name {} already exists'.format(project_name)}
            return response_formatter(status_code='400', body=payload)
    except Exception as e:
        payload = {'message': 'Internal error: {}'.format(e)}
        return response_formatter(status_code='500', body=payload)

    # Validate excluded_issue_type
    try:
        JIRA_ISSUE_TYPE = web_api_constants.JIRA_SEARCH_URL.format(jira_etl_constants.JIRA_BASE_URL)
        issue_types = requests.get(JIRA_ISSUE_TYPE, auth=(jira_etl_constants.JIRA_USERNAME, jira_etl_constants.JIRA_PASSWORD)).json()
        # Split csv to array
        excluded_issue_types_list = excluded_issue_types.split(',') if excluded_issue_types else []
        if excluded_issue_types_list:
            for excluded_issue_type in excluded_issue_types_list:
                # Raise exception if issue_type is invalid
                if not any(issue_type for issue_type in issue_types if issue_type['name'] == excluded_issue_type):
                    raise Exception(excluded_issue_type)
    except Exception as e:
        payload = {'message': 'Invalid issue type: \'{}\''.format(e)}
        return response_formatter(status_code='400', body=payload)

    # Validate JQL
    queryString = urllib.quote(issue_filter, safe='')
    queryString += '&fields=*none&maxResults=0'
    pageURL = jira_etl_constants.JQL_SEARCH_URL.format(query_parameters=queryString)
    r = requests.get(pageURL, auth=(jira_etl_constants.JIRA_USERNAME, jira_etl_constants.JIRA_PASSWORD))
    if not r.ok:
        payload = {"message": "Error in the JQL Query: {}".format(r.content)}
        return response_formatter(status_code='400', body=payload)

    try:
        redshift = RedshiftConnection()

        # Update issues in database
        try:
            issue_type_list = redshift.get_issue_types(project_id)
            all_issue_types = [{"name": issue_type[0], "subtask": issue_type[1]} for issue_type in issue_type_list]
        except Exception as e:
            payload = {'message': 'Invalid project key in db: \'{}\''.format(e)}
            return response_formatter(status_code='400', body=payload)

        redshift.updateIssues(project_id, board_name, include_subtasks, issue_filter,
                              all_issue_types, excluded_issue_types_list, project_name)
    except ValueError as e:
        payload = {'message': "Issue Type Error: {}".format(e)}
        return response_formatter(status_code='400', body=payload)
    except Exception as e:
        payload = {'message': 'Internal error: {}'.format(e)}
        return response_formatter(status_code='500', body=payload)
    finally:
        redshift.closeConnection()

    return response_formatter(status_code='200', body={})
