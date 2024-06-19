import { Client as DBClient } from 'pg'
import QueryStream from 'pg-query-stream'
import { IRDSDatabaseCredentialsSecret } from '../models/contracts/Secrets'
import { logger } from '../common/powertools/logger'

interface ISalesRepositoryInput {
  dbCredentials: IRDSDatabaseCredentialsSecret
}

export class USMonolithRepository {
  private dbClient: DBClient

  constructor({ dbCredentials }: ISalesRepositoryInput) {
    this.dbClient = new DBClient({
      host: dbCredentials.host,
      port: dbCredentials.port,
      user: dbCredentials.username,
      password: dbCredentials.password,
      database: dbCredentials.dbname,
    })
  }

  private startQueryStream = async ({
    queryString,
    streamCallback,
  }: {
    queryString: string
    streamCallback: (stream: QueryStream) => Promise<void>
  }) => {
    try {
      await this.dbClient.connect()
      logger.info('Connected to the database')
    } catch (error) {
      logger.error('Error connecting to the database', { error })
      throw error
    }

    this.dbClient.on('error', (error) => {
      throw error
    })

    const queryStream = new QueryStream(queryString)
    const dbStream = this.dbClient.query(queryStream)

    await streamCallback(dbStream)

    await this.dbClient.end()
  }

  public getMetrics = async ({
    queryString,
    streamCallback,
  }: {
    queryString: string
    streamCallback: (stream: QueryStream) => Promise<void>
  }) => {
    await this.startQueryStream({
      queryString,
      streamCallback,
    })
    return queryString
  }
}
