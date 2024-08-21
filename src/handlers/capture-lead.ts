import { logger } from '../common/powertools/logger'
import { errorResponse, successResponse } from '../lib/helpers/responses'
import { middyWrapper } from '../common/middy'
import { APIGatewayProxyEventV2, APIGatewayProxyHandlerV2 } from 'aws-lambda'
import { v4 as uuid } from 'uuid'
import { LeadsRepository } from '../repositories/LeadsRepository'
import dayjs from 'dayjs'

export const handler: APIGatewayProxyHandlerV2 = middyWrapper<APIGatewayProxyEventV2>(
  async (event) => {
    try {
      logger.info('Ingested event', { event })

      const parsedBody = event.body ? JSON.parse(event.body) : null
      const leadEmailAddress = parsedBody?.emailAddress
      const leadSource = parsedBody?.source

      const leadsRepository = new LeadsRepository()
      await leadsRepository.create({
        id: uuid(),
        emailAddress: leadEmailAddress,
        source: leadSource,
        createdAt: dayjs(),
      })

      return successResponse()
    } catch (error: unknown) {
      logger.error(JSON.stringify(error))
      return errorResponse(400, error as Error)
    }
  },
)
