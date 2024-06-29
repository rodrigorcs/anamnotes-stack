import { Schema } from 'dynamoose'
import { Item } from 'dynamoose/dist/Item'
import { conversationSchemaDefinition } from './definition'
import { ICreateConversation } from '../../contracts/Conversation'

export interface IConversationEntity extends ICreateConversation {
  pk: string
  sk: string
}

export type TConversationSchema = IConversationEntity & Item

export const ConversationSchema = new Schema(conversationSchemaDefinition)
