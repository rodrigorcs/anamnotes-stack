import { createDBKey } from '../lib/helpers/dynamodb'
import { ISummarization, ISummarizationKeys } from '../models/contracts/Summarization'
import { SummarizationDBModel } from '../models/schemas/Summarization/model'

type TPrimaryKeysParams = Pick<ISummarization, 'userId' | 'conversationId' | 'id'>
type TPartialPrimaryKeysParams = Pick<ISummarization, 'userId'> &
  Partial<Pick<ISummarization, 'conversationId' | 'id'>>

const getPrimaryKeys = ({ userId, conversationId, id }: TPrimaryKeysParams) => {
  return {
    pk: createDBKey<ISummarizationKeys>([{ userId }]),
    sk: createDBKey<ISummarizationKeys>([
      { summarization: undefined },
      { conversationId },
      { summarizationId: id },
    ]),
  }
}

const getPartialPrimaryKeys = ({ userId, conversationId, id }: TPartialPrimaryKeysParams) => {
  return {
    pk: createDBKey<ISummarizationKeys>([{ userId }]),
    sk: createDBKey<ISummarizationKeys>([
      { summarization: undefined },
      ...(conversationId ? [{ conversationId }] : []),
      ...(conversationId && id ? [{ summarizationId: id }] : []),
    ]),
  }
}

export class SummarizationsRepository {
  public create(contract: ISummarization) {
    const { id, userId, conversationId, createdAt, updatedAt } = contract
    return SummarizationDBModel.create({
      ...contract,
      ...getPrimaryKeys({ userId, conversationId, id }),
      createdAt: createdAt.toISOString(),
      updatedAt: updatedAt ? updatedAt.toISOString() : undefined,
    })
  }

  public get({ userId }: TPartialPrimaryKeysParams) {
    const { pk, sk } = getPartialPrimaryKeys({ userId })
    return SummarizationDBModel.query('pk').eq(pk).and().where('sk').beginsWith(sk).all().exec()
  }

  public delete({ userId, id, conversationId }: TPrimaryKeysParams) {
    const primaryKeys = getPrimaryKeys({ userId, conversationId, id })
    return SummarizationDBModel.delete(primaryKeys)
  }
}
