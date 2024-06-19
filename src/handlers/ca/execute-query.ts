/* eslint-disable no-async-promise-executor */
import { logger } from '../../common/powertools/logger'
import dayjs from 'dayjs'
import { parseExecuteQueryEvent } from '../../models/events/execute-query'
import { SQSEvent } from 'aws-lambda'
import { MetricsAction } from '../../actions/MetricsAction'
import 'reflect-metadata'
import middy from '@middy/core'
import sqsPartialBatchFailureMiddleware from '@middy/sqs-partial-batch-failure'
import { logAndReportError } from '../../lib/helpers/errors'

const getRecordPromises = (event: SQSEvent) => {
  const recordPromises: Promise<string>[] = []
  for (const record of event.Records) {
    const promise = new Promise<string>(async (resolve, reject) => {
      try {
        logger.debug('Ingested record', { record })
        const recordObj = JSON.parse(record.body)
        const parsedRecord = parseExecuteQueryEvent(recordObj)
        logger.info('Parsed record', { parsedRecord })

        const metricsAction = new MetricsAction()

        await metricsAction.getMetricsFromMonolith({
          companyIds: parsedRecord.detail.companyIds,
          date: dayjs(parsedRecord.detail.date),
        })

        const successMessage = `Success on ${parsedRecord.detail.date}`
        logger.info(successMessage)
        resolve(successMessage)
      } catch (error) {
        await logAndReportError('Error occurred while executing the query', error)
        reject(error)
      }
    })
    recordPromises.push(promise)
  }
  return recordPromises
}

const eventHandler = async (event: SQSEvent): Promise<PromiseSettledResult<string>[]> => {
  logger.debug('Ingested event', { event })
  const recordPromises = getRecordPromises(event)
  return Promise.allSettled(recordPromises)
}

export const handler = middy(eventHandler).use(sqsPartialBatchFailureMiddleware())
