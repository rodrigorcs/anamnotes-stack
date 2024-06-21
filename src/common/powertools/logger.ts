import { Logger } from '@aws-lambda-powertools/logger'
import { config } from '../../config'
import {
  LogItemExtraInput,
  LogItemMessage,
  LogLevel,
} from '@aws-lambda-powertools/logger/lib/types'

export interface ILog {
  message: LogItemMessage
  extraInput: LogItemExtraInput
  level: LogLevel
}

class CustomLogger {
  public logger: Logger
  private logs: ILog[]

  constructor() {
    this.logger = new Logger({
      serviceName: config.serviceName,
      logLevel: 'debug',
    })
    this.logs = []
  }

  debug(message: LogItemMessage, ...extraInput: LogItemExtraInput) {
    this.logger.debug(message, ...extraInput)
  }

  info(message: LogItemMessage, ...extraInput: LogItemExtraInput) {
    this.logs.push({ message, extraInput, level: 'INFO' })
    this.logger.info(message, ...extraInput)
  }

  warn(message: LogItemMessage, ...extraInput: LogItemExtraInput) {
    this.logs.push({ message, extraInput, level: 'WARN' })
    this.logger.warn(message, ...extraInput)
  }

  error(message: LogItemMessage, ...extraInput: LogItemExtraInput) {
    this.logs.push({ message, extraInput, level: 'ERROR' })
    this.logger.error(message, ...extraInput)
  }

  critical(message: LogItemMessage, ...extraInput: LogItemExtraInput) {
    this.logs.push({ message, extraInput, level: 'CRITICAL' })
    this.logger.critical(message, ...extraInput)
  }

  getLogs(): ILog[] {
    return this.logs
  }
}

export const logger = new CustomLogger()
