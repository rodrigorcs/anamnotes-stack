import { Schema } from 'dynamoose'
import { Item } from 'dynamoose/dist/Item'
import { chunkTranscriptionSchemaDefinition } from './definition'
import { ICreateChunkTranscription } from '../../contracts/ChunkTranscription'

export interface IChunkTranscriptionEntity extends ICreateChunkTranscription {
  pk: string
  sk: string
}

export type TChunkTranscriptionSchema = IChunkTranscriptionEntity & Item

export const ChunkTranscriptionSchema = new Schema(chunkTranscriptionSchemaDefinition)
