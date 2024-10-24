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
    type: Object,
    required: true,
    schema: {
      duration: {
        type: Number,
        required: false,
      },
      segments: {
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
              confidence: {
                type: Number,
                required: false,
              },
              hasSpeech: {
                type: Boolean,
                required: false,
              },
            },
          },
        ],
      },
    },
  },
  userId: {
    type: String,
    required: true,
  },
  conversationId: {
    type: String,
    required: true,
  },
  channelSlug: {
    type: String,
    required: true,
  },
  isLastChunk: {
    type: Boolean,
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
