import { logger } from '../common/powertools/logger'
import { errorResponse, successResponse } from '../lib/helpers/responses'
import { middyWrapper } from '../common/middy'
import { APIGatewayProxyEvent, APIGatewayProxyHandler } from 'aws-lambda'
import { v4 as uuid } from 'uuid'
import { LeadsRepository } from '../repositories/LeadsRepository'
import dayjs from 'dayjs'

export const handler: APIGatewayProxyHandler = middyWrapper<APIGatewayProxyEvent>(async (event) => {
  try {
    logger.info('Ingested event', { event })

    const parsedBody = event.body ? JSON.parse(event.body) : null

    const leadsRepository = new LeadsRepository()
    await leadsRepository.create({
      id: uuid(),
      emailAddress: parsedBody?.emailAddress,
      ipAddress: event.requestContext.identity.sourceIp,
      source: parsedBody?.source,
      createdAt: dayjs(),
    })

    return successResponse()
  } catch (error: unknown) {
    logger.error(JSON.stringify(error))
    return errorResponse(400, error as Error)
  }
})
