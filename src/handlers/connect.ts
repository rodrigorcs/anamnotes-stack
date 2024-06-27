import { APIGatewayProxyEvent } from 'aws-lambda'
import { logger } from '../common/powertools/logger'
import { WebSocketConnectionsRepository } from '../repositories/WebSocketConnectionsRepository'
import dayjs from 'dayjs'

export const handler = async (event: APIGatewayProxyEvent) => {
  logger.info('Received event', { event })

  const createdConnection = new WebSocketConnectionsRepository().create({
    id: 'test-id',
    userId: 'test-userId',
    summarizationId: 'test-summarizationId',
    createdAt: dayjs(),
  })

  logger.info('Created connection', { createdConnection })
  return { statusCode: 200, body: 'Connected.' }
}
