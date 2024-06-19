import { REQUIRED_ENV_VARIABLES, ENV_VARIABLES, SetAppStageProfile } from './models/types'
import { config } from '../config'
import { AppStage, AppStageProfiles } from './models/enums'
import { readFileSync, readdirSync, statSync } from 'fs'
import { createHash } from 'crypto'
import { join } from 'path'
import { aws_secretsmanager as secrets } from 'aws-cdk-lib'

export const setAppStageProfile: SetAppStageProfile = {
  prod: AppStageProfiles.PRODUCTION,
  staging: AppStageProfiles.STAGING,
  sandbox: AppStageProfiles.SANDBOX,
}

export const getDeploymentStage = (stageVariable: string | undefined): AppStage => {
  const validatedStage = Object.values(AppStage).find((stage) => stage === stageVariable)
  if (validatedStage) return validatedStage

  throw new Error(`Invalid STAGE detected`)
}

export const getRDSAccountId = (stage: AppStage): string | undefined => {
  const rdsAccountIds: { [K in AppStage]?: string | undefined } = {
    prod: '245522874614',
    staging: undefined, // Same account
    sandbox: undefined, // Same account
  }
  const rdsAccountId = rdsAccountIds[stage]

  return rdsAccountId
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

export const stageValue = {
  /** return a number value depending on the stage  */
  num(
    {
      production,
      staging,
      sandbox,
    }: {
      production?: number
      staging?: number
      sandbox?: number
    },
    defaultValue: number,
  ): number {
    if (config.stage === AppStage.PRODUCTION && Number.isFinite(production))
      return production as number
    if (config.stage === AppStage.STAGING && Number.isFinite(staging)) return staging as number
    if (config.stage === AppStage.SANDBOX && Number.isFinite(sandbox)) return sandbox as number

    return defaultValue
  },
  /** return a boolean value depending on the stage  */
  bool(
    {
      production,
      staging,
      sandbox,
    }: {
      production?: boolean
      staging?: boolean
      sandbox?: boolean
    },
    defaultValue: boolean,
  ): boolean {
    if (config.stage === AppStage.PRODUCTION && isBoolean(production)) return production as boolean
    if (config.stage === AppStage.STAGING && isBoolean(staging)) return staging as boolean
    if (config.stage === AppStage.SANDBOX && isBoolean(sandbox)) return sandbox as boolean

    return defaultValue
  },
  /** return a string value depending on the stage */
  str(
    {
      production,
      staging,
      sandbox,
    }: {
      production?: string
      staging?: string
      sandbox?: string
    },
    defaultValue: string,
  ): string {
    if (config.stage === AppStage.PRODUCTION && production) return production as string
    if (config.stage === AppStage.STAGING && staging) return staging as string
    if (config.stage === AppStage.SANDBOX && sandbox) return sandbox as string

    return defaultValue
  },
  other<T>(
    {
      production,
      staging,
      sandbox,
    }: {
      production?: T
      staging?: T
      sandbox?: T
    },
    defaultValue: T | undefined,
  ): T | undefined {
    if (config.stage === AppStage.PRODUCTION && production) return production
    if (config.stage === AppStage.STAGING && staging) return staging
    if (config.stage === AppStage.SANDBOX && sandbox) return sandbox

    return defaultValue
  },
}

/**
 * Some AWS resources do not allow names greater than 32 chars.
 * Use this function to set a shorter name if needed.
 */
export const useShortName = (name: string, shortName: string, charLimit = 32): string => {
  return name.length > charLimit ? shortName : name
}

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
