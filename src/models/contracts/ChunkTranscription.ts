import { Dayjs } from 'dayjs'

export interface IChunkTranscriptionContentSection {
  start?: number
  end?: number
  text: string
  speaker?: string
}

export interface IChunkTranscriptionContent {
  duration?: number
  segments: IChunkTranscriptionContentSection[]
}

export interface IChunkTranscription {
  id: string
  userId: string
  conversationId: string
  contentSections: IChunkTranscriptionContent
  isLastChunk: boolean
  createdAt: Dayjs
  updatedAt?: Dayjs
}

export interface ICreateChunkTranscription
  extends Omit<IChunkTranscription, 'createdAt' | 'updatedAt'> {
  createdAt: string
  updatedAt?: string
}

export interface IChunkTranscriptionKeys extends ICreateChunkTranscription {
  chunkId: string
  transcription: undefined
}
