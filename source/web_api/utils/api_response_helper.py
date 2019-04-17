import json


class ApiResponseError(Exception):
    def __init__(self, status_code, body):
        self.status_code = status_code
        self.body = body


def api_response_handler(method, args):
    try:
        return method(args)
    except ApiResponseError as api_error_response:
        return response_formatter(status_code=api_error_response.status_code,
                                  body=api_error_response.body)


def response_formatter(status_code='400', body={'message': 'error'}):
    api_response = {
        'statusCode': status_code,
        'headers': {
            'Access-Control-Allow-Origin': '*',
            "Access-Control-Allow-Credentials": True,
            'Access-Control-Allow-Headers': '*',
            'Content-Type': 'application/json',
            'Access-Control-Expose-Headers': 'X-Amzn-Remapped-Authorization',
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS'
        },
        'body': json.dumps(body)
    }
    return api_response
