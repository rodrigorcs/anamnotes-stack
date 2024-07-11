import { Construct } from 'constructs'
import {
  Duration,
  aws_lambda as lambda,
  aws_iam as iam,
  aws_sqs as sqs,
  aws_ec2 as ec2,
  aws_s3 as s3,
  aws_dynamodb as dynamodb,
  aws_lambda_event_sources as lambdaEventSources,
  aws_events as events,
  aws_events_targets as eventsTargets,
} from 'aws-cdk-lib'
import { AppStage, LambdaMetricActions } from '../../models/enums'
import { config } from '../../../config'
import { Metric, MetricOptions } from 'aws-cdk-lib/aws-cloudwatch'

interface ICronInput {
  name?: string
  expression: string
  event: Record<string, unknown>
}

interface ILambdaFunctionConstructProps {
  timeoutSecs: number
  memoryMB: number
  reservedConcurrentExecutions?: number
  provisionedConcurrentExecutions?: number
  sourceCodePath: string
  environment?: Record<string, string>
  deadLetterQueue?: sqs.IQueue
  layers?: lambda.ILayerVersion[]
  rolePermissions?: iam.PolicyStatementProps[]
  vpc?: ec2.Vpc | ec2.IVpc
  subnets?: ec2.ISubnet[]
  allowPublicSubnet?: boolean
  securityGroups?: ec2.ISecurityGroup[]
  eventSources?: {
    queueSource?: {
      queue: sqs.IQueue
      props?: lambdaEventSources.SqsEventSourceProps
    }
    s3Source?: {
      bucket: s3.Bucket
      props: lambdaEventSources.S3EventSourceProps
    }
    dynamodbSource?: {
      table: dynamodb.ITable
      props: lambdaEventSources.DynamoEventSourceProps
    }
  }[]
  cron?: ICronInput | ICronInput[]
}

interface ISharedFunctionLayerConstructProps {
  prefix: string
  assetPath: string
}

export class SharedFunctionLayer {
  public readonly layer: lambda.ILayerVersion

  constructor(scope: Construct, props: ISharedFunctionLayerConstructProps) {
    this.layer = new lambda.LayerVersion(scope, `${props.prefix}-shared-function-layer`, {
      code: lambda.Code.fromAsset(props.assetPath),
      compatibleRuntimes: [lambda.Runtime.NODEJS_18_X],
      description: 'Contains node module dependencies for lambda functions',
    })
  }
}

export class LambdaFunction {
  public readonly lambdaFn: lambda.Function
  public readonly lambdaFnAlias: lambda.Alias
  public readonly asTarget: eventsTargets.LambdaFunction

  constructor(scope: Construct, props: ILambdaFunctionConstructProps) {
    const fileName = props.sourceCodePath.split('/').pop()
    const lambdaName = `${config.projectName}-${fileName}`
    const role = new iam.Role(scope, `${lambdaName}-role`, {
      roleName: `${lambdaName}-role`,
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
    })

    role.addManagedPolicy(
      iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaBasicExecutionRole'),
    )
    role.addManagedPolicy(iam.ManagedPolicy.fromAwsManagedPolicyName('AWSXrayWriteOnlyAccess'))

    if (props.vpc) {
      role.addManagedPolicy(
        iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaVPCAccessExecutionRole'),
      )
    }

    for (const permission of props.rolePermissions || [])
      role.addToPolicy(new iam.PolicyStatement(permission))

    this.lambdaFn = new lambda.Function(scope, `${lambdaName}-fn`, {
      functionName: lambdaName,
      code: lambda.Code.fromAsset(props.sourceCodePath),
      handler: 'index.handler',
      runtime: lambda.Runtime.NODEJS_18_X,
      timeout: Duration.seconds(props.timeoutSecs),
      layers: props.layers,
      memorySize: props.memoryMB,
      // reservedConcurrentExecutions: props.reservedConcurrentExecutions,
      tracing: lambda.Tracing.ACTIVE,
      role,
      vpc: props.vpc,
      environment: props.environment,
      deadLetterQueue: props.deadLetterQueue,
      description: `Deployed on ${new Date().toISOString()}`,
      vpcSubnets: props.vpc
        ? {
            subnets: props.subnets,
          }
        : undefined,
      allowPublicSubnet: props.allowPublicSubnet,
      securityGroups: props.securityGroups,
    })

    if (props.rolePermissions) {
      for (const permission of props.rolePermissions || [])
        this.lambdaFn.role?.addToPrincipalPolicy(new iam.PolicyStatement(permission))
    }

    this.lambdaFnAlias = new lambda.Alias(scope, `${lambdaName}-current-alias`, {
      aliasName: 'Current',
      version: this.lambdaFn.currentVersion,
      provisionedConcurrentExecutions: props.provisionedConcurrentExecutions,
    })

    for (const eventSource of props.eventSources || []) {
      if (eventSource.queueSource) {
        const sqsEventSource = new lambdaEventSources.SqsEventSource(
          eventSource.queueSource.queue,
          eventSource.queueSource.props,
        )
        this.sourceLambda.addEventSource(sqsEventSource)
      }
      if (eventSource.s3Source) {
        const s3EventSource = new lambdaEventSources.S3EventSourceV2(
          eventSource.s3Source.bucket,
          eventSource.s3Source.props,
        )
        this.sourceLambda.addEventSource(s3EventSource)
      }
      if (eventSource.dynamodbSource) {
        const dynamoEventSource = new lambdaEventSources.DynamoEventSource(
          eventSource.dynamodbSource.table,
          eventSource.dynamodbSource.props,
        )
        this.sourceLambda.addEventSource(dynamoEventSource)
      }
    }

    if (props.cron) {
      const cronArray = Array.isArray(props.cron) ? props.cron : [props.cron]
      cronArray.forEach((cron, index) => {
        const cronName = cron.name ?? (cronArray.length > 1 ? index + 1 : undefined)
        const ruleName = `${lambdaName}-${cronName ? `${cronName}-` : ''}cron`
        const cronRule = new events.Rule(scope, ruleName, {
          schedule: events.Schedule.expression(`cron(${cron.expression})`),
          ruleName,
        })

        cronRule.addTarget(
          new eventsTargets.LambdaFunction(this.lambdaFn, {
            event: events.RuleTargetInput.fromObject(cron.event),
          }),
        )
      })
    }

    this.asTarget = new eventsTargets.LambdaFunction(this.lambdaFn)
  }

  get sourceLambda() {
    // Lmabda alias doesn't work in the local environment
    return config.validatedEnvs.STAGE === AppStage.LOCAL ? this.lambdaFn : this.lambdaFnAlias
  }

  getCustomMetricName = (action: LambdaMetricActions) =>
    `fn:${this.lambdaFn.functionName}.${action}`

  getMetric = (metricName: string, options?: MetricOptions) => {
    this.lambdaFn.metric(metricName, options)
  }
}

type TFunctionMap<T> = {
  [key in keyof Props<T>['functionProps']]: LambdaFunction
}

export enum ELambdaGroupTypes {
  WEBSOCKET = 'websocket',
  FILE = 'file',
  AI = 'ai',
  CONVERSATION = 'conversation',
}

interface Props<T> {
  type: ELambdaGroupTypes
  sharedEnvs?: Record<string, string>
  functionProps: {
    [key in keyof T]: ILambdaFunctionConstructProps
  }
}

export class GroupedLambdaFunctions<T> {
  type: Props<T>['type']

  functionMap: TFunctionMap<T> = {} as TFunctionMap<T>

  constructor(scope: Construct, props: Props<T>) {
    this.type = props.type

    Object.entries(props.functionProps).forEach(([key, functionProp]) => {
      this.functionMap[key as keyof T] = new LambdaFunction(scope, {
        ...(functionProp as ILambdaFunctionConstructProps),
        environment: {
          ...(functionProp as ILambdaFunctionConstructProps).environment,
          ...props.sharedEnvs,
        },
      })
    })
  }

  getMetrics = (metricName: string, options?: MetricOptions) => {
    return Object.entries(this.functionMap).reduce((metricArray: Metric[], [key, fn]) => {
      const fnMetric = (fn as LambdaFunction).lambdaFn.metric(metricName, {
        ...options,
        label: key,
      })

      return [...metricArray, fnMetric]
    }, [])
  }

  get logGroupNames() {
    return Object.entries(this.functionMap).reduce((logGroupNames: string[], [, fn]) => {
      const functionName = (fn as LambdaFunction).lambdaFn.functionName

      const logGroupName = `/aws/lambda/${functionName}`

      return [...logGroupNames, logGroupName]
    }, [])
  }
}

export const StartingPosition = lambda.StartingPosition
export const FilterCriteria = lambda.FilterCriteria
export const FilterRule = lambda.FilterRule
