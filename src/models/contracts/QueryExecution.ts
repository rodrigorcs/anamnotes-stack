import { Dayjs } from 'dayjs'
import { EPos } from './utils'

export interface IQueryExecution {
  merchantId: string
  date: Dayjs
  paymentsCount: number
  paymentsTotalSum: number
  pos: EPos
  executedAt: Dayjs
}

export interface ICreateQueryExecution extends Omit<IQueryExecution, 'date' | 'executedAt'> {
  date: string
  executedAt: string
}
