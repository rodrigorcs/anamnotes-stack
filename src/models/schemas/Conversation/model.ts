import { model } from 'dynamoose'
import { TConversationSchema } from './schema'
import { conversationSchemaDefinition } from './definition'
import { summarizationSchemaDefinition } from '../Summarization/definition'
import { makeKeysNotRequired } from '../utils'

export const ConversationDBModel = model<TConversationSchema>(
  `${process.env.TABLE_NAME}`,
  { ...conversationSchemaDefinition, ...makeKeysNotRequired(summarizationSchemaDefinition) },
  {
    create: false,
    waitForActive: { enabled: false },
  },
)
