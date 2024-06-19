import { uploadMultipartObjectToBucket } from '../lib/helpers/s3'
import { IRDSDatabaseCredentialsSecret } from '../models/contracts/Secrets'
import { USMonolithRepository } from '../repositories/USMonolithRepository'
import { Readable, Transform } from 'stream'
import { stringify as csvStringify } from 'csv-stringify'
import QueryStream from 'pg-query-stream'

const formatSaleItem = (item: Record<string, unknown>) => {
  return Object.fromEntries(
    Object.entries(item).map(([key, value]) => {
      if (value === null || value === undefined || value === '') return [key, 'null']
      return [key, value]
    }),
  )
}

export class USMonolithService {
  private repository: USMonolithRepository

  constructor(dbCredentials: IRDSDatabaseCredentialsSecret) {
    this.repository = new USMonolithRepository({ dbCredentials })
  }

  private convertDBStreamToCSV = (dbStream: QueryStream) => {
    const dataFormatter = new Transform({
      objectMode: true,
      transform(chunk, encoding, callback) {
        this.push(formatSaleItem(chunk))
        callback()
      },
    })

    const csvStringifier = csvStringify({
      objectMode: true,
      header: true,
      quoted: true,
      quoted_empty: true,
      cast: {
        boolean: (value) => (value ? 'true' : 'false'),
      },
    })

    return Readable.from(dbStream.pipe(dataFormatter).pipe(csvStringifier))
  }

  public setRepository(repository: USMonolithRepository) {
    this.repository = repository
  }

  public getMetrics = async ({
    queryExecutionId,
    queryString,
  }: {
    queryExecutionId: string
    queryString: string
  }) => {
    const { QUERY_RESULTS_BUCKET_NAME } = process.env as Record<string, string>

    const queryStringFromDB = await this.repository.getMetrics({
      queryString,
      streamCallback: (dbStream) => {
        const fileStream = this.convertDBStreamToCSV(dbStream)

        return uploadMultipartObjectToBucket({
          bucketName: QUERY_RESULTS_BUCKET_NAME,
          fileName: '',
          fileStream: fileStream,
        })
      },
    })

    return { queryString: queryStringFromDB, queryExecutionId }
  }
}
