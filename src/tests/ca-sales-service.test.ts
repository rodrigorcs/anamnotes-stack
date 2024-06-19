import { CAMonolithService } from '../services/CAMonolithService'
import { CAMonolithRepository } from '../repositories/CAMonolithRepository'

jest.mock('../repositories/CAMonolithRepository', () => {
  return {
    CAMonolithRepository: jest.fn().mockImplementation(() => {
      return { dumpSalesByPartner: jest.fn() }
    }),
  }
})

describe('CAMonolithService', () => {
  let service: CAMonolithService
  let mockRepository: jest.Mocked<CAMonolithRepository>

  beforeEach(() => {
    mockRepository = new CAMonolithRepository() as jest.Mocked<CAMonolithRepository>
    service = new CAMonolithService()
    service.setRepository(mockRepository)
  })

  describe('getMetrics', () => {
    it('empty', async () => {
      expect(true).toEqual(true)
    })
  })
})
