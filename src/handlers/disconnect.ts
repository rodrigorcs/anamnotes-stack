import { APIGatewayProxyWebsocketEventV2, APIGatewayProxyWebsocketHandlerV2 } from 'aws-lambda'
import { logger } from '../common/powertools/logger'
import { WebSocketConnectionsRepository } from '../repositories/WebSocketConnectionsRepository'
import { middyWrapper } from '../common/middy'

export const handler: APIGatewayProxyWebsocketHandlerV2 =
  middyWrapper<APIGatewayProxyWebsocketEventV2>(async (event) => {
    logger.info('Received event', { event })
    const wsConnectionsRepository = new WebSocketConnectionsRepository()

    const createdConnection = await wsConnectionsRepository.delete({
      id: 'test-id',
      userId: 'test-userId',
      summarizationId: event.requestContext.connectionId,
    })

    logger.info('Created connection', { createdConnection })
    return { statusCode: 200, body: 'Connected.' }
  })
