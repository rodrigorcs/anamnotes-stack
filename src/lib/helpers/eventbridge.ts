import {
  EventBridgeClient,
  PutEventsCommand,
  PutEventsCommandOutput,
} from '@aws-sdk/client-eventbridge'
import { EEventSources } from '../../models/events/utils'
import { logger } from '../../common/powertools/logger'

interface IEventPayload {
  detailType: string
  detail: Record<string, unknown>
}

export const sendEventToBus = async ({
  eventPayload,
  eventBusName,
}: {
  eventPayload: IEventPayload
  eventBusName: string
}): Promise<PutEventsCommandOutput> => {
  const eventBridgeClient = new EventBridgeClient()

  const event = {
    Detail: JSON.stringify(eventPayload.detail),
    DetailType: eventPayload.detailType,
    Source: EEventSources.BLAZE_PULSE,
    EventBusName: eventBusName,
  }

  logger.info('Sending event to EventBridge', { event })
  const command = new PutEventsCommand({
    Entries: [event],
  })

  const response = await eventBridgeClient.send(command)
  logger.info('Sent event to EventBridge', { response })

  return response
}
