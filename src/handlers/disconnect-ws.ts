import { logger } from '../common/powertools/logger'
import { WebSocketConnectionsRepository } from '../repositories/WebSocketConnectionsRepository'
import { middyWrapper } from '../common/middy'
import {
  APIGatewayProxyWebsocketEventV2,
  APIGatewayProxyWebsocketHandlerV2,
} from '../models/events/WebsocketEventV2'

export const handler: APIGatewayProxyWebsocketHandlerV2 =
  middyWrapper<APIGatewayProxyWebsocketEventV2>(async (event) => {
    logger.info('Received event', { event })
    const conversationId = event.queryStringParameters?.conversationId
    if (!conversationId) throw new Error('conversationId is missing in query string parameters')

    const wsConnectionsRepository = new WebSocketConnectionsRepository()

    await wsConnectionsRepository.delete({
      id: event.requestContext.connectionId,
      userId: 'test-userId',
      conversationId,
    })

    logger.info(`Deleted connection ${event.requestContext.connectionId}`)
    return { statusCode: 200, body: 'Connected.' }
  })
