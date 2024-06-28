/* eslint-disable no-async-promise-executor */
import { SQSEvent } from 'aws-lambda'
import { logger } from '../common/powertools/logger'
import 'reflect-metadata'
import middy from '@middy/core'
import sqsPartialBatchFailureMiddleware from '@middy/sqs-partial-batch-failure'

const getRecordPromises = (event: SQSEvent) => {
  const recordPromises: Promise<string>[] = []
  for (const record of event.Records) {
    const promise = new Promise<string>(async (resolve, reject) => {
      try {
        logger.debug('Ingested record', { record })

        const successMessage = `Success`
        logger.info(successMessage)
        resolve(successMessage)
      } catch (error) {
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
