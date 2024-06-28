import { logger } from '../common/powertools/logger'
import { createDBKey } from '../lib/helpers/dynamodb'
import {
  IChunkTranscription,
  IChunkTranscriptionKeys,
} from '../models/contracts/ChunkTranscription'
import { ChunkTranscriptionDBModel } from '../models/schemas/ChunkTranscription/model'

type TPrimaryKeysParams = Pick<IChunkTranscription, 'userId' | 'summarizationId' | 'id'>
type TPartialPrimaryKeysParams = Pick<IChunkTranscription, 'userId' | 'summarizationId'> &
  Partial<Pick<IChunkTranscription, 'id'>>

const getPrimaryKeys = ({ userId, summarizationId, id }: TPrimaryKeysParams) => {
  return {
    pk: createDBKey<IChunkTranscriptionKeys>([{ userId }, { summarizationId }]),
    sk: createDBKey<IChunkTranscriptionKeys>([{ chunkId: id }, { transcription: undefined }]),
  }
}

const getPartialPrimaryKeys = ({ userId, summarizationId, id }: TPartialPrimaryKeysParams) => {
  return {
    pk: createDBKey<IChunkTranscriptionKeys>([{ userId }, { summarizationId }]),
    sk: createDBKey<IChunkTranscriptionKeys>([
      { chunkId: id },
      ...(id ? [{ transcription: undefined }] : []),
    ]),
  }
}

export class ChunkTranscriptionsRepository {
  public create(contract: IChunkTranscription) {
    const { userId, summarizationId, id, createdAt, updatedAt } = contract
    return ChunkTranscriptionDBModel.create({
      ...contract,
      ...getPrimaryKeys({ userId, summarizationId, id }),
      createdAt: createdAt.toISOString(),
      updatedAt: updatedAt ? updatedAt.toISOString() : undefined,
    })
  }

  public get({ userId, summarizationId, id }: TPartialPrimaryKeysParams) {
    const { pk, sk } = getPartialPrimaryKeys({ userId, summarizationId, id })
    logger.info('primary keys', { pk, sk })
    return ChunkTranscriptionDBModel.query('pk')
      .eq(pk)
      .and()
      .where('sk')
      .beginsWith(sk)
      .all()
      .exec()
  }

  public delete({ userId, summarizationId, id }: TPrimaryKeysParams) {
    const primaryKeys = getPrimaryKeys({ userId, summarizationId, id })
    return ChunkTranscriptionDBModel.delete(primaryKeys)
  }
}
