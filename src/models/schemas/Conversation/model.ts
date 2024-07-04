import { model } from 'dynamoose'
import { TConversationSchema } from './schema'
import { conversationSchemaDefinition } from './definition'
import { summarizationSchemaDefinition } from '../Summarization/definition'
import { TSchemaDefinition, makeKeysNotRequired } from '../utils'
import { ISummarizationEntity } from '../Summarization/schema'

export const ConversationDBModel = model<TConversationSchema>(
  `${process.env.TABLE_NAME}`,
  {
    ...makeKeysNotRequired<TSchemaDefinition<ISummarizationEntity>>(summarizationSchemaDefinition),
    ...conversationSchemaDefinition,
  },
  {
    create: false,
    waitForActive: { enabled: false },
  },
)
