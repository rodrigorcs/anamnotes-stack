import { REQUIRED_ENV_VARIABLES, ENV_VARIABLES, SetAppStageProfile } from './models/types'
import { AppStage, AppStageProfiles } from './models/enums'
import { readFileSync, readdirSync, statSync } from 'fs'
import { createHash } from 'crypto'
import { join } from 'path'
import { aws_secretsmanager as secrets } from 'aws-cdk-lib'

export const setAppStageProfile: SetAppStageProfile = {
  prod: AppStageProfiles.PRODUCTION,
  staging: AppStageProfiles.STAGING,
}

export const getDeploymentStage = (stageVariable: string | undefined): AppStage => {
  const validatedStage = Object.values(AppStage).find((stage) => stage === stageVariable)
  if (validatedStage) return validatedStage

  throw new Error(`Invalid STAGE detected`)
}

export const validateEnv = (
  requiredEnvs: Array<keyof REQUIRED_ENV_VARIABLES>,
  env: { [key: string]: string | undefined },
): ENV_VARIABLES => {
  requiredEnvs.forEach((requiredEnv: string) => {
    if (!env[requiredEnv]) {
      throw new Error(`${requiredEnv} required`)
    }
  })

  return env as ENV_VARIABLES
}

export const isBoolean = (val: unknown): boolean => 'boolean' === typeof val

/**
 * Generates a SHA-256 hash based on the content of a directory.
 * This function is recursive and will hash the content of all files
 * and subdirectories to produce a single hash value.
 *
 * @param {string} dir - The directory path to hash.
 * @returns {string} - The SHA-256 hash of the directory content.
 */
export const computeDirHash = (dir: string): string => {
  const entries = readdirSync(dir)

  const entryHashes = entries.map((entry) => {
    const fullPath = join(dir, entry)
    const stat = statSync(fullPath)

    if (stat.isDirectory()) {
      return computeDirHash(fullPath)
    } else if (stat.isFile()) {
      const fileContent = readFileSync(fullPath, 'utf-8')
      return createHash('sha256').update(fileContent).digest('hex')
    } else {
      return ''
    }
  })

  const dirHash = createHash('sha256').update(entryHashes.join()).digest('hex')

  return dirHash
}

export const getSecretValue = (secret: secrets.ISecret, key: string) => {
  return secret.secretValueFromJson(key).unsafeUnwrap()
}

export const toCamelCase = (text: string) => {
  const camelCaseText = text.trim().replace(/[-_\s]+(.)?/g, (_, c) => (c ? c.toUpperCase() : ''))
  return camelCaseText.charAt(0).toUpperCase() + camelCaseText.slice(1)
}
