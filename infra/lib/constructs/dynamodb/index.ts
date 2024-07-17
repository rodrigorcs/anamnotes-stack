import { Construct } from 'constructs'
import { aws_dynamodb as dynamodb } from 'aws-cdk-lib'
import { config } from '../../../config'

interface IDynamoDBTableProps {
  tableName?: string
  partitionKey: dynamodb.Attribute
  sortKey?: dynamodb.Attribute
  deletionProtection?: boolean
  globalSecondaryIndexes?: dynamodb.GlobalSecondaryIndexProps[]
  writeAccessPrincipalArn?: string
  streamType?: dynamodb.StreamViewType
  streamArn?: string
}

export const DynamoDBAttributeType = dynamodb.AttributeType
export const StreamViewType = dynamodb.StreamViewType

export class DynamoDBTable {
  public readonly table: dynamodb.Table | dynamodb.ITable

  constructor(scope: Construct, props: IDynamoDBTableProps) {
    const tableName = `${config.projectName}${props.tableName ? `-${props.tableName}` : ''}-table`
    const table = dynamodb.Table.fromTableAttributes(scope, tableName, {
      tableName,
      tableStreamArn: props.streamArn,
    })

    this.table = table

    if (!table) {
      const table = new dynamodb.Table(scope, `${tableName}-dynamodb-table`, {
        tableName,
        partitionKey: props.partitionKey,
        sortKey: props.sortKey,
        billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
        deletionProtection: props.deletionProtection,
        stream: props.streamType,
      })
      for (const gsi of props.globalSecondaryIndexes || []) {
        table.addGlobalSecondaryIndex(gsi)
      }
      this.table = table
    }
  }
}
