import { createDBKey } from '../lib/helpers/dynamodb'
import {
  IWebSocketConnection,
  IWebSocketConnectionKeys,
} from '../models/contracts/WebSocketConnection'
import { WebSocketConnectionDBModel } from '../models/schemas/WebSocketConnection/model'
import { PartialWithPick } from '../models/utils'

type TPrimaryKeysParams = Pick<IWebSocketConnection, 'userId' | 'summarizationId' | 'id'>
type TPartialPrimaryKeysParams = Pick<IWebSocketConnection, 'userId' | 'summarizationId'> &
  PartialWithPick<IWebSocketConnection, 'id'>

const getPrimaryKeys = ({ userId, summarizationId, id }: TPrimaryKeysParams) => {
  return {
    pk: createDBKey<IWebSocketConnectionKeys>([{ userId, summarizationId }]),
    sk: createDBKey<IWebSocketConnectionKeys>([{ wsConnectionId: id }]),
  }
}

const getPartialPrimaryKeys = ({ userId, summarizationId, id }: TPartialPrimaryKeysParams) => {
  return {
    pk: createDBKey<IWebSocketConnectionKeys>([{ userId, summarizationId }]),
    sk: createDBKey<IWebSocketConnectionKeys>([{ wsConnectionId: id }]),
  }
}

export class WebSocketConnectionsRepository {
  public create(contract: IWebSocketConnection) {
    const { userId, summarizationId, id, createdAt, updatedAt } = contract
    return WebSocketConnectionDBModel.create({
      ...contract,
      ...getPrimaryKeys({ userId, summarizationId, id }),
      createdAt: createdAt.toISOString(),
      updatedAt: updatedAt ? updatedAt.toISOString() : undefined,
    })
  }

  public get({ userId, summarizationId, id }: TPartialPrimaryKeysParams) {
    const { pk, sk } = getPartialPrimaryKeys({ userId, summarizationId, id })
    return WebSocketConnectionDBModel.query('pk')
      .eq(pk)
      .and()
      .where('sk')
      .beginsWith(sk)
      .all()
      .exec()
  }
}
