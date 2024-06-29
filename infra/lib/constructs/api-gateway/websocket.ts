import {
  Arn,
  aws_apigatewayv2 as apigw,
  aws_apigatewayv2_integrations as apigwIntegrations,
  aws_lambda as lambda,
  aws_certificatemanager as acm,
} from 'aws-cdk-lib'
import { Construct } from 'constructs'
import { config } from '../../../config'
import { CNameRecord } from '../route53'

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
    connect?: lambda.Function
    disconnect?: lambda.Function
  }
}

export class APIGatewayWebSocket {
  public readonly webSocketAPI: apigw.WebSocketApi

  constructor(scope: Construct, props: IAPIGatewayWebSocketProps) {
    const apiName = `${config.projectName}${props.name ? `-${props.name}-` : '-'}websocket-api`
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
    const stage = new apigw.WebSocketStage(scope, `${apiName}-${stageName}-stage`, {
      webSocketApi: this.webSocketAPI,
      stageName,
      autoDeploy: true,
    })

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

      new CNameRecord(scope, {
        domainName: customDomain.name,
        recordName: props.gatewayDomain.subdomainName,
        hostedZoneId: props.gatewayDomain.hostedZoneId,
        hostedZoneName: props.gatewayDomain.domainName,
      })
    }
  }
}
