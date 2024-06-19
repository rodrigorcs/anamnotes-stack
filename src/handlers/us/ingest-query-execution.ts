import dayjs from 'dayjs'
import { logger } from '../../common/powertools/logger'
import { parseIngestQueryExecutionEvent } from '../../models/events/ingest-query-execution'
import { EventBridgeHandler } from 'aws-lambda'
import { sendEventToBus } from '../../lib/helpers/eventbridge'
import { EQueryExecutionEventTopics, EQueryExecutionEventTypes } from '../../models/events/utils'
import {
  TExecuteQueryEventDetail,
  TExecuteQueryEventDetailType,
} from '../../models/events/execute-query'
import { logAndReportError } from '../../lib/helpers/errors'
import { EPos } from '../../models/contracts/utils'

export const handler: EventBridgeHandler<string, unknown, void> = async (event) => {
  try {
    logger.info('Ingested event', { event })
    const parsedEvent = parseIngestQueryExecutionEvent(event)
    logger.info('Parsed event', { parsedEvent })

    const { PLATFORM_EVENT_BUS_NAME } = process.env as Record<string, string>

    const previousDay = dayjs().subtract(1, 'day').startOf('day')

    const eventPayload: {
      detailType: TExecuteQueryEventDetailType
      detail: TExecuteQueryEventDetail
    } = {
      detailType: `${EQueryExecutionEventTopics.QUERY_EXECUTION}.${EQueryExecutionEventTypes.STARTED}`,
      detail: {
        date: previousDay.toISOString(),
        pos: EPos.CA,
        companyIds: ['13'],
      },
    }

    await sendEventToBus({
      eventBusName: PLATFORM_EVENT_BUS_NAME,
      eventPayload,
    })
  } catch (error) {
    await logAndReportError('Error occurred while ingesting the query execution', error)
  }
}
