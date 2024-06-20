const commonResponse = {
  headers: {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Allow-Headers':
      'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
    'Access-Control-Allow-Methods': '*',
  },
  isBase64Encoded: false,
}

export const successResponse = (data?: unknown) => {
  return {
    ...commonResponse,
    statusCode: data ? 200 : 204,
    body: JSON.stringify(data),
  }
}

export const errorResponse = (statusCode: number, error: Error) => {
  return {
    ...commonResponse,
    statusCode,
    body: error.message ? JSON.stringify({ error: error.message }) : JSON.stringify(error),
  }
}
