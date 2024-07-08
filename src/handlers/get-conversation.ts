import { logger } from '../common/powertools/logger'
import { errorResponse, successResponse } from '../lib/helpers/responses'
import { middyWrapper } from '../common/middy'
import { APIGatewayProxyEvent, APIGatewayProxyHandler } from 'aws-lambda'
import { ConversationsService } from '../services/ConversationsService'
import { SummarizationsService } from '../services/SummarizationsService'
import { IConversationWithSummarizations } from '../models/contracts/Conversation'

export const handler: APIGatewayProxyHandler = middyWrapper<APIGatewayProxyEvent>(async (event) => {
  try {
    const conversationId = event.pathParameters?.conversationId
    if (!conversationId) throw new Error('conversationId is required')

    const userId = 'test-userId'
    const conversationsService = new ConversationsService()
    const summarizationsService = new SummarizationsService()
    const conversationItem = await conversationsService.getOne({
      userId,
      id: conversationId,
    })
    const summarizationItems = await summarizationsService.get({
      userId,
      conversationId,
    })

    const conversationWithSummarizations: IConversationWithSummarizations = {
      ...conversationItem,
      summarizations: summarizationItems,
    }

    return successResponse({ conversation: conversationWithSummarizations })
  } catch (error: unknown) {
    logger.error(JSON.stringify(error))
    return errorResponse(400, error as Error)
  }
})
