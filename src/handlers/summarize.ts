import {
  ApiGatewayManagementApiClient,
  PostToConnectionCommand,
} from '@aws-sdk/client-apigatewaymanagementapi'
import { WebSocketConnectionsRepository } from '../repositories/WebSocketConnectionsRepository'
import { logger } from '../common/powertools/logger'

export const handler = async () => {
  const websocketURL = `https://q5nwr2lnm7.execute-api.us-east-1.amazonaws.com/prod`
  const client = new ApiGatewayManagementApiClient({ endpoint: websocketURL })

  const wsConnectionsRepository = new WebSocketConnectionsRepository()
  const connections = await wsConnectionsRepository.get({
    userId: 'test-userId',
    summarizationId: 'test-summarizationId',
  })
  const connectionId = connections[0].id

  const requestParams = {
    ConnectionId: connectionId,
    Data: 'Hello!',
  }

  logger.info('connectionId', { connections, connectionId })

  const command = new PostToConnectionCommand(requestParams)
  const response = await client.send(command)

  return response
}
