import { model } from 'dynamoose'
import { TSummarizationSchema } from './schema'
import { summarizationSchemaDefinition } from './definition'

export const SummarizationDBModel = model<TSummarizationSchema>(
  `${process.env.TABLE_NAME}`,
  summarizationSchemaDefinition,
  {
    create: false,
    waitForActive: { enabled: false },
  },
)
