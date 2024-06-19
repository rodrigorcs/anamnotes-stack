import { createDBKey } from '../lib/helpers/dynamodb'
import { ICreateQueryExecution, IQueryExecution } from '../models/contracts/QueryExecution'
import { QueryExecutionDBModel } from '../models/schemas'
import { IQueryExecutionEntity } from '../models/schemas/QueryExecutions/schema'
import { PickWithPartial } from '../models/utils'

const getPrimaryKeys = ({ merchantId, date: dateObj }: Partial<IQueryExecution>) => {
  const date = dateObj?.toISOString()
  return {
    pk: createDBKey<ICreateQueryExecution>([{ merchantId }]),
    sk: createDBKey<ICreateQueryExecution>([{ date }]),
  }
}

export class QueryExecutionsRepository {
  public create(contract: IQueryExecution) {
    const { merchantId, date, executedAt } = contract
    return QueryExecutionDBModel.create({
      ...contract,
      ...getPrimaryKeys({ merchantId, date }),
      date: date.toISOString(),
      executedAt: executedAt.toISOString(),
    })
  }

  public bulkCreate(contracts: IQueryExecution[]) {
    const entities: IQueryExecutionEntity[] = contracts.map((contract) => {
      const { merchantId, date, executedAt } = contract
      return {
        ...contract,
        ...getPrimaryKeys({ merchantId, date }),
        date: date.toISOString(),
        executedAt: executedAt.toISOString(),
      }
    })

    return QueryExecutionDBModel.batchPut(entities)
  }

  public update(contract: PickWithPartial<IQueryExecution, 'merchantId' | 'date'>) {
    const { merchantId, date, executedAt } = contract
    return QueryExecutionDBModel.update({
      ...(contract as Omit<IQueryExecution, 'date' | 'executedAt'>),
      ...getPrimaryKeys({ merchantId, date }),
      ...(date && { date: date.toISOString() }),
      ...(executedAt && { executedAt: executedAt.toISOString() }),
    })
  }

  public get({ merchantId, date }: Pick<IQueryExecution, 'merchantId' | 'date'>) {
    const { pk, sk } = getPrimaryKeys({ merchantId, date })
    return QueryExecutionDBModel.query('pk').eq(pk).and().where('sk').gt(sk).all().exec()
  }
}
