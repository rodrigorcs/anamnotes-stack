import {
  Arn,
  aws_apigatewayv2 as apigw,
  aws_apigatewayv2_integrations as apigwIntegrations,
  aws_apigatewayv2_authorizers as apigwAuthorizers,
  aws_lambda as lambda,
  aws_certificatemanager as acm,
} from 'aws-cdk-lib'
import { Construct } from 'constructs'
import { config } from '../../../config'

interface IGatewayDomainProps {
  subdomainName: string
  domainName: string
  certificateId: string
  hostedZoneId: string
}

interface IAPIGatewayWebSocketProps {
  name?: string
  gatewayDomain?: IGatewayDomainProps
  handlers?: {
    authorizer?: lambda.Function
    connect?: lambda.Function
    disconnect?: lambda.Function
  }
}

export class APIGatewayWebSocket {
  private authorizer?: apigwAuthorizers.WebSocketLambdaAuthorizer
  public readonly webSocketAPI: apigw.WebSocketApi
  public readonly httpsURL: string

  constructor(scope: Construct, props: IAPIGatewayWebSocketProps) {
    const apiName = `${config.projectName}${props.name ? `-${props.name}-` : '-'}websocket-api`

    if (props.handlers?.authorizer) {
      const authorizerName = `${apiName}-authorizer`
      this.authorizer = new apigwAuthorizers.WebSocketLambdaAuthorizer(
        authorizerName,
        props.handlers?.authorizer,
        {
          identitySource: ['route.request.querystring.idToken'],
          authorizerName,
        },
      )
    }

    this.webSocketAPI = new apigw.WebSocketApi(scope, apiName, {
      apiName,
      ...(props?.handlers?.connect && {
        connectRouteOptions: {
          authorizer: this.authorizer,
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
    const stage = new apigw.WebSocketStage(scope, `${apiName}-${stageName}-stage`, {
      webSocketApi: this.webSocketAPI,
      stageName,
      autoDeploy: true,
    })

    this.httpsURL = stage.url.replace('wss', 'https')

    if (props.gatewayDomain) {
      const certificateARN = Arn.format({
        service: 'acm',
        resource: 'certificate',
        resourceName: props.gatewayDomain.certificateId,
        account: config.stack.env.account,
        region: config.stack.env.region,
        partition: 'aws',
      })

      const customDomainName = `${props.gatewayDomain.subdomainName}.${props.gatewayDomain.domainName}`
      const customDomain = new apigw.DomainName(
        scope,
        `${config.projectName}-${customDomainName.replace('.', '-')}`,
        {
          domainName: customDomainName,
          certificate: acm.Certificate.fromCertificateArn(
            scope,
            `${config.projectName}-${props.gatewayDomain.subdomainName}-${props.gatewayDomain.certificateId.toLowerCase()}-certificate`,
            certificateARN,
          ),
          endpointType: apigw.EndpointType.REGIONAL,
        },
      )

      new apigw.ApiMapping(
        scope,
        `${config.projectName}-${customDomainName.replace('.', '-')}-mapping`,
        {
          domainName: customDomain,
          api: this.webSocketAPI,
          stage,
        },
      )

      // In Console, manually create a CNAME record pointing to the WS API
    }
  }
}
