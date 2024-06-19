import { getSecret } from '@aws-lambda-powertools/parameters/secrets'

export const getSecretValue = async <SecretType>(secretName: string): Promise<SecretType> => {
  const externalBucketCredentialsSecret = await getSecret(secretName)
  const externalBucketCredentials = JSON.parse(externalBucketCredentialsSecret?.toString() ?? '')

  return externalBucketCredentials as SecretType
}
