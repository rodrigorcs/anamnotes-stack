import { IncomingWebhookSendArguments } from '@slack/webhook'
import { ILog } from '../../common/powertools/logger'
import { serializeError } from 'serialize-error'
import { LogItemExtraInput } from '@aws-lambda-powertools/logger/lib/types'

const formatInput = (input: LogItemExtraInput) => {
  const inputObjects = input.map((input) => serializeError(input)) // If not an error, it will pass through and return the original input
  return inputObjects ? JSON.stringify(inputObjects) : undefined
}

const createCodeBlock = (text: string) => {
  return `\`\`\`${text}\`\`\`` // Output: ```text``` (in Slack, this will be a code block)
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const createHyperlink = (text: string, url: string) => {
  return `<${url}|${text}>` // Output: <url|text> (in Slack, this will be a hyperlink)
}

const { AWS_REGION: REGION, AWS_LAMBDA_FUNCTION_NAME: LAMBDA_NAME, TABLE_NAME } = process.env
const cloudwatchLogsUrl = `https://${REGION}.console.aws.amazon.com/cloudwatch/home?region=${REGION}#logsV2:log-groups/log-group/$252Faws$252Flambda$252F${LAMBDA_NAME}`
const dynamodbTableUrl = TABLE_NAME
  ? `https://${REGION}.console.aws.amazon.com/dynamodbv2/home?region=${REGION}#item-explorer?operation=QUERY&table=${TABLE_NAME}`
  : undefined

export const buildSlackAlert = (message: string, logs: ILog[]): IncomingWebhookSendArguments => {
  return {
    blocks: [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `:warning: *Error captured in ${process.env.STAGE} environment* :warning:`,
        },
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `${message}.`,
        },
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `Issue happened on \`${LAMBDA_NAME}\`. Please check the logs for details.`,
        },
      },
      {
        type: 'divider',
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: '*Logs from execution* :scroll:',
        },
      },
      ...logs.flatMap((log) => {
        const { message, level, extraInput } = log
        const formattedInput = formatInput(extraInput)

        return [
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `\`[${level}]\` ${message}`,
            },
          },
          ...(formattedInput
            ? [
                {
                  type: 'section',
                  text: {
                    type: 'mrkdwn',
                    text: createCodeBlock(formattedInput),
                  },
                },
              ]
            : []),
        ]
      }),
      {
        type: 'divider',
      },
      {
        type: 'actions',
        elements: [
          {
            type: 'button',
            text: {
              type: 'plain_text',
              text: 'Go to Cloudwatch Logs',
            },
            value: 'cloudwatch_logs',
            url: cloudwatchLogsUrl,
            action_id: 'go_to_cloudwatch',
          },
          ...(dynamodbTableUrl
            ? [
                {
                  type: 'button' as const,
                  text: {
                    type: 'plain_text' as const,
                    text: 'Go to DynamoDB Table',
                  },
                  value: 'dynamodb_table',
                  url: dynamodbTableUrl,
                  action_id: 'go_to_dynamodb_table',
                },
              ]
            : []),
        ],
      },
    ],
  }
}

export const fallbackSlackAlert: IncomingWebhookSendArguments = {
  blocks: [
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `:warning: *Error captured in ${process.env.STAGE} environment* :warning:`,
      },
    },
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `Issue happened on \`${LAMBDA_NAME}\`. Please check the logs for details.`,
      },
    },
    {
      type: 'divider',
    },
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: ':sadpepe: There was an error while sending the logs to Slack. Please click on the buttons below to see detailed logs.',
      },
    },
    {
      type: 'actions',
      elements: [
        {
          type: 'button',
          text: {
            type: 'plain_text',
            text: 'Go to Cloudwatch Logs',
          },
          value: 'cloudwatch_logs',
          url: cloudwatchLogsUrl,
          action_id: 'go_to_cloudwatch',
        },
        ...(dynamodbTableUrl
          ? [
              {
                type: 'button' as const,
                text: {
                  type: 'plain_text' as const,
                  text: 'Go to DynamoDB Table',
                },
                value: 'dynamodb_table',
                url: dynamodbTableUrl,
                action_id: 'go_to_dynamodb_table',
              },
            ]
          : []),
      ],
    },
  ],
}
