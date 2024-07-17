import { logger } from '../common/powertools/logger'
import { WebSocketConnectionsRepository } from '../repositories/WebSocketConnectionsRepository'
import { middyWrapper } from '../common/middy'
import {
  APIGatewayProxyWebsocketEventV2,
  APIGatewayProxyWebsocketHandlerV2,
} from '../models/events/WebsocketEventV2'
import { CognitoJwtVerifier } from 'aws-jwt-verify'

export const handler: APIGatewayProxyWebsocketHandlerV2 =
  middyWrapper<APIGatewayProxyWebsocketEventV2>(async (event) => {
    logger.info('Received event', { event })
    const { USER_POOL_ID, USER_POOL_CLIENT_ID } = process.env as Record<string, string>

    const authToken = event.queryStringParameters?.idToken
    if (!authToken) throw new Error('idToken is missing in query string parameters')

    const verifier = CognitoJwtVerifier.create({
      userPoolId: USER_POOL_ID,
      clientId: USER_POOL_CLIENT_ID,
      tokenUse: 'id',
    })

    const jwt = authToken ? await verifier.verify(authToken) : null
    if (!jwt) throw new Error('idToken is invalid')

    const conversationId = event.queryStringParameters?.conversationId
    if (!conversationId) throw new Error('conversationId is missing in query string parameters')

    const wsConnectionsRepository = new WebSocketConnectionsRepository()

    await wsConnectionsRepository.delete({
      id: event.requestContext.connectionId,
      userId: jwt['cognito:username'],
      conversationId,
    })

    logger.info(`Deleted connection ${event.requestContext.connectionId}`)
    return { statusCode: 200, body: 'Disconnected.' }
  })
