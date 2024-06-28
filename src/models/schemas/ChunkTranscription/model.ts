import { model } from 'dynamoose'
import { TChunkTranscriptionSchema } from './schema'
import { chunkTranscriptionSchemaDefinition } from './definition'

export const ChunkTranscriptionDBModel = model<TChunkTranscriptionSchema>(
  `${process.env.TABLE_NAME}`,
  chunkTranscriptionSchemaDefinition,
  {
    create: false,
    waitForActive: { enabled: false },
  },
)
