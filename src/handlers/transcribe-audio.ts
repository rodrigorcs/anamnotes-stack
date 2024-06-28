/* eslint-disable no-async-promise-executor */
import { S3Event, SQSEvent } from 'aws-lambda'
import { logger } from '../common/powertools/logger'
import 'reflect-metadata'
import middy from '@middy/core'
import sqsPartialBatchFailureMiddleware from '@middy/sqs-partial-batch-failure'
import { OpenAI } from 'openai'
import { downloadFileFromBucket } from '../lib/helpers/s3'
import { createReadStream } from 'fs'

const getRecordPromises = (event: SQSEvent) => {
  const recordPromises: Promise<string>[] = []
  for (const record of event.Records) {
    const promise = new Promise<string>(async (resolve, reject) => {
      try {
        logger.debug('Ingested record', { record })
        const s3Event = JSON.parse(record.body) as S3Event

        for (const s3Record of s3Event.Records) {
          logger.debug('Ingested S3 record', { s3Record })

          const fileBuffer = await downloadFileFromBucket({
            bucketName: s3Record.s3.bucket.name,
            objectKey: s3Record.s3.object.key,
          })

          const openAIClient = new OpenAI()

          const transcription = await openAIClient.audio.transcriptions.create({
            model: 'whisper-1',
            file: createReadStream(fileBuffer),
            language: 'pt',
          })

          const successMessage = transcription.text
          logger.info(successMessage)
          resolve(successMessage)
        }
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
