import { IChunkTranscriptionSection } from '../../models/contracts/ChunkTranscription'

export interface ITranscribeParams {
  fileByteArray: Uint8Array
  fileName: string
}
export type TTranscribeResponse = Promise<IChunkTranscriptionSection[]>

export interface IAIProvider {
  transcribe({ fileByteArray, fileName }: ITranscribeParams): TTranscribeResponse
}
