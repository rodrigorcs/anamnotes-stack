import { APIGatewayProxyWebsocketEventV2 as DefaultEvent, Handler } from 'aws-lambda'

export interface APIGatewayProxyWebsocketEventV2 extends DefaultEvent {
  queryStringParameters?: Record<string, string>
  multiValueQueryStringParameters?: Record<string, string[]>
}

export interface IAPIGatewayProxyWebsocketAuthorizedEventV2
  extends APIGatewayProxyWebsocketEventV2 {
  requestContext: APIGatewayProxyWebsocketEventV2['requestContext'] & {
    authorizer: {
      userId: string
    }
  }
}

export type APIGatewayProxyWebsocketHandlerV2 = Handler<APIGatewayProxyWebsocketEventV2, void>
export type TAPIGatewayProxyWebsocketAuthorizedHandlerV2 = Handler<
  IAPIGatewayProxyWebsocketAuthorizedEventV2,
  void
>
