const stage = process.env.STAGE as 'staging' | 'prod' | 'local'
const infraServiceId = 'anamnotes-stack'

export const config = {
  serviceName: 'AnamnotesStack',
  stage,
  infraServiceId,
  infraServiceName: `${stage}-${infraServiceId}`,
} as const
