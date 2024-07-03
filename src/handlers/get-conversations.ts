import { logger } from '../common/powertools/logger'
import { errorResponse, successResponse } from '../lib/helpers/responses'
import { middyWrapper } from '../common/middy'
import { APIGatewayProxyEvent, APIGatewayProxyHandler } from 'aws-lambda'
import { ConversationsRepository } from '../repositories/ConversationsRepository'

export const handler: APIGatewayProxyHandler = middyWrapper<APIGatewayProxyEvent>(async (event) => {
  try {
    const conversationId = event.pathParameters?.conversationId
    const userId = 'test-userId'

    const conversationsRepository = new ConversationsRepository()
    const conversationItems = await conversationsRepository.get({
      userId,
      id: conversationId,
    })

    return successResponse({ conversations: conversationItems })
  } catch (error: unknown) {
    logger.error(JSON.stringify(error))
    return errorResponse(400, error as Error)
  }
})
