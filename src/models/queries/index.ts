import { Dayjs } from 'dayjs'
import { EPos } from '../contracts/utils'
import { getCAMetricsQuery } from './caQueries'

export const getMetricsQueryByPOS = (params: {
  companyIds: string[]
  date: Dayjs
}): string | null => {
  const POS = process.env.POS as EPos

  const queryByPOS = {
    [EPos.US]: '',
    [EPos.CA]: getCAMetricsQuery(params),
  }

  return queryByPOS[POS]
}
