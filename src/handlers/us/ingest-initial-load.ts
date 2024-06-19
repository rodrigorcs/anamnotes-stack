import { Handler } from 'aws-lambda'
import { logger } from '../../common/powertools/logger'
import dayjs from 'dayjs'
import { sendMessageBatchToQueue } from '../../lib/helpers/sqs'
import { TExecuteQueryEventDetail } from '../../models/events/execute-query'
import { parseIngestInitialLoadEvent } from '../../models/events/ingest-initial-load'
import { logAndReportError } from '../../lib/helpers/errors'
import { calculateIntervalsQty } from '../../lib/helpers/utils'

export const handler: Handler<unknown> = async (event) => {
  try {
    logger.info('Ingested event', { event })
    const parsedEvent = parseIngestInitialLoadEvent(event)
    logger.info('Parsed event', { parsedEvent })

    const { INITIAL_LOAD_QUEUE_URL } = process.env as Record<string, string>

    const startDate = dayjs(parsedEvent.detail.startDate)
    const endDate = dayjs(parsedEvent.detail.endDate)
    const { pos, companyIds } = parsedEvent.detail

    const messages: TExecuteQueryEventDetail[] = []
    const intervalsQty = calculateIntervalsQty(startDate, endDate, 1)

    for (let intervalCount = 0; intervalCount < intervalsQty; intervalCount++) {
      const date = startDate.add(intervalCount, 'day')

      messages.push({
        date: date.toISOString(),
        pos,
        companyIds,
      })
    }

    logger.info(`Created ${messages.length} messages to send to queue`, {
      firstMessages: messages.slice(0, 3),
      lastMessages: messages.slice(-3),
    })

    await sendMessageBatchToQueue({
      queueUrl: INITIAL_LOAD_QUEUE_URL,
      messages,
      delayIncrements: [
        {
          batchSize: 1,
          delay: 3,
        },
        {
          batchSize: 20,
          delay: 60,
        },
        {
          batchSize: 100,
          delay: 120,
        },
      ],
    })
  } catch (error) {
    await logAndReportError('Error occurred while ingesting the initial load', error)
  }
}
