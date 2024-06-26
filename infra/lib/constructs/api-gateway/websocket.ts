import {
  aws_apigatewayv2 as apigw,
  aws_apigatewayv2_integrations as apigwIntegrations,
  aws_lambda as lambda,
} from 'aws-cdk-lib'
import { Construct } from 'constructs'
import { config } from '../../../config'

interface IAPIGatewayWebSocketProps {
  name?: string
  handlers?: {
    connect?: lambda.Function
    disconnect?: lambda.Function
  }
}

export class APIGatewayWebSocket {
  public readonly webSocketAPI: apigw.WebSocketApi

  constructor(scope: Construct, props: IAPIGatewayWebSocketProps) {
    const apiName = `${config.projectName}-${props.name ?? ''}-websocket-api`
    this.webSocketAPI = new apigw.WebSocketApi(scope, apiName, {
      apiName,
      ...(props?.handlers?.connect && {
        connectRouteOptions: {
          integration: new apigwIntegrations.WebSocketLambdaIntegration(
            `${apiName}-connect-fn-integration`,
            props.handlers.connect,
          ),
        },
      }),
      ...(props?.handlers?.disconnect && {
        disconnectRouteOptions: {
          integration: new apigwIntegrations.WebSocketLambdaIntegration(
            `${apiName}-disconnect-fn-integration`,
            props.handlers.disconnect,
          ),
        },
      }),
    })

    const stageName = 'prod'
    new apigw.WebSocketStage(scope, `${apiName}-${stageName}-stage`, {
      webSocketApi: this.webSocketAPI,
      stageName,
      autoDeploy: true,
    })
  }
}
