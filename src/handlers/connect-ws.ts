import { APIGatewayProxyWebsocketEventV2 as DefaultEvent, Handler } from 'aws-lambda'
import { logger } from '../common/powertools/logger'
import { WebSocketConnectionsRepository } from '../repositories/WebSocketConnectionsRepository'
import dayjs from 'dayjs'
import { middyWrapper } from '../common/middy'

interface APIGatewayProxyWebsocketEventV2 extends DefaultEvent {
  queryStringParameters?: Record<string, string>
  multiValueQueryStringParameters?: Record<string, string[]>
}
type APIGatewayProxyWebsocketHandlerV2 = Handler<APIGatewayProxyWebsocketEventV2, void>

export const handler: APIGatewayProxyWebsocketHandlerV2 =
  middyWrapper<APIGatewayProxyWebsocketEventV2>(async (event) => {
    logger.info('Received event', { event })

    const conversationId = event.queryStringParameters?.conversationId
    if (!conversationId) throw new Error('conversationId is missing in query string parameters')

    const wsConnectionsRepository = new WebSocketConnectionsRepository()

    const createdConnection = await wsConnectionsRepository.create({
      id: event.requestContext.connectionId,
      userId: 'test-userId',
      conversationId,
      createdAt: dayjs(),
    })

    logger.info('Created connection', { createdConnection })
    return { statusCode: 200, body: 'Connected.' }
  })
