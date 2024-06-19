import {
  AthenaClient,
  StartQueryExecutionCommandInput,
  StartQueryExecutionCommand,
} from '@aws-sdk/client-athena'
import { logger } from '../common/powertools/logger'
import { getMetricsQueryByPOS } from '../models/queries'
import { Dayjs } from 'dayjs'

export class CAMonolithRepository {
  private athenaClient: AthenaClient
  private athenaWorkgroupName: string
  private glueCatalogName: string
  private glueDatabaseName: string
  private athenaOutputBucket: string

  constructor() {
    const {
      AWS_REGION,
      ATHENA_WORKGROUP_NAME,
      GLUE_CATALOG_NAME,
      GLUE_DATABASE_NAME,
      ATHENA_OUTPUT_BUCKET_NAME,
    } = process.env as Record<string, string>

    this.athenaClient = new AthenaClient({ region: AWS_REGION })
    this.athenaWorkgroupName = ATHENA_WORKGROUP_NAME
    this.glueCatalogName = GLUE_CATALOG_NAME
    this.glueDatabaseName = GLUE_DATABASE_NAME
    this.athenaOutputBucket = ATHENA_OUTPUT_BUCKET_NAME
  }

  private startQueryExecution = async ({
    queryString,
    date,
  }: {
    queryString: string
    date: Dayjs
  }) => {
    const input: StartQueryExecutionCommandInput = {
      WorkGroup: this.athenaWorkgroupName,
      ResultConfiguration: {
        OutputLocation: `s3://${this.athenaOutputBucket}/${date.toISOString()}/`,
      },
      QueryExecutionContext: {
        Catalog: this.glueCatalogName,
        Database: this.glueDatabaseName,
      },
      QueryString: queryString,
    }

    logger.info('Query sent to Athena...', { queryString })
    const command = new StartQueryExecutionCommand(input)
    const response = await this.athenaClient.send(command)
    logger.info('Response from Athena...', { response })

    return response
  }

  public getMetrics = ({ companyIds, date }: { companyIds: string[]; date: Dayjs }) => {
    const queryString = getMetricsQueryByPOS({ companyIds, date })
    if (!queryString) throw new Error('Query not found')

    return this.startQueryExecution({ queryString, date })
  }
}
