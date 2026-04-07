/**
 * Logger Utility
 *
 * Production-safe logging with environment-based control
 * Supports multiple log levels and structured logging
 */

export const LogLevel = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3,
  NONE: 4,
} as const

export type LogLevel = typeof LogLevel[keyof typeof LogLevel]

interface LoggerConfig {
  level: LogLevel
  enableTimestamps: boolean
  enableColors: boolean
}

class Logger {
  private config: LoggerConfig
  private readonly isDevelopment: boolean

  constructor() {
    this.isDevelopment = import.meta.env.DEV
    this.config = {
      level: this.isDevelopment ? LogLevel.DEBUG : LogLevel.WARN,
      enableTimestamps: true,
      enableColors: this.isDevelopment,
    }
  }

  /**
   * Configure logger settings
   */
  configure(config: Partial<LoggerConfig>): void {
    this.config = { ...this.config, ...config }
  }

  /**
   * Get current log level
   */
  getLevel(): LogLevel {
    return this.config.level
  }

  /**
   * Set log level
   */
  setLevel(level: LogLevel): void {
    this.config.level = level
  }

  /**
   * Format log message with timestamp and prefix
   */
  private formatMessage(prefix: string, messages: unknown[]): unknown[] {
    const timestamp = this.config.enableTimestamps
      ? `[${new Date().toISOString()}]`
      : ''

    return [timestamp, prefix, ...messages].filter(Boolean)
  }

  /**
   * Debug level logging (development only)
   */
  debug(context: string, ...messages: unknown[]): void {
    if (this.config.level <= LogLevel.DEBUG) {
      const prefix = this.config.enableColors
        ? `\x1b[36m[DEBUG:${context}]\x1b[0m`
        : `[DEBUG:${context}]`
      console.debug(...this.formatMessage(prefix, messages))
    }
  }

  /**
   * Info level logging
   */
  info(context: string, ...messages: unknown[]): void {
    if (this.config.level <= LogLevel.INFO) {
      const prefix = this.config.enableColors
        ? `\x1b[32m[INFO:${context}]\x1b[0m`
        : `[INFO:${context}]`
      console.info(...this.formatMessage(prefix, messages))
    }
  }

  /**
   * Warning level logging
   */
  warn(context: string, ...messages: unknown[]): void {
    if (this.config.level <= LogLevel.WARN) {
      const prefix = this.config.enableColors
        ? `\x1b[33m[WARN:${context}]\x1b[0m`
        : `[WARN:${context}]`
      console.warn(...this.formatMessage(prefix, messages))
    }
  }

  /**
   * Error level logging (always logged)
   */
  error(context: string, ...messages: unknown[]): void {
    if (this.config.level <= LogLevel.ERROR) {
      const prefix = this.config.enableColors
        ? `\x1b[31m[ERROR:${context}]\x1b[0m`
        : `[ERROR:${context}]`
      console.error(...this.formatMessage(prefix, messages))
    }
  }

  /**
   * Log with custom level
   */
  log(level: LogLevel, context: string, ...messages: unknown[]): void {
    switch (level) {
      case LogLevel.DEBUG:
        this.debug(context, ...messages)
        break
      case LogLevel.INFO:
        this.info(context, ...messages)
        break
      case LogLevel.WARN:
        this.warn(context, ...messages)
        break
      case LogLevel.ERROR:
        this.error(context, ...messages)
        break
    }
  }
}

// Export singleton instance
export const logger = new Logger()

// Export convenience methods for direct use
export const log = {
  debug: (context: string, ...messages: unknown[]) => logger.debug(context, ...messages),
  info: (context: string, ...messages: unknown[]) => logger.info(context, ...messages),
  warn: (context: string, ...messages: unknown[]) => logger.warn(context, ...messages),
  error: (context: string, ...messages: unknown[]) => logger.error(context, ...messages),
}
