import { Schema } from 'dynamoose'
import { Item } from 'dynamoose/dist/Item'
import { webSocketConnectionSchemaDefinition } from './definition'
import { ICreateWebSocketConnection } from '../../contracts/WebSocketConnection'

export interface IWebSocketConnectionEntity extends ICreateWebSocketConnection {
  pk: string
  sk: string
}

export type TWebSocketConnectionSchema = IWebSocketConnectionEntity & Item

export const WebSocketConnectionSchema = new Schema(webSocketConnectionSchemaDefinition)
