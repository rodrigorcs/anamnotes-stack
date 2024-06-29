import { Dayjs } from 'dayjs'

export interface IChunkTranscriptionSection {
  start?: number
  end?: number
  text: string
  speaker?: string
}

export interface IChunkTranscription {
  id: string
  userId: string
  conversationId: string
  contentSections: IChunkTranscriptionSection[]
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
  transcription: string
}
