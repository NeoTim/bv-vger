import json
import requests
from utils.redshift_connection.redshift_connection import RedshiftConnection
from utils.api_response_helper import ApiResponseError
from utils.api_response_helper import response_formatter
from utils.api_response_helper import api_response_handler
from source.git_etl.constants import git_etl_constants


def handler(event, context):
    return api_response_handler(__update_repos, event)


def __update_repos(lambda_input):
    repos = __parse_input(lambda_input=lambda_input)
    project_id = __parse_project_id_from_input(lambda_input=lambda_input)
    __validate_github_repos(repos)
    __apply_github_repo_updates(repos=repos, project_id=project_id)
    return response_formatter(status_code='200', body={})


def __parse_input(lambda_input):
    try:
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


def __validate_github_repos(repos):
    try:
        for repo in repos:
            GITHUB_API = git_etl_constants.GIT_REPO_URL.format(repo=repo)
            github_response = requests.get(GITHUB_API, headers={'Authorization': 'token %s' % git_etl_constants.GIT_API_KEY})
            if github_response.status_code != 200:
                payload = {'message': 'Invalid repository name: \'{}\''.format(repo)}
                raise ApiResponseError(status_code=400, body=payload)
    except Exception:
        # Git API fail
        payload = {'message': 'Service Unavailable'}
        raise ApiResponseError(status_code=503, body=payload)


def __apply_github_repo_updates(repos, project_id):
    database = RedshiftConnection()
    try:
        insert_repo_list = []
        for repo in repos:
            insert_repo_list.append((project_id, repo))
        database.updateTeamRepos(project_id, insert_repo_list)
    except Exception:
        database.closeConnection()
        payload = {'message': 'Internal error'}
        raise ApiResponseError(status_code=500, body=payload)
    finally:
        database.closeConnection()
