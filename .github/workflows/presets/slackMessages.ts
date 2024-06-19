import { generateSlackMessage } from '../helpers/stringHelpers'
import { Constants } from './constants'

export const successText = generateSlackMessage([
  `Nice!! Successful Deployment of GetGreenline API ECS Services to ${Constants.BranchMappedEnv}!`,
  '*Owner*: ${{ github.event.sender.login }}',
  '*Environment*: ${{ inputs.environment }}',
  `*Workflow*: ${Constants.WorkflowUrl}`
])

export const failureText = generateSlackMessage([
  "Deployment of Greenline-API: ${{ steps.failed_job.outputs.result }} " + `to ${Constants.BranchMappedEnv} failed`,
  '*Failed Job*: ${{ steps.failed_job.outputs.result }}',
  '*Merger*: ${{ github.event.sender.login }}',
  `*Workflow*: ${Constants.WorkflowUrl}`
])

export const testFailureText = generateSlackMessage([
  `${Constants.BranchMappedEnv} Greenline-API Automated Test Failure`,
  '*Merger*: ${{ github.event.sender.login }}',
  `*Workflow*: ${Constants.WorkflowUrl}`
])
