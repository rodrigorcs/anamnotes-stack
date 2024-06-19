import { z } from 'zod'
import { EQueryExecutionEventTopics, EQueryExecutionEventTypes, isTimestampValid } from './utils'
import { EPos } from '../contracts/utils'

const IngestInitialLoadEventSchema = z.object({
  'detail-type': z.enum([
    `${EQueryExecutionEventTopics.INITIAL_LOAD}.${EQueryExecutionEventTypes.SCHEDULED}`,
  ]),
  detail: z.object({
    startDate: z.string().refine(isTimestampValid),
    endDate: z.string().refine(isTimestampValid),
    pos: z.nativeEnum(EPos),
    companyIds: z.array(z.string()),
  }),
})

export const parseIngestInitialLoadEvent = (event: unknown) => {
  return IngestInitialLoadEventSchema.parse(event)
}
