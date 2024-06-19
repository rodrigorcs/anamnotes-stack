import { NormalJob, ReusableWorkflowCallJob } from '@getgreenline/github-actions-wac'
import { accountNumberMapping, appStageMapping, environmentToBranchMapping } from './branchMaps'
import { gaUtils } from '@getgreenline/infra-utils'
import { notifyFailureWorkflow } from '../helpers/workflowHelpers'
import { testFailureText } from './slackMessages'
import { Constants } from './constants'

const {
  workflowContext,
  checkout,
  setupNode,
  setNpmToken,
  yarnCache,
  multiline
} = gaUtils

let reusableWorkflowCallJobs: { [key: string]: ReusableWorkflowCallJob } = {}

for (const environment of Object.keys(environmentToBranchMapping)) {
  reusableWorkflowCallJobs[environment] = {
    name: `Trigger ${environment} deployment`,
    with: {
      stage: appStageMapping[environment],
      aws_account_number_name: accountNumberMapping[environment],
      aws_region_name: Constants.AwsRegionName
    },
    needs: 'RunTests',
    if: `contains(github.ref, 'refs/heads/${environmentToBranchMapping[environment]}') && needs.RunTests.result == 'success'`,
    uses: './.github/workflows/deploy.yml',
    secrets: {
      SLACK_BOT_USER_OAUTH_ACCESS_TOKEN: workflowContext.secrets('SLACK_BOT_USER_OAUTH_ACCESS_TOKEN'),
      NPM_TOKEN: workflowContext.secrets('NPM_TOKEN'),

      SLACK_DEV_CHANNEL: workflowContext.secrets('SLACK_DEV_CHANNEL'),
      SLACK_DEV_DEPLOYMENTS_CHANNEL: workflowContext.secrets('SLACK_DEV_DEPLOYMENTS_CHANNEL')
    },
  }
}

const yarnCacheJobs = [
  yarnCache.setupCache({
    name: 'Set Yarn cache for app',
    id: 'app-cache-yarn-cache',
    with: {
      path: 'yarn.lock',
      key: "${{ runner.os }}-yarn-${{ hashFiles('yarn.lock') }}",
      'restore-keys': '${{ runner.os }}-yarn-',
    },
  }),
  yarnCache.cacheNodeModules({
    name: 'Cache node_modules for app',
    id: 'app-cache-node-modules',
    with: {
      path: 'node_modules',
      key: "${{ runner.os }}-${{ matrix.node-version }}-nodemodules-${{ hashFiles('yarn.lock') }}",
      'restore-keys': '${{ runner.os }}-${{ matrix.node-version }}-nodemodules-',
    },
  }),
  yarnCache.installNodePackagesFromCache({
    name: 'Install app dependencies',
    if: "steps.app-cache-yarn-cache.outputs.cache-hit != 'true' || steps.app-cache-node-modules.outputs.cache-hit != 'true'"
  }),
  yarnCache.setupCache({
    name: 'Set Yarn cache for infra',
    id: 'infra-cache-yarn-cache',
    with: {
      path: 'infra/yarn.lock',
      key: "${{ runner.os }}-yarn-${{ hashFiles('infra/yarn.lock') }}",
      'restore-keys': '${{ runner.os }}-yarn-',
    },
  }),
  yarnCache.cacheNodeModules({
    name: 'Cache node_modules for infra',
    id: 'infra-cache-node-modules',
    with: {
      path: 'infra/node_modules',
      key: "${{ runner.os }}-${{ matrix.node-version }}-nodemodules-${{ hashFiles('infra/yarn.lock') }}",
      'restore-keys': '${{ runner.os }}-${{ matrix.node-version }}-nodemodules-',
    },
  }),
  yarnCache.installNodePackagesFromCache({
    name: 'Install infra dependencies',
    if: "steps.infra-cache-yarn-cache.outputs.cache-hit != 'true' || steps.infra-cache-node-modules.outputs.cache-hit != 'true'",
    'working-directory': './infra'
  })
]

const testJobs: { [key: string]: NormalJob } = {
  RunTests: {
    'runs-on': 'ubuntu-latest',
    name: 'Test',
    'timeout-minutes': 10,
    steps: [
      checkout({ uses: 'actions/checkout@v3' }),
      setupNode({
        uses: 'actions/setup-node@v3',
        with: {
          'node-version': Constants.NodeVersion
        }
      }),
      setNpmToken(),
      ...yarnCacheJobs,
      {
        name: 'Extract current branch name',
        run: 'echo "BRANCH_NAME=${GITHUB_REF#refs/heads/}" >> $GITHUB_ENV'
      },
      {
        name: 'Download build artifacts',
        uses: 'actions/download-artifact@v3',
      },
      {
        name: 'Run Tests',
        run: 'yarn test',
      },
      {
        name: 'Cancel entire workflow immediately on test failure',
        if: "${{ failure() }}",
        uses: 'GetGreenline/cancel-action@72f3be561937e7cefd2f42b6817c0b371b4e9f43'
      }
    ]
  },

  TestNotifyFailure: notifyFailureWorkflow({
    needs: ['RunTests'],
    jobIf: "always() && needs.RunTests.result != 'success'",
    failureText: testFailureText
  })
}

export {
  testJobs,
  yarnCacheJobs,
  reusableWorkflowCallJobs
}