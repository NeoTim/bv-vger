import json
from utils.redshift_connection.redshift_connection import RedshiftConnection
from utils.api_response_helper import ApiResponseError
from utils.api_response_helper import response_formatter
from utils.api_response_helper import api_response_handler
from utils.jira_helper.JiraBoardConfiguration import JiraBoardConfiguration


def handler(event, context):
    return api_response_handler(__update_work_states, event)


def __update_work_states(event):
    board_configuration = __parse_lambda_input_for_jira_configuration(event)
    project_id = __parse_project_id_from_input(event)
    __apply_work_state_update(board_config=board_configuration, project_id=project_id)
    return response_formatter(status_code='200', body={})


def __parse_lambda_input_for_jira_configuration(lambda_input):
    try:
        # User input
        data = json.loads(lambda_input['body'])
        return JiraBoardConfiguration(work_states=data['workStates'],
                                      lead_time_start_state=data['defaultLeadTimeStartState'],
                                      lead_time_end_state=data['defaultLeadTimeEndState'])
    except Exception:
        payload = {'message': 'Invalid user input'}
        raise ApiResponseError(status_code=400, body=payload)


def __parse_project_id_from_input(lambda_input):
    try:
        return lambda_input.get('pathParameters').get('id')
    except Exception:
        payload = {"message": "Could not get id path parameter"}
        raise ApiResponseError(status_code=400, body=payload)


def __apply_work_state_update(board_config, project_id):
    database = RedshiftConnection()
    try:
        status_state_values = []  # Values to insert in team_status_states table
        work_state_values = []    # Values to insert in team_work_states table
        seq_number = 0            # Sequence counter for team_work_states table

        for work_state in board_config.work_states:
            for status in work_state['status']:
                status_state_values.append((int(project_id), str(status), str(work_state['name'])))

            work_state_values.append((int(project_id), str(work_state['name']), seq_number))
            seq_number += 1
        database.updateTeamStatusStates(project_id, status_state_values)
        database.updateTeamWorkStates(project_id, work_state_values)
        database.updateDefaultLeadTimeStates(project_id, board_config.lead_time_start_state, board_config.lead_time_end_state)
    except Exception:
        payload = {'message': 'Internal error'}
        database.closeConnection()
        raise ApiResponseError(status_code=500, body=payload)
    finally:
        database.closeConnection()
