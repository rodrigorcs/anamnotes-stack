import { Schema } from 'dynamoose'
import { Item } from 'dynamoose/dist/Item'
import { ICreateQueryExecution } from '../../contracts/QueryExecution'
import { queryExecutionSchemaDefinition } from './definition'

export interface IQueryExecutionEntity extends ICreateQueryExecution {
  pk: string
  sk: string
}

export type TQueryExecutionSchema = IQueryExecutionEntity & Item

export const QueryExecutionSchema = new Schema(queryExecutionSchemaDefinition)
