import { model } from 'dynamoose'
import { queryExecutionSchemaDefinition } from './definition'
import { TQueryExecutionSchema } from './schema'

export const QueryExecutionDBModel = model<TQueryExecutionSchema>(
  `${process.env.TABLE_NAME}`,
  queryExecutionSchemaDefinition,
  {
    create: false,
    waitForActive: { enabled: false },
  },
)
