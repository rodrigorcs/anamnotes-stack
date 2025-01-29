import * as path from 'path'
import * as dotenv from 'dotenv'
import { getDeploymentStage, validateEnv } from './lib/utils'
import { REQUIRED_ENV_VARIABLES } from './lib/models/types'
import { stageValue } from './lib/helpers'
import { Stack } from 'aws-cdk-lib/core'
import { Construct } from 'constructs'
import { AppStage } from './lib/models/enums'

dotenv.config({
  path: path.resolve(__dirname, `./.env.${getDeploymentStage(process.env.STAGE)}`),
})

export const requiredEnvs: Array<keyof REQUIRED_ENV_VARIABLES> = [
  'CDK_DEFAULT_ACCOUNT',
  'AWS_DEFAULT_REGION',
  'DEPLOYED_BY',
  'STAGE',
]

const validatedEnvs = validateEnv(requiredEnvs, process.env)

const stage = getDeploymentStage(validatedEnvs.STAGE)

const projectId = 'anamnotes-stack' as const
const projectName = `${stage}-${projectId}` as const
const ssmParametersRoot = `/${stage}/${projectId}` as const

export const config = {
  projectId,
  projectName,
  stage,
  isProd: stage === AppStage.PRODUCTION,
  aws: {
    ssm: {
      hfToken: `${ssmParametersRoot}/hf-token`,
      openaiApiKey: `${ssmParametersRoot}/openai-api-key`,
    },
    acm: {
      certificateId: stageValue<string>({
        staging: 'a97318e4-e07d-4d8d-8892-01daf5c3367a',
        prod: 'e3750459-4261-463f-ba63-243923a6afb6',
      }),
    },
    route53: {
      hostedZoneId: stageValue<string>({
        staging: 'Z03723123I6T44W2QOSIN',
        prod: 'Z0448513YG2VMTOLT2NK',
      }),
      domainName: stageValue<string>({
        staging: 'staging.anamnotes.com',
        prod: 'anamnotes.com',
      }),
    },
    dynamodb: {
      streamARN: (scope: Construct) => {
        const streamName = stageValue<string>({
          staging: '2024-07-11T21:04:04.247',
          prod: '2024-07-17T13:51:50.497',
        })
        const tableARN = Stack.of(scope).formatArn({
          resource: 'table',
          service: 'dynamodb',
          resourceName: `${projectName}-table`,
        })
        return `${tableARN}/stream/${streamName}`
      },
    },
    cognito: {
      domainPrefix: stageValue<string>({
        staging: 'staging-anamnotes',
        prod: 'anamnotes',
      }),
      googleIdP: {
        clientId: '546907548376-e622vkucvrg9crqpsr3enbuarfalqse0.apps.googleusercontent.com',
        clientSecret: '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',
      },
      callbackURL: stageValue<string>({
        staging: 'https://www.app.staging.anamnotes.com',
        prod: 'https://www.app.anamnotes.com',
      }),
    },
  },
  stack: {
    env: {
      account: validatedEnvs.CDK_DEFAULT_ACCOUNT,
      region: validatedEnvs.AWS_DEFAULT_REGION,
    },
  },
  deployedBy: process.env.DEPLOYED_BY || 'Github',
  validatedEnvs,
  githubRepo: 'rodrigorcs/anamnotes-stack',
} as const
