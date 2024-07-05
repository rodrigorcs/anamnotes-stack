import { Dayjs } from 'dayjs'
import { ISummarization } from './Summarization'

interface IClient {
  id: string
  name: string
}

export interface IConversation {
  id: string
  userId: string
  client: IClient
  createdAt: Dayjs
  updatedAt?: Dayjs
}

export interface IConversationWithSummarizations extends IConversation {
  summarizations: Pick<ISummarization, 'id' | 'content' | 'createdAt' | 'updatedAt'>[]
}

export interface ICreateConversation extends Omit<IConversation, 'createdAt' | 'updatedAt'> {
  createdAt: string
  updatedAt?: string
}

export interface IConversationKeys extends ICreateConversation {
  conversationId: string
  conversation: undefined
}
