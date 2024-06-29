import { APIGatewayProxyWebsocketEventV2 as DefaultEvent, Handler } from 'aws-lambda'

export interface APIGatewayProxyWebsocketEventV2 extends DefaultEvent {
  queryStringParameters?: Record<string, string>
  multiValueQueryStringParameters?: Record<string, string[]>
}

export type APIGatewayProxyWebsocketHandlerV2 = Handler<APIGatewayProxyWebsocketEventV2, void>
