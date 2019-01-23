from __future__ import print_function
import json
import psycopg2
from source import common_constants


def handler(event, context):
    # Grab the data passed to the lambda function through the browser URL (API Gateway)
    try:
        projectID = (event.get('pathParameters').get('id'))
    except Exception as e:
        print(e)
        payload = {"message": "Id path parameter not given"}
        response = {
            "statusCode": 400,
            "headers": {
                "Access-Control-Allow-Origin": "*",  # Required for CORS support to work
                "Access-Control-Allow-Credentials": True  # Required for cookies, authorization headers with HTTPS
            },
            "body": json.dumps(payload)
        }
        return response

    # Connect to the Vger Redshift DB
    conn = psycopg2.connect(dbname=common_constants.REDSHIFT_DATABASE_NAME,
                            host=common_constants.REDSHIFT_CLUSTER_ENDPOINT,
                            port=common_constants.REDSHIFT_PORT,
                            user=common_constants.REDSHIFT_USERNAME,
                            password=common_constants.REDSHIFT_PASSWORD)
    cur = conn.cursor()

    selectIDQuery = "SELECT repo_name FROM team_repo WHERE team_project_id = %s"

    try:
        cur.execute(selectIDQuery, (projectID,))
        conn.commit()
        repoResults = cur.fetchall()
    except Exception:
        cur.close()
        conn.close()
        payload = {"message": "Internal Error"}
        response = {
            "statusCode": 500,
            "headers": {
                "Access-Control-Allow-Origin": "*",  # Required for CORS support to work
                "Access-Control-Allow-Credentials": True  # Required for cookies, authorization headers with HTTPS
            },
            "body": json.dumps(payload)
        }
        return response

    repos = [result[0] for result in repoResults] if repoResults else []

    response = {
        "statusCode": 200,
        "headers": {
            "Access-Control-Allow-Origin": "*",  # Required for CORS support to work
            "Access-Control-Allow-Credentials": True  # Required for cookies, authorization headers with HTTPS
        },
        "body": json.dumps(repos)
    }

    cur.close()
    conn.close()
    return response
