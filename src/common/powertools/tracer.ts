import { eventBridgeClient, secretsManagerClient } from '../aws-sdk-clients'
import { Tracer } from '@aws-lambda-powertools/tracer/lib/Tracer'
import { logger } from './logger'
import { config } from '../../config'

const tracer = new Tracer({ serviceName: config.serviceName })

Object.values({ eventBridgeClient, secretsManagerClient }).forEach((client) =>
  tracer.captureAWSv3Client(client),
)

tracer.provider.setLogger(logger)

export { tracer }
