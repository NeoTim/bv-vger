import requests
from utils.redshift_connection.redshift_connection import RedshiftConnection
from utils.constants import web_api_constants
from source.jira_etl.constants import jira_etl_constants
from utils.api_response_helper import ApiResponseError
from utils.api_response_helper import response_formatter
from utils.api_response_helper import api_response_handler


def find_default_start_state(work_states):
    default_state = ''
    first_column = ''
    contains_open = False
    for index, column in enumerate(work_states):
        state = column['name']
        if index == 0:
            first_column = state
        if contains_open:
            # If open status was found in the previous state, return current state
            default_state = state
            return default_state
        contains_open = any(status_name == "Open" for status_name in column["status"])
    # After iterating through all columns and the 'Open' status was never found,
    # use the first column as the default lead time start state
    if not contains_open:
        default_state = first_column

    return default_state


def find_default_end_state(work_states):
    default_state = 'Pseudo End State'
    for column in reversed(work_states):
        state = column['name']
        contains_closed = any(status_name == "Closed" for status_name in column["status"])
        if contains_closed:
            default_state = state
            return default_state

    return default_state


def handler(event, context):
    return api_response_handler(__get_board_states, event)


class JiraBoardConfiguration:
    def __init__(self, lead_time_start_state, lead_time_end_state, work_states):
        self.lead_time_start_state = lead_time_start_state
        self.lead_time_end_state = lead_time_end_state
        self.work_states = work_states


def __get_board_states(event):
    project_id = __parse_product_id_from_input(event)
    board_id = __fetch_board_id(project_id)
    jira_board_configuration = __fetch_board_configuration(board_id)

    payload = {
        "defaultLeadTimeStartState": jira_board_configuration.lead_time_start_state,
        "defaultLeadTimeEndState": jira_board_configuration.lead_time_end_state,
        "workStates": jira_board_configuration.work_states
    }

    return response_formatter(status_code=200, body=payload)


def __parse_product_id_from_input(lambda_input):
    try:
        return lambda_input.get('pathParameters').get('id')
    except Exception:
        payload = {"message": "Could not get id path parameter"}
        raise ApiResponseError(status_code=400, body=payload)


def __fetch_board_id(project_id):
    database = RedshiftConnection()
    board_id = ""
    try:
        board_id = database.getBoardId(project_id)
        print(board_id)
    except Exception:
        payload = {'message': 'Internal error'}
        raise ApiResponseError(status_code=500, body=payload)
    finally:
        database.closeConnection()
        return board_id


def __fetch_board_configuration(board_id):
    work_states = []
    pseudo_end_state_name = 'Pseudo End State'
    try:
        JIRA_BOARD_CONFIG_API = web_api_constants.CONFIG_URL.format(jira_etl_constants.JIRA_BASE_URL, board_id)
        board_config = requests.get(JIRA_BOARD_CONFIG_API, auth=(jira_etl_constants.JIRA_USERNAME, jira_etl_constants.JIRA_PASSWORD)).json()

        # Ignore the first empty backlog column
        first_column = board_config['columnConfig']['columns'][0]
        if first_column.get("name") == "Backlog" and (not first_column.get("statuses")):
            board_config['columnConfig']['columns'].pop(0)

        for column in board_config['columnConfig']['columns']:
            state = {
                "name": str(column["name"]),
                "status": []
            }
            for status in column['statuses']:
                status_object = requests.get(status['self'], auth=(jira_etl_constants.JIRA_USERNAME, jira_etl_constants.JIRA_PASSWORD)).json()
                state['status'].append(str(status_object['name']))  # convert unicode string to regular string
            work_states.append(state)

        lead_time_start_state = find_default_start_state(work_states)
        lead_time_end_state = find_default_end_state(work_states)

        # Cover edge cases when projects do not use explicitly defined column for closed tickets
        if lead_time_end_state == pseudo_end_state_name:
            state = {
                "name": pseudo_end_state_name,
                "status": ["Closed"]
            }
            work_states.append(state)

        return JiraBoardConfiguration(lead_time_start_state=lead_time_start_state,
                                      lead_time_end_state=lead_time_end_state,
                                      work_states=work_states)
    except Exception:
        payload = {'message': 'Service unavailable'}
        raise ApiResponseError(status_code=503, body=payload)
