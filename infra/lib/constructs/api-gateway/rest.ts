import {
  Duration,
  RemovalPolicy,
  Arn,
  aws_apigateway as apigw,
  aws_logs as logs,
  aws_certificatemanager as acm,
  aws_iam as iam,
} from 'aws-cdk-lib'
import { Construct } from 'constructs'
import { AppStage, HttpMethods } from '../../models/enums'
import { LambdaFunction } from '../lambda'
import { config } from '../../../config'
import { CommonMetricOptions, Metric } from 'aws-cdk-lib/aws-cloudwatch'
import { CNameRecord } from '../route53'

interface ILambdaIntegration {
  method: HttpMethods
  handler: LambdaFunction
  apigwMethodOptions: apigw.MethodOptions
  lambdaIntegrationOption?: apigw.LambdaIntegrationOptions
}

interface IBucketIntegration {
  method: HttpMethods
  bucketName: string
  apigwMethodOptions: apigw.MethodOptions
  role: iam.Role
}

interface IRoute {
  resourcePath: string[]
  lambdaIntegrations?: ILambdaIntegration[]
  bucketIntegrations?: IBucketIntegration[]
}

interface INestedApiProps {
  baseResource: apigw.Resource
  requestAuthorizer?: apigw.IAuthorizer
  routes: IRoute[]
}

// This may need to be updated
export const defaultCorsPreflightOptions: apigw.CorsOptions = {
  allowOrigins: apigw.Cors.ALL_ORIGINS,
  allowMethods: apigw.Cors.ALL_METHODS,
}

export class NestedApiResources {
  public readonly restApi: apigw.IRestApi

  constructor(scope: Construct, props: INestedApiProps) {
    let resource = props.baseResource

    props.routes.forEach((route) => {
      route.resourcePath.forEach((path) => {
        resource = resource.addResource(path, {
          defaultCorsPreflightOptions,
          defaultMethodOptions: {
            apiKeyRequired: true, // TODO: Remove when adding cognito authorizer
          },
        })
      })

      route.lambdaIntegrations?.forEach((integration) => {
        const apigwMethodOptions = {
          ...integration.apigwMethodOptions,
          authorizationType: props.requestAuthorizer
            ? apigw.AuthorizationType.CUSTOM
            : apigw.AuthorizationType.NONE,
          authorizer: props.requestAuthorizer,
        }

        const handler = integration.handler.sourceLambda

        resource.addMethod(
          integration.method,
          new apigw.LambdaIntegration(handler, integration.lambdaIntegrationOption),
          apigwMethodOptions,
        )
      })

      route.bucketIntegrations?.forEach((integration) => {
        const apigwMethodOptions = {
          ...integration.apigwMethodOptions,
          authorizationType: props.requestAuthorizer
            ? apigw.AuthorizationType.CUSTOM
            : apigw.AuthorizationType.NONE,
          authorizer: props.requestAuthorizer,
        }

        resource.addMethod(
          integration.method,
          new apigw.AwsIntegration({
            service: 's3',
            integrationHttpMethod: integration.method,
            path: integration.bucketName,
            options: {
              credentialsRole: integration.role,
            },
          }),
          apigwMethodOptions,
        )
      })
    })
  }
}

interface GatewayDomainProps {
  subdomainName: string
  domainName: string
  certificateId: string
  hostedZoneId: string
  endpointType?: apigw.EndpointType
}

interface APIGatewayRestApiProps {
  identitySources: string[]
  gatewayDomain?: GatewayDomainProps
  handlers?: {
    requestAuthorizer?: LambdaFunction
  }
}

export class APIGatewayRestApi {
  public readonly restApi: apigw.RestApi
  public readonly requestLambdaAuthorizer: apigw.RequestAuthorizer
  public readonly restApiId: string
  public readonly restApiRootResourceId: string

  constructor(scope: Construct, props: APIGatewayRestApiProps) {
    const accessLogGroupName = `${config.projectName}-api-access-logs`
    const accessLogGroup = new logs.LogGroup(scope, accessLogGroupName, {
      logGroupName: accessLogGroupName,
      retention: logs.RetentionDays.SIX_MONTHS,
      removalPolicy: RemovalPolicy.DESTROY,
    })

    const accessLogsCustomFormat = apigw.AccessLogFormat.custom(
      JSON.stringify({
        requestId: apigw.AccessLogField.contextRequestId(),
        sourceIp: apigw.AccessLogField.contextIdentitySourceIp(),
        requestTime: apigw.AccessLogField.contextRequestTime(),
        httpProtocol: apigw.AccessLogField.contextProtocol(),
        httpMethod: apigw.AccessLogField.contextHttpMethod(),
        httpStatus: apigw.AccessLogField.contextStatus(),
        contextPath: apigw.AccessLogField.contextPath(),
        resourcePath: apigw.AccessLogField.contextResourcePath(),
        responseLength: apigw.AccessLogField.contextResponseLength(),
        apiKeyId: apigw.AccessLogField.contextIdentityApiKeyId(),
        apiKey: apigw.AccessLogField.contextIdentityApiKey(),
        integrationLatency: apigw.AccessLogField.contextIntegrationLatency(),
        integrationStatus: apigw.AccessLogField.contextIntegrationStatus(),
      }),
    )

    const restApiName = `${config.projectName}-rest-api`
    this.restApi = new apigw.RestApi(scope, restApiName, {
      restApiName,
      deploy: true,
      deployOptions: {
        stageName: 'prod',
        metricsEnabled: true,
        accessLogDestination: new apigw.LogGroupLogDestination(accessLogGroup),
        loggingLevel: apigw.MethodLoggingLevel.INFO,
        accessLogFormat: accessLogsCustomFormat,
        tracingEnabled: true,
      },
      defaultCorsPreflightOptions: {
        allowOrigins: apigw.Cors.ALL_ORIGINS,
        allowMethods: apigw.Cors.ALL_METHODS,
      },
      apiKeySourceType: apigw.ApiKeySourceType.HEADER,
    })

    if (props.handlers?.requestAuthorizer) {
      const requestLambdaAuthorizer = new apigw.RequestAuthorizer(
        scope,
        `${config.projectName}-auth-request-authorizer`,
        {
          identitySources: props.identitySources,
          handler: props.handlers.requestAuthorizer.sourceLambda,
          resultsCacheTtl: Duration.seconds(5),
        },
      )
      requestLambdaAuthorizer._attachToApi(this.restApi)
      this.requestLambdaAuthorizer = requestLambdaAuthorizer
    }

    if (props.gatewayDomain) {
      new CNameRecord(scope, {
        domainName: props.gatewayDomain.domainName,
        recordName: props.gatewayDomain.subdomainName,
        hostedZoneId: props.gatewayDomain.hostedZoneId,
        hostedZoneName: props.gatewayDomain.domainName,
      })

      const certificateARN = Arn.format({
        service: 'acm',
        resource: 'certificate',
        resourceName: props.gatewayDomain.certificateId,
      })

      const customDomainName = `${props.gatewayDomain.subdomainName}.${props.gatewayDomain.domainName}`
      const customDomain = new apigw.DomainName(
        scope,
        `${config.projectName}-${customDomainName.replace('.', '-')}`,
        {
          domainName: customDomainName,
          certificate: acm.Certificate.fromCertificateArn(
            scope,
            `${config.projectName}-${props.gatewayDomain.certificateId.toLowerCase()}`,
            certificateARN,
          ),
          endpointType: props.gatewayDomain.endpointType,
        },
      )

      new apigw.BasePathMapping(
        scope,
        `${config.projectName}-${customDomainName.replace('.', '-')}-mapping`,
        {
          domainName: customDomain,
          restApi: this.restApi,
        },
      )
    }

    this.restApi.addGatewayResponse('AccessDenied', {
      type: apigw.ResponseType.ACCESS_DENIED,
      statusCode: '403',
      responseHeaders: {
        'Access-Control-Allow-Origin': "'*'",
        'Access-Control-Allow-Methods': "'*'",
      },
      templates: {
        'application/json': `{
          "errors": $context.authorizer.errors,
        }`,
      },
    })

    this.restApiId = this.restApi.restApiId
    this.restApiRootResourceId = this.restApi.root.resourceId

    const plan = this.restApi.addUsagePlan(`${config.projectName}-default-usage-plan`, {
      name: 'default-usage-plan',
    })

    plan.addApiStage({ stage: this.restApi.deploymentStage })
  }
}

interface IExistingAPIGatewayRestApiProps {
  prefix: string
  serviceName: string
  restApiId: string
  rootResourceId: string
  requestAuthorizerId: string
  resources: string[]
}

export class ExistingAPIGatewayRestApiResource {
  public baseResource: apigw.Resource

  requestAuthorizer?: apigw.IAuthorizer

  constructor(scope: Construct, props: IExistingAPIGatewayRestApiProps) {
    const restApiResourceId = `${props.prefix}-${config.validatedEnvs.STAGE}-rest-api`

    const restApi =
      config.validatedEnvs.STAGE === AppStage.LOCAL
        ? new apigw.RestApi(scope, restApiResourceId)
        : apigw.RestApi.fromRestApiAttributes(scope, restApiResourceId, {
            restApiId: props.restApiId,
            rootResourceId: props.rootResourceId,
          })

    this.requestAuthorizer =
      config.validatedEnvs.STAGE === AppStage.LOCAL
        ? undefined
        : {
            authorizationType: apigw.AuthorizationType.CUSTOM,
            authorizerId: props.requestAuthorizerId,
          }

    let baseResource = restApi.root.addResource(props.serviceName)

    props.resources.forEach((resource) => {
      baseResource = baseResource.addResource(resource, {
        defaultCorsPreflightOptions,
      })
    })

    this.baseResource = baseResource

    // https://github.com/aws/aws-cdk/issues/13526#issuecomment-1011216177
    const deployment = new apigw.Deployment(
      scope,
      `${props.prefix}-${config.validatedEnvs.STAGE}-deployment`,
      {
        api: restApi,
      },
    )

    // @ts-expect-error deployment.resource is not available in contract
    deployment.resource.stageName = 'prod'
  }

  getMetric = (metricName: string, options?: CommonMetricOptions) => {
    let metric = new Metric({
      namespace: 'AWS/ApiGateway',
      metricName,
      dimensionsMap: {
        ApiName: 'BLAZE API',
      },
    })

    if (options) {
      metric = metric.with(options)
    }

    return metric
  }
}

export const IdentitySource = apigw.IdentitySource
export const EndpointType = apigw.EndpointType
