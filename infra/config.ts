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

const projectId = 'blaze-pulse' as const
const projectName = `${stage}-${projectId}` as const
const ssmParametersRoot = `/${stage}/${projectId}` as const

export const config = {
  projectId,
  projectName,
  stage,
  stack: {
    env: {
      account: validatedEnvs.CDK_DEFAULT_ACCOUNT,
      region: validatedEnvs.AWS_DEFAULT_REGION,
    },
  },
  aws: {
    us: {
      ssm: {
        apiGateway: {
          restApiId: `/${stage}/gateway/authz/restApi/envs/restApiId`,
          restApiRootResourceId: `/${stage}/gateway/authz/restApi/envs/restApiRootResourceId`,
          requestAuthorizerId: `/${stage}/gateway/authz/restApi/envs/requestAuthorizerId`,
        },
        caEventBusArn: `${ssmParametersRoot}/ca-event-bus-arn`,
        caExecuteQueryLambdaRoleArn: `${ssmParametersRoot}/ca-execute-query-lambda-role-arn`,
        caCrossAccountRoleArn: `${ssmParametersRoot}/ca-cross-account-role-arn`,
        slackAlertsEndpoint: `${ssmParametersRoot}/slack-alerts-endpoint`,
      },
      eventbridge: {
        platformEventBusName: `blaze-${stage}-platform-eventbus`,
      },
    },
    ca: {
      ssm: {
        glueDatabaseName: `${ssmParametersRoot}/glue-database-name`,
        glueCatalogName: `${ssmParametersRoot}/glue-catalog-name`,
        blazePulseTableName: `${ssmParametersRoot}/dynamodb-table-name`,
        writeToTableRoleArn: `${ssmParametersRoot}/write-to-table-role-arn`,
        icebergRawDataBucketName: `${ssmParametersRoot}/iceberg-raw-data-bucket-name`,
        eventBusName: `${ssmParametersRoot}/event-bus-name`,
        usAccountId: `${ssmParametersRoot}/us-account-id`,
        slackAlertsEndpoint: `${ssmParametersRoot}/slack-alerts-endpoint`,
      },
      s3: {
        usQueryResultsBucketName: `${projectName}-query-results-replica-bucket`,
      },
    },
  },
  deployedBy: process.env.DEPLOYED_BY || 'Github',
  validatedEnvs,
  githubRepo: 'GetGreenline/blaze-pulse',
} as const
