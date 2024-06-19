import {
  aws_events as events,
  aws_events_targets as targets,
  aws_sqs as sqs,
  aws_lambda as lambda,
  aws_pipes as pipes,
  aws_iam as iam,
  IResolvable,
} from 'aws-cdk-lib'
import { EventSources, EventTopics, EventTypes } from '../models/enums'
import { Construct } from 'constructs'
import { RuleProps } from 'aws-cdk-lib/aws-events'
import { CommonMetricOptions, Metric } from 'aws-cdk-lib/aws-cloudwatch'
import { config } from '../../config'

interface IExistingEventBusProps {
  eventBusName: string
  eventBusArn?: string
  eventRule?: {
    name: string
    targetQueue: sqs.IQueue
    detailType: string[]
    source: string
  }
  scheduledRule?: {
    name: string
    duration: number // minutes
    lambda: lambda.Function
  }
  eventSources?: {
    queueSource?: {
      pipeName: string
      queue: sqs.IQueue
      props?: IResolvable | pipes.CfnPipe.PipeTargetEventBridgeEventBusParametersProperty
    }
  }[]
}

export class ExistingEventBus {
  public readonly eventBus: events.IEventBus
  public readonly asTarget: targets.EventBus

  constructor(scope: Construct, props: IExistingEventBusProps) {
    this.eventBus = events.EventBus.fromEventBusName(
      scope,
      `${config.projectName}-${props.eventBusName}`,
      props.eventBusName,
    )

    if (props.eventSources) {
      for (const eventSource of props.eventSources) {
        if (eventSource.queueSource) {
          const { pipeName, queue, props: queueProps } = eventSource.queueSource
          const fullPipeName = `${config.projectName}-${pipeName}-pipe`
          const roleName = `${fullPipeName}-role`

          const allowToConsumeSQSMessageStatement = new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            actions: ['sqs:ReceiveMessage', 'sqs:DeleteMessage', 'sqs:GetQueueAttributes'],
            resources: [queue.queueArn],
          })

          const allowToPutEventsStatement = new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            actions: ['events:PutEvents'],
            resources: [this.eventBus.eventBusArn],
          })

          const allowToPutLogs = new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            actions: [
              'logs:CreateLogGroup',
              'logs:CreateLogStream',
              'logs:PutLogEvents',
              'logs:DescribeLogStreams',
            ],
            resources: ['arn:aws:logs:*:*:*'],
          })

          const pipeRole = new iam.Role(scope, roleName, {
            roleName,
            assumedBy: new iam.ServicePrincipal('pipes.amazonaws.com'),
          })

          pipeRole.addToPolicy(allowToConsumeSQSMessageStatement)
          pipeRole.addToPolicy(allowToPutEventsStatement)
          pipeRole.addToPolicy(allowToPutLogs)

          new pipes.CfnPipe(scope, fullPipeName, {
            name: fullPipeName,
            roleArn: pipeRole.roleArn,
            source: queue.queueArn,
            target: this.eventBus.eventBusArn,
            targetParameters: {
              eventBridgeEventBusParameters: {
                detailType: `${EventTopics.QUERY_EXECUTION}.${EventTypes.STARTED}`,
                source: EventSources.BLAZE_PULSE,
              },
              inputTemplate: `{
                "date": "<$.body.date>",
                "pos": "<$.body.pos>",
                "companyIds": <$.body.companyIds>
              }`,
              ...queueProps,
            },
            logConfiguration: {
              level: 'TRACE',
              includeExecutionData: ['ALL'],
              cloudwatchLogsLogDestination: {
                logGroupArn:
                  'arn:aws:logs:us-east-1:394147191967:log-group:/aws/vendedlogs/pipes/staging-blaze-pulse-initial-load-pipe:*',
              },
            },
          })
        }
      }
    }

    this.asTarget = new targets.EventBus(this.eventBus)
  }
}

interface ICrossAccountEventBusProps {
  eventBusArn: string
}

export class CrossAccountEventBus {
  public readonly eventBus: events.IEventBus
  public readonly asTarget: targets.EventBus

  constructor(scope: Construct, props: ICrossAccountEventBusProps) {
    this.eventBus = events.EventBus.fromEventBusArn(
      scope,
      `${config.projectName}-${props.eventBusArn}`,
      props.eventBusArn,
    )

    this.asTarget = new targets.EventBus(this.eventBus)
  }
}

export class EventRule {
  rule: events.Rule

  private ruleName: string

  private eventBusName: string

  constructor(scope: Construct, props: IEventRuleProps) {
    this.ruleName = props.ruleName

    this.eventBusName = props.eventBus.eventBusName

    this.rule = new events.Rule(scope, props.ruleName, props)
  }

  getMetric = (metricName: string, options?: CommonMetricOptions) => {
    let metric = new Metric({
      namespace: 'AWS/Events',
      metricName,
      dimensionsMap: {
        RuleName: this.ruleName,
        EventBusName: this.eventBusName,
      },
    })

    if (options) {
      metric = metric.with(options)
    }

    return metric
  }
}

interface IEventRuleProps extends RuleProps {
  eventBus: events.IEventBus
  ruleName: string
}

interface IGroupedEventRuleProps<T> {
  ruleProps: {
    [key in keyof T]: IEventRuleProps
  }
}

type RuleMap<T> = {
  [key in keyof IGroupedEventRuleProps<T>['ruleProps']]: EventRule
}

export class GroupedEventRules<T> {
  ruleMap: RuleMap<T> = {} as RuleMap<T>

  constructor(scope: Construct, props: IGroupedEventRuleProps<T>) {
    Object.entries(props.ruleProps).forEach(([key, ruleProp]) => {
      this.ruleMap[key as keyof T] = new EventRule(scope, ruleProp as IEventRuleProps)
    })
  }

  getMetrics = (metricName: string, options?: CommonMetricOptions) => {
    return Object.entries(this.ruleMap).reduce((metricArray: Metric[], [key, rule]) => {
      const ruleMetric = (rule as EventRule).getMetric(metricName, {
        ...options,
        label: options?.label || key,
      })

      return [...metricArray, ruleMetric]
    }, [])
  }
}

export const predefinedEventRules = {
  queryExecutionStartedRule: ({
    ruleName,
    eventBus,
    targets,
  }: {
    ruleName: string
    eventBus: events.IEventBus
    targets: events.IRuleTarget[]
  }): IEventRuleProps => {
    const eventTopic = EventTopics.QUERY_EXECUTION
    const eventType = EventTypes.STARTED

    const fullRuleName = `${config.projectName}-${eventTopic}-${eventType}-${ruleName}-rule`

    return {
      eventBus,
      ruleName: fullRuleName,
      description: `Routes an ${eventTopic}.${eventType} event`,
      targets,
      eventPattern: {
        source: [EventSources.BLAZE_PULSE],
        detailType: [`${eventTopic}.${eventType}`],
      },
    }
  },
  queryAthenaExecutionRule: ({
    eventBus,
    targets,
  }: {
    eventBus: events.IEventBus
    targets: events.IRuleTarget[]
  }): IEventRuleProps => {
    const eventTopic = EventTopics.QUERY_EXECUTION
    const eventType = EventTypes.STARTED

    const ruleName = `${config.projectName}-${eventTopic}-${eventType}-ca-rule`

    return {
      eventBus,
      ruleName,
      description: `Sends an ${eventTopic}.${eventType} event`,
      enabled: true,
      targets,
      eventPattern: {
        detailType: [`${eventTopic}.${eventType}`],
        source: [EventSources.BLAZE_PULSE],
      },
    }
  },
}
