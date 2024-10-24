import { createDBKey } from '../lib/helpers/dynamodb'
import {
  IChunkTranscription,
  IChunkTranscriptionKeys,
} from '../models/contracts/ChunkTranscription'
import { ChunkTranscriptionDBModel } from '../models/schemas/ChunkTranscription/model'

type TPrimaryKeysParams = Pick<
  IChunkTranscription,
  'userId' | 'conversationId' | 'channelSlug' | 'id'
>
type TPartialPrimaryKeysParams = Pick<
  IChunkTranscription,
  'userId' | 'conversationId' | 'channelSlug'
> &
  Partial<Pick<IChunkTranscription, 'id'>>

const getPrimaryKeys = ({ userId, conversationId, channelSlug, id }: TPrimaryKeysParams) => {
  return {
    pk: createDBKey<IChunkTranscriptionKeys>([{ userId }, { conversationId }]),
    sk: createDBKey<IChunkTranscriptionKeys>([
      { channelSlug },
      { chunkId: id.toString().padStart(3, '0') },
      { transcription: undefined },
    ]),
  }
}

const getPartialPrimaryKeys = ({
  userId,
  conversationId,
  channelSlug,
  id,
}: TPartialPrimaryKeysParams) => {
  return {
    pk: createDBKey<IChunkTranscriptionKeys>([{ userId }, { conversationId }]),
    sk: createDBKey<IChunkTranscriptionKeys>([
      { channelSlug },
      { chunkId: id?.toString().padStart(3, '0') },
      ...(id ? [{ transcription: undefined }] : []),
    ]),
  }
}

export class ChunkTranscriptionsRepository {
  public create(contract: IChunkTranscription) {
    const { userId, conversationId, channelSlug, id, createdAt, updatedAt } = contract
    return ChunkTranscriptionDBModel.create({
      ...contract,
      ...getPrimaryKeys({ userId, conversationId, channelSlug, id }),
      createdAt: createdAt.toISOString(),
      updatedAt: updatedAt ? updatedAt.toISOString() : undefined,
    })
  }

  public get({ userId, conversationId, channelSlug, id }: TPartialPrimaryKeysParams) {
    const { pk, sk } = getPartialPrimaryKeys({ userId, conversationId, channelSlug, id })
    return ChunkTranscriptionDBModel.query('pk').eq(pk).and().where('sk').beginsWith(sk).exec()
  }

  public delete({ userId, conversationId, channelSlug, id }: TPrimaryKeysParams) {
    const primaryKeys = getPrimaryKeys({ userId, conversationId, channelSlug, id })
    return ChunkTranscriptionDBModel.delete(primaryKeys)
  }
}
