from __future__ import print_function
import json
import urllib
import psycopg2
from source import common_constants


def handler(event, context):
    # Grab the data passed to the lambda function through the browser URL (API Gateway)
    try:
        teamID = (event.get('pathParameters').get('id'))
    except Exception as e:
        payload = {"message": "Could not get id path parameter"}
        response = {
            "statusCode": 400,
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

    selectIDQuery = "SELECT name, id FROM team WHERE id = %s"

    try:
        cur.execute(selectIDQuery, (teamID,))
        conn.commit()
        results = cur.fetchall()
    except Exception:
        cur.close()
        conn.close()
        payload = {"message": "Internal Error. Could not query database given parameters"}
        response = {
            "statusCode": 500,
            "body": json.dumps(payload)
        }
        return response

    if not results:
        cur.close()
        conn.close()
        payload = {"message": "No resource with team ID {} found".format(teamID)}
        response = {
            "statusCode": 404,
            "body": json.dumps(payload)
        }
        return response

    query = "SELECT name, id FROM team_project WHERE team_project.team_id = %s"

    try:
        projectName = (event.get('queryStringParameters').get('name'))
    except Exception:
        projectName = None

    try:
        if projectName is not None:
            try:
                decodedProject = urllib.unquote(projectName).decode('utf8')
            except Exception:
                payload = {"message": "Could not decode given project name parameter: {}".format(projectName)}
                response = {
                    "statusCode": 400,
                    "body": json.dumps(payload)
                }
                return response
            query += " AND name = %s"
            cur.execute(query, (teamID, decodedProject))
        else:
            cur.execute(query, (teamID,))
        conn.commit()
        results = cur.fetchall()
    except Exception:
        cur.close()
        conn.close()
        payload = {"message": "Internal Error. Could not query database given parameters"}
        response = {
            "statusCode": 500,
            "body": json.dumps(payload)
        }
        return response

    payload = []
    columns = ['name', 'id']
    for result in results:
        teamConfig = [result[0], result[1]]
        payload.append(dict(zip(columns, teamConfig)))

    response = {
        "statusCode": 200,
        "headers": {
            "Access-Control-Allow-Origin": "*",  # Required for CORS support to work
            "Access-Control-Allow-Credentials": True  # Required for cookies, authorization headers with HTTPS
        },
        "body": json.dumps(payload)
    }

    cur.close()
    conn.close()
    return response
