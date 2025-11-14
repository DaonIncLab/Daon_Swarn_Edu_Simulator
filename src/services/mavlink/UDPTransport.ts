/**
 * UDP Transport for MAVLink
 * Standard MAVLink connection using UDP (default port 14550)
 */

import { MAVLinkTransport, TransportConfig } from './MAVLinkTransport'

export class UDPTransport extends MAVLinkTransport {
  private socket: WebSocket | null = null
  private config: TransportConfig | null = null
  private reconnectTimer: number | null = null
  private reconnectAttempts = 0
  private maxReconnectAttempts = 5
  private reconnectDelay = 2000 // 2 seconds

  async connect(config: TransportConfig): Promise<void> {
    this.config = config
    const host = config.host || 'localhost'
    const port = config.port || 14550

    return new Promise((resolve, reject) => {
      try {
        // Use WebSocket bridge to UDP (requires bridge server)
        // Format: ws://host:wsPort/mavlink/udp/host/port
        const wsUrl = `ws://${host}:${port + 1000}/mavlink`

        console.log(`[UDPTransport] Connecting to ${wsUrl}`)

        this.socket = new WebSocket(wsUrl)
        this.socket.binaryType = 'arraybuffer'

        this.socket.onopen = () => {
          console.log('[UDPTransport] Connected')
          this.isConnected = true
          this.reconnectAttempts = 0
          resolve()
        }

        this.socket.onmessage = (event) => {
          if (event.data instanceof ArrayBuffer) {
            const packet = new Uint8Array(event.data)
            this.handlePacket(packet)
          }
        }

        this.socket.onerror = (error) => {
          console.error('[UDPTransport] WebSocket error:', error)
          const err = new Error('UDP transport connection error')
          this.handleError(err)

          if (!this.isConnected) {
            reject(err)
          }
        }

        this.socket.onclose = () => {
          console.log('[UDPTransport] Disconnected')
          const wasConnected = this.isConnected
          this.handleDisconnect()

          // Attempt reconnection if we were previously connected
          if (wasConnected && this.reconnectAttempts < this.maxReconnectAttempts) {
            this.scheduleReconnect()
          }
        }

        // Timeout after 10 seconds
        setTimeout(() => {
          if (!this.isConnected && this.socket?.readyState !== WebSocket.OPEN) {
            this.socket?.close()
            reject(new Error('UDP transport connection timeout'))
          }
        }, 10000)
      } catch (error) {
        reject(error)
      }
    })
  }

  async disconnect(): Promise<void> {
    if (this.reconnectTimer !== null) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }

    if (this.socket) {
      this.socket.close()
      this.socket = null
    }

    this.isConnected = false
  }

  async sendPacket(packet: Uint8Array): Promise<void> {
    if (!this.isConnected || !this.socket) {
      throw new Error('UDP transport not connected')
    }

    try {
      this.socket.send(packet.buffer)
      this.stats.packetsSent++
      this.stats.bytesSent += packet.length
    } catch (error) {
      this.handleError(
        error instanceof Error ? error : new Error('Failed to send packet')
      )
      throw error
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer !== null) {
      return
    }

    this.reconnectAttempts++
    console.log(
      `[UDPTransport] Reconnecting in ${this.reconnectDelay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`
    )

    this.reconnectTimer = window.setTimeout(() => {
      this.reconnectTimer = null
      if (this.config) {
        this.connect(this.config).catch((err) => {
          console.error('[UDPTransport] Reconnect failed:', err)
          if (this.reconnectAttempts < this.maxReconnectAttempts) {
            this.scheduleReconnect()
          }
        })
      }
    }, this.reconnectDelay)
  }
}
