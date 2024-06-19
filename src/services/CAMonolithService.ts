import { Dayjs } from 'dayjs'
import { CAMonolithRepository } from '../repositories/CAMonolithRepository'

export class CAMonolithService {
  private repository: CAMonolithRepository

  constructor() {
    this.repository = new CAMonolithRepository()
  }

  public setRepository(repository: CAMonolithRepository) {
    this.repository = repository
  }

  public getMetrics = async ({ companyIds, date }: { companyIds: string[]; date: Dayjs }) => {
    const athenaResponse = await this.repository.getMetrics({ companyIds, date })

    const queryExecutionId = athenaResponse.QueryExecutionId
    if (!queryExecutionId) throw new Error('queryExecutionId was not provided by Athena')

    return { queryExecutionId }
  }
}
