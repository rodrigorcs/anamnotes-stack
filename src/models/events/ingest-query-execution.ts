import { z } from 'zod'
import { EQueryExecutionEventTopics, EQueryExecutionEventTypes } from './utils'

const IngestQueryExecutionEventSchema = z.object({
  'detail-type': z.enum([
    `${EQueryExecutionEventTopics.QUERY_EXECUTION}.${EQueryExecutionEventTypes.SCHEDULED}`,
  ]),
})

export const parseIngestQueryExecutionEvent = (event: unknown) => {
  return IngestQueryExecutionEventSchema.parse(event)
}
