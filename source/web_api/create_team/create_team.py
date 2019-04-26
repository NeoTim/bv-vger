import json
# from redshift_connection import RedshiftConnection
from utils.redshift_connection.redshift_connection import RedshiftConnection
from utils.api_response_helper import ApiResponseError
from utils.api_response_helper import response_formatter
from utils.api_response_helper import api_response_handler


def handler(event, context):
    api_response_handler(__create_team, event)


def __create_team(event):
    team_name = __fetch_team_name_from_user_input(user_input=event)

    # Validate Team name
    __validate_team_name(team_name=team_name)

    # Create an entry in team table
    __create_team_in_database(team_name=team_name)

    # Get id of the newly created team
    team_id = __fetch_id_of_created_team(team_name=team_name)

    payload = {
        'name': team_name,
        'id': team_id
    }
    return response_formatter(status_code='201', body=payload)


def __fetch_id_of_created_team(team_name):
    redshift = RedshiftConnection()
    try:
        return redshift.getTeamId(team_name)
    except Exception:
        redshift.closeConnection()
        payload = {'message': 'Internal error'}
        raise ApiResponseError(status_code='500', body=payload)
    finally:
        redshift.closeConnection()


def __create_team_in_database(team_name):
    redshift = RedshiftConnection()
    try:
        redshift.insertTeam(team_name)
    except Exception as e:
        redshift.closeConnection()
        payload = {'message': 'Failed to insert {} into team {}'.format(team_name, e)}
        raise ApiResponseError(status_code='500', body=payload)
    finally:
        redshift.closeConnection()


def __validate_team_name(team_name):
    redshift = RedshiftConnection()
    try:
        team_exists = redshift.validateTeamName(team_name)
        # If team name already exists:
        if team_exists:
            payload = {'message': 'Team name already exists'}
            return response_formatter(status_code='400', body=payload)
    except Exception:
        redshift.closeConnection()
        payload = {'message': 'Internal error'}
        raise ApiResponseError(status_code='500', body=payload)
    finally:
        redshift.closeConnection()


def __fetch_team_name_from_user_input(user_input):
    # Validate user input
    try:
        # User input
        data = json.loads(user_input['body'])
        return data['name']
    except Exception:
        payload = {'message': 'Invalid user input'}
        raise ApiResponseError(status_code='404', body=payload)
