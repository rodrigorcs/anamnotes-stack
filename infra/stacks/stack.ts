/* eslint-disable @typescript-eslint/no-unused-vars */
import { Stack, StackProps } from 'aws-cdk-lib'
import { Construct } from 'constructs'
import { config } from '../config'
import { ELambdaGroupTypes, GroupedLambdaFunctions } from '../lib/constructs/lambda'
import { APIGatewayRestApi, IdentitySource, NestedApiResources } from '../lib/constructs/apigw'
import { HttpMethods } from '../lib/models/enums'

export class AnamnotesStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props)

    // ENVS

    const sharedLambdaEnvs = {
      STAGE: config.stage,
    }

    // LAMBDAS

    // const { functionMap: infraLambdas } = new GroupedLambdaFunctions(this, {
    //   type: ELambdaGroupTypes.INFRA,
    //   sharedEnvs: sharedLambdaEnvs,
    //   functionProps: {
    //     startInstance: {
    //       reservedConcurrentExecutions: 1,
    //       memoryMB: 256,
    //       timeoutSecs: 300,
    //       sourceCodePath: '../dist/handlers/start-instance',
    //       environment: {},
    //     },
    //   },
    // })

    // API GATEWAY

    const { restApi: api } = new APIGatewayRestApi(this, {
      identitySources: [IdentitySource.header('Authorization')],
    })

    const baseResourceV1 = api.root.addResource('v1')

    // new NestedApiResources(this, {
    //   baseResource: baseResourceV1,
    //   routes: [
    //     {
    //       resourcePath: ['prepare'],
    //       integrations: [
    //         {
    //           method: HttpMethods.POST,
    //           handler: infraLambdas.startInstance,
    //           apigwMethodOptions: {
    //             operationName: 'Start instance',
    //             apiKeyRequired: false,
    //           },
    //         },
    //       ],
    //     },
    //   ],
    // })
  }
}
