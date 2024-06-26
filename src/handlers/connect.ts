import { APIGatewayProxyEvent } from 'aws-lambda'
import { logger } from '../common/powertools/logger'

export const handler = async (event: APIGatewayProxyEvent) => {
  logger.info('Received event', { event })
  return { statusCode: 200, body: 'Connected.' }
}
