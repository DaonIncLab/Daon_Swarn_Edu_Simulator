/**
 * Logger Utility Unit Tests
 */

import { describe, test, expect, beforeEach, vi, afterEach } from 'vitest'
import { log, logger, LogLevel } from '@/utils/logger'

describe('Logger', () => {
  let consoleDebugSpy: ReturnType<typeof vi.spyOn>
  let consoleWarnSpy: ReturnType<typeof vi.spyOn>
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>
  let consoleInfoSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    consoleDebugSpy = vi.spyOn(console, 'debug').mockImplementation(() => {})
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    consoleInfoSpy = vi.spyOn(console, 'info').mockImplementation(() => {})
  })

  afterEach(() => {
    consoleDebugSpy.mockRestore()
    consoleWarnSpy.mockRestore()
    consoleErrorSpy.mockRestore()
    consoleInfoSpy.mockRestore()
    logger.setLevel(LogLevel.DEBUG) // Reset to default
  })

  describe('Log Level Filtering', () => {
    test('DEBUG level logs all messages', () => {
      logger.setLevel(LogLevel.DEBUG)

      log.debug('Test', 'debug message')
      log.info('Test', 'info message')
      log.warn('Test', 'warn message')
      log.error('Test', 'error message')

      expect(consoleDebugSpy).toHaveBeenCalled()
      expect(consoleInfoSpy).toHaveBeenCalled()
      expect(consoleWarnSpy).toHaveBeenCalled()
      expect(consoleErrorSpy).toHaveBeenCalled()
    })

    test('INFO level filters out DEBUG', () => {
      logger.setLevel(LogLevel.INFO)

      log.debug('Test', 'debug message')
      log.info('Test', 'info message')
      log.warn('Test', 'warn message')
      log.error('Test', 'error message')

      expect(consoleDebugSpy).not.toHaveBeenCalled()
      expect(consoleInfoSpy).toHaveBeenCalled()
      expect(consoleWarnSpy).toHaveBeenCalled()
      expect(consoleErrorSpy).toHaveBeenCalled()
    })

    test('WARN level filters out DEBUG and INFO', () => {
      logger.setLevel(LogLevel.WARN)

      log.debug('Test', 'debug message')
      log.info('Test', 'info message')
      log.warn('Test', 'warn message')
      log.error('Test', 'error message')

      expect(consoleDebugSpy).not.toHaveBeenCalled()
      expect(consoleInfoSpy).not.toHaveBeenCalled()
      expect(consoleWarnSpy).toHaveBeenCalled()
      expect(consoleErrorSpy).toHaveBeenCalled()
    })

    test('ERROR level only logs errors', () => {
      logger.setLevel(LogLevel.ERROR)

      log.debug('Test', 'debug message')
      log.info('Test', 'info message')
      log.warn('Test', 'warn message')
      log.error('Test', 'error message')

      expect(consoleDebugSpy).not.toHaveBeenCalled()
      expect(consoleInfoSpy).not.toHaveBeenCalled()
      expect(consoleWarnSpy).not.toHaveBeenCalled()
      expect(consoleErrorSpy).toHaveBeenCalled()
    })

    test('NONE level filters out all messages', () => {
      logger.setLevel(LogLevel.NONE)

      log.debug('Test', 'debug message')
      log.info('Test', 'info message')
      log.warn('Test', 'warn message')
      log.error('Test', 'error message')

      expect(consoleDebugSpy).not.toHaveBeenCalled()
      expect(consoleInfoSpy).not.toHaveBeenCalled()
      expect(consoleWarnSpy).not.toHaveBeenCalled()
      expect(consoleErrorSpy).not.toHaveBeenCalled()
    })
  })

  describe('Message Formatting', () => {
    test('includes context in log messages', () => {
      logger.setLevel(LogLevel.DEBUG)
      log.debug('MyComponent', 'test message')

      expect(consoleDebugSpy).toHaveBeenCalled()
      const call = consoleDebugSpy.mock.calls[0]
      expect(call.some(arg => String(arg).includes('MyComponent'))).toBe(true)
    })

    test('handles multiple message arguments', () => {
      logger.setLevel(LogLevel.DEBUG)
      log.debug('Test', 'message', { data: 123 }, 'more text')

      expect(consoleDebugSpy).toHaveBeenCalled()
      const call = consoleDebugSpy.mock.calls[0]
      expect(call.length).toBeGreaterThan(2) // timestamp, context, message, args...
    })

    test('handles object messages', () => {
      logger.setLevel(LogLevel.DEBUG)
      const obj = { key: 'value', number: 42 }
      log.info('Test', obj)

      expect(consoleInfoSpy).toHaveBeenCalled()
    })

    test('handles error objects', () => {
      logger.setLevel(LogLevel.ERROR)
      const error = new Error('Test error')
      log.error('Test', 'Error occurred:', error)

      expect(consoleErrorSpy).toHaveBeenCalled()
      const call = consoleErrorSpy.mock.calls[0]
      expect(call.some(arg => arg === error)).toBe(true)
    })
  })

  describe('Configuration', () => {
    test('configure method updates settings', () => {
      logger.configure({ level: LogLevel.ERROR, enableTimestamps: false })

      log.debug('Test', 'should not appear')
      log.error('Test', 'should appear')

      expect(consoleDebugSpy).not.toHaveBeenCalled()
      expect(consoleErrorSpy).toHaveBeenCalled()

      // Check no timestamp
      const call = consoleErrorSpy.mock.calls[0]
      const hasTimestamp = call.some(arg =>
        typeof arg === 'string' && /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(arg)
      )
      expect(hasTimestamp).toBe(false)
    })

    test('configure with enableTimestamps true adds timestamps', () => {
      logger.configure({ level: LogLevel.DEBUG, enableTimestamps: true })

      log.debug('Test', 'message')

      expect(consoleDebugSpy).toHaveBeenCalled()
      const call = consoleDebugSpy.mock.calls[0]
      // Timestamps should be in the output
      const hasTimestamp = call.some(arg =>
        typeof arg === 'string' && /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(arg)
      )
      expect(hasTimestamp).toBe(true)
    })

    test('configure with enableTimestamps false removes timestamps', () => {
      logger.configure({ level: LogLevel.DEBUG, enableTimestamps: false })

      log.debug('Test', 'message')

      expect(consoleDebugSpy).toHaveBeenCalled()
      const call = consoleDebugSpy.mock.calls[0]
      // No timestamps in output
      const hasTimestamp = call.some(arg =>
        typeof arg === 'string' && /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(arg)
      )
      expect(hasTimestamp).toBe(false)
    })

    test('configure with enableColors true adds color codes', () => {
      logger.configure({ level: LogLevel.DEBUG, enableColors: true })

      log.debug('Test', 'message')

      expect(consoleDebugSpy).toHaveBeenCalled()
      const call = consoleDebugSpy.mock.calls[0]
      // ANSI color codes should be present
      const hasColorCodes = call.some(arg =>
        typeof arg === 'string' && /\x1b\[\d+m/.test(arg)
      )
      expect(hasColorCodes).toBe(true)
    })

    test('configure with enableColors false removes color codes', () => {
      logger.configure({ level: LogLevel.DEBUG, enableColors: false })

      log.debug('Test', 'message')

      expect(consoleDebugSpy).toHaveBeenCalled()
      const call = consoleDebugSpy.mock.calls[0]
      // No ANSI color codes
      const hasColorCodes = call.some(arg =>
        typeof arg === 'string' && /\x1b\[\d+m/.test(arg)
      )
      expect(hasColorCodes).toBe(false)
    })

    test('getLevel returns current log level', () => {
      logger.setLevel(LogLevel.WARN)
      expect(logger.getLevel()).toBe(LogLevel.WARN)

      logger.setLevel(LogLevel.DEBUG)
      expect(logger.getLevel()).toBe(LogLevel.DEBUG)
    })
  })

  describe('Helper Functions', () => {
    test('log.debug calls logger.debug', () => {
      logger.setLevel(LogLevel.DEBUG)
      log.debug('Context', 'message')

      expect(consoleDebugSpy).toHaveBeenCalled()
    })

    test('log.info calls logger.info', () => {
      logger.setLevel(LogLevel.DEBUG)
      log.info('Context', 'message')

      expect(consoleInfoSpy).toHaveBeenCalled()
    })

    test('log.warn calls logger.warn', () => {
      logger.setLevel(LogLevel.DEBUG)
      log.warn('Context', 'message')

      expect(consoleWarnSpy).toHaveBeenCalled()
    })

    test('log.error calls logger.error', () => {
      logger.setLevel(LogLevel.DEBUG)
      log.error('Context', 'message')

      expect(consoleErrorSpy).toHaveBeenCalled()
    })
  })

  describe('Edge Cases', () => {
    test('handles empty context', () => {
      logger.setLevel(LogLevel.DEBUG)
      log.debug('', 'message')

      expect(consoleDebugSpy).toHaveBeenCalled()
    })

    test('handles empty message', () => {
      logger.setLevel(LogLevel.DEBUG)
      log.debug('Context')

      expect(consoleDebugSpy).toHaveBeenCalled()
    })

    test('handles null values', () => {
      logger.setLevel(LogLevel.DEBUG)
      log.debug('Context', null)

      expect(consoleDebugSpy).toHaveBeenCalled()
    })

    test('handles undefined values', () => {
      logger.setLevel(LogLevel.DEBUG)
      log.debug('Context', undefined)

      expect(consoleDebugSpy).toHaveBeenCalled()
    })

    test('handles very long messages', () => {
      logger.setLevel(LogLevel.DEBUG)
      const longMessage = 'a'.repeat(10000)
      log.debug('Context', longMessage)

      expect(consoleDebugSpy).toHaveBeenCalled()
    })

    test('handles special characters in context', () => {
      logger.setLevel(LogLevel.DEBUG)
      log.debug('Test🚀Context', 'message')

      expect(consoleDebugSpy).toHaveBeenCalled()
    })
  })

  describe('Multiple Log Calls', () => {
    test('handles rapid consecutive calls', () => {
      logger.setLevel(LogLevel.DEBUG)

      for (let i = 0; i < 100; i++) {
        log.debug('Test', `message ${i}`)
      }

      expect(consoleDebugSpy).toHaveBeenCalledTimes(100)
    })

    test('mixes different log levels', () => {
      logger.setLevel(LogLevel.DEBUG)

      log.debug('Test', 'debug')
      log.info('Test', 'info')
      log.warn('Test', 'warn')
      log.error('Test', 'error')
      log.debug('Test', 'debug2')

      expect(consoleDebugSpy).toHaveBeenCalledTimes(2)
      expect(consoleInfoSpy).toHaveBeenCalledTimes(1)
      expect(consoleWarnSpy).toHaveBeenCalledTimes(1)
      expect(consoleErrorSpy).toHaveBeenCalledTimes(1)
    })
  })

  describe('Configuration Persistence', () => {
    test('level changes persist across calls', () => {
      logger.setLevel(LogLevel.ERROR)

      log.debug('Test', 'should not appear')
      log.error('Test', 'should appear')

      expect(consoleDebugSpy).not.toHaveBeenCalled()
      expect(consoleErrorSpy).toHaveBeenCalled()

      logger.setLevel(LogLevel.DEBUG)

      log.debug('Test', 'now should appear')

      expect(consoleDebugSpy).toHaveBeenCalled()
    })

    test('timestamp setting persists', () => {
      logger.configure({ enableTimestamps: true })
      log.debug('Test', 'msg1')

      logger.configure({ enableTimestamps: false })
      log.debug('Test', 'msg2')

      expect(consoleDebugSpy).toHaveBeenCalledTimes(2)
    })

    test('color setting persists', () => {
      logger.configure({ enableColors: true })
      log.debug('Test', 'msg1')

      logger.configure({ enableColors: false })
      log.debug('Test', 'msg2')

      expect(consoleDebugSpy).toHaveBeenCalledTimes(2)
    })

    test('partial configuration updates only specified fields', () => {
      logger.configure({ level: LogLevel.WARN, enableTimestamps: false, enableColors: false })

      // Only update level
      logger.configure({ level: LogLevel.DEBUG })

      expect(logger.getLevel()).toBe(LogLevel.DEBUG)

      // Timestamps should still be false
      log.debug('Test', 'message')
      const call = consoleDebugSpy.mock.calls[0]
      const hasTimestamp = call.some(arg =>
        typeof arg === 'string' && /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(arg)
      )
      expect(hasTimestamp).toBe(false)
    })
  })

  describe('Custom Log Level Method', () => {
    test('logger.log with DEBUG level', () => {
      logger.setLevel(LogLevel.DEBUG)
      logger.log(LogLevel.DEBUG, 'Test', 'message')

      expect(consoleDebugSpy).toHaveBeenCalled()
    })

    test('logger.log with INFO level', () => {
      logger.setLevel(LogLevel.DEBUG)
      logger.log(LogLevel.INFO, 'Test', 'message')

      expect(consoleInfoSpy).toHaveBeenCalled()
    })

    test('logger.log with WARN level', () => {
      logger.setLevel(LogLevel.DEBUG)
      logger.log(LogLevel.WARN, 'Test', 'message')

      expect(consoleWarnSpy).toHaveBeenCalled()
    })

    test('logger.log with ERROR level', () => {
      logger.setLevel(LogLevel.DEBUG)
      logger.log(LogLevel.ERROR, 'Test', 'message')

      expect(consoleErrorSpy).toHaveBeenCalled()
    })

    test('logger.log respects current log level', () => {
      logger.setLevel(LogLevel.WARN)
      logger.log(LogLevel.DEBUG, 'Test', 'should not appear')
      logger.log(LogLevel.WARN, 'Test', 'should appear')

      expect(consoleDebugSpy).not.toHaveBeenCalled()
      expect(consoleWarnSpy).toHaveBeenCalled()
    })
  })
})
