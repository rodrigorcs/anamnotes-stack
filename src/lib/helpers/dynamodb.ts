import { DynamoDB, DynamoDBClientConfig } from '@aws-sdk/client-dynamodb'
import { aws } from 'dynamoose'

export const createDBKey = <IContract>(
  keyObjects: { [K in keyof IContract]?: string | number }[],
): string => {
  return keyObjects
    .map((keyObject) =>
      Object.entries(keyObject).map(([key, value]) => `${key}${value ? `#${value}` : ''}`),
    )
    .join('#')
}

export const configureCrossAccountDynamoDBClient = (clientConfig: DynamoDBClientConfig) => {
  const dynamoDBClient = new DynamoDB(clientConfig)

  aws.ddb.set(dynamoDBClient)
}
