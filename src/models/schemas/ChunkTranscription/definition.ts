import { TSchemaDefinition } from '../utils'
import { IChunkTranscriptionEntity } from './schema'

export const chunkTranscriptionSchemaDefinition: TSchemaDefinition<IChunkTranscriptionEntity> = {
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
  contentSections: {
    type: Array,
    required: true,
    schema: [
      {
        type: Object,
        schema: {
          start: {
            type: Number,
            required: false,
          },
          end: {
            type: Number,
            required: false,
          },
          text: {
            type: String,
            required: true,
          },
          speaker: {
            type: String,
            required: false,
          },
        },
      },
    ],
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
