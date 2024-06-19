import { JobNeeds, NormalJob } from '@getgreenline/github-actions-wac'
import { gaUtils } from '@getgreenline/infra-utils'

const {
  checkout,
  multiline
} = gaUtils

export const notifyFailureWorkflow = ({ 
  needs,
  jobIf,
  failureText
}: { 
  needs?: JobNeeds,
  jobIf?: NormalJob['if']
  failureText: string
}): NormalJob => ({
  'runs-on': 'ubuntu-latest',
  needs,
  if: jobIf,
  'timeout-minutes': 2,
  steps: [
    checkout({ uses: 'actions/checkout@v3' }),
    {
      name: 'Extract current branch name',
      run: 'echo "BRANCH_NAME=${GITHUB_REF#refs/heads/}" >> $GITHUB_ENV'
    },
    {
      name: 'Extract current branch name and other github info',
      run: multiline(
        'echo "GITHUB_REPOSITORY=${GITHUB_REPOSITORY}" >> $GITHUB_ENV',
        'echo "GITHUB_RUN_ID=${GITHUB_RUN_ID}" >> $GITHUB_ENV'
      )
    },
    {
      name: 'Determine which job failed',
      id: 'failed_job',
      uses: 'actions/github-script@v6',
      with: {
        script: multiline(
          'const needs = JSON.parse(process.env.NEEDS)',
          'console.log(needs)',
          "return Object.keys(needs).reduce((acc, job) => acc === '' && needs[`${job}`].result === 'failure' ? job : acc, '')",
        ),
        'result-encoding': 'string'            
      },
      env: {
        NEEDS: '${{ toJSON(needs) }}'
      }
    },
    {
      name: 'Send message to Slack API',
      uses: 'GetGreenline/github-actions-slack@416029e5d5cac6ccce0b1993e76dc99c9a897954',
      id: 'notify',
      with: {
        'slack-bot-user-oauth-access-token': '${{ secrets.SLACK_BOT_USER_OAUTH_ACCESS_TOKEN }}',
        'slack-channel': "${{ env.BRANCH_NAME == 'main' && secrets.SLACK_DEV_CHANNEL || secrets.SLACK_DEV_DEPLOYMENTS_CHANNEL }}",
        'slack-optional-unfurl_links': false,
        'slack-text': failureText,
        'slack-optional-icon_emoji': ':warning:',
      }
    }
  ]
})