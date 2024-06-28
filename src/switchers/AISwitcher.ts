import { IAIProvider } from '../models/providers/AIProvider'
import { OpenAIProvider } from '../providers/ai/OpenAIProvider'

export enum AIProviders {
  OPEN_AI = 'openai',
}

export class AIProviderSwitcher {
  static getProvider(providerSlug: AIProviders): IAIProvider {
    const providerMap = {
      [AIProviders.OPEN_AI]: OpenAIProvider,
    }

    const AIProvider = providerMap[providerSlug]
    if (!AIProvider) throw new Error(`Invalid AI provider: ${providerSlug}`)

    return new AIProvider()
  }
}
