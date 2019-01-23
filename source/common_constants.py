import os
import boto3

ENV = os.environ['VGER_ENV']
ssm_base = os.environ["VGER_SSM_BASE"]
ssm_client = boto3.client('ssm')
sts_client = boto3.client('sts')

# Redshift
REDSHIFT_USERNAME = ssm_client.get_parameter(
    Name='/{ssm_base}/redshift/{env}/username'.format(ssm_base=ssm_base, env=ENV),
    WithDecryption=True)['Parameter']['Value']
REDSHIFT_PASSWORD = ssm_client.get_parameter(
    Name='/{ssm_base}/redshift/{env}/password'.format(ssm_base=ssm_base, env=ENV),
    WithDecryption=True)['Parameter']['Value']
REDSHIFT_PORT = ssm_client.get_parameter(
    Name='/{ssm_base}/redshift/{env}/port'.format(ssm_base=ssm_base, env=ENV))['Parameter']['Value']
REDSHIFT_DATABASE_NAME = ssm_client.get_parameter(
    Name='/{ssm_base}/redshift/{env}/database_name'.format(ssm_base=ssm_base, env=ENV))['Parameter']['Value']
REDSHIFT_CLUSTER_ENDPOINT = ssm_client.get_parameter(
    Name='/{ssm_base}/redshift/{env}/cluster_endpoint'.format(ssm_base=ssm_base, env=ENV))['Parameter']['Value']

# AWS
AWS_ACCOUNT_ID = sts_client.get_caller_identity()['Account']
