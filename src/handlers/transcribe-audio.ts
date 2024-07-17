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
  const { STAGE } = process.env as Record<string, string>
  const isProd = STAGE === 'prod'

  for (const record of event.Records) {
    const promise = new Promise<string>(async (resolve, reject) => {
      try {
        logger.debug('Ingested record', { record })
        const s3Event = JSON.parse(record.body) as S3Event

        for (const s3Record of s3Event.Records) {
          logger.info('Ingested S3 record', { s3Record })
          const bucketName = s3Record.s3.bucket.name
          const objectKey = decodeURIComponent(s3Record.s3.object.key)

          const fileByteArray = await downloadFileFromBucket({
            bucketName,
            objectKey,
          })
          const [userPath, conversationPath, fileNameWithExtension] = objectKey.split('/')
          const [fileName] = fileNameWithExtension.split('.')
          const userId = userPath.split('=').pop()
          const conversationId = conversationPath.split('=').pop()
          const [chunkIdPart, isLastChunkPart] = fileName.split('-')
          const chunkId = chunkIdPart.split('=').pop()
          const isLastChunk = isLastChunkPart.split('=').pop() === 'true'

          if (!userId) {
            throw new Error('userId not found in file name, expected format: userId=1234')
          }
          if (!chunkId) {
            throw new Error('chunkId not found in file name, expected format: chunkId=1234')
          }
          if (!conversationId) {
            throw new Error(
              'conversationId not found in object key, expected format: conversationId=1234',
            )
          }

          const previousChunkId = (parseInt(chunkId) - 1).toString().padStart(3, '0')
          const previousTranscriptions = await chunkTranscriptionsRepository.get({
            userId,
            conversationId,
            id: previousChunkId,
          })

          const previousContext = previousTranscriptions[0]
            ? previousTranscriptions[0].contentSections.segments
                .slice(1)
                .slice(-10) // TODO: Add segments based on their token count from verbose response
                .map((segment) => segment.text)
                .join(' ')
            : undefined

          try {
            const aiProviderSlug = isProd ? AIProviders.OPEN_AI : AIProviders.DUMMY
            const AIProvider = AIProviderSwitcher.getProvider(aiProviderSlug)
            const contentSections = await AIProvider.transcribe({
              fileByteArray,
              fileName: fileNameWithExtension,
              previousContext,
            })
            logger.info('Transcribed content sections', { contentSections })

            try {
              const chunkTranscriptionCreatedItem = await chunkTranscriptionsRepository.create({
                id: chunkId,
                userId,
                conversationId,
                contentSections,
                isLastChunk,
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
