import * as AWSClients from '../aws-sdk-clients/clients'

import { Tracer } from '@aws-lambda-powertools/tracer/lib/Tracer'
import { logger } from './logger'
import { config } from '../../config'

const tracer = new Tracer({ serviceName: config.serviceName })

Object.values(AWSClients).forEach((client) => tracer.captureAWSv3Client(client))

tracer.provider.setLogger(logger)

export { tracer }
