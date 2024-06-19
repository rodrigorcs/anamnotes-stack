import { Stack, StackProps } from 'aws-cdk-lib'
import { Construct } from 'constructs'
import { config } from '../config'
import { ELambdaGroupTypes, GroupedLambdaFunctions } from '../lib/constructs/lambda'

export class AnamnotesStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props)

    // ENVS

    const sharedLambdaEnvs = {
      STAGE: config.stage,
    }

    // LAMBDAS

    new GroupedLambdaFunctions(this, {
      type: ELambdaGroupTypes.INGESTION,
      sharedEnvs: sharedLambdaEnvs,
      functionProps: {
        IngestInitialLoad: {
          reservedConcurrentExecutions: 1,
          memoryMB: 256,
          timeoutSecs: 300,
          sourceCodePath: '../dist/handlers/start-instance',
          environment: {},
        },
      },
    })
  }
}
