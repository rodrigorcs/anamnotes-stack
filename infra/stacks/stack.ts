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
  IdentitySource,
  NestedApiResources,
} from '../lib/constructs/api-gateway/rest'
import { HttpMethods } from '../lib/models/enums'
// import { ExistingVPC } from '../lib/constructs/ec2/vpc'
// import { AutoScalingGroup } from '../lib/constructs/ec2/asg'
// import { ExistingMachineImage } from '../lib/constructs/ec2/ami'
// import { ApplicationLoadBalancer } from '../lib/constructs/ec2/alb'
// import { ExistingStringSystemParameter } from '../lib/constructs/ssm'
import { APIGatewayWebSocket } from '../lib/constructs/api-gateway/websocket'
import { DynamoDBAttributeType, DynamoDBTable } from '../lib/constructs/dynamodb'
import { S3Bucket, S3EventType } from '../lib/constructs/s3'
import { GroupedSQS } from '../lib/constructs/sqs'
// import { PolicyStatement } from 'aws-cdk-lib/aws-iam'

export class AnamnotesStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props)

    // SYSTEM PARAMETERS

    // const { value: hfToken } = new ExistingStringSystemParameter(this, {
    //   path: config.aws.ssm.hfToken,
    //   fetchInSynthesisTime: true,
    // })

    // const { value: openaiApiKey } = new ExistingStringSystemParameter(this, {
    //   path: config.aws.ssm.openaiApiKey,
    //   fetchInSynthesisTime: true,
    // })

    // VPCS

    // const { vpc: existingVPC } = new ExistingVPC(this, {
    //   vpcId: config.aws.ec2.vpc.vpcId,
    // })

    // MACHINE IMAGES

    // const { machineImage: existingMachineImage } = new ExistingMachineImage(this, {
    //   name: config.aws.ec2.ami.imageName,
    // })

    // AUTO SCALING GROUPS

    // const { group: autoScalingGroup } = new AutoScalingGroup(this, {
    //   name: 'api-instances',
    //   vpc: existingVPC,
    //   instanceType: 'g6.xlarge',
    //   maxCapacity: 1,
    //   minCapacity: 0,
    //   machineImage: existingMachineImage,
    //   keyPairName: config.aws.ec2.asg.keyPairName,
    //   commandsOnBoot: [
    //     'cd /.', // Go to root directory
    //     'cd home/ec2-user/anamnotes', // Go to anamnotes directory
    //     'sudo systemctl enable docker', // Enable docker
    //     `sudo docker run --gpus all --ipc=host --ulimit memlock=-1 -d -p 8080:8080 -e HF_TOKEN='${hfToken}' -e OPENAI_API_KEY='${openaiApiKey}' anamnotes-api:v1.0`, // Run the docker container
    //   ],
    // })

    // LOAD BALANCER

    // new ApplicationLoadBalancer(this, {
    //   name: 'api',
    //   vpc: existingVPC,
    //   targets: [autoScalingGroup],
    // })

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
                            S: FilterRule.isEqual('true'),
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

    // API GATEWAY - REST API

    const { restApi } = new APIGatewayRestApi(this, {
      identitySources: [IdentitySource.header('Authorization')],
    })

    const baseResourceV1 = restApi.root.addResource('v1')
    const summarizationsResource = baseResourceV1.addResource('summarizations')
    const summarizationResource = summarizationsResource.addResource('{summarizationId}')
    const audioChunksResource = summarizationResource.addResource('audioChunks')
    const audioChunkResource = audioChunksResource.addResource('{chunkId}')

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
    })

    // PERMISSIONS

    anamnotesTable.grantReadWriteData(websocketLambdas.connect.lambdaFn)
    anamnotesTable.grantReadWriteData(websocketLambdas.disconnect.lambdaFn)
    anamnotesTable.grantReadWriteData(aiLambdas.summarize.lambdaFn)

    webSocketAPI.grantManageConnections(aiLambdas.summarize.lambdaFn)

    audioChunksBucket.grantPut(fileLambdas.getChunkUploadUrl.lambdaFn)
  }
}
