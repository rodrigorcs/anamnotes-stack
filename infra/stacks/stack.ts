import { Stack, StackProps } from 'aws-cdk-lib'
import { Construct } from 'constructs'
import { config } from '../config'
import {
  ELambdaGroupTypes,
  FilterCriteria,
  FilterRule,
  GroupedLambdaFunctions,
  StartingPosition,
} from '../lib/constructs/lambda'
import {
  APIGatewayRestApi,
  EndpointType,
  IdentitySource,
  NestedApiResources,
} from '../lib/constructs/api-gateway/rest'
import { HttpMethods } from '../lib/models/enums'
import { ExistingStringSystemParameter } from '../lib/constructs/ssm'
import { APIGatewayWebSocket } from '../lib/constructs/api-gateway/websocket'
import { DynamoDBAttributeType, DynamoDBTable, StreamViewType } from '../lib/constructs/dynamodb'
import { S3Bucket, S3EventType, S3HTTPMethods } from '../lib/constructs/s3'
import { GroupedSQS } from '../lib/constructs/sqs'

export class AnamnotesStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props)

    // SYSTEM PARAMETERS

    const { value: openaiApiKey } = new ExistingStringSystemParameter(this, {
      path: config.aws.ssm.openaiApiKey,
      fetchInSynthesisTime: true,
    })

    // SQS QUEUES

    const { sqsMap: dlqQueues } = new GroupedSQS(this, {
      sqsProps: {
        audioChunksEventsDLQ: {
          queueName: 'audio-chunks-events-dlq',
          visibilityTimeout: 300,
        },
      },
    })

    const { sqsMap: queues } = new GroupedSQS(this, {
      sqsProps: {
        audioChunksEvents: {
          queueName: 'audio-chunks-events',
          visibilityTimeout: 300,
          dlq: { queue: dlqQueues.audioChunksEventsDLQ.queue, maxReceiveCount: 3 },
        },
      },
    })

    // S3 BUCKETS

    const { bucket: audioChunksBucket } = new S3Bucket(this, {
      name: 'audio-chunks',
      corsConfig: [
        { allowedMethods: [S3HTTPMethods.PUT], allowedOrigins: ['*'], allowedHeaders: ['*'] },
      ],
      eventDestinations: [
        {
          s3Destination: {
            eventType: S3EventType.OBJECT_CREATED,
            queue: queues.audioChunksEvents.queue,
          },
        },
      ],
    })

    // DYNAMODB

    const { table: anamnotesTable } = new DynamoDBTable(this, {
      partitionKey: { name: 'pk', type: DynamoDBAttributeType.STRING },
      sortKey: { name: 'sk', type: DynamoDBAttributeType.STRING },
      deletionProtection: true,
      streamType: StreamViewType.NEW_IMAGE,
    })

    // ENVS

    const sharedLambdaEnvs = {
      STAGE: config.stage,
    }

    // LAMBDAS

    const { functionMap: websocketLambdas } = new GroupedLambdaFunctions(this, {
      type: ELambdaGroupTypes.WEBSOCKET,
      sharedEnvs: sharedLambdaEnvs,
      functionProps: {
        connect: {
          reservedConcurrentExecutions: 1,
          memoryMB: 128,
          timeoutSecs: 300,
          sourceCodePath: '../dist/handlers/connect-ws',
          environment: {
            ...sharedLambdaEnvs,
            TABLE_NAME: anamnotesTable.tableName,
          },
        },
        disconnect: {
          reservedConcurrentExecutions: 1,
          memoryMB: 128,
          timeoutSecs: 300,
          sourceCodePath: '../dist/handlers/disconnect-ws',
          environment: {
            ...sharedLambdaEnvs,
            TABLE_NAME: anamnotesTable.tableName,
          },
        },
      },
    })

    const { functionMap: aiLambdas } = new GroupedLambdaFunctions(this, {
      type: ELambdaGroupTypes.AI,
      sharedEnvs: sharedLambdaEnvs,
      functionProps: {
        transcribe: {
          reservedConcurrentExecutions: 1,
          memoryMB: 256,
          timeoutSecs: 300,
          sourceCodePath: '../dist/handlers/transcribe-audio',
          eventSources: [
            {
              queueSource: {
                queue: queues.audioChunksEvents.queue,
              },
            },
          ],
          environment: {
            ...sharedLambdaEnvs,
            TABLE_NAME: anamnotesTable.tableName,
            OPENAI_API_KEY: openaiApiKey,
          },
        },
        summarize: {
          reservedConcurrentExecutions: 1,
          memoryMB: 256,
          timeoutSecs: 300,
          sourceCodePath: '../dist/handlers/summarize-text',
          eventSources: [
            {
              dynamodbSource: {
                table: anamnotesTable,
                props: {
                  startingPosition: StartingPosition.LATEST,
                  filters: [
                    FilterCriteria.filter({
                      eventName: FilterRule.isEqual('INSERT'),
                      dynamodb: {
                        Keys: {
                          sk: { S: FilterRule.beginsWith('chunkId#') },
                        },
                        NewImage: {
                          isLastChunk: {
                            BOOL: [true],
                          },
                        },
                      },
                    }),
                  ],
                },
              },
            },
          ],
          environment: {
            ...sharedLambdaEnvs,
            TABLE_NAME: anamnotesTable.tableName,
            OPENAI_API_KEY: openaiApiKey,
          },
        },
      },
    })

    const { functionMap: fileLambdas } = new GroupedLambdaFunctions(this, {
      type: ELambdaGroupTypes.FILE,
      sharedEnvs: sharedLambdaEnvs,
      functionProps: {
        getChunkUploadUrl: {
          reservedConcurrentExecutions: 1,
          memoryMB: 128,
          timeoutSecs: 300,
          sourceCodePath: '../dist/handlers/get-chunk-upload-url',
          environment: {
            ...sharedLambdaEnvs,
            TABLE_NAME: anamnotesTable.tableName,
            BUCKET_NAME: audioChunksBucket.bucketName,
          },
        },
      },
    })

    const { functionMap: conversationLambdas } = new GroupedLambdaFunctions(this, {
      type: ELambdaGroupTypes.CONVERSATION,
      sharedEnvs: sharedLambdaEnvs,
      functionProps: {
        startConversation: {
          reservedConcurrentExecutions: 1,
          memoryMB: 128,
          timeoutSecs: 300,
          sourceCodePath: '../dist/handlers/start-conversation',
          environment: {
            ...sharedLambdaEnvs,
            TABLE_NAME: anamnotesTable.tableName,
          },
        },
        getConversations: {
          reservedConcurrentExecutions: 1,
          memoryMB: 128,
          timeoutSecs: 300,
          sourceCodePath: '../dist/handlers/get-conversations',
          environment: {
            ...sharedLambdaEnvs,
            TABLE_NAME: anamnotesTable.tableName,
          },
        },
      },
    })

    // API GATEWAY - REST API

    const { restApi } = new APIGatewayRestApi(this, {
      identitySources: [IdentitySource.header('Authorization')],
      gatewayDomain: {
        domainName: config.aws.route53.domainName,
        subdomainName: 'api',
        hostedZoneId: config.aws.route53.hostedZoneId,
        certificateId: config.aws.acm.certificateId,
        endpointType: EndpointType.EDGE,
      },
    })

    const baseResourceV1 = restApi.root.addResource('v1')
    const conversationsResource = baseResourceV1.addResource('conversations')
    const conversationResource = conversationsResource.addResource('{conversationId}')
    const audioChunksResource = conversationResource.addResource('audioChunks')
    const audioChunkResource = audioChunksResource.addResource('{chunkId}')

    new NestedApiResources(this, {
      baseResource: conversationsResource,
      routes: [
        {
          resourcePath: [],
          lambdaIntegrations: [
            {
              method: HttpMethods.POST,
              handler: conversationLambdas.startConversation,
              apigwMethodOptions: {
                operationName: 'Start conversation',
                apiKeyRequired: false,
              },
            },
          ],
        },
        {
          resourcePath: [],
          lambdaIntegrations: [
            {
              method: HttpMethods.GET,
              handler: conversationLambdas.getConversations,
              apigwMethodOptions: {
                operationName: 'Get conversations',
                apiKeyRequired: false,
              },
            },
          ],
        },
      ],
    })

    new NestedApiResources(this, {
      baseResource: conversationResource,
      routes: [
        {
          resourcePath: [],
          lambdaIntegrations: [
            {
              method: HttpMethods.GET,
              handler: conversationLambdas.getConversations,
              apigwMethodOptions: {
                operationName: 'Get conversation by ID',
                apiKeyRequired: false,
              },
            },
          ],
        },
      ],
    })

    new NestedApiResources(this, {
      baseResource: audioChunkResource,
      routes: [
        {
          resourcePath: ['uploadUrl'],
          lambdaIntegrations: [
            {
              method: HttpMethods.GET,
              handler: fileLambdas.getChunkUploadUrl,
              apigwMethodOptions: {
                operationName: 'Upload audio chunk to bucket',
                apiKeyRequired: false,
              },
            },
          ],
        },
      ],
    })

    // API GATEWAY - WEBSOCKET API

    const { webSocketAPI } = new APIGatewayWebSocket(this, {
      handlers: {
        connect: websocketLambdas.connect.lambdaFn,
        disconnect: websocketLambdas.disconnect.lambdaFn,
      },
      gatewayDomain: {
        domainName: config.aws.route53.domainName,
        subdomainName: 'ws',
        hostedZoneId: config.aws.route53.hostedZoneId,
        certificateId: config.aws.acm.certificateId,
      },
    })

    // PERMISSIONS

    anamnotesTable.grantReadWriteData(websocketLambdas.connect.lambdaFn)
    anamnotesTable.grantReadWriteData(websocketLambdas.disconnect.lambdaFn)
    anamnotesTable.grantReadWriteData(aiLambdas.transcribe.lambdaFn)
    anamnotesTable.grantReadWriteData(aiLambdas.summarize.lambdaFn)
    anamnotesTable.grantReadWriteData(conversationLambdas.startConversation.lambdaFn)
    anamnotesTable.grantReadData(conversationLambdas.getConversations.lambdaFn)

    webSocketAPI.grantManageConnections(aiLambdas.summarize.lambdaFn)

    audioChunksBucket.grantPut(fileLambdas.getChunkUploadUrl.lambdaFn)
    audioChunksBucket.grantRead(aiLambdas.transcribe.lambdaFn)
  }
}
