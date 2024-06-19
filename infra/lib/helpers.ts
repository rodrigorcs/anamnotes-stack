/**
 *
 * Reference: https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/sqs-message-metadata.html
 */

import { IParameterItem } from './interfaces'

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

export type ValidStageNames = 'production' | 'staging' | 'sandbox'

/**
 * Returns the value for the specified stage from the given object, or the default value if the object is empty or the stage is not present in the object.
 *
 * @template T The type of the object properties and the default value
 * @param {Object} stageObj An object with properties of type T, keyed by stage name
 * @param {T} defaultValue The default value to return if the object is empty or the stage is not present in the object
 * @return {T} The value for the specified stage, or the default value
 */
export const stageValue = <T>(
  stageObj: { [key in ValidStageNames]?: T },
  defaultValue: T | undefined,
): T | undefined => {
  const stage = process.env.STAGE as ValidStageNames

  if (stage && stageObj[stage] !== undefined) return stageObj[stage]

  return defaultValue
}
