import * as path from 'path'
import * as dotenv from 'dotenv'
import { getDeploymentStage, validateEnv } from './lib/utils'
import { REQUIRED_ENV_VARIABLES } from './lib/models/types'

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
    sm: {
      apiEnvsSecretName: `${projectName}-api-envs`,
    },
    ssm: {
      hfToken: `${ssmParametersRoot}/hf-token`,
      openaiApiKey: `${ssmParametersRoot}/openai-api-key`,
    },
    ec2: {
      vpc: {
        vpcId: 'vpc-03e671a621d004593',
      },
      ami: {
        imageName: 'sandbox-anamnotes-api-image',
      },
      asg: {
        keyPairName: 'sandbox-anamnotes-api-instance-keypair',
      },
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
