import { SchemaDefinition } from 'dynamoose/dist/Schema'

export type TSchemaDefinition<Entity> = {
  [Key in keyof Entity]: Key extends keyof SchemaDefinition ? SchemaDefinition[Key] : never
}

export const makeKeysNotRequired = <T>(obj: T): T => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const result: any = { ...obj }

  if (result.required) {
    result.required = false
  }

  if (result.schema) {
    if (Array.isArray(result.schema)) {
      result.schema = result.schema.map((item: T) => makeKeysNotRequired(item as T))
    } else {
      result.schema = makeKeysNotRequired(result.schema as T)
    }
  }

  return result as T
}
