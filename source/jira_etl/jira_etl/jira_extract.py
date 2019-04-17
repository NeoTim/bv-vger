from __future__ import print_function
import json
import yaml
import requests
import urllib
import time
from jira_transform import jira_transform
from source.jira_etl.lib import jira_etl_lib
from source.jira_etl.constants import jira_etl_constants
from source.web_api.utils.redshift_connection.redshift_connection import RedshiftConnection


def handler(event, context):
    database = RedshiftConnection()
    __extract_from_jira(event.get('id'), database)
    database.closeConnection()


def __extract_from_jira(team_id, database):
    team_config = database.get_team_config_from_project(team_id=team_id)
    update_response = database.update_last_etl(team_config=team_config)

    print("Fetching issues for {}".format(team_config.get('name')))
    if team_config['last_issue_change']:
        initial_load = False
        timestamp_since = team_config.get('last_issue_change')
    else:
        initial_load = True
        timestamp_since = 0

    # Define the value for the first part of the CSVs to be created
    batch_file_indicator = 1
    # Store the max issues and fire off lambdas while incrementing the
    # starting index with the batch size to return all issues
    batch_iterator = 0
    BATCH_SIZE = 1000

    # # Query for the total number of issues for this JQL
    # # https://developer.atlassian.com/jiradev/jira-apis/jira-rest-apis/jira-rest-api-tutorials/jira-rest-api-example-query-issues
    query = jira_etl_lib.create_final_issue_jql(team_config, timestamp_since)
    print(query)

    query_string = urllib.quote(query, safe='') + '&fields=*none&maxResults=0'
    page_url = jira_etl_constants.JQL_SEARCH_URL.format(query_parameters=query_string)

    # Should not use jira client interface here
    # Jira client returns entire issue list although
    # we are only concerned about meta data containing total number of issues here
    response = requests.get(page_url, auth=(jira_etl_constants.JIRA_USERNAME, jira_etl_constants.JIRA_PASSWORD))

    if int(response.status_code) == 200:
        content = response.json()
        dump = json.dumps(content)
        yaml_obj = yaml.safe_load(dump)
        total_issues = yaml_obj['total']
    else:
        print("ERROR: Status code: {} returned".format(int(response.status_code)))
        return

    print("Total issues: {}".format(total_issues))

    if total_issues == 0:
        print("No new issues for {}".format(team_config.get('name')))
    else:
        while batch_iterator < total_issues:
            print("Starting batch loading! Part: " + str(batch_file_indicator))
            print("starting at {}".format(batch_iterator))
            print("batch size of {}".format(BATCH_SIZE))
            jira_transform(file_part=batch_file_indicator,
                           batch_size=BATCH_SIZE,
                           start_at=batch_iterator,
                           team_config=team_config,
                           timestamp_since=timestamp_since,
                           initial_load=initial_load)

            # Increment the starting index
            batch_iterator += BATCH_SIZE

            # Increment the file part
            batch_file_indicator += 1

    # Finished within 5 min
    database.reset_last_etl(team_id=team_config.get('id'))
    print("ETL for project {} finished in {} seconds".format(team_config.get("name"), time.time() - update_response.get('update_start_time')))
    return
