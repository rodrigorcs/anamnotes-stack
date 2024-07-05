import { logger } from '../common/powertools/logger'
import { errorResponse, successResponse } from '../lib/helpers/responses'
import { middyWrapper } from '../common/middy'
import { APIGatewayProxyEvent, APIGatewayProxyHandler } from 'aws-lambda'
import { v4 as uuid } from 'uuid'
import { ConversationsRepository } from '../repositories/ConversationsRepository'
import dayjs from 'dayjs'

export const handler: APIGatewayProxyHandler = middyWrapper<APIGatewayProxyEvent>(async (event) => {
  try {
    const userId = 'test-userId'
    const parsedBody = event.body ? JSON.parse(event.body) : null
    const clientName = parsedBody?.client?.name

    const conversationsRepository = new ConversationsRepository()
    const createdConversationItem = await conversationsRepository.create({
      id: uuid(),
      userId,
      client: {
        id: uuid(),
        name: clientName,
      },
      createdAt: dayjs(),
    })

    return successResponse({ conversationId: createdConversationItem.id })
  } catch (error: unknown) {
    logger.error(JSON.stringify(error))
    return errorResponse(400, error as Error)
  }
})
