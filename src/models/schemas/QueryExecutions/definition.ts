import { EPos } from '../../contracts/utils'
import { TSchemaDefinition } from '../utils'
import { IQueryExecutionEntity } from './schema'

export const queryExecutionSchemaDefinition: TSchemaDefinition<IQueryExecutionEntity> = {
  pk: {
    type: String,
    hashKey: true,
  },
  sk: {
    type: String,
    rangeKey: true,
  },
  date: {
    type: String,
    required: true,
  },
  merchantId: {
    type: String,
    required: true,
  },
  paymentsCount: {
    type: Number,
    required: false,
  },
  paymentsTotalSum: {
    type: Number,
    required: false,
  },
  pos: {
    type: String,
    enum: Object.values(EPos),
    required: true,
  },
  executedAt: {
    type: String,
    required: true,
  },
}
