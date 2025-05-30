/**
 *
 * Reference: https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/sqs-message-metadata.html
 */

import { IParameterItem } from './interfaces'
import { AppStage } from './models/enums'

const createPathParameter = ({ name, dataType }: IParameterItem) => ({
  Name: name,
  Value: {
    StringValue: `$util.escapeJavaScript($input.params("${name}"))`,
    DataType: dataType,
  },
})

export const createRequestTemplate = (
  pathParams: IParameterItem[],
  queryParams?: IParameterItem[],
) => {
  const joiner = '&'

  const actionMessageBody = [
    { key: 'Action', value: 'SendMessage' },
    { key: 'MessageBody', value: '$util.urlEncode($input.body)' },
  ]
    .map((item) => `${item.key}=${item.value}`)
    .join(joiner)

  const messageAttributes = [...pathParams, ...(queryParams || [])]
    .map((param, index) => {
      const i = index + 1
      const pathParameter = createPathParameter(param)

      const arr = [
        { key: 'Name', value: pathParameter.Name },
        { key: 'Value.StringValue', value: pathParameter.Value.StringValue },
        { key: 'Value.DataType', value: pathParameter.Value.DataType },
      ]
        .map((item) => `MessageAttribute.${i}.${item.key}=${item.value}`)
        .join(joiner)

      return arr
    })
    .join(joiner)

  return [actionMessageBody, messageAttributes].join(joiner)
}

type TRemoteAppStage = AppStage.STAGING | AppStage.PRODUCTION

export const stageValue = <T>(stageObj: { [key in TRemoteAppStage]: T }): T => {
  const stage = process.env.STAGE as TRemoteAppStage
  if (!stage) throw new Error(`No stage found in the environment variables`)

  const stageValue = stageObj[stage]

  return stageValue
}
