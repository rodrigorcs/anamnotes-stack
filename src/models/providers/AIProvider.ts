import { IChunkTranscriptionSection } from '../../models/contracts/ChunkTranscription'

export interface ITranscribeParams {
  fileByteArray: Uint8Array
  fileName: string
}
export type TTranscribeResponse = Promise<IChunkTranscriptionSection[]>

export interface ISummarizeParams {
  contentSections: IChunkTranscriptionSection[]
}
interface ISummarizeSection {
  slug: string
  content: string
}
export type TSummarizeResponse = Promise<ISummarizeSection[]>

export interface IAIProvider {
  transcribe({ fileByteArray, fileName }: ITranscribeParams): TTranscribeResponse
  summarize({ contentSections }: ISummarizeParams): TSummarizeResponse
}
