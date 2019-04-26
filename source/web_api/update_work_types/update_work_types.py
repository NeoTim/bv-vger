import json
from utils.redshift_connection.redshift_connection import RedshiftConnection
from utils.api_response_helper import ApiResponseError
from utils.api_response_helper import response_formatter
from utils.api_response_helper import api_response_handler


def handler(event, context):
    return api_response_handler(__update_work_types, event)


def __update_work_types(event):
    work_types = __parse_lambda_input(event)
    project_id = __parse_project_id_from_input(event)
    __apply_work_type_updates(work_types=work_types, project_id=project_id)
    return response_formatter(status_code=200, body={})


def __parse_lambda_input(lambda_input):
    try:
        # User input
        return json.loads(lambda_input['body'])
    except Exception:
        payload = {'message': 'Invalid user input'}
        raise ApiResponseError(status_code=400, body=payload)


def __parse_project_id_from_input(lambda_input):
    try:
        return lambda_input.get('pathParameters').get('id')
    except Exception:
        payload = {"message": "Could not get id path parameter"}
        raise ApiResponseError(status_code=400, body=payload)


def __apply_work_type_updates(work_types, project_id):
    redshift = RedshiftConnection()
    try:
        insert_value_list = []
        for key in work_types:
            for issue in work_types[key]:
                insert_value_list.append((project_id, issue, key))
        redshift.updateTeamWorkTypes(project_id, insert_value_list)
    except Exception:
        redshift.closeConnection()
        payload = {'message': 'Internal error'}
        raise ApiResponseError(status_code=500, body=payload)
    finally:
        redshift.closeConnection()
