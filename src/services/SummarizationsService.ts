import { QueryResponse } from 'dynamoose/dist/ItemRetriever'
import { v4 as uuid } from 'uuid'
import dayjs from 'dayjs'
import { TSummarizationSchema } from '../models/schemas/Summarization/schema'
import { ISummarization } from '../models/contracts/Summarization'
import { SummarizationsRepository } from '../repositories/SummarizationsRepository'

export class SummarizationsService {
  private repository: SummarizationsRepository
  public readonly queryExecutionId: string = uuid()

  constructor() {
    this.repository = new SummarizationsRepository()
  }

  private convertEntityToContract(entity: TSummarizationSchema): ISummarization {
    return {
      id: entity.id,
      userId: entity.userId,
      conversationId: entity.conversationId,
      content: entity.content,
      createdAt: dayjs(entity.createdAt),
      updatedAt: dayjs(entity.updatedAt),
    }
  }

  private convertEntitiesToContracts(
    entities: QueryResponse<TSummarizationSchema>,
  ): ISummarization[] {
    return entities.map((entity) => {
      return this.convertEntityToContract(entity)
    })
  }

  public async create(contract: ISummarization) {
    return this.repository.create(contract)
  }

  public async get({
    userId,
    conversationId,
    id,
  }: Pick<ISummarization, 'userId' | 'conversationId'> & Partial<Pick<ISummarization, 'id'>>) {
    const entities = await this.repository.get({ userId, conversationId, id })
    const contracts = this.convertEntitiesToContracts(entities)

    return contracts
  }

  public async getOne({
    userId,
    conversationId,
    id,
  }: Pick<ISummarization, 'userId' | 'conversationId' | 'id'>) {
    const entities = await this.repository.get({ userId, conversationId, id })
    const contract = this.convertEntityToContract(entities[0])

    return contract
  }
}
