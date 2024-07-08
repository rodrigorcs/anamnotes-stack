import { logger } from '../common/powertools/logger'
import { errorResponse, successResponse } from '../lib/helpers/responses'
import { middyWrapper } from '../common/middy'
import { APIGatewayProxyEvent, APIGatewayProxyHandler } from 'aws-lambda'
import { ConversationsService } from '../services/ConversationsService'

export const handler: APIGatewayProxyHandler = middyWrapper<APIGatewayProxyEvent>(async () => {
  try {
    const userId = 'test-userId'
    const conversationsService = new ConversationsService()
    logger.info('Getting conversations')
    const conversationItems = await conversationsService.get({
      userId,
    })

    return successResponse({ conversations: conversationItems })
  } catch (error: unknown) {
    logger.error(JSON.stringify(error))
    return errorResponse(400, error as Error)
  }
})
