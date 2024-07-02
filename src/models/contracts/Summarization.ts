import { Dayjs } from 'dayjs'

export interface IContentSection {
  slug: string
  content: string
}

export interface ISummarization {
  id: string
  userId: string
  conversationId: string
  content: IContentSection[]
  createdAt: Dayjs
  updatedAt?: Dayjs
}

export interface ICreateSummarization extends Omit<ISummarization, 'createdAt' | 'updatedAt'> {
  createdAt: string
  updatedAt?: string
}

export interface ISummarizationKeys extends ICreateSummarization {
  summarization: undefined
  summarizationId: string
}
