import { model } from 'dynamoose'
import { TLeadSchema } from './schema'
import { SchemaDefinition } from './definition'

export const LeadDBModel = model<TLeadSchema>(`${process.env.TABLE_NAME}`, SchemaDefinition, {
  create: false,
  waitForActive: { enabled: false },
})
