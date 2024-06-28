import { Metrics, MetricUnits } from '@aws-lambda-powertools/metrics'
import { config } from '../../config'

export { MetricUnits }

export const metrics = new Metrics({
  namespace: config.serviceName,
  serviceName: config.serviceName,
})
