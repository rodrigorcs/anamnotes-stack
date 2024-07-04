import { SchemaDefinition } from 'dynamoose/dist/Schema'

export type TSchemaDefinition<Entity> = {
  [Key in keyof Entity]: Key extends keyof SchemaDefinition ? SchemaDefinition[Key] : never
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const makeKeysNotRequired = <T>(obj: any): T => {
  if (Array.isArray(obj)) {
    return obj.map((item) => makeKeysNotRequired(item)) as T
  } else if (typeof obj === 'object' && obj !== null) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const newObj: any = {}
    for (const [key, value] of Object.entries(obj)) {
      if (key === 'required') {
        newObj[key] = false
      } else if (typeof value === 'object') {
        newObj[key] = makeKeysNotRequired(value)
      } else {
        newObj[key] = value
      }
    }
    return newObj
  }
  return obj
}
