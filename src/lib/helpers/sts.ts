import { AssumeRoleCommand, AssumeRoleCommandOutput, STSClient } from '@aws-sdk/client-sts'
import { z } from 'zod'

const AssumedRoleSchema = z.object({
  Credentials: z.object({
    AccessKeyId: z.string(),
    SecretAccessKey: z.string(),
    SessionToken: z.string(),
  }),
})

export const validateAssumedRole = (assumedRole: AssumeRoleCommandOutput) =>
  AssumedRoleSchema.parse(assumedRole)

export const assumeRole = async (roleArn: string) => {
  const stsClient = new STSClient()
  const assumeRoleCommand = new AssumeRoleCommand({
    RoleArn: roleArn,
    RoleSessionName: `assumed_role_session`,
  })

  const assumedRole = await stsClient.send(assumeRoleCommand)
  const validatedAssumedRole = validateAssumedRole(assumedRole)

  return {
    accessKeyId: validatedAssumedRole.Credentials.AccessKeyId,
    secretAccessKey: validatedAssumedRole.Credentials.SecretAccessKey,
    sessionToken: validatedAssumedRole.Credentials.SessionToken,
  }
}
