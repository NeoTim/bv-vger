from __future__ import print_function
import json
import urllib
import psycopg2
from source import common_constants


def handler(event, context):
    # Grab the data passed to the lambda function through the browser URL (API Gateway)
    query = "SELECT * FROM team"
    try:
        team = event.get('queryStringParameters').get('name')
    except Exception as e:
        # NOTE From API called ...team/ directly, not really an error
        team = None

    # Connect to the Vger Redshift DB
    conn = psycopg2.connect(dbname=common_constants.REDSHIFT_DATABASE_NAME,
                            host=common_constants.REDSHIFT_CLUSTER_ENDPOINT,
                            port=common_constants.REDSHIFT_PORT,
                            user=common_constants.REDSHIFT_USERNAME,
                            password=common_constants.REDSHIFT_PASSWORD)
    cur = conn.cursor()

    try:
        if team is not None:
            try:
                decodedTeam = urllib.unquote(team).decode('utf8')
            except Exception:
                payload = {"message": "Could not decode given team name parameter: {}".format(team)}
                response = {
                    "statusCode": 400,
                    "body": json.dumps(payload)
                }
                return response
            query += " WHERE name = %s"
            cur.execute(query, (decodedTeam,))
        else:
            cur.execute(query)
        conn.commit()
        results = cur.fetchall()
    except Exception:
        cur.close()
        conn.close()
        payload = {"message": "Could not query database."}
        response = {
            "statusCode": 500,
            "body": json.dumps(payload)
        }
        return response

    payload = []
    columns = ['name', 'id']
    for result in results:
        teamConfig = [result[1], result[0]]
        payload.append(dict(zip(columns, teamConfig)))

    response = {
        "statusCode": 200,
        "headers": {
            "Access-Control-Allow-Origin": "*",  # Required for CORS support to work
            "Access-Control-Allow-Credentials": True  # Required for cookies, authorization headers with HTTPS
        },
        "body": json.dumps(payload),
        "isBase64Encoded": False
    }

    cur.close()
    conn.close()
    return response
