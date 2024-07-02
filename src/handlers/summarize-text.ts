import {
  ApiGatewayManagementApiClient,
  PostToConnectionCommand,
} from '@aws-sdk/client-apigatewaymanagementapi'
import { WebSocketConnectionsRepository } from '../repositories/WebSocketConnectionsRepository'
import { logger } from '../common/powertools/logger'
import { ChunkTranscriptionsRepository } from '../repositories/ChunkTranscriptionsRepository'
import { DynamoDBStreamHandler } from 'aws-lambda'
import { unmarshall } from '@aws-sdk/util-dynamodb'
import { IChunkTranscriptionEntity } from '../models/schemas/ChunkTranscription/schema'
import { AIProviderSwitcher, AIProviders } from '../switchers/AISwitcher'
import { SummarizationsRepository } from '../repositories/SummarizationsRepository'
import { v4 as uuid } from 'uuid'
import dayjs from 'dayjs'

export const handler: DynamoDBStreamHandler = async (event) => {
  try {
    const websocketURL = `https://q5nwr2lnm7.execute-api.us-east-1.amazonaws.com/prod`
    const client = new ApiGatewayManagementApiClient({ endpoint: websocketURL })
    const chunkTranscriptionsRepository = new ChunkTranscriptionsRepository()
    const summarizationsRepository = new SummarizationsRepository()
    const wsConnectionsRepository = new WebSocketConnectionsRepository()
    const AIProvider = AIProviderSwitcher.getProvider(AIProviders.OPEN_AI)

    // TODO: Add try/catch
    logger.info('Ingested event', { event })
    for (const record of event.Records) {
      logger.info('Ingested record', { record })
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const parsedRecord = record as any // TODO: Add schema validator
      const chunkTranscriptionEntity = unmarshall(
        parsedRecord.dynamodb.NewImage,
      ) as IChunkTranscriptionEntity
      logger.info('Entity after unmarshall', { chunkTranscriptionEntity })

      const { userId, conversationId } = chunkTranscriptionEntity

      const chunkTranscriptions = await chunkTranscriptionsRepository.get({
        conversationId,
        userId,
      })

      logger.info('chunkTranscriptions', { chunkTranscriptions })

      const contentSections = chunkTranscriptions.map(
        (chunkTranscription) => chunkTranscription.contentSections,
      )

      const summarizedSections = await AIProvider.summarize({
        contentSections,
      })

      logger.info('Summarized content', { summarizedSections })

      const connections = await wsConnectionsRepository.get({
        userId,
        conversationId,
      })
      const connectionId = connections[0].id

      const requestParams = {
        ConnectionId: connectionId,
        Data: JSON.stringify(summarizedSections),
      }

      logger.info('connectionId', { connections, connectionId })

      const command = new PostToConnectionCommand(requestParams)
      await client.send(command)

      const createdSummarizationItem = await summarizationsRepository.create({
        id: uuid(),
        conversationId,
        userId,
        content: summarizedSections,
        createdAt: dayjs(),
      })

      logger.info('Created summarization item', { createdSummarizationItem })
    }
  } catch (error) {
    logger.error('Error in handler', { error })
  }
}
