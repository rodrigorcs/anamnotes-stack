import { QueryResponse } from 'dynamoose/dist/ItemRetriever'
import { v4 as uuid } from 'uuid'
import dayjs from 'dayjs'
import { IConversation, IConversationWithSummarizations } from '../models/contracts/Conversation'
import { TConversationSchema } from '../models/schemas/Conversation/schema'
import { ConversationsRepository } from '../repositories/ConversationsRepository'
import { TSummarizationSchema } from '../models/schemas/Summarization/schema'

export class ConversationsService {
  private repository: ConversationsRepository
  public readonly queryExecutionId: string = uuid()

  constructor() {
    this.repository = new ConversationsRepository()
  }

  private convertEntitiesToConversationContract({
    conversationEntity,
    summarizationEntities,
  }: {
    conversationEntity: TConversationSchema
    summarizationEntities: TSummarizationSchema[]
  }): IConversationWithSummarizations {
    const summarizationContracts = summarizationEntities.map((summarizationEntity) => ({
      id: summarizationEntity.id,
      content: summarizationEntity.content,
      createdAt: dayjs(summarizationEntity.createdAt),
      updatedAt: dayjs(summarizationEntity.updatedAt),
    }))

    return {
      id: conversationEntity.id,
      userId: conversationEntity.userId,
      summarizations: summarizationContracts,
      createdAt: dayjs(conversationEntity.createdAt),
      updatedAt: dayjs(conversationEntity.updatedAt),
    }
  }

  private convertEntitiesToConversationContracts(
    entities: QueryResponse<TConversationSchema | TSummarizationSchema>,
  ): IConversationWithSummarizations[] {
    const conversationEntities = entities.filter(
      (entity) => !entity.sk.includes('summarization'),
    ) as TConversationSchema[]

    return conversationEntities.map((conversationEntity) => {
      const summarizationEntities = entities.filter((entity) => {
        return (
          entity.sk.includes('summarization') &&
          (entity as TSummarizationSchema).conversationId === conversationEntity.id
        )
      }) as TSummarizationSchema[]

      return this.convertEntitiesToConversationContract({
        conversationEntity,
        summarizationEntities,
      })
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
    const contracts = this.convertEntitiesToConversationContracts(entities)

    return contracts
  }

  public async getOne({ userId, id }: Pick<IConversation, 'userId' | 'id'>) {
    const entities = await this.repository.get({ userId, id })

    const conversationEntity = entities.find((entity) => !entity.sk.includes('summarization'))
    if (!conversationEntity) throw new Error('Conversation not found')

    const summarizationEntities = entities.filter((entity) =>
      entity.sk.includes('summarization'),
    ) as TSummarizationSchema[]

    const contract = this.convertEntitiesToConversationContract({
      conversationEntity,
      summarizationEntities,
    })

    return contract
  }
}
