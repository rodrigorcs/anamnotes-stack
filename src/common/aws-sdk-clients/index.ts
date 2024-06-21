import { EventBridgeClient } from '@aws-sdk/client-eventbridge'
import { SecretsManagerClient } from '@aws-sdk/client-secrets-manager'

export const eventBridgeClient = new EventBridgeClient({})
export const secretsManagerClient = new SecretsManagerClient({})
