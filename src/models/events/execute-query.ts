import { z } from 'zod'
import {
  EEventSources,
  EQueryExecutionEventTopics,
  EQueryExecutionEventTypes,
  isTimestampValid,
} from './utils'
import { EPos } from '../contracts/utils'

const ExecuteQueryEventSchema = z.object({
  source: z.nativeEnum(EEventSources),
  'detail-type': z.enum([
    `${EQueryExecutionEventTopics.QUERY_EXECUTION}.${EQueryExecutionEventTypes.STARTED}`,
  ]),
  detail: z.object({
    date: z.string().refine(isTimestampValid),
    pos: z.nativeEnum(EPos),
    companyIds: z.array(z.string()),
  }),
})

export const parseExecuteQueryEvent = (event: unknown) => {
  return ExecuteQueryEventSchema.parse(event)
}

type TExecuteQueryEvent = z.infer<typeof ExecuteQueryEventSchema>
export type TExecuteQueryEventDetailType = TExecuteQueryEvent['detail-type']
export type TExecuteQueryEventDetail = TExecuteQueryEvent['detail']
