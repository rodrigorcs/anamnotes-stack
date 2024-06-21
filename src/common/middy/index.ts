import 'reflect-metadata'
import middy from '@middy/core'
import httpErrorHandler from '@middy/http-error-handler'
import cors from '@middy/http-cors'
import { Handler } from 'aws-lambda'
import { injectLambdaContext } from '@aws-lambda-powertools/logger'
import { captureLambdaHandler } from '@aws-lambda-powertools/tracer'
import { logMetrics } from '@aws-lambda-powertools/metrics'
import { metrics } from '../powertools/metrics'
import { tracer } from '../powertools/tracer'
import { logger } from '../powertools/logger'

export const middyWrapper = <T>(
  handler: Handler<T>,
  {
    isSQSHandler = false,
    otherMiddlewares,
  }: {
    isSQSHandler?: boolean
    otherMiddlewares?: middy.MiddlewareObj[]
  } = {},
) => {
  // https://middy.js.org/docs/intro/testing/
  const timeout = process.env.STAGE === 'test' ? 0 : undefined
  const middifiedHandler = middy(handler, { timeoutEarlyInMillis: timeout })

  if (process.env.STAGE !== 'test') {
    middifiedHandler
      .use(injectLambdaContext(logger.logger))
      .use(captureLambdaHandler(tracer))
      .use(logMetrics(metrics, { captureColdStartMetric: true }))
  }

  // do not enable cors and http error handler for SQS handlers
  if (!isSQSHandler) {
    middifiedHandler
      .use(
        cors({
          origins: ['*'],
          credentials: true,
          headers: 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
          methods: 'OPTIONS,GET,POST,PATCH,PUT,DELETE',
        }),
      )
      .use(httpErrorHandler())
  }

  if (otherMiddlewares) {
    middifiedHandler.use(otherMiddlewares)
  }

  return middifiedHandler
}
