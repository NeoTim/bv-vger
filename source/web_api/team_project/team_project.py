from __future__ import print_function
import json
import urllib
from utils.redshift_connection.redshift_connection import RedshiftConnection
from utils.api_response_helper import ApiResponseError
from utils.api_response_helper import api_response_handler


def handler(event, context):
    api_response_handler(__describe_team_project, event)


def __describe_team_project(event):
    # Grab the data passed to the lambda function through the browser URL (API Gateway)
    team_id = __get_team_id_from_input(lambda_input=event)

    __fetch_team_by_id(team_id)

    query_string_parameters = event.get('queryStringParameters')
    project_name = query_string_parameters.get('name') if query_string_parameters else None

    results = __get_team_from_project(project_name=project_name,
                                      team_id=team_id)

    payload = []
    columns = ['name', 'id']
    for result in results:
        team_config = [result[0], result[1]]
        payload.append(dict(zip(columns, team_config)))

    response = {
        "statusCode": 200,
        "headers": {
            "Access-Control-Allow-Origin": "*",  # Required for CORS support to work
            "Access-Control-Allow-Credentials": True  # Required for cookies, authorization headers with HTTPS
        },
        "body": json.dumps(payload)
    }
    return response


def __decode_project_name(project_name):
    try:
        return urllib.unquote(project_name).decode('utf8')
    except Exception:
        payload = {"message": "Could not decode given project name parameter: {}".format(project_name)}
        raise ApiResponseError(status_code=400, body=payload)


def __get_team_from_project(project_name, team_id):
    database = RedshiftConnection()
    decoded_project_name = __decode_project_name(project_name)

    try:
        team = database.get_team_from_project(team_id=team_id,
                                              project_name=decoded_project_name)
    except Exception:
        database.closeConnection()
        payload = {"message": "Internal Error. Could not query database given parameters"}
        raise ApiResponseError(status_code=500, body=payload)
    finally:
        database.closeConnection()
    return team


def __get_team_id_from_input(lambda_input):
    try:
        return lambda_input.get('pathParameters').get('id')
    except Exception:
        payload = {"message": "Could not get id path parameter"}
        raise ApiResponseError(status_code=400, body=payload)


def __fetch_team_by_id(team_id):
    database = RedshiftConnection()
    try:
        results = database.get_team_by_id(team_id=team_id)
    except Exception:
        database.closeConnection()
        payload = {"message": "Internal Error. Could not query database given parameters"}
        raise ApiResponseError(status_code=500, body=payload)
    finally:
        database.closeConnection()

    if not results:
        payload = {"message": "No resource with team ID {} found".format(team_id)}
        raise ApiResponseError(status_code=404, body=payload)

    return results
