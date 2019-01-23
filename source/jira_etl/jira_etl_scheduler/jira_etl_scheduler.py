from __future__ import print_function
import psycopg2
import json
import boto3
from source import common_constants


def handler(event, context):
    lambda_client = boto3.client('lambda')

    conn = psycopg2.connect(dbname=common_constants.REDSHIFT_DATABASE_NAME,
                            host=common_constants.REDSHIFT_CLUSTER_ENDPOINT,
                            port=common_constants.REDSHIFT_PORT,
                            user=common_constants.REDSHIFT_USERNAME,
                            password=common_constants.REDSHIFT_PASSWORD)
    cur = conn.cursor()

    selectAllTeamsQuery = "SELECT id, name FROM team_project ORDER BY last_issue_change IS NULL DESC, last_issue_change ASC"
    cur.execute(selectAllTeamsQuery)
    rows = cur.fetchall()
    for row in rows:
        teamConfig = {"id": row[0]}
        print("Starting JIRA ETL for project {}".format(row[1]))
        jsonPayload = json.dumps(teamConfig)

        function_name = "vger-sls-jira-etl-{}".format(common_constants.ENV)
        lambda_client.invoke(FunctionName=function_name, InvocationType="Event", Payload=jsonPayload)

    print("jiraScheduler Done")
