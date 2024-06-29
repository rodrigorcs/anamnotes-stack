import { logger } from '../common/powertools/logger'
import { createDBKey } from '../lib/helpers/dynamodb'
import {
  IWebSocketConnection,
  IWebSocketConnectionKeys,
} from '../models/contracts/WebSocketConnection'
import { WebSocketConnectionDBModel } from '../models/schemas/WebSocketConnection/model'

type TPrimaryKeysParams = Pick<IWebSocketConnection, 'userId' | 'conversationId' | 'id'>
type TPartialPrimaryKeysParams = Pick<IWebSocketConnection, 'userId' | 'conversationId'> &
  Partial<Pick<IWebSocketConnection, 'id'>>

const getPrimaryKeys = ({ userId, conversationId, id }: TPrimaryKeysParams) => {
  return {
    pk: createDBKey<IWebSocketConnectionKeys>([{ userId }, { conversationId }]),
    sk: createDBKey<IWebSocketConnectionKeys>([{ wsConnectionId: id }]),
  }
}

const getPartialPrimaryKeys = ({ userId, conversationId, id }: TPartialPrimaryKeysParams) => {
  return {
    pk: createDBKey<IWebSocketConnectionKeys>([{ userId }, { conversationId }]),
    sk: createDBKey<IWebSocketConnectionKeys>([{ wsConnectionId: id }]),
  }
}

export class WebSocketConnectionsRepository {
  public create(contract: IWebSocketConnection) {
    const { userId, conversationId, id, createdAt, updatedAt } = contract
    return WebSocketConnectionDBModel.create({
      ...contract,
      ...getPrimaryKeys({ userId, conversationId, id }),
      createdAt: createdAt.toISOString(),
      updatedAt: updatedAt ? updatedAt.toISOString() : undefined,
    })
  }

  public get({ userId, conversationId, id }: TPartialPrimaryKeysParams) {
    const { pk, sk } = getPartialPrimaryKeys({ userId, conversationId, id })
    logger.info('primary keys', { pk, sk })
    return WebSocketConnectionDBModel.query('pk')
      .eq(pk)
      .and()
      .where('sk')
      .beginsWith(sk)
      .all()
      .exec()
  }

  public delete({ userId, conversationId, id }: TPrimaryKeysParams) {
    const primaryKeys = getPrimaryKeys({ userId, conversationId, id })
    return WebSocketConnectionDBModel.delete(primaryKeys)
  }
}
