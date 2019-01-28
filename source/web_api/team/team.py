from __future__ import print_function
import boto3
import os
import json
import urllib
import psycopg2


def handler(event, context):
    # Defining environment variables for accessing private information
    ENV = os.environ['ENV']
    ssm_base = os.environ["VGER_SSM_BASE"]
    ssm_client = boto3.client('ssm')

    DATABASE_NAME = ssm_client.get_parameter(Name='/{ssm_base}/redshift/{env}/database_name'.format(ssm_base=ssm_base, env=ENV))
    REDSHIFT_PORT = ssm_client.get_parameter(Name='/{ssm_base}/redshift/{env}/port'.format(ssm_base=ssm_base, env=ENV))
    CLUSTER_ENDPOINT = ssm_client.get_parameter(Name='/{ssm_base}/redshift/{env}/cluster_endpoint'.format(ssm_base=ssm_base, env=ENV))
    E_AWS_RS_USER = ssm_client.get_parameter(Name='/{ssm_base}/redshift/{env}/username'.format(ssm_base=ssm_base, env=ENV), WithDecryption=True)
    E_AWS_RS_PASS = ssm_client.get_parameter(Name='/{ssm_base}/redshift/{env}/password'.format(ssm_base=ssm_base, env=ENV), WithDecryption=True)

    # Grab the data passed to the lambda function through the browser URL (API Gateway)
    query = "SELECT * FROM team"
    try:
        team = event.get('queryStringParameters').get('name')
    except Exception as e:
        # NOTE From API called ...team/ directly, not really an error
        team = None

    # Connect to the Vger Redshift DB
    conn = psycopg2.connect(dbname=DATABASE_NAME, host=CLUSTER_ENDPOINT, port=REDSHIFT_PORT,
                            user=E_AWS_RS_USER, password=E_AWS_RS_PASS)
    cur = conn.cursor()

    try:
        if team is not None:
            try:
                decodedTeam = urllib.unquote(team).decode('utf8')
            except Exception as e:
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
