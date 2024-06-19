import {
  Duration,
  RemovalPolicy,
  aws_apigateway as apigw,
  aws_sqs as sqs,
  aws_logs as logs,
  aws_certificatemanager as acm,
  aws_iam as iam,
  Aws,
} from 'aws-cdk-lib'
import { Construct } from 'constructs'
import { AppStage, HttpMethods } from '../enums'
import { LambdaFunction } from './lambda'
import { config } from '../../config'
import { IParameterItem } from '../interfaces'
import { createRequestTemplate } from '../helpers'
import { CommonMetricOptions, Metric } from 'aws-cdk-lib/aws-cloudwatch'

interface IIntegration {
  method: HttpMethods
  handler: LambdaFunction
  apigwMethodOptions: apigw.MethodOptions
  lambdaIntegrationOption?: apigw.LambdaIntegrationOptions
}

interface IRoute {
  resourcePath: string[]
  integrations: IIntegration[]
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
        })
      })

      route.integrations.forEach((integration) => {
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
    })
  }
}

interface APIGatewayRestApiProps {
  prefix: string
  identitySources: string[]
  gatewayDomain?: GatewayDomainProps
  handlers: {
    requestAuthorizer: LambdaFunction
  }
}

interface GatewayDomainProps {
  subdomainName: string
  domainName: string
  certificate: acm.ICertificate
}

export class APIGatewayRestApi {
  public readonly restApi: apigw.RestApi
  public readonly requestLambdaAuthorizer: apigw.RequestAuthorizer
  public readonly restApiId: string
  public readonly restApiRootResourceId: string

  constructor(scope: Construct, props: APIGatewayRestApiProps) {
    const accessLogGroup = new logs.LogGroup(scope, `${props.prefix}-access-log-group`, {
      logGroupName: `${props.prefix}-api-access-logs`,
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

    const requestLambdaAuthorizer = new apigw.RequestAuthorizer(
      scope,
      `${props.prefix}-auth-request-authorizer`,
      {
        identitySources: props.identitySources,
        handler: props.handlers.requestAuthorizer.sourceLambda,
        resultsCacheTtl: Duration.seconds(5),
      },
    )

    this.restApi = new apigw.RestApi(scope, `${props.prefix}-rest-api`, {
      restApiName: `${props.prefix}-rest-api`,
      description: 'Used for Authorizing requests to customers microservices',
      deploy: true,
      deployOptions: {
        stageName: 'prod',
        metricsEnabled: true,
        accessLogDestination: new apigw.LogGroupLogDestination(accessLogGroup),
        accessLogFormat: accessLogsCustomFormat,
        tracingEnabled: true,
      },
      defaultCorsPreflightOptions: {
        allowOrigins: apigw.Cors.ALL_ORIGINS,
        allowMethods: apigw.Cors.ALL_METHODS,
      },
    })

    requestLambdaAuthorizer._attachToApi(this.restApi)

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
    this.requestLambdaAuthorizer = requestLambdaAuthorizer

    const plan = this.restApi.addUsagePlan(`${props.prefix}-default-usage-plan`, {
      name: 'default-usage-plan',
      description: 'default usage plan for customers-service gateway',
    })

    plan.addApiStage({ stage: this.restApi.deploymentStage })
  }
}

interface Props {
  prefix: string
  baseResource: apigw.Resource
  integration: {
    queue: sqs.IQueue
    queueName: string
    method: HttpMethods
    resourcePaths: string[]
    integrationHttpMethod: HttpMethods
    pathParameters: IParameterItem[]
    queryParameters?: IParameterItem[]
  }
}

/**
 * References:
 * https://blog.pocketgalaxy.io/posts/2021-09-19-api-gateway-sqs-integration.html
 * https://sbstjn.com/blog/aws-cdk-api-gateway-service-integration-sqs/
 */
export class ApigwSqsLambda {
  constructor(scope: Construct, props: Props) {
    let resource = props.baseResource

    const credentialsRole = new iam.Role(
      scope,
      `${props.prefix}-customers-service-sqs-role-${props.integration.queueName}`,
      {
        assumedBy: new iam.ServicePrincipal('apigateway.amazonaws.com'),
      },
    )

    const inlinePolicy = new iam.Policy(
      scope,
      `${props.prefix}-customers-service-sqs-policy-${props.integration.queueName}`,
      {
        statements: [
          new iam.PolicyStatement({
            actions: ['sqs:SendMessage'],
            effect: iam.Effect.ALLOW,
            resources: [props.integration.queue.queueArn],
          }),
        ],
      },
    )

    credentialsRole.attachInlinePolicy(inlinePolicy)

    props.integration.resourcePaths.forEach((path) => {
      resource = resource.addResource(path)
    })

    const integration = new apigw.AwsIntegration({
      service: 'sqs',
      path: `${Aws.ACCOUNT_ID}/${props.integration.queue.queueName}`,
      integrationHttpMethod: props.integration.integrationHttpMethod,
      options: {
        credentialsRole,
        passthroughBehavior: apigw.PassthroughBehavior.NEVER,
        requestParameters: {
          'integration.request.header.Content-Type': `'application/x-www-form-urlencoded'`,
        },
        requestTemplates: {
          'application/json': createRequestTemplate(
            props.integration.pathParameters,
            props.integration.queryParameters,
          ),
        },
        integrationResponses: [
          {
            statusCode: '200',
            responseTemplates: {
              'application/json': `{ message: 'Success' }`,
            },
          },
        ],
      },
    })

    resource.addMethod(props.integration.method, integration, {
      methodResponses: [{ statusCode: '200' }],
    })
  }
}

interface IExistingAPIGatewayRestApiProps {
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
    const restApiResourceId = `${config.projectName}-rest-api`

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
    const deployment = new apigw.Deployment(scope, `${config.projectName}-deployment`, {
      api: restApi,
    })

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(deployment as any).resource.stageName = 'prod'
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
