#!/usr/bin/env bash
set -e

usage()
{
    echo Usage: `basename $0` "<ssm_store>" >&2
    echo "" >&2
    echo "  Runs the current UI code locally, using the QA environment" >&2
}

while [[ $# -ne 1 ]] ; do
  case $1 in
    -*) usage; exit 1;;
     *) break;;
  esac
  shift
done

ssm_store=$1
if [[ -z "$ssm_store" ]] ; then
    echo "no ssm-store was defined" >&2
    exit 1
fi

# Define the UI config file for the QA environment         
bindir=`dirname $0`
ui_config=`${bindir}/deploy/ui-config.sh qa ${ssm_store}`

# Run current UI code in a local Web server
cd ${bindir}/source/webpage
http-server -o

# Clean up generated config file for QA environment
rm ${ui_config}
