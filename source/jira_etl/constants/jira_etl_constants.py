from source.common_constants import ssm_client
from source.common_constants import ssm_base
from source.common_constants import ENV


JIRA_USERNAME = ssm_client.get_parameter(
    Name='/{ssm_base}/jira/{env}/username'.format(ssm_base=ssm_base, env=ENV),
    WithDecryption=True)['Parameter']['Value']
JIRA_PASSWORD = ssm_client.get_parameter(
    Name='/{ssm_base}/jira/{env}/password'.format(ssm_base=ssm_base, env=ENV),
    WithDecryption=True)['Parameter']['Value']
JIRA_BASE_URL = ssm_client.get_parameter(
    Name='/{ssm_base}/jira/{env}/host_url'.format(ssm_base=ssm_base, env=ENV))['Parameter']['Value']

JQL_SEARCH_URL = JIRA_BASE_URL + '/rest/api/latest/search?jql={query_parameters}'

S3_ENG_BUCKET = ''
