import { APIGatewayProxyEvent } from 'aws-lambda'
import { errorResponse, successResponse } from '../../lib/helpers/responses'
import { MetricsAction } from '../../actions/MetricsAction'
import { logger } from '../../common/powertools/logger'
import dayjs from 'dayjs'

export const handler = async (event: APIGatewayProxyEvent) => {
  try {
    const merchantId = event.pathParameters?.merchantId
    if (!merchantId) return errorResponse(400, new Error('Merchant ID is required'))

    const metricsAction = new MetricsAction()

    const merchantMetrics = await metricsAction.getPrecomputedMetrics({ merchantId, date: dayjs() })

    return successResponse(merchantMetrics)
  } catch (error) {
    logger.error(JSON.stringify(error))
    return errorResponse(400, error as Error)
  }
}
