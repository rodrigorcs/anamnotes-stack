import 'reflect-metadata'
import { logger } from '../common/powertools/logger'
// import { APIGatewayProxyEvent, Context } from 'aws-lambda'
import { successResponse, errorResponse } from '../lib/helpers/responses'

export const handler = () => {
  try {
    return successResponse()
  } catch (error) {
    logger.error(JSON.stringify(error))
    return errorResponse(400, error as Error)
  }
}
