import { Schema } from 'dynamoose'
import { Item } from 'dynamoose/dist/Item'
import { summarizationSchemaDefinition } from './definition'
import { ICreateSummarization } from '../../contracts/Summarization'

export interface ISummarizationEntity extends ICreateSummarization {
  pk: string
  sk: string
}

export type TSummarizationSchema = ISummarizationEntity & Item

export const SummarizationSchema = new Schema(summarizationSchemaDefinition)
