import { SlackAPI } from '../../apis/SlackAPI'
import { logger } from '../../common/powertools/logger'
import { buildSlackAlert } from './slack'

export const logAndReportError = async (message: string, error: unknown): Promise<void> => {
  const slackAPI = new SlackAPI()
  const errorMessage = (error as Error).message

  if (errorMessage?.length < 64) {
    logger.error(`${message}: \`${errorMessage}\``, { error })
  } else {
    logger.error(message, { error })
  }

  const logs = logger.getLogs()
  const slackAlert = buildSlackAlert(message, logs)
  await slackAPI.sendAlert(slackAlert)
}
