import { model } from 'dynamoose'
import { TWebSocketConnectionSchema } from './schema'
import { webSocketConnectionSchemaDefinition } from './definition'

export const WebSocketConnectionDBModel = model<TWebSocketConnectionSchema>(
  `${process.env.TABLE_NAME}`,
  webSocketConnectionSchemaDefinition,
  {
    create: false,
    waitForActive: { enabled: false },
  },
)
