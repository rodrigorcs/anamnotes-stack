import { S3Handler } from 'aws-lambda'
import { logger } from '../../common/powertools/logger'
import { logAndReportError } from '../../lib/helpers/errors'
import { downloadFileFromBucket, getS3ObjectMetadata } from '../../lib/helpers/s3'
import { Readable } from 'stream'
import { parseStream } from 'fast-csv'
import { IMetricsQueryOutput } from '../../models/contracts/MetricsQueryOutput'
import { IQueryExecution } from '../../models/contracts/QueryExecution'
import { EPos } from '../../models/contracts/utils'
import dayjs from 'dayjs'
import { MetricsAction } from '../../actions/MetricsAction'
import { configureCrossAccountDynamoDBClient } from '../../lib/helpers/dynamodb'
import { assumeRole } from '../../lib/helpers/sts'

export const handler: S3Handler = async (event) => {
  logger.info('Ingested event', { event })

  for (const record of event.Records) {
    try {
      logger.info('Ingested record', {
        record,
      })
      const metricsAction = new MetricsAction()

      const bucketName = decodeURIComponent(record.s3.bucket.name)
      const objectKey = decodeURIComponent(record.s3.object.key)

      const { ASSUMED_ROLE_ARN } = process.env as Record<string, string>

      const assumedRoleCredentials = await assumeRole(ASSUMED_ROLE_ARN)
      configureCrossAccountDynamoDBClient({
        region: 'us-east-1',
        credentials: assumedRoleCredentials,
      })

      const [objectPath] = objectKey.split('.')
      const [dateISOString] = objectPath.split('/')

      const objectMetadata = await getS3ObjectMetadata({
        bucketName,
        objectKey,
      })

      const metricsFileBuffer = await downloadFileFromBucket({
        bucketName,
        objectKey,
      })

      const fileStream = Readable.from(metricsFileBuffer)
      const queryExecutions: IQueryExecution[] = []

      await new Promise((resolve, reject) => {
        parseStream(fileStream, { headers: true, objectMode: true })
          .on('data', (row: IMetricsQueryOutput) => {
            if (row)
              queryExecutions.push({
                date: dayjs(dateISOString),
                executedAt: dayjs(objectMetadata.LastModified),
                merchantId: `blc-${row.company_id}`,
                paymentsCount: parseInt(row.payments_count),
                paymentsTotalSum: parseInt(row.payments_totals_sum),
                pos: EPos.CA,
              })
          })
          .on('error', reject)
          .on('end', resolve)
      })

      logger.info('queryExecutions', { queryExecutions })

      await metricsAction.saveMetrics(queryExecutions)

      logger.info('Success')
    } catch (error) {
      await logAndReportError('Error occurred while saving the results', error)
    }
  }
}
