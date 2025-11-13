/**
 * MAVLink Error Handling
 *
 * Custom error classes for MAVLink operations
 */

/**
 * Base MAVLink Error class
 */
export class MAVLinkError extends Error {
  public readonly code: string
  public readonly context?: Record<string, any>
  public readonly timestamp: number

  constructor(message: string, code: string, context?: Record<string, any>) {
    super(message)
    this.name = 'MAVLinkError'
    this.code = code
    this.context = context
    this.timestamp = Date.now()

    // Maintains proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, MAVLinkError)
    }
  }

  /**
   * Convert error to JSON for logging
   */
  toJSON() {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      context: this.context,
      timestamp: this.timestamp,
      stack: this.stack,
    }
  }
}

/**
 * Protocol-level errors (parsing, serialization)
 */
export class MAVLinkProtocolError extends MAVLinkError {
  constructor(message: string, context?: Record<string, any>) {
    super(message, 'PROTOCOL_ERROR', context)
    this.name = 'MAVLinkProtocolError'
  }
}

/**
 * CRC validation errors
 */
export class MAVLinkCRCError extends MAVLinkError {
  public readonly expectedCrc: number
  public readonly receivedCrc: number

  constructor(expectedCrc: number, receivedCrc: number, msgId: number) {
    super(
      `CRC mismatch for message ${msgId}: expected ${expectedCrc}, received ${receivedCrc}`,
      'CRC_ERROR',
      { msgId, expectedCrc, receivedCrc }
    )
    this.name = 'MAVLinkCRCError'
    this.expectedCrc = expectedCrc
    this.receivedCrc = receivedCrc
  }
}

/**
 * Message construction errors
 */
export class MAVLinkMessageError extends MAVLinkError {
  public readonly messageId: number

  constructor(message: string, messageId: number, context?: Record<string, any>) {
    super(message, 'MESSAGE_ERROR', { ...context, messageId })
    this.name = 'MAVLinkMessageError'
    this.messageId = messageId
  }
}

/**
 * Command errors (COMMAND_LONG, MISSION_ITEM)
 */
export class MAVLinkCommandError extends MAVLinkError {
  public readonly command: number
  public readonly result?: number

  constructor(
    message: string,
    command: number,
    result?: number,
    context?: Record<string, any>
  ) {
    super(message, 'COMMAND_ERROR', { ...context, command, result })
    this.name = 'MAVLinkCommandError'
    this.command = command
    this.result = result
  }
}

/**
 * Conversion errors (Blockly to MAVLink)
 */
export class MAVLinkConversionError extends MAVLinkError {
  public readonly action: string

  constructor(message: string, action: string, context?: Record<string, any>) {
    super(message, 'CONVERSION_ERROR', { ...context, action })
    this.name = 'MAVLinkConversionError'
    this.action = action
  }
}

/**
 * Coordinate conversion errors
 */
export class MAVLinkCoordinateError extends MAVLinkError {
  constructor(message: string, context?: Record<string, any>) {
    super(message, 'COORDINATE_ERROR', context)
    this.name = 'MAVLinkCoordinateError'
  }
}

/**
 * Timeout errors
 */
export class MAVLinkTimeoutError extends MAVLinkError {
  public readonly timeoutMs: number

  constructor(message: string, timeoutMs: number, context?: Record<string, any>) {
    super(message, 'TIMEOUT_ERROR', { ...context, timeoutMs })
    this.name = 'MAVLinkTimeoutError'
    this.timeoutMs = timeoutMs
  }
}

/**
 * Error code constants
 */
export const MAVLinkErrorCode = {
  PROTOCOL_ERROR: 'PROTOCOL_ERROR',
  CRC_ERROR: 'CRC_ERROR',
  MESSAGE_ERROR: 'MESSAGE_ERROR',
  COMMAND_ERROR: 'COMMAND_ERROR',
  CONVERSION_ERROR: 'CONVERSION_ERROR',
  COORDINATE_ERROR: 'COORDINATE_ERROR',
  TIMEOUT_ERROR: 'TIMEOUT_ERROR',
  INVALID_PACKET: 'INVALID_PACKET',
  INVALID_MESSAGE_ID: 'INVALID_MESSAGE_ID',
  INVALID_PAYLOAD: 'INVALID_PAYLOAD',
  UNSUPPORTED_COMMAND: 'UNSUPPORTED_COMMAND',
  HOME_NOT_SET: 'HOME_NOT_SET',
} as const

export type MAVLinkErrorCode = typeof MAVLinkErrorCode[keyof typeof MAVLinkErrorCode]

/**
 * Check if error is a MAVLink error
 */
export function isMAVLinkError(error: unknown): error is MAVLinkError {
  return error instanceof MAVLinkError
}

/**
 * Format error for logging
 */
export function formatMAVLinkError(error: unknown): string {
  if (isMAVLinkError(error)) {
    const contextStr = error.context ? ` | Context: ${JSON.stringify(error.context)}` : ''
    return `[${error.code}] ${error.message}${contextStr}`
  }

  if (error instanceof Error) {
    return `[ERROR] ${error.message}`
  }

  return `[UNKNOWN] ${String(error)}`
}

/**
 * Result type for operations that can fail
 */
export type MAVLinkResult<T> =
  | { success: true; data: T }
  | { success: false; error: MAVLinkError }

/**
 * Create success result
 */
export function success<T>(data: T): MAVLinkResult<T> {
  return { success: true, data }
}

/**
 * Create error result
 */
export function failure<T>(error: MAVLinkError): MAVLinkResult<T> {
  return { success: false, error }
}

/**
 * Wrap a function in try-catch and return Result type
 */
export function wrapMAVLinkOperation<T>(
  operation: () => T,
  errorMessage: string,
  errorCode: string
): MAVLinkResult<T> {
  try {
    const data = operation()
    return success(data)
  } catch (error) {
    const mavlinkError = new MAVLinkError(
      errorMessage,
      errorCode,
      { originalError: error instanceof Error ? error.message : String(error) }
    )
    return failure(mavlinkError)
  }
}
