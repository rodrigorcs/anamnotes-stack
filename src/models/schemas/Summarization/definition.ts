import { TSchemaDefinition } from '../utils'
import { ISummarizationEntity } from './schema'

export const summarizationSchemaDefinition: TSchemaDefinition<ISummarizationEntity> = {
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
  conversationId: {
    type: String,
    required: true,
  },
  content: {
    type: Array,
    required: true,
    schema: [
      {
        type: Object,
        schema: {
          slug: {
            type: String,
            required: true,
          },
          content: {
            type: String,
            required: true,
          },
        },
      },
    ],
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
