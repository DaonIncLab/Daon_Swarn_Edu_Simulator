/**
 * Abstract base class for MAVLink transport layers
 * Supports UDP, Serial, and TCP connections to real drones
 */

export interface TransportConfig {
  type: "udp" | "serial" | "tcp";
  host?: string; // For UDP/TCP target
  port?: number; // For UDP/TCP target
  device?: string; // For Serial
  baudRate?: number; // For Serial
}

export interface TransportStats {
  packetsSent: number;
  packetsReceived: number;
  bytesReceived: number;
  bytesSent: number;
  lastPacketTime: number;
  errors: number;
}

export abstract class MAVLinkTransport {
  protected isConnected = false;
  protected stats: TransportStats = {
    packetsSent: 0,
    packetsReceived: 0,
    bytesReceived: 0,
    bytesSent: 0,
    lastPacketTime: 0,
    errors: 0,
  };

  // Event handlers
  protected onPacketCallback?: (packet: Uint8Array) => void;
  protected onControlMessageCallback?: (message: unknown) => void;
  protected onErrorCallback?: (error: Error) => void;
  protected onDisconnectCallback?: () => void;

  /**
   * Open the transport connection
   */
  abstract connect(config: TransportConfig): Promise<void>;

  /**
   * Close the transport connection
   */
  abstract disconnect(): Promise<void>;

  /**
   * Send a MAVLink packet
   */
  abstract sendPacket(packet: Uint8Array): Promise<void>;

  /**
   * Send a transport-specific control message
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async sendControlMessage(_message: unknown): Promise<void> {
    throw new Error("Control messages are not supported by this transport");
  }

  /**
   * Check if transport is connected
   */
  isOpen(): boolean {
    return this.isConnected;
  }

  /**
   * Get transport statistics
   */
  getStats(): TransportStats {
    return { ...this.stats };
  }

  /**
   * Reset statistics
   */
  resetStats(): void {
    this.stats = {
      packetsSent: 0,
      packetsReceived: 0,
      bytesReceived: 0,
      bytesSent: 0,
      lastPacketTime: 0,
      errors: 0,
    };
  }

  /**
   * Register callback for received packets
   */
  onPacket(callback: (packet: Uint8Array) => void): void {
    this.onPacketCallback = callback;
  }

  /**
   * Register callback for received control messages
   */
  onControlMessage(callback: (message: unknown) => void): void {
    this.onControlMessageCallback = callback;
  }

  /**
   * Register callback for errors
   */
  onError(callback: (error: Error) => void): void {
    this.onErrorCallback = callback;
  }

  /**
   * Register callback for disconnect events
   */
  onDisconnect(callback: () => void): void {
    this.onDisconnectCallback = callback;
  }

  /**
   * Handle received packet (called by subclasses)
   */
  protected handlePacket(packet: Uint8Array): void {
    this.stats.packetsReceived++;
    this.stats.bytesReceived += packet.length;
    this.stats.lastPacketTime = Date.now();

    if (this.onPacketCallback) {
      this.onPacketCallback(packet);
    }
  }

  /**
   * Handle received control message (called by subclasses)
   */
  protected handleControlMessage(message: unknown): void {
    if (this.onControlMessageCallback) {
      this.onControlMessageCallback(message);
    }
  }

  /**
   * Handle transport error (called by subclasses)
   */
  protected handleError(error: Error): void {
    this.stats.errors++;

    if (this.onErrorCallback) {
      this.onErrorCallback(error);
    }
  }

  /**
   * Handle disconnect event (called by subclasses)
   */
  protected handleDisconnect(): void {
    this.isConnected = false;

    if (this.onDisconnectCallback) {
      this.onDisconnectCallback();
    }
  }
}
