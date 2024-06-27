import { Dayjs } from 'dayjs'

export interface IWebSocketConnection {
  id: string
  userId: string
  summarizationId: string
  createdAt: Dayjs
  updatedAt?: Dayjs
}

export interface ICreateWebSocketConnection
  extends Omit<IWebSocketConnection, 'createdAt' | 'updatedAt'> {
  createdAt: string
  updatedAt?: string
}

export interface IWebSocketConnectionKeys extends ICreateWebSocketConnection {
  wsConnectionId: string
}
