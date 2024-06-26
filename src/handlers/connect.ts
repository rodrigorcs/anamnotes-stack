/* eslint-disable @typescript-eslint/no-unused-vars */
import { APIGatewayProxyEvent } from 'aws-lambda'

export const handler = async (event: APIGatewayProxyEvent) => {
  return { statusCode: 200, body: 'Connected.' }
}
