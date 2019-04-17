# git_etl constants
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

GIT_API_USER = ssm_client.get_parameter(Name='/{ssm_base}/git/{env}/api_user'.format(ssm_base=ssm_base, env=env_to_use))
GIT_API_KEY = ssm_client.get_parameter(Name='/{ssm_base}/git/{env}/api_key'.format(ssm_base=ssm_base, env=env_to_use), WithDecryption=True)
GIT_ORGANIZATION = ssm_client.get_parameter(Name='/{ssm_base}/git/organization'.format(ssm_base=ssm_base, env=env_to_use))

# TODO this presents a unique issue. We currently limit to one github org, but this might not be the case
GIT_URL = "https://api.github.com/repos/{org}".format(org=GIT_ORGANIZATION)
GIT_REPO_URL = GIT_URL + "/{repo}"
GRAPHQL_URL = 'https://api.github.com/graphql'
