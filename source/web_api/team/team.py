from __future__ import print_function
import json
import urllib
from utils.redshift_connection.redshift_connection import RedshiftConnection
from utils.api_response_helper import ApiResponseError
from utils.api_response_helper import response_formatter
from utils.api_response_helper import api_response_handler


def handler(event, context):
    response = api_response_handler(__fetch_team, event)
    return response


def __fetch_team(event):
    team_name = __fetch_team_name_from_query_string_parameters(event)
    found_teams = __fetch_team_by_name(team_name)
    payload = []
    columns = ['name', 'id']
    for team in found_teams:
        teamConfig = [team[1], team[0]]
        payload.append(dict(zip(columns, teamConfig)))

    response = {
        "statusCode": 200,
        "headers": {
            "Access-Control-Allow-Origin": "*",  # Required for CORS support to work
            "Access-Control-Allow-Credentials": True  # Required for cookies, authorization headers with HTTPS
        },
        "body": json.dumps(payload),
        "isBase64Encoded": False
    }
    return response


def __fetch_team_name_from_query_string_parameters(handler_input):
    query_string_parameters = handler_input.get('queryStringParameters')
    if query_string_parameters:
        return query_string_parameters.get('name')
    else:
        return None


def __fetch_team_by_name(team):
    database = RedshiftConnection()
    returned_teams = []
    try:
        if team is not None:
            try:
                decodedTeam = urllib.unquote(team).decode('utf8')
            except Exception:
                database.closeConnection()
                payload = {"message": "Could not decode given team name parameter: {}".format(team)}
                raise ApiResponseError(status_code=400, body=payload)
            returned_teams = database.fetch_team_by_name(team_name=decodedTeam)
        else:
            returned_teams = database.fetch_teams()
    except Exception:
        database.closeConnection()
        payload = {"message": "Something went wrong querying the database for teams."}
        raise ApiResponseError(status_code=500, body=payload)
    finally:
        database.closeConnection()
        return returned_teams
