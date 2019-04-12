import os
from source.common_constants import ssm_client
from source.common_constants import ssm_base
from source.common_constants import ENV


def __fetch_local_vger_env():
    try:
        return os.environ['LOCAL_VGER_ENV']
    except KeyError:
        return False


local_vger_env = __fetch_local_vger_env()

if ENV == 'local':
    env_to_use = local_vger_env if local_vger_env else 'qa'
else:
    env_to_use = ENV

JIRA_USERNAME = ssm_client.get_parameter(
    Name='/{ssm_base}/jira/{env}/username'.format(ssm_base=ssm_base, env=env_to_use),
    WithDecryption=True)['Parameter']['Value']
JIRA_PASSWORD = ssm_client.get_parameter(
    Name='/{ssm_base}/jira/{env}/password'.format(ssm_base=ssm_base, env=env_to_use),
    WithDecryption=True)['Parameter']['Value']
JIRA_BASE_URL = ssm_client.get_parameter(
    Name='/{ssm_base}/jira/{env}/host_url'.format(ssm_base=ssm_base, env=env_to_use))['Parameter']['Value']

JQL_SEARCH_URL = JIRA_BASE_URL + '/rest/api/latest/search?jql={query_parameters}'

S3_ENG_BUCKET = ssm_client.get_parameter(
    Name='/{ssm_base}/s3/{env}/bucket_name'.format(ssm_base=ssm_base, env=env_to_use))['Parameter']['Value']
