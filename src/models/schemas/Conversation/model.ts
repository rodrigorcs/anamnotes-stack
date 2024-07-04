import { model } from 'dynamoose'
import { TConversationSchema } from './schema'
import { conversationSchemaDefinition } from './definition'
import { summarizationSchemaDefinition } from '../Summarization/definition'

export const ConversationDBModel = model<TConversationSchema>(
  `${process.env.TABLE_NAME}`,
  { ...conversationSchemaDefinition, ...summarizationSchemaDefinition },
  {
    create: false,
    waitForActive: { enabled: false },
  },
)
