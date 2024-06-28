/* eslint-disable no-async-promise-executor */
import { S3Event, SQSEvent } from 'aws-lambda'
import { logger } from '../common/powertools/logger'
import 'reflect-metadata'
import middy from '@middy/core'
import sqsPartialBatchFailureMiddleware from '@middy/sqs-partial-batch-failure'
import { OpenAI, toFile } from 'openai'
import { downloadFileFromBucket } from '../lib/helpers/s3'
import { ChunkTranscriptionsRepository } from '../repositories/ChunkTranscriptionsRepository'
import dayjs from 'dayjs'

const getRecordPromises = (event: SQSEvent) => {
  const recordPromises: Promise<string>[] = []
  const chunkTranscriptionsRepository = new ChunkTranscriptionsRepository()
  for (const record of event.Records) {
    const promise = new Promise<string>(async (resolve, reject) => {
      try {
        logger.debug('Ingested record', { record })
        const s3Event = JSON.parse(record.body) as S3Event

        for (const s3Record of s3Event.Records) {
          logger.debug('Ingested S3 record', { s3Record })
          const bucketName = s3Record.s3.bucket.name
          const objectKey = decodeURIComponent(s3Record.s3.object.key)

          const fileByteArray = await downloadFileFromBucket({
            bucketName,
            objectKey,
          })
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          const [_userPath, summarizationPath, fileNameWithExtension] = objectKey.split('/')
          const [fileName] = objectKey.split('.')
          const summarizationId = summarizationPath.split('=').pop()
          const chunkId = fileName.split('=').pop()
          if (!chunkId) {
            throw new Error('chunkId not found in file name, expected format: chunkId=1234')
          }
          if (!summarizationId) {
            throw new Error(
              'summarizationId not found in object key, expected format: userId=1234/summarizationId=1234',
            )
          }

          const file = await toFile(fileByteArray, fileNameWithExtension)

          const openAIClient = new OpenAI()

          const transcription = await openAIClient.audio.transcriptions.create({
            model: 'whisper-1',
            file,
            language: 'pt',
          })

          chunkTranscriptionsRepository.create({
            id: chunkId,
            userId: 'test-userId',
            summarizationId,
            contentSections: [
              {
                text: transcription.text,
              },
            ],
            createdAt: dayjs(),
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
