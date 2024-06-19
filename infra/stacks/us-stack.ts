import { Stack, StackProps } from 'aws-cdk-lib'
import { Construct } from 'constructs'
import { config } from '../config'
import { ELambdaGroupTypes, GroupedLambdaFunctions } from '../lib/constructs/lambda'
import { DynamoDBTable, DynamoDBAttributeType } from '../lib/constructs/dynamodb'
import { ExistingStringSystemParameter } from '../lib/constructs/ssm'
import { EPos, EventSources, EventTopics, EventTypes } from '../lib/models/enums'
import {
  CrossAccountEventBus,
  ExistingEventBus,
  GroupedEventRules,
  predefinedEventRules,
} from '../lib/constructs/eventbridge'
import { GroupedSQS } from '../lib/constructs/sqs'
import { ExistingAPIGatewayRestApiResource, NestedApiResources } from '../lib/constructs/apigw'
import { HttpMethods } from '../lib/enums'

export class USBlazePulseStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props)

    // SYSTEM PARAMETERS
    // Fetching during synthesis time because VPC and SGs will not allow token as parameters for lookup.

    const { value: restApiId } = new ExistingStringSystemParameter(this, {
      path: config.aws.us.ssm.apiGateway.restApiId,
    })

    const { value: rootResourceId } = new ExistingStringSystemParameter(this, {
      path: config.aws.us.ssm.apiGateway.restApiRootResourceId,
    })

    const { value: requestAuthorizerId } = new ExistingStringSystemParameter(this, {
      path: config.aws.us.ssm.apiGateway.requestAuthorizerId,
    })

    const { value: caEventBusArn } = new ExistingStringSystemParameter(this, {
      path: config.aws.us.ssm.caEventBusArn,
    })

    const { value: caExecuteQueryLambdaRoleArn } = new ExistingStringSystemParameter(this, {
      path: config.aws.us.ssm.caExecuteQueryLambdaRoleArn,
    })

    const { value: slackAlertsEndpoint } = new ExistingStringSystemParameter(this, {
      path: config.aws.us.ssm.slackAlertsEndpoint,
    })

    // ENVS

    const sharedLambdaEnvs = {
      SLACK_ALERTS_ENDPOINT: slackAlertsEndpoint,
      POS: EPos.US,
      STAGE: config.stage,
    }

    // DYNAMODB

    const { table: blazePulseTable } = new DynamoDBTable(this, {
      partitionKey: { name: 'pk', type: DynamoDBAttributeType.STRING },
      sortKey: { name: 'sk', type: DynamoDBAttributeType.STRING },
      deletionProtection: true,
      writeAccessPrincipalArn: caExecuteQueryLambdaRoleArn,
    })

    // SQS

    const { sqsMap: dlqQueues } = new GroupedSQS(this, {
      sqsProps: {
        InitialLoadDLQ: {
          queueName: `initial-load-dlq`,
          visibilityTimeout: 300,
        },
        QueryExecutionsDLQ: {
          queueName: `query-executions-dlq`,
          visibilityTimeout: 300,
        },
      },
    })

    const { sqsMap: queues } = new GroupedSQS(this, {
      sqsProps: {
        InitialLoad: {
          queueName: 'initial-load',
          visibilityTimeout: 300,
          dlq: {
            queue: dlqQueues.InitialLoadDLQ.queue,
            maxReceiveCount: 3,
          },
        },
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

    // EVENTBRIDGE

    const { eventBus: platformEventBus } = new ExistingEventBus(this, {
      eventBusName: config.aws.us.eventbridge.platformEventBusName,
      eventSources: [
        {
          queueSource: {
            pipeName: 'initial-load',
            queue: queues.InitialLoad.queue,
            props: {
              detailType: `${EventTopics.QUERY_EXECUTION}.${EventTypes.STARTED}`,
              source: EventSources.BLAZE_PULSE,
            },
          },
        },
      ],
    })

    const caEventBus = new CrossAccountEventBus(this, {
      eventBusArn: caEventBusArn,
    })

    // LAMBDAS

    const { functionMap: ingestionLambdas } = new GroupedLambdaFunctions(this, {
      type: ELambdaGroupTypes.INGESTION,
      sharedEnvs: sharedLambdaEnvs,
      functionProps: {
        IngestInitialLoad: {
          reservedConcurrentExecutions: 1,
          memoryMB: 256,
          timeoutSecs: 300,
          sourceCodePath: '../dist/handlers/us/ingest-initial-load',
          functionName: 'ingest-initial-load',
          handler: 'index.handler',
          environment: {
            INITIAL_LOAD_QUEUE_URL: queues.InitialLoad.queue.queueUrl,
            SLACK_ALERTS_ENDPOINT: slackAlertsEndpoint,
          },
        },
        IngestQueryExecution: {
          reservedConcurrentExecutions: 2,
          memoryMB: 128,
          timeoutSecs: 300,
          sourceCodePath: '../dist/handlers/us/ingest-query-execution',
          functionName: 'ingest-query-execution',
          handler: 'index.handler',
          cron: [
            {
              name: 'daily',
              expression: '0 7 * * ? *', // Everyday at 7AM UTC
              event: {
                source: EventSources.BLAZE_PULSE,
                'detail-type': `${EventTopics.QUERY_EXECUTION}.${EventTypes.SCHEDULED}`,
              },
            },
          ],
          environment: {
            PLATFORM_EVENT_BUS_NAME: platformEventBus.eventBusName,
            SLACK_ALERTS_ENDPOINT: slackAlertsEndpoint,
          },
        },
      },
    })

    const { functionMap: getMetricsLambdas } = new GroupedLambdaFunctions(this, {
      type: ELambdaGroupTypes.METRICS,
      sharedEnvs: sharedLambdaEnvs,
      functionProps: {
        GetMetrics: {
          reservedConcurrentExecutions: 10,
          memoryMB: 128,
          timeoutSecs: 30,
          sourceCodePath: '../dist/handlers/us/get-metrics',
          functionName: 'get-metrics',
          handler: 'index.handler',
          environment: {
            TABLE_NAME: blazePulseTable.tableName,
            SLACK_ALERTS_ENDPOINT: slackAlertsEndpoint,
          },
        },
      },
    })

    // API GATEWAY

    const api = new ExistingAPIGatewayRestApiResource(this, {
      serviceName: 'pulse',
      restApiId,
      rootResourceId,
      requestAuthorizerId,
      resources: ['api'],
    })

    const baseResourceV1 = api.baseResource.addResource('v1')
    const merchantsResource = baseResourceV1.addResource('merchants')
    const merchantIdResource = merchantsResource.addResource('{merchantId}')

    new NestedApiResources(this, {
      baseResource: merchantIdResource,
      requestAuthorizer: api.requestAuthorizer,
      routes: [
        {
          resourcePath: ['metrics'],
          integrations: [
            {
              method: HttpMethods.GET,
              handler: getMetricsLambdas.GetMetrics,
              apigwMethodOptions: {
                operationName: 'Get metrics',
                apiKeyRequired: false,
              },
            },
          ],
        },
      ],
    })

    // EVENT RULES

    new GroupedEventRules(this, {
      ruleProps: {
        QueryExecutionStartedCA: predefinedEventRules.queryExecutionStartedRule({
          ruleName: EPos.CA,
          eventBus: platformEventBus,
          targets: [caEventBus.asTarget],
        }),
      },
    })

    // PERMISSIONS

    platformEventBus.grantPutEventsTo(ingestionLambdas.IngestQueryExecution.lambdaFn)

    blazePulseTable.grantReadData(getMetricsLambdas.GetMetrics.lambdaFn)

    queues.InitialLoad.queue.grantSendMessages(ingestionLambdas.IngestInitialLoad.lambdaFn)
  }
}
