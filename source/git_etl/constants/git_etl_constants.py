# git_etl constants
from source.common_constants import ssm_client
from source.common_constants import ssm_base
from source.common_constants import ENV

GIT_API_USER = ssm_client.get_parameter(Name='/{ssm_base}/git/{env}/api_user'.format(ssm_base=ssm_base, env=ENV))
GIT_API_KEY = ssm_client.get_parameter(Name='/{ssm_base}/git/{env}/api_key'.format(ssm_base=ssm_base, env=ENV), WithDecryption=True)
GIT_ORGANIZATION = ssm_client.get_parameter(Name='/{ssm_base}/git/organization'.format(ssm_base=ssm_base, env=ENV))

# TODO this presents a unique issue. We currently limit to one github org, but this might not be the case
GIT_URL = "https://api.github.com/repos/{org}".format(org=GIT_ORGANIZATION)
GIT_REPO_URL = GIT_URL + "/{repo}"
GRAPHQL_URL = 'https://api.github.com/graphql'
