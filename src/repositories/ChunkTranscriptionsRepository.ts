import { createDBKey } from '../lib/helpers/dynamodb'
import {
  IChunkTranscription,
  IChunkTranscriptionKeys,
} from '../models/contracts/ChunkTranscription'
import { ChunkTranscriptionDBModel } from '../models/schemas/ChunkTranscription/model'

type TPrimaryKeysParams = Pick<IChunkTranscription, 'userId' | 'conversationId' | 'id'>
type TPartialPrimaryKeysParams = Pick<IChunkTranscription, 'userId' | 'conversationId'> &
  Partial<Pick<IChunkTranscription, 'id'>>

const getPrimaryKeys = ({ userId, conversationId, id }: TPrimaryKeysParams) => {
  return {
    pk: createDBKey<IChunkTranscriptionKeys>([{ userId }, { conversationId }]),
    sk: createDBKey<IChunkTranscriptionKeys>([
      { chunkId: id.toString().padStart(3, '0') },
      { transcription: undefined },
    ]),
  }
}

const getPartialPrimaryKeys = ({ userId, conversationId, id }: TPartialPrimaryKeysParams) => {
  return {
    pk: createDBKey<IChunkTranscriptionKeys>([{ userId }, { conversationId }]),
    sk: createDBKey<IChunkTranscriptionKeys>([
      { chunkId: id?.toString().padStart(3, '0') },
      ...(id ? [{ transcription: undefined }] : []),
    ]),
  }
}

export class ChunkTranscriptionsRepository {
  public create(contract: IChunkTranscription) {
    const { userId, conversationId, id, createdAt, updatedAt } = contract
    return ChunkTranscriptionDBModel.create({
      ...contract,
      ...getPrimaryKeys({ userId, conversationId, id }),
      createdAt: createdAt.toISOString(),
      updatedAt: updatedAt ? updatedAt.toISOString() : undefined,
    })
  }

  public get({ userId, conversationId, id }: TPartialPrimaryKeysParams) {
    const { pk, sk } = getPartialPrimaryKeys({ userId, conversationId, id })
    return ChunkTranscriptionDBModel.query('pk')
      .eq(pk)
      .and()
      .where('sk')
      .beginsWith(sk)
      .all()
      .exec()
  }

  public delete({ userId, conversationId, id }: TPrimaryKeysParams) {
    const primaryKeys = getPrimaryKeys({ userId, conversationId, id })
    return ChunkTranscriptionDBModel.delete(primaryKeys)
  }
}
