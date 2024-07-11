import * as path from 'path'
import * as dotenv from 'dotenv'
import { getDeploymentStage, validateEnv } from './lib/utils'
import { REQUIRED_ENV_VARIABLES } from './lib/models/types'
import { stageValue } from './lib/helpers'
import { Stack } from 'aws-cdk-lib/core'
import { Construct } from 'constructs'

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
  aws: {
    ssm: {
      hfToken: `${ssmParametersRoot}/hf-token`,
      openaiApiKey: `${ssmParametersRoot}/openai-api-key`,
    },
    acm: {
      certificateId: '4da2fd45-4693-483e-84d3-d506823b9b48',
    },
    route53: {
      hostedZoneId: 'Z0448513YG2VMTOLT2NK',
      domainName: stageValue<string>({ staging: 'staging.anamnotes.com' }, 'anamnotes.com'),
    },
    dynamodb: {
      streamARN: (scope: Construct) => {
        const streamName = stageValue<string>(
          { staging: '2024-07-11T21:04:04.247' },
          '2024-06-28T01:32:38.930',
        )
        const tableARN = Stack.of(scope).formatArn({
          resource: 'table',
          service: 'dynamodb',
          resourceName: `${projectName}-table`,
        })
        return `${tableARN}/stream/${streamName}`
      },
    },
    cognito: {
      domainPrefix: stageValue<string>(
        {
          production: 'anamnotes',
          staging: 'staging-anamnotes',
        },
        'anamnotes', // TODO: Update to 'sandbox-anamnotes' after updating the naming in prod account
      ),
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
