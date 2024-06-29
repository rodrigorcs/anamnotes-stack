import { Dayjs } from 'dayjs'

export interface IConversation {
  id: string
  userId: string
  createdAt: Dayjs
  updatedAt?: Dayjs
}

export interface ICreateConversation extends Omit<IConversation, 'createdAt' | 'updatedAt'> {
  createdAt: string
  updatedAt?: string
}

export interface IConversationKeys extends ICreateConversation {
  conversationId: string
  conversation: undefined
}
