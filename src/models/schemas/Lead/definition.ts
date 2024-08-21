import { TSchemaDefinition } from '../utils'
import { ILeadEntity } from './schema'

export const SchemaDefinition: TSchemaDefinition<ILeadEntity> = {
  pk: {
    type: String,
    hashKey: true,
  },
  sk: {
    type: String,
    rangeKey: true,
  },
  id: {
    type: String,
    required: true,
  },
  emailAddress: {
    type: String,
    required: true,
  },
  source: {
    type: String,
    required: true,
  },
  createdAt: {
    type: String,
    required: true,
  },
  updatedAt: {
    type: String,
    required: false,
  },
}
