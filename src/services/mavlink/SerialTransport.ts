/**
 * Serial Transport for MAVLink
 * Direct hardware connection via Web Serial API
 */

import type { TransportConfig } from './MAVLinkTransport'
import { MAVLinkTransport } from './MAVLinkTransport'
import { log } from '@/utils/logger'

// Web Serial API types
declare global {
  interface Navigator {
    serial: Serial
  }

  interface Serial {
    requestPort(options?: SerialPortRequestOptions): Promise<SerialPort>
    getPorts(): Promise<SerialPort[]>
    addEventListener(type: string, listener: EventListener): void
    removeEventListener(type: string, listener: EventListener): void
  }

  interface SerialPort {
    readable: ReadableStream<Uint8Array> | null
    writable: WritableStream<Uint8Array> | null
    getInfo(): SerialPortInfo
    open(options: SerialOptions): Promise<void>
    close(): Promise<void>
  }

  interface SerialPortInfo {
    usbVendorId?: number
    usbProductId?: number
  }

  interface SerialPortRequestOptions {
    filters?: SerialPortFilter[]
  }

  interface SerialPortFilter {
    usbVendorId?: number
    usbProductId?: number
  }

  interface SerialOptions {
    baudRate: number
    dataBits?: number
    stopBits?: number
    parity?: 'none' | 'even' | 'odd'
    bufferSize?: number
    rtscts?: boolean
    signal?: AbortSignal
  }
}

export class SerialTransport extends MAVLinkTransport {
  private port: SerialPort | null = null
  private reader: ReadableStreamDefaultReader<Uint8Array> | null = null
  private writer: WritableStreamDefaultWriter<Uint8Array> | null = null
  private readLoop: Promise<void> | null = null
  private abortController: AbortController | null = null

  async connect(config: TransportConfig): Promise<void> {
    if (!('serial' in navigator)) {
      throw new Error(
        'Web Serial API not supported in this browser. Use Chrome/Edge.'
      )
    }

    try {
      const baudRate = config.baudRate || 57600 // Standard MAVLink baud rate

      // Request a port if device not specified, or get existing port
      if (!this.port) {
        this.port = await (navigator.serial as Serial).requestPort()
      }

      // Open the serial port
      await this.port.open({ baudRate })

      log.info('Connected', { baudRate })

      // Set up reader and writer
      if (this.port.readable && this.port.writable) {
        this.reader = this.port.readable.getReader()
        this.writer = this.port.writable.getWriter()
        this.isConnected = true

        // Start reading loop
        this.abortController = new AbortController()
        this.readLoop = this.startReadLoop()
      } else {
        throw new Error('Serial port streams not available')
      }
    } catch (error) {
      log.error('Connection failed', { error })
      throw error
    }
  }

  async disconnect(): Promise<void> {
    log.info('Disconnecting')

    // Stop read loop
    if (this.abortController) {
      this.abortController.abort()
      this.abortController = null
    }

    // Wait for read loop to finish
    if (this.readLoop) {
      await this.readLoop.catch(() => {
        /* ignore abort errors */
      })
      this.readLoop = null
    }

    // Release reader
    if (this.reader) {
      try {
        await this.reader.cancel()
        this.reader.releaseLock()
      } catch {
        /* ignore errors */
      }
      this.reader = null
    }

    // Release writer
    if (this.writer) {
      try {
        await this.writer.close()
      } catch {
        /* ignore errors */
      }
      this.writer = null
    }

    // Close port
    if (this.port) {
      try {
        await this.port.close()
      } catch {
        /* ignore errors */
      }
      this.port = null
    }

    this.isConnected = false
  }

  async sendPacket(packet: Uint8Array): Promise<void> {
    if (!this.isConnected || !this.writer) {
      throw new Error('Serial transport not connected')
    }

    try {
      await this.writer.write(packet)
      this.stats.packetsSent++
      this.stats.bytesSent += packet.length
    } catch (error) {
      this.handleError(
        error instanceof Error ? error : new Error('Failed to send packet')
      )
      throw error
    }
  }

  /**
   * Continuous read loop for incoming data
   */
  private async startReadLoop(): Promise<void> {
    if (!this.reader) {
      return
    }

    const buffer: number[] = []
    const MAVLINK_STX_V2 = 0xfd // MAVLink v2 start byte

    try {
      while (this.isConnected && !this.abortController?.signal.aborted) {
        const { value, done } = await this.reader.read()

        if (done) {
          log.info('Read stream ended')
          break
        }

        if (!value) {
          continue
        }

        // Process incoming bytes
        for (let i = 0; i < value.length; i++) {
          const byte = value[i]
          buffer.push(byte)

          // Look for MAVLink packet start
          if (byte === MAVLINK_STX_V2 && buffer.length === 1) {
            // Valid start, continue building packet
            continue
          }

          // MAVLink v2 packet: STX(1) + LEN(1) + INCOMPAT(1) + COMPAT(1) + SEQ(1) + SYSID(1) + COMPID(1) + MSGID(3) + PAYLOAD(n) + CRC(2) + SIGNATURE(13 optional)
          if (buffer.length >= 2) {
            const payloadLen = buffer[1]
            const minPacketLen = 12 + payloadLen // Without signature
            const maxPacketLen = 12 + payloadLen + 13 // With signature

            // Check if we have enough bytes for a complete packet
            if (buffer.length >= minPacketLen) {
              // Extract complete packet
              const packet = new Uint8Array(buffer.slice(0, minPacketLen))
              this.handlePacket(packet)

              // Clear buffer
              buffer.length = 0
            } else if (buffer.length > maxPacketLen) {
              // Invalid packet, clear and resync
              log.warn('Invalid packet, resyncing')
              buffer.length = 0
            }
          }
        }

        // Prevent buffer overflow
        if (buffer.length > 300) {
          log.warn('Buffer overflow, clearing')
          buffer.length = 0
        }
      }
    } catch (error) {
      if (!this.abortController?.signal.aborted) {
        log.error('Read error', { error })
        this.handleError(
          error instanceof Error ? error : new Error('Serial read error')
        )
        this.handleDisconnect()
      }
    }
  }

  /**
   * List available serial ports
   */
  static async listPorts(): Promise<SerialPort[]> {
    if (!('serial' in navigator)) {
      throw new Error('Web Serial API not supported')
    }

    return await (navigator.serial as Serial).getPorts()
  }
}
