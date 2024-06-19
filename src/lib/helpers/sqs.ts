import { logger } from '../../common/powertools/logger'
import { SQSClient, SendMessageCommand, SendMessageCommandInput } from '@aws-sdk/client-sqs'

export const sendMessageToQueue = ({
  sqs,
  messageBody,
  delay,
}: {
  sqs: {
    client: SQSClient
    queueUrl: string
  }
  messageBody: Record<string, unknown>
  delay: number
}) => {
  const params: SendMessageCommandInput = {
    MessageBody: JSON.stringify(messageBody),
    QueueUrl: sqs.queueUrl,
    DelaySeconds: delay,
  }

  const command = new SendMessageCommand(params)
  return sqs.client.send(command)
}

export const sendMessageBatchToQueue = async ({
  queueUrl,
  messages,
  delayIncrements,
}: {
  queueUrl: string
  messages: Record<string, unknown>[]
  delayIncrements?: {
    batchSize: number
    delay: number
  }[]
}) => {
  const sqsClient = new SQSClient()

  let index = 0
  let delayToSendMessage = 0
  let currentMessage: Record<string, unknown> | null = null
  try {
    logger.info('Using delay increments', { delayIncrements })
    for (const message of messages) {
      currentMessage = message
      delayIncrements?.forEach(({ batchSize, delay }) => {
        // If is last message from batch, apply increment to delay
        if (index !== 0 && index % batchSize === 0) delayToSendMessage += delay
      })

      await sendMessageToQueue({
        sqs: {
          client: sqsClient,
          queueUrl,
        },
        messageBody: message,
        delay: delayToSendMessage,
      })

      logger.debug(
        `Sent message #${index + 1} (of ${
          messages.length
        }) to queue, will be delivered in ${delayToSendMessage}s`,
      )

      index++
    }
  } catch (error) {
    logger.error(
      `Error sending message #${index + 1} (of ${messages.length}) to queue, ending loop...`,
      { error, message: currentMessage },
    )
    throw error
  }
  logger.info(`Successfully sent ${index} messages to queue`)
}
