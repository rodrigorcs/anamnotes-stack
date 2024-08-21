import { createDBKey } from '../lib/helpers/dynamodb'
import { ILead, ILeadKeys } from '../models/contracts/Lead'
import { LeadDBModel } from '../models/schemas/Lead/model'

type TPrimaryKeysParams = Pick<ILead, 'source' | 'id'>

const getPrimaryKeys = ({ source, id }: TPrimaryKeysParams) => {
  return {
    pk: createDBKey<ILeadKeys>([{ lead: undefined, source }]),
    sk: createDBKey<ILeadKeys>([{ leadId: id }]),
  }
}

export class LeadsRepository {
  public create(contract: ILead) {
    const { source, id, createdAt, updatedAt } = contract
    return LeadDBModel.create({
      ...contract,
      ...getPrimaryKeys({ source, id }),
      createdAt: createdAt.toISOString(),
      updatedAt: updatedAt ? updatedAt.toISOString() : undefined,
    })
  }
}
