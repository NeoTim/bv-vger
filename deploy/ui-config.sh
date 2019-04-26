#!/usr/bin/env bash
set -e

usage()
{
    echo Usage: `basename $0` "<env> <ssm_store>" >&2
    echo "" >&2
    echo "  Sets up UI configuration for the specified environment (either 'qa' or 'prod')" >&2
}

while [[ $# -gt 0 ]] ; do
  case $1 in
    -*) usage; exit 1;;
     *) break;;
  esac
  shift
done

if [[ $# -ne 2 ]] ; then
    usage
    exit 1
fi

bindir=`dirname $0`
bindir=`cd ${bindir}; pwd`

env=$1
ssm_store=$2

if [[ -z "$ssm_store" ]] ; then
    echo "no ssm-store was defined" >&2
    exit 1
fi

case ${env} in
   prod|qa) bucket_name=$(aws ssm get-parameter --name /${ssm_store}/s3/${env}/bucket_name --query "Parameter"."Value" --output text);;
         *) echo "Unknown environment: $env" >&2; exit 1;;
esac

api_gateway=$(aws ssm get-parameter --name /${ssm_store}/apigateway/${env}/url --query "Parameter"."Value" --output text)
jira_url=$(aws ssm get-parameter --name /${ssm_store}/jira/${env}/host_url --query "Parameter"."Value" --output text)
support_url=$(aws ssm get-parameter --name /${ssm_store}/support_url --query "Parameter"."Value" --output text)

# Setup the UI config file for this environment
cd ${bindir}/..

ui_src_path=source/webpage
config_file_name=constants.js
config_src_path=${ui_src_path}/shared/${config_file_name}
react_config_file_name=react_constants.js
react_config_src_path=${ui_src_path}/shared/${react_config_file_name}

cat > ${config_src_path} << EOL
/*
 * Global constants
 * This is generated JavaScript to be used by the statically hosted web portions of the Vger codebase
 * !!!!!!!!!!NOTHING SECURE SHOULD EVER BE IN THIS FILE!!!!!!!!!!
 * All of this JavaScript will by visible by any user who has access to the Vger UI
 */
(function(){
    'use strict';

    angular.module('sharedConstants', [])
        .service('sharedConstantsService', sharedConstantsService);

    sharedConstantsService.\$inject = ['\$rootScope'];

    function sharedConstantsService(\$rootScope){

        const API_GATEWAY_URL = '${api_gateway}';
        const JIRA_HOST_URL = '${jira_url}';
        const JIRA_SUPPORT_URL = '${support_url}';

        return {
            setRootScopeConstants: setRootScopeConstants
        };

        function setRootScopeConstants(){
            \$rootScope.API_GATEWAY_URL = API_GATEWAY_URL;
            \$rootScope.JIRA_HOST_URL = JIRA_HOST_URL;
            \$rootScope.JIRA_SUPPORT_URL = JIRA_SUPPORT_URL;
        }
    }
})();
EOL

cat > ${react_config_src_path} << EOL
/*
 * Global constants
 * This is generated JavaScript to be used by the statically hosted web portions of the Vger codebase
 * !!!!!!!!!!NOTHING SECURE SHOULD EVER BE IN THIS FILE!!!!!!!!!!
 * All of this JavaScript will by visible by any user who has access to the Vger UI
 */

const API_GATEWAY_URL = '${api_gateway}';
const JIRA_HOST_URL = '${jira_url}';
const JIRA_SUPPORT_URL = '${support_url}';

export {API_GATEWAY_URL, JIRA_HOST_URL};
export default JIRA_SUPPORT_URL;
EOL

# Return the generated config file path
echo `pwd`/${config_src_path}
