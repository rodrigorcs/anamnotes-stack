#!/usr/bin/env node
import 'source-map-support/register'
import { App } from 'aws-cdk-lib'
import { USBlazePulseStack } from '../stacks/us-stack'
import { config } from '../config'
import { stageValue } from '../lib/utils'
import { CABlazePulseStack } from '../stacks/ca-stack'

export const createUSStack = (app: App) =>
  new USBlazePulseStack(app, `${config.projectName}-stack`, {
    env: config.stack.env,
    description: `Resources for ${config.stage} Blaze Pulse`,
    terminationProtection: stageValue.bool(
      {
        production: true,
      },
      false,
    ),
    tags: {
      Project: config.projectName,
      DeployedBy: config.deployedBy,
      GithubRepo: config.githubRepo,
    },
  })

export const createCAStack = (app: App) =>
  new CABlazePulseStack(app, `${config.projectName}-stack`, {
    env: config.stack.env,
    description: `Resources for ${config.stage} Blaze Pulse`,
    terminationProtection: stageValue.bool(
      {
        production: true,
      },
      false,
    ),
    tags: {
      Project: config.projectName,
      DeployedBy: config.deployedBy,
      GithubRepo: config.githubRepo,
    },
  })

/**
 * We use an async function to initialize the CDK App so that we can make asynchronous calls to
 * the AWS SDK to get any information we need before deploying the CDK instead of using the CDK provided
 * context resolution to get that information
 */
export const createApp = () => {
  const app = new App()

  if (process.env.CA_DEPLOY) {
    const stack = createCAStack(app)
    return { app, stack }
  }

  const stack = createUSStack(app)
  return { app, stack }
}

if (process.env.NODE_ENV !== 'test') createApp()
