export const successResponse = (data?: unknown) => {
  return {
    statusCode: data ? 200 : 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Credentials': true,
      'Access-Control-Allow-Headers':
        'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
      'Access-Control-Allow-Methods': '*',
    },
    body: JSON.stringify(data),
  }
}

export const errorResponse = (statusCode: number, error: Error) => {
  return {
    statusCode,
    body: error.message ? JSON.stringify({ error: error.message }) : JSON.stringify(error),
  }
}
