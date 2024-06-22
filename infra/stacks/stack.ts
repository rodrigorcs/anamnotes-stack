import { Stack, StackProps } from 'aws-cdk-lib'
import { Construct } from 'constructs'
import { config } from '../config'
import { ELambdaGroupTypes, GroupedLambdaFunctions } from '../lib/constructs/lambda'
import {
  APIGatewayRestApi,
  IdentitySource,
  NestedApiResources,
} from '../lib/constructs/api-gateway'
import { HttpMethods } from '../lib/models/enums'
import { ExistingVPC } from '../lib/constructs/ec2/vpc'
import { AutoScalingGroup } from '../lib/constructs/ec2/auto-scaling'
import { ExistingMachineImage } from '../lib/constructs/ec2/ami'

export class AnamnotesStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props)

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

    new AutoScalingGroup(this, {
      name: 'api-instances',
      vpc: existingVPC,
      instanceType: 'g5.xlarge',
      maxCapacity: 1,
      minCapacity: 0,
      machineImage: existingMachineImage,
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

    // API GATEWAY

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
  }
}
