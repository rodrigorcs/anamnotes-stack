import { logger } from '../common/powertools/logger'
import { errorResponse, successResponse } from '../lib/helpers/responses'
import { middyWrapper } from '../common/middy'
import {
  APIGatewayProxyWithCognitoAuthorizerEvent,
  APIGatewayProxyWithCognitoAuthorizerHandler,
} from 'aws-lambda'
import { ConversationsService } from '../services/ConversationsService'
import { getUserIdFromEvent } from '../lib/helpers/cognito'

export const handler: APIGatewayProxyWithCognitoAuthorizerHandler =
  middyWrapper<APIGatewayProxyWithCognitoAuthorizerEvent>(async (event) => {
    try {
      logger.info('Ingested event', { event })
      const userId = getUserIdFromEvent(event)

      const conversationsService = new ConversationsService()
      logger.info('Getting conversations')
      const conversationItems = await conversationsService.get({
        userId,
      })
      logger.info(`Retrieved ${conversationItems.length} conversations`)

      return successResponse({ conversations: conversationItems })
    } catch (error: unknown) {
      logger.error(JSON.stringify(error))
      return errorResponse(400, error as Error)
    }
  })
