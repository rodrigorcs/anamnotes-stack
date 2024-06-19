import {
  IncomingWebhook,
  IncomingWebhookSendArguments,
  IncomingWebhookResult,
} from '@slack/webhook'
import { fallbackSlackAlert } from '../lib/helpers/slack'
import { logger } from '../common/powertools/logger'

export class SlackAPI {
  private slackWebhook: IncomingWebhook

  constructor() {
    const { SLACK_ALERTS_ENDPOINT } = process.env as Record<string, string>
    this.slackWebhook = new IncomingWebhook(SLACK_ALERTS_ENDPOINT)
  }

  public async sendAlert(
    message: string | IncomingWebhookSendArguments,
  ): Promise<IncomingWebhookResult> {
    try {
      const response = await this.slackWebhook.send(message)
      return response
    } catch (error) {
      logger.warn('Failed to send Slack alert, trying to send fallback message instead...', {
        error,
      })
      const response = this.slackWebhook.send(fallbackSlackAlert)
      return response
    }
  }
}
