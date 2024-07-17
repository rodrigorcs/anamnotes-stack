#!/usr/bin/env node
import 'source-map-support/register'
import { App } from 'aws-cdk-lib'
import { AnamnotesStack } from '../stacks/stack'
import { config } from '../config'
import { stageValue } from '../lib/helpers'

export const createStack = (app: App) =>
  new AnamnotesStack(app, config.projectName, {
    env: config.stack.env,
    description: `Resources for ${config.stage} Anamnotes`,
    terminationProtection: stageValue({
      staging: false,
      prod: false, // TODO: Set to true when ready for prod
    }),
    tags: {
      Project: config.projectName,
      DeployedBy: config.deployedBy,
      GithubRepo: config.githubRepo,
    },
  })

export const createApp = () => {
  const app = new App()

  const stack = createStack(app)
  return { app, stack }
}

if (process.env.NODE_ENV !== 'test') createApp()
