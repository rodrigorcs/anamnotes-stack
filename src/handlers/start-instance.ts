import { logger } from '../common/powertools/logger'
import { errorResponse, successResponse } from '../lib/helpers/responses'
import { middyWrapper } from '../common/middy'
import { APIGatewayProxyEvent, APIGatewayProxyHandler } from 'aws-lambda'

export const handler: APIGatewayProxyHandler = middyWrapper<APIGatewayProxyEvent>(
  async (event, context) => {
    try {
      return successResponse({ event, context })
    } catch (error: unknown) {
      logger.error(JSON.stringify(error))
      return errorResponse(400, error as Error)
    }
  },
)
