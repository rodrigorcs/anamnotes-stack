import { QueryResponse } from 'dynamoose/dist/ItemRetriever'
import { IQueryExecution } from '../models/contracts/QueryExecution'
import { TQueryExecutionSchema } from '../models/schemas/QueryExecutions/schema'
import { QueryExecutionsRepository } from '../repositories/QueryExecutionsRepository'
import { v4 as uuid } from 'uuid'
import dayjs from 'dayjs'
import { PickWithPartial } from '../models/utils'

export class QueryExecutionsService {
  private repository: QueryExecutionsRepository
  public readonly queryExecutionId: string = uuid()

  constructor() {
    this.repository = new QueryExecutionsRepository()
  }

  public convertEntityToContract(entity: TQueryExecutionSchema): IQueryExecution {
    return {
      ...entity,
      date: dayjs(entity.date),
      executedAt: dayjs(entity.executedAt),
    }
  }

  private convertEntitiesToContracts(
    entities: QueryResponse<TQueryExecutionSchema>,
  ): IQueryExecution[] {
    return entities.map((entity) => this.convertEntityToContract(entity))
  }

  public async create(contract: IQueryExecution) {
    return this.repository.create(contract)
  }

  public async bulkCreate(contracts: IQueryExecution[]) {
    return this.repository.bulkCreate(contracts)
  }

  public async update(contract: PickWithPartial<IQueryExecution, 'merchantId' | 'date'>) {
    return this.repository.update(contract)
  }

  public async get({ merchantId, date }: Pick<IQueryExecution, 'merchantId' | 'date'>) {
    const entities = await this.repository.get({ merchantId, date })
    const contracts = this.convertEntitiesToContracts(entities)

    return contracts
  }

  public async getOne({ merchantId, date }: Pick<IQueryExecution, 'merchantId' | 'date'>) {
    const [firstEntity] = await this.repository.get({ merchantId, date })
    const contract = this.convertEntityToContract(firstEntity)

    return contract
  }
}
