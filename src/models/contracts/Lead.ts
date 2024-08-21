import { Dayjs } from 'dayjs'

export interface ILead {
  id: string
  emailAddress: string
  source: string
  ipAddress: string
  createdAt: Dayjs
  updatedAt?: Dayjs
}

export interface ICreateLead extends Omit<ILead, 'createdAt' | 'updatedAt'> {
  createdAt: string
  updatedAt?: string
}

export interface ILeadKeys extends ICreateLead {
  lead: undefined
  source: string
  leadId: string
}
