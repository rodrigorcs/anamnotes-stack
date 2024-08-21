import { Schema } from 'dynamoose'
import { Item } from 'dynamoose/dist/Item'
import { SchemaDefinition } from './definition'
import { ICreateLead } from '../../contracts/Lead'

export interface ILeadEntity extends ICreateLead {
  pk: string
  sk: string
}

export type TLeadSchema = ILeadEntity & Item

export const LeadSchema = new Schema(SchemaDefinition)
