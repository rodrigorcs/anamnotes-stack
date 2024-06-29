/* eslint-disable no-async-promise-executor */
import { S3Event, SQSEvent } from 'aws-lambda'
import { logger } from '../common/powertools/logger'
import 'reflect-metadata'
import middy from '@middy/core'
import sqsPartialBatchFailureMiddleware from '@middy/sqs-partial-batch-failure'
import { downloadFileFromBucket } from '../lib/helpers/s3'
import { ChunkTranscriptionsRepository } from '../repositories/ChunkTranscriptionsRepository'
import dayjs from 'dayjs'
import { AIProviderSwitcher, AIProviders } from '../switchers/AISwitcher'

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
          const conversationId = summarizationPath.split('=').pop()
          const chunkId = fileName.split('=').pop()
          if (!chunkId) {
            throw new Error('chunkId not found in file name, expected format: chunkId=1234')
          }
          if (!conversationId) {
            throw new Error(
              'conversationId not found in object key, expected format: userId=1234/conversationId=1234',
            )
          }

          try {
            const AIProvider = AIProviderSwitcher.getProvider(AIProviders.OPEN_AI)
            const contentSections = await AIProvider.transcribe({
              fileByteArray,
              fileName: fileNameWithExtension,
            })
            logger.info('Transcribed content sections', { contentSections })

            try {
              const chunkTranscriptionCreatedItem = await chunkTranscriptionsRepository.create({
                id: chunkId,
                userId: 'test-userId',
                conversationId,
                contentSections,
                isLastChunk: true,
                createdAt: dayjs(),
              })
              logger.info('Created chunk transcription', { chunkTranscriptionCreatedItem })
            } catch (error) {
              logger.info('Error when creating chunk transcription', { error })
            }
          } catch (error) {
            logger.error('Error when transcribing content sections', { error })
          }

          const successMessage = 'Success'
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
