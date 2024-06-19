const stage = process.env.STAGE as 'sandbox' | 'staging' | 'prod' | 'local'
const infraServiceId = 'blaze-pulse'

export const config = {
  serviceName: 'BlazePulse',
  stage,
  infraServiceId,
  infraServiceName: `${stage}-${infraServiceId}`,
} as const
