/**
 * Input Validation Utility
 *
 * Provides XSS protection and input validation using DOMPurify and Zod
 */

import DOMPurify from 'dompurify'
import { z } from 'zod'

/**
 * Sanitize HTML input to prevent XSS attacks
 */
export function sanitizeHtml(input: string): string {
  return DOMPurify.sanitize(input, {
    ALLOWED_TAGS: [], // No HTML tags allowed
    ALLOWED_ATTR: [], // No attributes allowed
    KEEP_CONTENT: true, // Keep text content
  })
}

/**
 * Sanitize and limit text input
 */
export function sanitizeText(input: string, maxLength: number = 1000): string {
  const sanitized = sanitizeHtml(input)
  return sanitized.slice(0, maxLength)
}

/**
 * Project validation schemas
 */
export const projectSchemas = {
  name: z
    .string()
    .min(1, 'Project name is required')
    .max(100, 'Project name must be less than 100 characters')
    .regex(/^[a-zA-Z0-9가-힣\s\-_]+$/, 'Project name contains invalid characters'),

  description: z
    .string()
    .max(500, 'Description must be less than 500 characters')
    .optional(),
}

/**
 * Connection validation schemas
 */
export const connectionSchemas = {
  ipAddress: z
    .string()
    .regex(
      /^(\d{1,3}\.){3}\d{1,3}$/,
      'Invalid IP address format'
    )
    .refine(
      (ip) => {
        const parts = ip.split('.').map(Number)
        return parts.every((part) => part >= 0 && part <= 255)
      },
      'IP address octets must be between 0 and 255'
    ),

  port: z
    .number()
    .int()
    .min(1, 'Port must be at least 1')
    .max(65535, 'Port must be at most 65535'),

  wsUrl: z
    .string()
    .regex(/^wss?:\/\/.+/, 'WebSocket URL must start with ws:// or wss://'),

  hostname: z
    .string()
    .min(1, 'Hostname is required')
    .max(255, 'Hostname too long')
    .regex(/^[a-zA-Z0-9.-]+$/, 'Invalid hostname format'),

  serialDevice: z
    .string()
    .min(1, 'Serial device is required')
    .regex(/^(COM\d+|\/dev\/tty[A-Za-z0-9]+)$/, 'Invalid serial device format'),

  baudRate: z
    .number()
    .int()
    .refine(
      (rate) => [9600, 19200, 38400, 57600, 115200, 230400, 460800, 921600].includes(rate),
      'Invalid baud rate'
    ),
}

/**
 * Validate and sanitize project name
 */
export function validateProjectName(name: string): {
  success: boolean
  data?: string
  error?: string
} {
  try {
    const sanitized = sanitizeText(name, 100)
    const validated = projectSchemas.name.parse(sanitized)
    return { success: true, data: validated }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: error.errors[0].message }
    }
    return { success: false, error: 'Validation failed' }
  }
}

/**
 * Validate and sanitize project description
 */
export function validateProjectDescription(description: string): {
  success: boolean
  data?: string
  error?: string
} {
  try {
    const sanitized = sanitizeText(description, 500)
    const validated = projectSchemas.description.parse(sanitized)
    return { success: true, data: validated || '' }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: error.errors[0].message }
    }
    return { success: false, error: 'Validation failed' }
  }
}

/**
 * Validate IP address
 */
export function validateIpAddress(ip: string): {
  success: boolean
  data?: string
  error?: string
} {
  try {
    const validated = connectionSchemas.ipAddress.parse(ip.trim())
    return { success: true, data: validated }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: error.errors[0].message }
    }
    return { success: false, error: 'Invalid IP address' }
  }
}

/**
 * Validate port number
 */
export function validatePort(port: number | string): {
  success: boolean
  data?: number
  error?: string
} {
  try {
    const portNum = typeof port === 'string' ? parseInt(port, 10) : port
    const validated = connectionSchemas.port.parse(portNum)
    return { success: true, data: validated }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: error.errors[0].message }
    }
    return { success: false, error: 'Invalid port' }
  }
}

/**
 * Validate hostname
 */
export function validateHostname(hostname: string): {
  success: boolean
  data?: string
  error?: string
} {
  try {
    const validated = connectionSchemas.hostname.parse(hostname.trim())
    return { success: true, data: validated }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: error.errors[0].message }
    }
    return { success: false, error: 'Invalid hostname' }
  }
}

/**
 * Validate serial device
 */
export function validateSerialDevice(device: string): {
  success: boolean
  data?: string
  error?: string
} {
  try {
    const validated = connectionSchemas.serialDevice.parse(device.trim())
    return { success: true, data: validated }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: error.errors[0].message }
    }
    return { success: false, error: 'Invalid serial device' }
  }
}

/**
 * Validate baud rate
 */
export function validateBaudRate(baudRate: number | string): {
  success: boolean
  data?: number
  error?: string
} {
  try {
    const rate = typeof baudRate === 'string' ? parseInt(baudRate, 10) : baudRate
    const validated = connectionSchemas.baudRate.parse(rate)
    return { success: true, data: validated }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: error.errors[0].message }
    }
    return { success: false, error: 'Invalid baud rate' }
  }
}
