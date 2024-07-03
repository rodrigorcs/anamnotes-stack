import { createDBKey } from '../lib/helpers/dynamodb'
import { IConversation, IConversationKeys } from '../models/contracts/Conversation'
import { ConversationDBModel } from '../models/schemas/Conversation/model'

type TPrimaryKeysParams = Pick<IConversation, 'userId' | 'id'>
type TPartialPrimaryKeysParams = Pick<IConversation, 'userId'> & Partial<Pick<IConversation, 'id'>>

const getPrimaryKeys = ({ userId, id }: TPrimaryKeysParams) => {
  return {
    pk: createDBKey<IConversationKeys>([{ userId }]),
    sk: createDBKey<IConversationKeys>([{ conversationId: id }]),
  }
}

const getPartialPrimaryKeys = ({ userId, id }: TPartialPrimaryKeysParams) => {
  return {
    pk: createDBKey<IConversationKeys>([{ userId }]),
    sk: createDBKey<IConversationKeys>([...(id ? [{ conversationId: id }] : [])]),
  }
}

export class ConversationsRepository {
  public create(contract: IConversation) {
    const { userId, id, createdAt, updatedAt } = contract
    return ConversationDBModel.create({
      ...contract,
      ...getPrimaryKeys({ userId, id }),
      createdAt: createdAt.toISOString(),
      updatedAt: updatedAt ? updatedAt.toISOString() : undefined,
    })
  }

  public get({ userId, id }: TPartialPrimaryKeysParams) {
    const { pk, sk } = getPartialPrimaryKeys({ userId, id })
    return ConversationDBModel.query('pk').eq(pk).and().where('sk').beginsWith(sk).all().exec()
  }

  public delete({ userId, id }: TPrimaryKeysParams) {
    const primaryKeys = getPrimaryKeys({ userId, id })
    return ConversationDBModel.delete(primaryKeys)
  }
}
