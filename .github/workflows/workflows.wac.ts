import { createWorkflow } from '@getgreenline/github-actions-wac'
import { gaUtils } from '@getgreenline/infra-utils'
import { Constants } from './presets/constants'
import { reusableWorkflowCallJobs, yarnCacheJobs, testJobs } from './presets/workflowJobs'

const { checkout, setupNode, setNpmToken, configureAwsCredentials, multiline, workflowContext } =
  gaUtils

const environmentToBranchMapping: { [key: string]: string } = {
  sandbox: 'sandbox',
  staging: 'staging',
  prod: 'main',
}

for (const environment of Object.keys(environmentToBranchMapping)) {
  reusableWorkflowCallJobs[environment] = {
    name: `Trigger ${environment} deployment`,
    with: { environment },
    if: `contains(github.ref, 'refs/heads/${environmentToBranchMapping[environment]}')`,
    uses: './.github/workflows/deploy.yml',
    secrets: {
      SLACK_BOT_USER_OAUTH_ACCESS_TOKEN: workflowContext.secrets(
        'SLACK_BOT_USER_OAUTH_ACCESS_TOKEN',
      ),
      NPM_TOKEN: workflowContext.secrets('NPM_TOKEN'),
    },
  }
}

/**
 * Workflows
 *
 * The triggers workflow is used to trigger the deploy workflow for the
 * respective environment.
 */

export const triggers = createWorkflow({
  name: 'Trigger Environment Deploy Workflow',
  on: {
    push: {
      branches: ['sandbox', 'staging', 'main'],
    },
    // so that it can be triggered manually from the Actions tab
    workflow_dispatch: {},
  },
  jobs: {
    ...testJobs,
    ...reusableWorkflowCallJobs,
  },
})

const workingDirOpt = { 'working-directory': './infra' }

export const deploy = createWorkflow({
  name: 'Build App and Deploy Workflow',
  on: {
    workflow_call: {
      inputs: {
        environment: { required: true, type: 'string' },
      },
      secrets: {
        SLACK_BOT_USER_OAUTH_ACCESS_TOKEN: { required: false },
        NPM_TOKEN: { required: true },
      },
    },
  },
  jobs: {
    DeployUSApp: {
      'runs-on': 'ubuntu-latest',
      permissions: {
        contents: 'read',
        'id-token': 'write',
      },
      environment: workflowContext.inputs('environment'),
      steps: [
        checkout({ uses: 'actions/checkout@v3' }),
        setupNode({
          uses: 'actions/setup-node@v3',
          with: {
            'node-version': Constants.NodeVersion,
          },
        }),
        setNpmToken(),
        ...yarnCacheJobs,
        configureAwsCredentials({
          with: {
            'role-to-assume': `arn:aws:iam::${workflowContext.vars(
              'US_AWS_ACCOUNT_NUMBER',
            )}:role/GitHub-OCID`,
            'role-duration-seconds': 900,
            'aws-region': `${workflowContext.vars('US_AWS_REGION')}`,
          },
        }),
        {
          name: 'Build app',
          run: 'yarn build',
        },
        {
          name: 'Deploy and Synth',
          run: multiline('npx cdk synth', 'npx cdk deploy --require-approval never'),
          env: {
            CDK_DEFAULT_ACCOUNT: workflowContext.vars('US_AWS_ACCOUNT_NUMBER'),
            AWS_DEFAULT_REGION: workflowContext.vars('US_AWS_REGION'),
            DEPLOYED_BY: 'github.actions',
            DEPLOYMENT_ENV: 'ci',
            STAGE: workflowContext.vars('STAGE'),
          },
          ...workingDirOpt,
        },
      ],
    },
    DeployCAApp: {
      'runs-on': 'ubuntu-latest',
      permissions: {
        contents: 'read',
        'id-token': 'write',
      },
      environment: workflowContext.inputs('environment'),
      steps: [
        checkout({ uses: 'actions/checkout@v3' }),
        setupNode({
          uses: 'actions/setup-node@v3',
          with: {
            'node-version': Constants.NodeVersion,
          },
        }),
        setNpmToken(),
        ...yarnCacheJobs,
        configureAwsCredentials({
          with: {
            'role-to-assume': `arn:aws:iam::${workflowContext.vars(
              'CA_AWS_ACCOUNT_NUMBER',
            )}:role/github-actions-private-repo-deployment-role`,
            'role-duration-seconds': 900,
            'aws-region': `${workflowContext.vars('CA_AWS_REGION')}`,
          },
        }),
        {
          name: 'Build app',
          run: 'yarn build',
        },
        {
          name: 'Deploy and Synth',
          run: multiline('npx cdk synth', 'npx cdk deploy --require-approval never'),
          env: {
            CDK_DEFAULT_ACCOUNT: workflowContext.vars('CA_AWS_ACCOUNT_NUMBER'),
            AWS_DEFAULT_REGION: workflowContext.vars('CA_AWS_REGION'),
            CA_DEPLOY: 'true',
            DEPLOYED_BY: 'github.actions',
            DEPLOYMENT_ENV: 'ci',
            STAGE: workflowContext.vars('STAGE'),
          },
          ...workingDirOpt,
        },
      ],
    },
  },
})
