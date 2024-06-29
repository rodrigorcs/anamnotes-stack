import { IAIProvider } from '../models/providers/AIProvider'
import { DummyAIProvider, OpenAIProvider } from '../providers/ai'

export enum AIProviders {
  OPEN_AI = 'openai',
  DUMMY = 'dummy',
}

export class AIProviderSwitcher {
  static getProvider(providerSlug: AIProviders): IAIProvider {
    const providerMap = {
      [AIProviders.OPEN_AI]: OpenAIProvider,
      [AIProviders.DUMMY]: DummyAIProvider,
    }

    const AIProvider = providerMap[providerSlug]
    if (!AIProvider) throw new Error(`Invalid AI provider: ${providerSlug}`)

    return new AIProvider()
  }
}
