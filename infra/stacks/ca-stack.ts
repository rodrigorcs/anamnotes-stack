import { Stack, StackProps } from 'aws-cdk-lib'
import { Construct } from 'constructs'
import { ELambdaGroupTypes, GroupedLambdaFunctions } from '../lib/constructs/lambda'
import { config } from '../config'
import { AthenaWorkgroup } from '../lib/constructs/athena'
import { ExistingS3Bucket, S3Bucket, S3EventType } from '../lib/constructs/s3'
import { ExistingStringSystemParameter } from '../lib/constructs/ssm'
import {
  ExistingEventBus,
  GroupedEventRules,
  predefinedEventRules,
} from '../lib/constructs/eventbridge'
import { EPos } from '../lib/models/enums'
import { GroupedSQS } from '../lib/constructs/sqs'

export class CABlazePulseStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props)

    // SYSTEM PARAMETERS

    const { value: blazePulseTableName } = new ExistingStringSystemParameter(this, {
      path: config.aws.ca.ssm.blazePulseTableName,
    })

    const { value: glueCatalogName } = new ExistingStringSystemParameter(this, {
      path: config.aws.ca.ssm.glueCatalogName,
    })

    const { value: glueDatabaseName } = new ExistingStringSystemParameter(this, {
      path: config.aws.ca.ssm.glueDatabaseName,
    })

    const { value: writeToTableRoleArn } = new ExistingStringSystemParameter(this, {
      path: config.aws.ca.ssm.writeToTableRoleArn,
    })

    const { value: icebergRawDataBucketName } = new ExistingStringSystemParameter(this, {
      path: config.aws.ca.ssm.icebergRawDataBucketName,
    })

    const { value: eventBusName } = new ExistingStringSystemParameter(this, {
      path: config.aws.ca.ssm.eventBusName,
    })

    const { value: slackAlertsEndpoint } = new ExistingStringSystemParameter(this, {
      path: config.aws.ca.ssm.slackAlertsEndpoint,
    })

    // BUCKETS

    const icebergRawDataBucket = new ExistingS3Bucket(this, {
      bucketName: icebergRawDataBucketName,
    })

    const athenaQueryResultsBucket = new S3Bucket(this, {
      name: 'query-results',
    })

    // ATHENA

    const athenaWorkgroup = new AthenaWorkgroup(this, {
      workgroupName: 'default',
      outputBucketName: athenaQueryResultsBucket.bucket.bucketName,
      glueDatabaseName: glueDatabaseName,
    })

    // EVENTBRIDGE

    const { eventBus: caEventBus } = new ExistingEventBus(this, {
      eventBusName,
    })

    // SQS

    const { sqsMap: dlqQueues } = new GroupedSQS(this, {
      sqsProps: {
        QueryExecutionsDLQ: {
          queueName: `query-executions-dlq`,
          visibilityTimeout: 300,
        },
      },
    })

    const { sqsMap: queues } = new GroupedSQS(this, {
      sqsProps: {
        QueryExecutions: {
          queueName: 'query-executions',
          visibilityTimeout: 3600,
          dlq: {
            queue: dlqQueues.QueryExecutionsDLQ.queue,
            maxReceiveCount: 3,
          },
        },
      },
    })

    // LAMBDAS

    const { functionMap: metricsLambdas } = new GroupedLambdaFunctions(this, {
      type: ELambdaGroupTypes.METRICS,
      functionProps: {
        ExecuteQuery: {
          reservedConcurrentExecutions: 1,
          memoryMB: 256,
          timeoutSecs: 300,
          sourceCodePath: '../dist/handlers/ca/execute-query',
          functionName: 'execute-query',
          handler: 'index.handler',
          eventSources: [
            {
              queueSource: {
                queue: queues.QueryExecutions.queue,
                props: {
                  reportBatchItemFailures: true,
                  batchSize: 3,
                },
              },
            },
          ],
          environment: {
            ATHENA_WORKGROUP_NAME: athenaWorkgroup.workgroup.name,
            ATHENA_OUTPUT_BUCKET_NAME: athenaQueryResultsBucket.bucket.bucketName,
            ASSUMED_ROLE_ARN: writeToTableRoleArn,
            GLUE_CATALOG_NAME: glueCatalogName,
            GLUE_DATABASE_NAME: glueDatabaseName,
            SLACK_ALERTS_ENDPOINT: slackAlertsEndpoint,
            POS: EPos.CA,
            STAGE: config.stage,
          },
        },
        SaveResults: {
          reservedConcurrentExecutions: 1,
          memoryMB: 256,
          timeoutSecs: 300,
          sourceCodePath: '../dist/handlers/ca/save-results',
          functionName: 'save-results',
          handler: 'index.handler',
          eventSources: [
            {
              s3Source: {
                bucket: athenaQueryResultsBucket.bucket,
                props: {
                  events: [S3EventType.OBJECT_CREATED],
                  filters: [
                    {
                      suffix: '.csv',
                    },
                  ],
                },
              },
            },
          ],
          environment: {
            TABLE_NAME: blazePulseTableName,
            ASSUMED_ROLE_ARN: writeToTableRoleArn,
            SLACK_ALERTS_ENDPOINT: slackAlertsEndpoint,
            POS: EPos.CA,
            STAGE: config.stage,
          },
          rolePermissions: [
            {
              actions: ['sts:AssumeRole'],
              resources: [writeToTableRoleArn],
            },
          ],
        },
      },
    })

    // EVENT RULES

    new GroupedEventRules(this, {
      ruleProps: {
        QueryExecutionStarted: predefinedEventRules.queryAthenaExecutionRule({
          targets: [queues.QueryExecutions.asTarget],
          eventBus: caEventBus,
        }),
      },
    })

    // PERMISSIONS

    athenaWorkgroup.grantQueryExecution(metricsLambdas.ExecuteQuery.lambdaFn)

    icebergRawDataBucket.bucket.grantRead(metricsLambdas.ExecuteQuery.lambdaFn)

    athenaQueryResultsBucket.bucket.grantReadWrite(metricsLambdas.ExecuteQuery.lambdaFn)

    athenaQueryResultsBucket.bucket.grantRead(metricsLambdas.SaveResults.lambdaFn)

    queues.QueryExecutions.queue.grantConsumeMessages(metricsLambdas.ExecuteQuery.lambdaFn)
  }
}
