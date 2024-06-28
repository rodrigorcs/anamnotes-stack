import { aws_sqs as sqs, aws_events_targets as eventsTargets, Duration } from 'aws-cdk-lib'
import { Metric, MetricOptions } from 'aws-cdk-lib/aws-cloudwatch'
import { Construct } from 'constructs'
import { config } from '../../../config'

interface ISQSQueueProps {
  queueName: string
  visibilityTimeout?: number
  dlq?: sqs.DeadLetterQueue
  deliveryDelay?: number
}

export class SQSQueue {
  public readonly queue: sqs.IQueue
  public readonly asTarget: eventsTargets.SqsQueue

  constructor(scope: Construct, props: ISQSQueueProps) {
    const queueName = `${config.projectName}-${props.queueName}-queue`
    this.queue = new sqs.Queue(scope, queueName, {
      queueName,
      visibilityTimeout: Duration.seconds(props.visibilityTimeout || 30),
      deadLetterQueue: props.dlq,
      deliveryDelay: Duration.seconds(props.deliveryDelay || 0),
    })

    this.asTarget = new eventsTargets.SqsQueue(this.queue)
  }
}

interface IGroupedSQSProps<T> {
  sqsProps: {
    [key in keyof T]: ISQSQueueProps
  }
}
export class GroupedSQS<T> {
  sqsMap: { [key in keyof IGroupedSQSProps<T>['sqsProps']]: SQSQueue } = {} as {
    [key in keyof IGroupedSQSProps<T>['sqsProps']]: SQSQueue
  }

  constructor(scope: Construct, props: IGroupedSQSProps<T>) {
    Object.entries(props.sqsProps).forEach(([key, sqsProp]) => {
      this.sqsMap[key as keyof T] = new SQSQueue(scope, sqsProp as ISQSQueueProps)
    })
  }

  getMetrics = (metricName: string, options?: MetricOptions) => {
    return Object.entries(this.sqsMap).reduce((metricArray: Metric[], [key, sqs]) => {
      const sqsMetric = (sqs as SQSQueue).queue.metric(metricName, {
        ...options,
        label: options?.label || key,
      })

      return [...metricArray, sqsMetric]
    }, [])
  }
}
