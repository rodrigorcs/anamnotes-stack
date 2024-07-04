// import { QueryResponse } from 'dynamoose/dist/ItemRetriever'
import { v4 as uuid } from 'uuid'
import dayjs from 'dayjs'
import { IConversation, IConversationWithSummarizations } from '../models/contracts/Conversation'
import { TConversationSchema } from '../models/schemas/Conversation/schema'
import { ConversationsRepository } from '../repositories/ConversationsRepository'
import { TSummarizationSchema } from '../models/schemas/Summarization/schema'
import { logger } from '../common/powertools/logger'

export class ConversationsService {
  private repository: ConversationsRepository
  public readonly queryExecutionId: string = uuid()

  constructor() {
    this.repository = new ConversationsRepository()
  }

  public convertEntitiesToConversationContract(
    allEntities: (TConversationSchema | TSummarizationSchema)[],
  ): IConversationWithSummarizations {
    logger.info('allEntities', { allEntities })

    const summarizationEntities = allEntities.filter((entity) =>
      entity.sk.includes('summarization'),
    ) as TSummarizationSchema[]
    logger.info('summarizationEntities', { summarizationEntities })

    const summarizationContracts = summarizationEntities.map((summarizationEntity) => ({
      id: summarizationEntity.id,
      content: summarizationEntity.content,
      createdAt: dayjs(summarizationEntity.createdAt),
      updatedAt: dayjs(summarizationEntity.updatedAt),
    }))
    logger.info('summarizationContracts', { summarizationContracts })

    const conversationEntity = allEntities.find(
      (entity) => !entity.sk.includes('summarization'),
    ) as TConversationSchema
    logger.info('conversationEntity', { conversationEntity })

    return {
      id: conversationEntity.id,
      userId: conversationEntity.userId,
      summarizations: summarizationContracts,
      createdAt: dayjs(conversationEntity.createdAt),
      updatedAt: dayjs(conversationEntity.updatedAt),
    }
  }

  // private convertEntitiesToContracts(
  //   entities: QueryResponse<TConversationSchema>,
  // ): IConversation[] {
  //   return entities.map((entity) => this.convertEntitiesToConversationContract(entity))
  // }

  public async create(contract: IConversation) {
    return this.repository.create(contract)
  }

  // public async get({
  //   userId,
  //   id,
  // }: Pick<IConversation, 'userId'> & Partial<Pick<IConversation, 'id'>>) {
  //   const entities = await this.repository.get({ userId, id })
  //   const contracts = this.convertEntitiesToContracts(entities)

  //   return contracts
  // }

  public async getOne({ userId, id }: Pick<IConversation, 'userId' | 'id'>) {
    const entities = await this.repository.get({ userId, id })
    const contract = this.convertEntitiesToConversationContract(entities)

    return contract
  }
}
