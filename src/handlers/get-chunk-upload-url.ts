import { logger } from '../common/powertools/logger'
import { errorResponse, successResponse } from '../lib/helpers/responses'
import { middyWrapper } from '../common/middy'
import {
  APIGatewayProxyWithCognitoAuthorizerEvent,
  APIGatewayProxyWithCognitoAuthorizerHandler,
} from 'aws-lambda'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3'
import { getUserIdFromEvent } from '../lib/helpers/cognito'

export const handler: APIGatewayProxyWithCognitoAuthorizerHandler =
  middyWrapper<APIGatewayProxyWithCognitoAuthorizerEvent>(async (event) => {
    try {
      const userId = getUserIdFromEvent(event)
      const { BUCKET_NAME } = process.env as Record<string, string>

      const { conversationId, chunkId } = event.pathParameters as Record<string, string>
      const { isLastChunk: isLastChunkStr } = event.queryStringParameters as Record<string, string>
      const isLastChunk = isLastChunkStr === 'true'

      const client = new S3Client()
      const command = new PutObjectCommand({
        Bucket: BUCKET_NAME,
        Key: `userId=${userId}/conversationId=${conversationId}/chunkId=${chunkId}-isLastChunk=${isLastChunk}.webm`,
      })
      const signedUrl = await getSignedUrl(client, command, { expiresIn: 3600 })

      return successResponse({ signedUrl })
    } catch (error: unknown) {
      logger.error(JSON.stringify(error))
      return errorResponse(400, error as Error)
    }
  })
