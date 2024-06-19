export const Constants = {
  BranchMappedEnv: '${{ inputs.environment }}',
  WorkflowUrl:
    'https://github.com/${{ env.GITHUB_REPOSITORY }}/actions/runs/${{ env.GITHUB_RUN_ID }}',
  NodeVersion: '20.x',
  AwsRegionName: 'us-east-1',
}
