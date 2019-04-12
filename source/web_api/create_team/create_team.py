import json
# from redshift_connection import RedshiftConnection
from source.web_api.utils.redshift_connection.redshift_connection import RedshiftConnection


class ApiResponseError(Exception):
    def __init__(self, status_code, body):
        self.status_code = status_code
        self.body = body


def api_response_handler(method, args):
    try:
        return method(args)
    except ApiResponseError as api_error_response:
        return response_formatter(status_code=api_error_response.status_code,
                                  body=api_error_response.body)


def response_formatter(status_code='400', body={'message': 'error'}):
    api_response = {
        'statusCode': status_code,
        'headers': {
            'Access-Control-Allow-Origin': '*',
            "Access-Control-Allow-Credentials": True,
            'Access-Control-Allow-Headers': '*',
            'Content-Type': 'application/json',
            'Access-Control-Expose-Headers': 'X-Amzn-Remapped-Authorization',
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS'
        },
        'body': json.dumps(body)
    }
    return api_response


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
        payload = {'message': 'Internal error'}
        raise ApiResponseError(status_code='500', body=payload)
    finally:
        redshift.closeConnection()


def __create_team_in_database(team_name):
    redshift = RedshiftConnection()
    try:
        redshift.insertTeam(team_name)
    except Exception as e:
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
