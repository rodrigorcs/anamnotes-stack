import { TSchemaDefinition } from '../utils'
import { IWebSocketConnectionEntity } from './schema'

export const webSocketConnectionSchemaDefinition: TSchemaDefinition<IWebSocketConnectionEntity> = {
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
  userId: {
    type: String,
    required: true,
  },
  summarizationId: {
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
