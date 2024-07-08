import { QueryResponse } from 'dynamoose/dist/ItemRetriever'
import { v4 as uuid } from 'uuid'
import dayjs from 'dayjs'
import { IConversation } from '../models/contracts/Conversation'
import { TConversationSchema } from '../models/schemas/Conversation/schema'
import { ConversationsRepository } from '../repositories/ConversationsRepository'

export class ConversationsService {
  private repository: ConversationsRepository
  public readonly queryExecutionId: string = uuid()

  constructor() {
    this.repository = new ConversationsRepository()
  }

  private convertEntityToContract(entity: TConversationSchema): IConversation {
    return {
      id: entity.id,
      userId: entity.userId,
      client: entity.client,
      createdAt: dayjs(entity.createdAt),
      updatedAt: dayjs(entity.updatedAt),
    }
  }

  private convertEntitiesToContracts(
    entities: QueryResponse<TConversationSchema>,
  ): IConversation[] {
    return entities.map((entity) => {
      return this.convertEntityToContract(entity)
    })
  }

  public async create(contract: IConversation) {
    return this.repository.create(contract)
  }

  public async get({
    userId,
    id,
  }: Pick<IConversation, 'userId'> & Partial<Pick<IConversation, 'id'>>) {
    const entities = await this.repository.get({ userId, id })
    const contracts = this.convertEntitiesToContracts(entities)

    return contracts
  }

  public async getOne({ userId, id }: Pick<IConversation, 'userId' | 'id'>) {
    const entities = await this.repository.get({ userId, id })
    const contract = this.convertEntityToContract(entities[0])

    return contract
  }
}
