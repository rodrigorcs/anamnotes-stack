import {
  ApiGatewayManagementApiClient,
  PostToConnectionCommand,
  DeleteConnectionCommand,
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
import {
  EWebsocketMessageTypes,
  TSummarizationWebsocketMessage,
} from '../models/events/WebsocketMessage'
import { ConversationsService } from '../services/ConversationsService'
import { SummarizationsService } from '../services/SummarizationsService'

export const handler: DynamoDBStreamHandler = async (event) => {
  try {
    const { WEBSOCKET_ENDPOINT, STAGE } = process.env as Record<string, string>
    const isProd = STAGE === 'sandbox'

    const client = new ApiGatewayManagementApiClient({ endpoint: WEBSOCKET_ENDPOINT })
    const chunkTranscriptionsRepository = new ChunkTranscriptionsRepository()
    const summarizationsRepository = new SummarizationsRepository()
    const wsConnectionsRepository = new WebSocketConnectionsRepository()
    const conversationsService = new ConversationsService()
    const summarizationsService = new SummarizationsService()
    const AIProvider = AIProviderSwitcher.getProvider(
      isProd ? AIProviders.OPEN_AI : AIProviders.OPEN_AI,
    )

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

      const connections = await wsConnectionsRepository.get({
        userId,
        conversationId,
      })
      const connectionId = connections[0].id

      const chunkTranscriptions = await chunkTranscriptionsRepository.get({
        conversationId,
        userId,
      })
      logger.info('chunkTranscriptions', { chunkTranscriptions })

      const contentSections = chunkTranscriptions.map(
        (chunkTranscription) => chunkTranscription.contentSections,
      )

      try {
        const summarizedSections = await AIProvider.summarize({
          contentSections,
        })
        logger.info('Summarized content', { summarizedSections })

        const createdSummarizationItem = await summarizationsRepository.create({
          id: uuid(),
          conversationId,
          userId,
          content: summarizedSections,
          createdAt: dayjs(),
        })

        const updatedConversationItem = await conversationsService.getOne({
          id: conversationId,
          userId,
        })

        const summarizationItems = await summarizationsService.get({
          conversationId,
          userId,
        })

        const message: TSummarizationWebsocketMessage = {
          success: true,
          type: EWebsocketMessageTypes.SUMMARIZATION,
          data: { ...updatedConversationItem, summarizations: summarizationItems },
        }

        const postToConnectionCommand = new PostToConnectionCommand({
          ConnectionId: connectionId,
          Data: JSON.stringify(message),
        })
        await client.send(postToConnectionCommand)
        logger.info(`Sent message to WS connection ${connectionId}`, { message })

        logger.info('Created summarization item', { createdSummarizationItem })
      } catch (error) {
        const message: TSummarizationWebsocketMessage = {
          success: false,
          type: EWebsocketMessageTypes.SUMMARIZATION,
          error: {
            message:
              error instanceof Error ? error.message : typeof error === 'string' ? error : null,
          },
        }

        const postToConnectionCommand = new PostToConnectionCommand({
          ConnectionId: connectionId,
          Data: JSON.stringify(message),
        })
        await client.send(postToConnectionCommand)
        logger.info(`Sent message to WS connection ${connectionId}`, { message })
      }

      const deleteConnectionCommand = new DeleteConnectionCommand({
        ConnectionId: connectionId,
      })
      await client.send(deleteConnectionCommand)
      logger.info(`Deleted WS connection ${connectionId}`)
    }
  } catch (error) {
    logger.error('Error in handler', { error })
  }
}
