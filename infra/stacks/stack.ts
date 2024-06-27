import { Stack, StackProps } from 'aws-cdk-lib'
import { Construct } from 'constructs'
import { config } from '../config'
import { ELambdaGroupTypes, GroupedLambdaFunctions } from '../lib/constructs/lambda'
import {
  APIGatewayRestApi,
  IdentitySource,
  NestedApiResources,
} from '../lib/constructs/api-gateway/rest'
import { HttpMethods } from '../lib/models/enums'
import { ExistingVPC } from '../lib/constructs/ec2/vpc'
import { AutoScalingGroup } from '../lib/constructs/ec2/asg'
import { ExistingMachineImage } from '../lib/constructs/ec2/ami'
import { ApplicationLoadBalancer } from '../lib/constructs/ec2/alb'
import { ExistingStringSystemParameter } from '../lib/constructs/ssm'
import { APIGatewayWebSocket } from '../lib/constructs/api-gateway/websocket'
import { DynamoDBAttributeType, DynamoDBTable } from '../lib/constructs/dynamodb'

export class AnamnotesStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props)

    // SYSTEM PARAMETERS

    const { value: hfToken } = new ExistingStringSystemParameter(this, {
      path: config.aws.ssm.hfToken,
      fetchInSynthesisTime: true,
    })

    const { value: openaiApiKey } = new ExistingStringSystemParameter(this, {
      path: config.aws.ssm.openaiApiKey,
      fetchInSynthesisTime: true,
    })

    // ENVS

    const sharedLambdaEnvs = {
      STAGE: config.stage,
    }

    // VPCS

    const { vpc: existingVPC } = new ExistingVPC(this, {
      vpcId: config.aws.ec2.vpc.vpcId,
    })

    // MACHINE IMAGES

    const { machineImage: existingMachineImage } = new ExistingMachineImage(this, {
      name: config.aws.ec2.ami.imageName,
    })

    // AUTO SCALING GROUPS

    const { group: autoScalingGroup } = new AutoScalingGroup(this, {
      name: 'api-instances',
      vpc: existingVPC,
      instanceType: 'g6.xlarge',
      maxCapacity: 1,
      minCapacity: 0,
      machineImage: existingMachineImage,
      keyPairName: config.aws.ec2.asg.keyPairName,
      commandsOnBoot: [
        'cd /.', // Go to root directory
        'cd home/ec2-user/anamnotes', // Go to anamnotes directory
        'sudo systemctl enable docker', // Enable docker
        `sudo docker run --gpus all --ipc=host --ulimit memlock=-1 -d -p 8080:8080 -e HF_TOKEN='${hfToken}' -e OPENAI_API_KEY='${openaiApiKey}' anamnotes-api:v1.0`, // Run the docker container
      ],
    })

    // LOAD BALANCER

    new ApplicationLoadBalancer(this, {
      name: 'api',
      vpc: existingVPC,
      targets: [autoScalingGroup],
    })

    // DYNAMODB

    const { table: anamnotesTable } = new DynamoDBTable(this, {
      partitionKey: { name: 'pk', type: DynamoDBAttributeType.STRING },
      sortKey: { name: 'sk', type: DynamoDBAttributeType.STRING },
      deletionProtection: true,
    })

    // LAMBDAS

    const { functionMap: infraLambdas } = new GroupedLambdaFunctions(this, {
      type: ELambdaGroupTypes.INFRA,
      sharedEnvs: sharedLambdaEnvs,
      functionProps: {
        startInstance: {
          reservedConcurrentExecutions: 1,
          memoryMB: 256,
          timeoutSecs: 300,
          sourceCodePath: '../dist/handlers/start-instance',
          environment: {
            ...sharedLambdaEnvs,
          },
        },
      },
    })

    const { functionMap: websocketLambdas } = new GroupedLambdaFunctions(this, {
      type: ELambdaGroupTypes.WEBSOCKET,
      sharedEnvs: sharedLambdaEnvs,
      functionProps: {
        connect: {
          reservedConcurrentExecutions: 1,
          memoryMB: 128,
          timeoutSecs: 300,
          sourceCodePath: '../dist/handlers/connect',
          environment: {
            ...sharedLambdaEnvs,
            TABLE_NAME: anamnotesTable.tableName,
          },
        },
        disconnect: {
          reservedConcurrentExecutions: 1,
          memoryMB: 128,
          timeoutSecs: 300,
          sourceCodePath: '../dist/handlers/disconnect',
          environment: {
            ...sharedLambdaEnvs,
            TABLE_NAME: anamnotesTable.tableName,
          },
        },
      },
    })

    // API GATEWAY - REST API

    const { restApi: api } = new APIGatewayRestApi(this, {
      identitySources: [IdentitySource.header('Authorization')],
    })

    const baseResourceV1 = api.root.addResource('v1')

    new NestedApiResources(this, {
      baseResource: baseResourceV1,
      routes: [
        {
          resourcePath: ['prepare'],
          integrations: [
            {
              method: HttpMethods.POST,
              handler: infraLambdas.startInstance,
              apigwMethodOptions: {
                operationName: 'Start instance',
                apiKeyRequired: false,
              },
            },
          ],
        },
      ],
    })

    // API GATEWAY - WEBSOCKET API

    new APIGatewayWebSocket(this, {
      handlers: {
        connect: websocketLambdas.connect.lambdaFn,
        disconnect: websocketLambdas.disconnect.lambdaFn,
      },
    })

    // PERMISSIONS

    anamnotesTable.grantReadWriteData(websocketLambdas.connect.lambdaFn)
    anamnotesTable.grantReadWriteData(websocketLambdas.disconnect.lambdaFn)
  }
}
