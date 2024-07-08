import { model } from 'dynamoose'
import { TConversationSchema } from './schema'
import { conversationSchemaDefinition } from './definition'

export const ConversationDBModel = model<TConversationSchema>(
  `${process.env.TABLE_NAME}`,
  conversationSchemaDefinition,
  {
    create: false,
    waitForActive: { enabled: false },
  },
)
