import { SchemaDefinition } from 'dynamoose/dist/Schema'

export type TSchemaDefinition<Entity> = {
  [Key in keyof Entity]: Key extends keyof SchemaDefinition ? SchemaDefinition[Key] : never
}
