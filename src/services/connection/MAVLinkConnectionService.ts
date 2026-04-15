/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * MAVLink Connection Service
 *
 * Implements IConnectionService using MAVLink protocol
 * Handles real drone connections over UDP/Serial transport
 */

import { CommandAction, MessageType } from "@/constants/commands";
import { ConnectionStatus } from "@/constants/connection";
import type { PositionSetpointCallback } from "@/services/execution/VirtualLeaderFormation";
import { VirtualLeaderFormationController } from "@/services/execution/VirtualLeaderFormation";
import { coordinateConverter } from "@/services/mavlink/CoordinateConverter";
import {
  createMissionItemInt as buildMissionItemInt,
  MAV_CMD,
  MISSION_FRAME,
} from "@/services/mavlink/MAVLinkCommands";
import {
  MAVLINK_POSITION_SENTINEL,
  MAVLinkConverter,
} from "@/services/mavlink/MAVLinkConverter";
import {
  createCommandLong,
  createHeartbeat,
  createMissionClearAll,
  createMissionCount,
  createMissionItemInt,
  createMissionSetCurrent,
  createMissionStart,
  parseGlobalPositionInt,
  parseMissionAck,
  parseMissionCurrent,
  parseMissionItemReached,
  parseMissionRequest,
  parseMissionRequestInt,
} from "@/services/mavlink/MAVLinkMessages";
import {
  MAV_MSG_ID,
  parsePacket,
  serializePacket,
} from "@/services/mavlink/MAVLinkProtocol";
import type { MAVLinkTransport } from "@/services/mavlink/MAVLinkTransport";
import { SerialTransport } from "@/services/mavlink/SerialTransport";
import { UDPTransport } from "@/services/mavlink/UDPTransport";
import {
  MAV_RESULT,
  type MissionAckMessage,
  type MissionItemIntMessage,
  type MissionRequestIntMessage,
  type MissionRequestMessage,
} from "@/types/mavlink";
import type { Command, DroneState } from "@/types/websocket";
import { log } from "@/utils/logger";
import type { IConnectionService } from "./IConnectionService";
import type {
  CommandBatchContext,
  CommandResponse,
  ConnectionConfig,
  ConnectionEventListeners,
} from "./types";
import type { MAVLinkTelemetry } from "./MAVLinkSimulator";

/**
 * Formation Control Mode
 * Determines how formation commands are executed
 */
export enum FormationControlMode {
  /**
   * GCS-Coordinated: GCS calculates each drone's position individually
   * - Existing implementation using MAVLinkConverter
   * - Each drone receives independent position setpoints
   */
  GCS_COORDINATED = "gcs_coordinated",

  /**
   * Virtual Leader: Virtual point moves, drones follow with formation offsets
   * - Smooth synchronized movement
   * - Easier trajectory planning
   * - Formation moves as one cohesive unit
   */
  VIRTUAL_LEADER = "virtual_leader",
}

interface MAVLinkComponentRef {
  systemId: number;
  componentId: number;
  isPrimaryFlightComponent: boolean;
}

interface PendingCommandAckWaiter {
  command: number;
  resolve: (ack: { command: number; result: number }) => void;
  reject: (error: Error) => void;
  timeoutId: number;
}

interface PendingMissionRequestWaiter {
  seq: number;
  resolve: (message: MissionRequestIntMessage | MissionRequestMessage) => void;
  reject: (error: Error) => void;
  timeoutId: number;
}

interface PendingMissionAckWaiter {
  resolve: (message: MissionAckMessage) => void;
  reject: (error: Error) => void;
  timeoutId: number;
}

interface PendingMissionCompletionWaiter {
  finalSeq: number;
  targetSystem: number;
  resolve: (seq: number) => void;
  reject: (error: Error) => void;
  timeoutId: number;
}

interface MissionProgressState {
  currentSeq: number;
  isArmed: boolean;
  lastUpdatedAt: number;
}

interface MissionPositionCacheEntry {
  x: number;
  y: number;
  z: number;
  heading: number;
  lastUpdatedAt: number;
}

interface PlannedTargetPosition {
  x: number;
  y: number;
  z: number;
  heading: number;
}

const ROTATE_WAYPOINT_OFFSET_METERS = 0.3;
const FAILSAFE_HEARTBEAT_TIMEOUT_MS = 3000;
const FAILSAFE_MIN_RETRY_INTERVAL_MS = 3000;
const FAILSAFE_WATCHDOG_INTERVAL_MS = 1000;

/**
 * MAVLink Connection Service
 */
export class MAVLinkConnectionService implements IConnectionService {
  private status: ConnectionStatus = ConnectionStatus.DISCONNECTED;
  private listeners: ConnectionEventListeners = {};
  private messageListener: ((message: unknown) => void) | null = null;
  private droneCount: number = 4;
  private lastTelemetry: Map<number, Partial<DroneState>> = new Map();

  // Real connection infrastructure
  private transport: MAVLinkTransport | null = null;
  private heartbeatInterval: number | null = null;
  private failsafeWatchdogInterval: number | null = null;
  private isFailsafeWatchdogRunning = false;
  private lastHeartbeatAtBySystem: Map<number, number> = new Map();
  private lastArmedStateBySystem: Map<number, boolean> = new Map();
  private lastFailsafeSentAtBySystem: Map<number, number> = new Map();
  private systemId: number = 255; // GCS system ID
  private componentId: number = 190; // GCS component ID
  private systemComponents: Map<number, Map<number, MAVLinkComponentRef>> =
    new Map();
  private pendingMissionItems: MissionItemIntMessage[] = [];
  private missionPositionCache: Map<number, MissionPositionCacheEntry> =
    new Map();
  private pendingMissionTargetCache: Map<number, PlannedTargetPosition> =
    new Map();
  private isHomePositionInitialized = false;
  private homePositionSourceSystemId: number | null = null;
  private pendingMissionRequestWaiter: PendingMissionRequestWaiter | null =
    null;
  private pendingMissionAckWaiter: PendingMissionAckWaiter | null = null;
  private pendingCommandAckWaiter: PendingCommandAckWaiter | null = null;
  private pendingMissionCompletionWaiter: PendingMissionCompletionWaiter | null =
    null;
  private missionProgressBySystem: Map<number, MissionProgressState> = new Map();

  // Formation control
  private formationMode: FormationControlMode =
    FormationControlMode.GCS_COORDINATED;
  private virtualLeaderController: VirtualLeaderFormationController | null =
    null;

  constructor(droneCount: number = 4) {
    this.droneCount = droneCount;
  }

  async connect(config: ConnectionConfig): Promise<void> {
    log.info("Connecting...", { config });

    if (!config.mavlink) {
      throw new Error("MAVLink configuration is required");
    }

    this._updateStatus(ConnectionStatus.CONNECTING);

    await this._initializeRealConnection(config);

    this._updateStatus(ConnectionStatus.CONNECTED);

    if (this.listeners.onLog) {
      this.listeners.onLog("[MAVLink] Connected to real drone transport");
    }
  }

  /**
   * Initialize real MAVLink hardware connection
   */
  private async _initializeRealConnection(
    config: ConnectionConfig,
  ): Promise<void> {
    log.info("Initializing real connection...");

    if (!config.mavlink) {
      throw new Error("MAVLink configuration is required");
    }

    const mavConfig = config.mavlink;

    // Create appropriate transport
    const transportType = mavConfig.transportType || "udp";

    if (transportType === "udp") {
      this.transport = new UDPTransport();
    } else if (transportType === "serial") {
      this.transport = new SerialTransport();
    } else {
      throw new Error(`Unsupported transport type: ${transportType}`);
    }

    // Set up packet handler
    this.transport.onPacket((packet: Uint8Array) => {
      this._handleIncomingPacket(packet);
    });

    // Set up error handler
    this.transport.onError((error: Error) => {
      log.error("Transport error", { error });
      if (this.listeners.onLog) {
        this.listeners.onLog(`[MAVLink] Error: ${error.message}`);
      }
    });

    // Set up disconnect handler
    this.transport.onDisconnect(() => {
      log.info("Transport disconnected");
      this._stopHeartbeat();
      this._stopFailsafeWatchdog();
      this._updateStatus(ConnectionStatus.DISCONNECTED);
    });

    this.transport.onControlMessage((message: unknown) => {
      log.info("Transport control message", { message });
      if (this.listeners.onLog && typeof message === "object" && message) {
        const msg = message as Record<string, unknown>;
        const type = typeof msg.type === "string" ? msg.type : "unknown";
        this.listeners.onLog(`[MAVLink Bridge] ${type}`);
      }
    });

    // Connect transport
    await this.transport.connect({
      type: transportType,
      host: mavConfig.host,
      port: mavConfig.port,
      device: mavConfig.device,
      baudRate: mavConfig.baudRate,
    });

    if (transportType === "udp") {
      await this.transport.sendControlMessage({
        type: "set_target",
        target: {
          host: mavConfig.host || "localhost",
          port: mavConfig.port || 14550,
        },
      });
    }

    // Start heartbeat (1Hz as per MAVLink spec)
    this._startHeartbeat();
    this._startFailsafeWatchdog();

    log.info("Real connection established");
  }

  /**
   * Handle incoming MAVLink packet from transport
   */
  private _handleIncomingPacket(packet: Uint8Array): void {
    try {
      // Parse MAVLink packet
      const parsed = parsePacket(packet);

      if (!parsed) {
        log.warn("Failed to parse packet");
        return;
      }

      const systemId = parsed.sysid;
      const componentId = parsed.compid;
      const droneId = systemId;

      this._registerComponent(systemId, componentId);

      // Initialize telemetry entry if needed
      if (!this.lastTelemetry.has(droneId)) {
        this.lastTelemetry.set(droneId, {
          id: droneId,
          position: { x: 0, y: 0, z: 0 },
          velocity: { x: 0, y: 0, z: 0 },
          rotation: { x: 0, y: 0, z: 0 },
          battery: 100,
          status: "landed",
          isActive: false,
        });
      }

      const state = this.lastTelemetry.get(droneId)!;

      // Process message based on type
      switch (parsed.msgid) {
        case MAV_MSG_ID.GLOBAL_POSITION_INT:
          this._processGlobalPosition(systemId, state, parsed.payload);
          break;

        case MAV_MSG_ID.ATTITUDE:
          this._processAttitude(state, parsed.payload);
          break;

        case MAV_MSG_ID.HEARTBEAT:
          this._markPrimaryFlightComponent(systemId, componentId);
          this._processHeartbeat(systemId, state, parsed.payload);
          break;

        case MAV_MSG_ID.BATTERY_STATUS:
          this._processBatteryStatus(state, parsed.payload);
          break;

        case MAV_MSG_ID.MISSION_REQUEST_INT:
          this._processMissionRequestInt(parsed.payload);
          break;

        case MAV_MSG_ID.MISSION_REQUEST:
          this._processMissionRequest(parsed.payload);
          break;

        case MAV_MSG_ID.MISSION_ACK:
          this._processMissionAck(parsed.payload);
          break;

        case MAV_MSG_ID.MISSION_CURRENT:
          this._processMissionCurrent(systemId, parsed.payload);
          break;

        case MAV_MSG_ID.MISSION_ITEM_REACHED:
          this._processMissionItemReached(systemId, parsed.payload);
          break;

        case MAV_MSG_ID.COMMAND_ACK:
          this._processCommandAck(parsed.payload);
          break;

        case MAV_MSG_ID.STATUSTEXT:
          this._processStatusText(parsed.payload);
          break;
      }

      // Emit telemetry updates
      this._emitTelemetryUpdates();
    } catch (error) {
      log.error("Packet processing error", { error });
    }
  }

  private _processStatusText(payload: Uint8Array): void {
    const severity = payload[0] ?? 0;
    const textBytes = payload.slice(1, 51);
    const text = new TextDecoder().decode(textBytes).replace(/\0/g, "").trim();

    console.log("[MAVLink][STATUSTEXT]", { severity, text });
  }

  /**
   * Process GLOBAL_POSITION_INT message
   */
  private _processGlobalPosition(
    systemId: number,
    state: Partial<DroneState>,
    payload: Uint8Array,
  ): void {
    let globalPosition;

    try {
      globalPosition = parseGlobalPositionInt(payload);
    } catch (error) {
      log.warn("[MAVLink] Skipping malformed GLOBAL_POSITION_INT", {
        systemId,
        payloadLength: payload.byteLength,
        error,
      });
      return;
    }

    const lat = globalPosition.lat;
    const lon = globalPosition.lon;
    const alt = globalPosition.alt;
    const relativeAlt = globalPosition.relative_alt;
    const vx = globalPosition.vx / 100; // cm/s to m/s
    const vy = globalPosition.vy / 100;
    const vz = globalPosition.vz / 100;
    const heading =
      globalPosition.hdg > 0 && globalPosition.hdg !== 65535
        ? globalPosition.hdg / 100
        : (state.rotation?.z ?? 0);

    try {
      this._initializeHomePositionFromGlobalPosition(systemId, lat, lon, alt);
      const localPos = coordinateConverter.mavlinkGlobalToLocal(
        lat,
        lon,
        alt,
        relativeAlt,
      );
      state.position = { x: localPos.x, y: localPos.y, z: localPos.z };
      state.velocity = { x: vx, y: vy, z: vz };
      this._storeMissionPosition(
        systemId,
        localPos.x,
        localPos.y,
        localPos.z,
        heading,
      );
    } catch (error) {
      log.warn("Coordinate conversion error", { error });
    }
  }

  private _initializeHomePositionFromGlobalPosition(
    systemId: number,
    lat: number,
    lon: number,
    alt: number,
  ): void {
    if (this.isHomePositionInitialized || coordinateConverter.hasHome()) {
      return;
    }

    if (lat === 0 || lon === 0) {
      log.warn(
        "[MAVLink] Skipping home initialization: invalid GLOBAL_POSITION_INT",
        {
          systemId,
          lat,
          lon,
          alt,
        },
      );
      return;
    }

    const latitude = lat / 1e7;
    const longitude = lon / 1e7;
    const altitude = alt / 1000;

    coordinateConverter.setHome(latitude, longitude, altitude);
    this.isHomePositionInitialized = true;
    this.homePositionSourceSystemId = systemId;

    log.info("[MAVLink] Home position initialized from GLOBAL_POSITION_INT", {
      systemId,
      latitude,
      longitude,
      altitude,
    });
  }

  private _storeMissionPosition(
    systemId: number,
    x: number,
    y: number,
    z: number,
    heading: number,
  ): void {
    const now = Date.now();
    const normalizedHeading = this._normalizeHeading(heading);
    const existing = this.missionPositionCache.get(systemId);

    if (existing && now - existing.lastUpdatedAt < 1000) {
      this.missionPositionCache.set(systemId, {
        ...existing,
        heading: normalizedHeading,
      });
      return;
    }

    this.missionPositionCache.set(systemId, {
      x,
      y,
      z,
      heading: normalizedHeading,
      lastUpdatedAt: now,
    });
  }

  /**
   * Process ATTITUDE message
   */
  private _processAttitude(
    state: Partial<DroneState>,
    payload: Uint8Array,
  ): void {
    const view = new DataView(
      payload.buffer,
      payload.byteOffset,
      payload.byteLength,
    );

    const roll = view.getFloat32(4, true);
    const pitch = view.getFloat32(8, true);
    const yaw = view.getFloat32(12, true);

    state.rotation = {
      x: (roll * 180) / Math.PI,
      y: (pitch * 180) / Math.PI,
      z: (yaw * 180) / Math.PI,
    };
  }

  /**
   * Process HEARTBEAT message
   */
  private _processHeartbeat(
    systemId: number,
    state: Partial<DroneState>,
    payload: Uint8Array,
  ): void {
    const view = new DataView(
      payload.buffer,
      payload.byteOffset,
      payload.byteLength,
    );

    const baseMode = view.getUint8(6);
    const systemStatus = view.getUint8(8);
    const isArmed = (baseMode & 0x80) !== 0;

    state.status = MAVLinkConverter.mavStateTodroneStatus(systemStatus);
    state.isActive = isArmed; // MAV_MODE_FLAG_SAFETY_ARMED
    this._updateMissionProgressState(systemId, {
      isArmed,
    });
    this.lastHeartbeatAtBySystem.set(systemId, Date.now());
    this.lastArmedStateBySystem.set(systemId, isArmed);
    this._tryResolveMissionCompletionFromProgress(systemId);

    console.log("[MAVLink][HEARTBEAT]", {
      status: state.status,
      isActive: state.isActive,
      baseMode,
      systemStatus,
    });
  }

  /**
   * Process BATTERY_STATUS message
   */
  private _processBatteryStatus(
    state: Partial<DroneState>,
    payload: Uint8Array,
  ): void {
    const view = new DataView(
      payload.buffer,
      payload.byteOffset,
      payload.byteLength,
    );

    const batteryRemaining = view.getInt8(33); // Battery remaining percentage
    state.battery = batteryRemaining;
  }

  /**
   * Process COMMAND_ACK message
   */
  private _processCommandAck(payload: Uint8Array): void {
    const view = new DataView(
      payload.buffer,
      payload.byteOffset,
      payload.byteLength,
    );

    const command = view.getUint16(0, true);
    const result = view.getUint8(2);
    const progress = payload.byteLength > 3 ? view.getUint8(3) : undefined;
    const resultParam2 =
      payload.byteLength > 7 ? view.getInt32(4, true) : undefined;
    const targetSystem = payload.byteLength > 8 ? view.getUint8(8) : undefined;
    const targetComponent =
      payload.byteLength > 9 ? view.getUint8(9) : undefined;
    const resultStr = this._getMavResultLabel(result);

    console.log("[MAVLink][COMMAND_ACK]", {
      command,
      result,
      resultStr,
      progress,
      resultParam2,
      targetSystem,
      targetComponent,
    });

    if (this.listeners.onLog) {
      this.listeners.onLog(`[MAVLink] Command ${command} ${resultStr}`);
    }

    if (
      this.pendingCommandAckWaiter &&
      this.pendingCommandAckWaiter.command === command
    ) {
      clearTimeout(this.pendingCommandAckWaiter.timeoutId);
      const waiter = this.pendingCommandAckWaiter;
      this.pendingCommandAckWaiter = null;

      if (result === MAV_RESULT.ACCEPTED) {
        waiter.resolve({ command, result });
      } else {
        waiter.reject(new Error(`Command ${command} ${resultStr}`));
      }
    }
  }

  private _processMissionRequestInt(payload: Uint8Array): void {
    const message = parseMissionRequestInt(payload);

    if (
      this.pendingMissionRequestWaiter &&
      this.pendingMissionRequestWaiter.seq === message.seq
    ) {
      clearTimeout(this.pendingMissionRequestWaiter.timeoutId);
      const waiter = this.pendingMissionRequestWaiter;
      this.pendingMissionRequestWaiter = null;
      waiter.resolve(message);
    }
  }

  private _processMissionRequest(payload: Uint8Array): void {
    const message = parseMissionRequest(payload);

    if (
      this.pendingMissionRequestWaiter &&
      this.pendingMissionRequestWaiter.seq === message.seq
    ) {
      clearTimeout(this.pendingMissionRequestWaiter.timeoutId);
      const waiter = this.pendingMissionRequestWaiter;
      this.pendingMissionRequestWaiter = null;
      waiter.resolve(message);
    }
  }

  private _processMissionAck(payload: Uint8Array): void {
    const message = parseMissionAck(payload);

    if (this.pendingMissionAckWaiter) {
      clearTimeout(this.pendingMissionAckWaiter.timeoutId);
      const waiter = this.pendingMissionAckWaiter;
      this.pendingMissionAckWaiter = null;

      if (message.type === MAV_RESULT.ACCEPTED) {
        waiter.resolve(message);
      } else {
        waiter.reject(
          new Error(`Mission ACK ${this._getMavResultLabel(message.type)}`),
        );
      }
    }
  }

  private _processMissionCurrent(systemId: number, payload: Uint8Array): void {
    const message = parseMissionCurrent(payload);
    this._updateMissionProgressState(systemId, {
      currentSeq: message.seq,
    });
    this._tryResolveMissionCompletionFromProgress(systemId);

    console.log("[MAVLink][MISSION_CURRENT]", {
      systemId,
      seq: message.seq,
      missionState: message.mission_state,
      missionMode: message.mission_mode,
      missionId: message.mission_id,
    });

    if (this.listeners.onLog) {
      this.listeners.onLog(`[MAVLink] Mission current seq ${message.seq}`);
    }
  }

  private _processMissionItemReached(
    systemId: number,
    payload: Uint8Array,
  ): void {
    const message = parseMissionItemReached(payload);

    // console.log("[MAVLink][MISSION_ITEM_REACHED]", {
    //   seq: message.seq,
    // });

    // if (this.listeners.onLog) {
    //   this.listeners.onLog(`[MAVLink] Mission item reached seq ${message.seq}`);
    // }

    if (
      this.pendingMissionCompletionWaiter &&
      this.pendingMissionCompletionWaiter.targetSystem === systemId &&
      message.seq >= this.pendingMissionCompletionWaiter.finalSeq
    ) {
      clearTimeout(this.pendingMissionCompletionWaiter.timeoutId);
      const waiter = this.pendingMissionCompletionWaiter;
      this.pendingMissionCompletionWaiter = null;
      log.info("[MAVLink] Mission completion resolved by MISSION_ITEM_REACHED", {
        systemId,
        seq: message.seq,
        finalSeq: waiter.finalSeq,
      });
      waiter.resolve(message.seq);
    }
  }

  private _updateMissionProgressState(
    systemId: number,
    partial: Partial<MissionProgressState>,
  ): void {
    const previous = this.missionProgressBySystem.get(systemId);
    this.missionProgressBySystem.set(systemId, {
      currentSeq: partial.currentSeq ?? previous?.currentSeq ?? -1,
      isArmed: partial.isArmed ?? previous?.isArmed ?? false,
      lastUpdatedAt: Date.now(),
    });
  }

  private _tryResolveMissionCompletionFromProgress(systemId: number): void {
    if (
      !this.pendingMissionCompletionWaiter ||
      this.pendingMissionCompletionWaiter.targetSystem !== systemId
    ) {
      return;
    }

    const progress = this.missionProgressBySystem.get(systemId);
    if (!progress) {
      return;
    }

    if (
      progress.currentSeq >= this.pendingMissionCompletionWaiter.finalSeq &&
      !progress.isArmed
    ) {
      clearTimeout(this.pendingMissionCompletionWaiter.timeoutId);
      const waiter = this.pendingMissionCompletionWaiter;
      this.pendingMissionCompletionWaiter = null;
      log.info("[MAVLink] Mission completion resolved by MISSION_CURRENT + DISARM", {
        systemId,
        seq: progress.currentSeq,
        finalSeq: waiter.finalSeq,
      });
      waiter.resolve(progress.currentSeq);
    }
  }

  private _getMavResultLabel(result: number): string {
    switch (result) {
      case MAV_RESULT.ACCEPTED:
        return "ACCEPTED";
      case MAV_RESULT.TEMPORARILY_REJECTED:
        return "TEMPORARILY_REJECTED";
      case MAV_RESULT.DENIED:
        return "DENIED";
      case MAV_RESULT.UNSUPPORTED:
        return "UNSUPPORTED";
      case MAV_RESULT.FAILED:
        return "FAILED";
      case MAV_RESULT.IN_PROGRESS:
        return "IN_PROGRESS";
      case MAV_RESULT.CANCELLED:
        return "CANCELLED";
      default:
        return `UNKNOWN (${result})`;
    }
  }

  /**
   * Start sending heartbeat messages (1Hz)
   */
  private _startHeartbeat(): void {
    if (this.heartbeatInterval !== null) {
      return;
    }

    const sendHeartbeat = () => {
      if (!this.transport || !this.transport.isOpen()) {
        return;
      }

      // Create HEARTBEAT message
      const heartbeatPacket = createHeartbeat(
        6, // MAV_TYPE_GCS
        0, // MAV_AUTOPILOT_GENERIC
        0, // base_mode
        0, // custom_mode
        4, // MAV_STATE_ACTIVE
        this.systemId,
        this.componentId,
      );

      this.transport
        .sendPacket(serializePacket(heartbeatPacket))
        .catch((err) => {
          log.error("Failed to send heartbeat", { error: err });
        });
    };

    // Send initial heartbeat
    sendHeartbeat();

    // Send heartbeat every second
    this.heartbeatInterval = window.setInterval(sendHeartbeat, 1000);
    log.info("Heartbeat started (1Hz)");
  }

  /**
   * Stop heartbeat
   */
  private _stopHeartbeat(): void {
    if (this.heartbeatInterval !== null) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
      log.info("Heartbeat stopped");
    }
  }

  private _startFailsafeWatchdog(): void {
    if (this.failsafeWatchdogInterval !== null) {
      return;
    }

    this.failsafeWatchdogInterval = window.setInterval(() => {
      if (this.isFailsafeWatchdogRunning) {
        return;
      }

      this.isFailsafeWatchdogRunning = true;
      this._evaluateAutoFailsafe()
        .catch((error) => {
          log.error("[MAVLink][FAILSAFE] Watchdog error", { error });
        })
        .finally(() => {
          this.isFailsafeWatchdogRunning = false;
        });
    }, FAILSAFE_WATCHDOG_INTERVAL_MS);
  }

  private _stopFailsafeWatchdog(): void {
    if (this.failsafeWatchdogInterval !== null) {
      clearInterval(this.failsafeWatchdogInterval);
      this.failsafeWatchdogInterval = null;
    }
    this.isFailsafeWatchdogRunning = false;
  }

  private _getActiveArmedSystems(now: number = Date.now()): number[] {
    return Array.from(this.lastHeartbeatAtBySystem.entries())
      .filter(([systemId, lastHeartbeatAt]) => {
        const isArmed = this.lastArmedStateBySystem.get(systemId) ?? false;
        const isHeartbeatFresh =
          now - lastHeartbeatAt <= FAILSAFE_HEARTBEAT_TIMEOUT_MS;
        return isArmed && isHeartbeatFresh;
      })
      .map(([systemId]) => systemId);
  }

  private _getAutoFailsafeTargetSystems(now: number = Date.now()): number[] {
    return Array.from(this.lastHeartbeatAtBySystem.entries())
      .filter(([systemId, lastHeartbeatAt]) => {
        const isArmed = this.lastArmedStateBySystem.get(systemId) ?? false;
        if (!isArmed || now - lastHeartbeatAt <= FAILSAFE_HEARTBEAT_TIMEOUT_MS) {
          return false;
        }

        const lastSentAt = this.lastFailsafeSentAtBySystem.get(systemId);
        if (!lastSentAt) {
          return true;
        }

        return now - lastSentAt >= FAILSAFE_MIN_RETRY_INTERVAL_MS;
      })
      .map(([systemId]) => systemId);
  }

  private _terminateMissionStateForFailsafe(source: "AUTO" | "MANUAL"): void {
    const reason = `[MAVLink][FAILSAFE] Mission flow aborted by ${source} failsafe`;
    this._resetMissionUploadState(reason);
    this._clearMissionBuffer();
    this._clearPendingMissionTargetCache();
  }

  private async _sendFailsafeLanding(
    targetSystems: number[],
    source: "AUTO" | "MANUAL",
  ): Promise<{ landedSystems: number[]; clearedSystems: number[] }> {
    this._terminateMissionStateForFailsafe(source);

    const now = Date.now();
    const landedSystems: number[] = [];
    const clearedSystems: number[] = [];

    for (const targetSystem of targetSystems) {
      try {
        await this._sendRealCommand({
          command: MAV_CMD.NAV_LAND,
          target_system: targetSystem,
          target_component: this._getTargetComponentId(targetSystem),
        });
        landedSystems.push(targetSystem);
        this.lastFailsafeSentAtBySystem.set(targetSystem, now);
      } catch (error) {
        log.error("[MAVLink][FAILSAFE] LAND command failed", {
          source,
          targetSystem,
          error,
        });
      }
    }

    for (const targetSystem of targetSystems) {
      const targetComponent = this._getTargetComponentId(targetSystem);
      try {
        await this._sendMissionClearAll(targetSystem, targetComponent);
        clearedSystems.push(targetSystem);
      } catch (error) {
        log.warn("[MAVLink][FAILSAFE] MISSION_CLEAR_ALL failed (best effort)", {
          source,
          targetSystem,
          targetComponent,
          error,
        });
      }
    }

    const logMessage =
      source === "AUTO"
        ? `[MAVLink][FAILSAFE][AUTO_FAILSAFE_TRIGGERED] LAND→CLEAR (landed: ${landedSystems.join(", ") || "none"}, cleared: ${clearedSystems.join(", ") || "none"})`
        : `[MAVLink][FAILSAFE][MANUAL_FAILSAFE_TRIGGERED] LAND→CLEAR (landed: ${landedSystems.join(", ") || "none"}, cleared: ${clearedSystems.join(", ") || "none"})`;

    log.warn(logMessage);
    if (this.listeners.onLog) {
      this.listeners.onLog(logMessage);
    }

    return {
      landedSystems,
      clearedSystems,
    };
  }

  private async _evaluateAutoFailsafe(): Promise<void> {
    if (!this.transport || !this.transport.isOpen()) {
      return;
    }

    const targetSystems = this._getAutoFailsafeTargetSystems(Date.now());
    if (targetSystems.length === 0) {
      return;
    }

    const { landedSystems } = await this._sendFailsafeLanding(
      targetSystems,
      "AUTO",
    );
    if (landedSystems.length === 0) {
      throw new Error(
        "[MAVLink][FAILSAFE] Auto failsafe could not send LAND to any system",
      );
    }
  }

  /**
   * Handle incoming MAVLink telemetry messages
   */
  private _handleTelemetry(telemetry: MAVLinkTelemetry[]): void {
    for (const msg of telemetry) {
      const systemId = msg.systemId;
      const droneId = systemId;

      // Initialize telemetry entry if needed
      if (!this.lastTelemetry.has(droneId)) {
        this.lastTelemetry.set(droneId, {
          id: droneId,
          position: { x: 0, y: 0, z: 0 },
          velocity: { x: 0, y: 0, z: 0 },
          rotation: { x: 0, y: 0, z: 0 },
          battery: 100,
          status: "landed",
          isActive: false,
        });
      }

      const state = this.lastTelemetry.get(droneId)!;

      // Update based on message type
      switch (msg.msgType) {
        case "GLOBAL_POSITION_INT":
          try {
            this._initializeHomePositionFromGlobalPosition(
              systemId,
              msg.data.lat,
              msg.data.lon,
              msg.data.alt,
            );
            // Convert GPS to local coordinates
            const localPos = coordinateConverter.mavlinkGlobalToLocal(
              msg.data.lat,
              msg.data.lon,
              msg.data.alt,
              msg.data.relative_alt,
            );

            state.position = {
              x: localPos.x,
              y: localPos.y,
              z: localPos.z,
            };
            this._storeMissionPosition(
              systemId,
              localPos.x,
              localPos.y,
              localPos.z,
              msg.data.hdg / 100,
            );

            state.velocity = {
              x: msg.data.vx / 100, // cm/s to m/s
              y: msg.data.vy / 100,
              z: msg.data.vz / 100,
            };
          } catch (error) {
            // If coordinate conversion fails, use simulation defaults
            log.warn("Coordinate conversion error", { error });
          }
          break;

        case "BATTERY_STATUS":
          state.battery = msg.data.battery_remaining;
          break;

        case "ATTITUDE":
          state.rotation = {
            x: (msg.data.roll * 180) / Math.PI,
            y: (msg.data.pitch * 180) / Math.PI,
            z: (msg.data.yaw * 180) / Math.PI,
          };
          break;

        case "HEARTBEAT":
          state.status = MAVLinkConverter.mavStateTodroneStatus(
            msg.data.system_status,
          );
          state.isActive = (msg.data.base_mode & 0x80) !== 0;
          break;
      }
    }

    // Emit telemetry updates
    this._emitTelemetryUpdates();
  }

  /**
   * Emit telemetry updates to listeners
   */
  private _emitTelemetryUpdates(): void {
    const timestamp = Date.now();
    const droneStates = this._buildDroneStates();

    if (this.listeners.onTelemetry) {
      for (const drone of droneStates) {
        this.listeners.onTelemetry({
          droneId: String(drone.id),
          position: drone.position,
          battery: drone.battery,
          timestamp,
        });
      }
    }

    if (this.messageListener) {
      this.messageListener({
        type: MessageType.TELEMETRY,
        drones: droneStates,
        timestamp,
      });
    }
  }

  private _buildDroneStates(): DroneState[] {
    return Array.from(this.lastTelemetry.entries())
      .sort(([leftId], [rightId]) => leftId - rightId)
      .map(([droneId, state]) =>
        MAVLinkConverter.normalizeDroneState(droneId, state),
      );
  }

  private _registerComponent(
    systemId: number,
    componentId: number,
    isPrimaryFlightComponent: boolean = false,
  ): void {
    let components = this.systemComponents.get(systemId);
    if (!components) {
      components = new Map();
      this.systemComponents.set(systemId, components);
    }

    const existing = components.get(componentId);
    components.set(componentId, {
      systemId,
      componentId,
      isPrimaryFlightComponent:
        existing?.isPrimaryFlightComponent ?? isPrimaryFlightComponent,
    });
  }

  private _markPrimaryFlightComponent(
    systemId: number,
    componentId: number,
  ): void {
    this._registerComponent(systemId, componentId, true);

    const components = this.systemComponents.get(systemId);
    if (!components) {
      return;
    }

    for (const [id, component] of components) {
      components.set(id, {
        ...component,
        isPrimaryFlightComponent: id === componentId,
      });
    }
  }

  private _getTargetComponentId(systemId: number): number {
    const components = this.systemComponents.get(systemId);
    if (!components) {
      return 1;
    }

    for (const component of components.values()) {
      if (component.isPrimaryFlightComponent) {
        return component.componentId;
      }
    }

    return 1;
  }

  async disconnect(): Promise<void> {
    log.info("Disconnecting...");

    // Stop heartbeat
    this._stopHeartbeat();
    this._stopFailsafeWatchdog();

    // Disconnect transport
    if (this.transport) {
      await this.transport.disconnect();
      this.transport = null;
    }

    this.lastTelemetry.clear();
    this.systemComponents.clear();
    this.lastHeartbeatAtBySystem.clear();
    this.lastArmedStateBySystem.clear();
    this.lastFailsafeSentAtBySystem.clear();
    this.missionProgressBySystem.clear();
    this.missionPositionCache.clear();
    this.pendingMissionTargetCache.clear();
    this.isHomePositionInitialized = false;
    this.homePositionSourceSystemId = null;
    coordinateConverter.resetHome();
    this._clearMissionBuffer();
    this._resetMissionUploadState();
    this._updateStatus(ConnectionStatus.DISCONNECTED);
  }

  async sendCommands(
    commands: Command[],
    context?: CommandBatchContext,
  ): Promise<CommandResponse> {
    if (commands.length === 1) {
      return this._sendSingleCommand(commands[0], context);
    }

    return this._sendMissionBatch(commands);
  }

  private async _sendSingleCommand(
    command: Command,
    context?: CommandBatchContext,
  ): Promise<CommandResponse> {
    log.debug("Sending command", { action: command.action });

    if (!this.transport) {
      return {
        success: false,
        error: "Transport not connected",
        timestamp: Date.now(),
      };
    }

    try {
      // Handle formation commands specially
      if (
        command.action === CommandAction.SET_FORMATION ||
        command.action === CommandAction.MOVE_FORMATION
      ) {
        return await this._handleFormationCommand(command);
      }

      // Convert Blockly command to MAVLink
      const droneId = this._resolveTargetSystemId(command);

      const mavlinkCmds = MAVLinkConverter.blocklyToMAVLink(command, droneId);

      if (mavlinkCmds.length === 0) {
        // Commands like WAIT are handled by GCS timing
        return {
          success: true,
          timestamp: Date.now(),
        };
      }

      const normalizedSize = context?.total ?? 1;
      const useMissionProtocol =
        normalizedSize > 1 && this._isMissionProtocolCandidate(command);

      if (useMissionProtocol) {
        const normalizedIndex = context?.index ?? normalizedSize;

        for (const [seq, params] of mavlinkCmds.entries()) {
          const missionItem = this._buildMissionItemFromCommand(
            command,
            params,
            this.pendingMissionItems.length + seq,
          );
          this.pendingMissionItems.push(missionItem);
        }

        if (context?.isLast ?? normalizedIndex >= normalizedSize) {
          await this._executeBufferedMission();
        }

        return {
          success: true,
          commandId: `mavlink-mission-${Date.now()}`,
          timestamp: Date.now(),
        };
      }

      // Execute each MAVLink command
      for (const params of mavlinkCmds) {
        const resolvedParams = this._resolveCommandParamsForExecution(
          command,
          params,
        );
        await this._sendRealCommand(resolvedParams);
      }

      if (context?.isLast) {
        this._clearPendingMissionTargetCache();
      }

      return {
        success: true,
        commandId: `mavlink-${Date.now()}`,
        timestamp: Date.now(),
      };
    } catch (error) {
      log.error("Command execution error", { error });
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        timestamp: Date.now(),
      };
    }
  }

  private _resolveTargetSystemId(command: Command): number {
    const requestedDroneId =
      typeof command.params.droneId === "number"
        ? command.params.droneId
        : null;

    if (requestedDroneId !== null) {
      return this.lastTelemetry.get(requestedDroneId)?.id ?? requestedDroneId;
    }

    const knownSystems = Array.from(this.lastTelemetry.keys()).sort(
      (left, right) => left - right,
    );

    if (knownSystems.length === 1) {
      return knownSystems[0];
    }

    return 1;
  }

  /**
   * Send real MAVLink command via transport
   */
  private _isMissionProtocolCandidate(command: Command): boolean {
    return (
      command.action === CommandAction.TAKEOFF ||
      command.action === CommandAction.LAND ||
      command.action === CommandAction.TAKEOFF_ALL ||
      command.action === CommandAction.LAND_ALL ||
      command.action === CommandAction.HOVER ||
      command.action === CommandAction.SET_SPEED ||
      command.action === CommandAction.MOVE_DRONE ||
      command.action === CommandAction.MOVE_DIRECTION ||
      command.action === CommandAction.ROTATE
    );
  }

  private _buildMissionItemFromCommand(
    command: Command,
    params: {
      command: number;
      param1?: number;
      param2?: number;
      param3?: number;
      param4?: number;
      param5?: number;
      param6?: number;
      param7?: number;
      target_system?: number;
      target_component?: number;
    },
    seq: number,
  ): MissionItemIntMessage {
    const targetSystem = params.target_system ?? 1;
    const isChangeSpeedCommand = params.command === MAV_CMD.DO_CHANGE_SPEED;
    const plannedTarget = this._resolvePlannedTargetPosition(command, params);
    const globalPosition = coordinateConverter.localToMavlinkGlobal(
      plannedTarget.x,
      plannedTarget.y,
      plannedTarget.z,
    );
    const missionCommand =
      command.action === CommandAction.ROTATE
        ? MAV_CMD.NAV_WAYPOINT
        : (params.command as (typeof MAV_CMD)[keyof typeof MAV_CMD]);
    const missionParam4 =
      command.action === CommandAction.ROTATE
        ? plannedTarget.heading
        : (params.param4 ?? 0);
    const missionParam1 =
      command.action === CommandAction.ROTATE ? 0 : (params.param1 ?? 0);
    const missionParam2 =
      command.action === CommandAction.ROTATE ? 1 : (params.param2 ?? 0);
    const missionParam3 =
      command.action === CommandAction.ROTATE ? 0 : (params.param3 ?? 0);

    const missionItem = buildMissionItemInt({
      seq,
      command: missionCommand,
      frame: isChangeSpeedCommand
        ? MISSION_FRAME.MISSION
        : MISSION_FRAME.GLOBAL_RELATIVE_ALT_INT,
      current: seq === 0 ? 1 : 0,
      autocontinue: 1,
      param1: missionParam1,
      param2: missionParam2,
      param3: missionParam3,
      param4: missionParam4,
      x: isChangeSpeedCommand ? 0 : globalPosition.lat,
      y: isChangeSpeedCommand ? 0 : globalPosition.lon,
      z: isChangeSpeedCommand ? 0 : globalPosition.relativeAlt / 1000,
      target_system: targetSystem,
      target_component: params.target_component ?? 1,
    });

    return missionItem;
  }

  private _getCurrentLocalPosition(
    targetSystem: number,
  ): PlannedTargetPosition {
    const current = this.missionPositionCache.get(targetSystem);

    if (!current) {
      throw new Error(
        `Current drone position is unavailable for planned target calculation (system ${targetSystem})`,
      );
    }

    return {
      x: current.x,
      y: current.y,
      z: current.z,
      heading: current.heading,
    };
  }

  private _getPlannedBasePosition(targetSystem: number): PlannedTargetPosition {
    return (
      this.pendingMissionTargetCache.get(targetSystem) ??
      this._getCurrentLocalPosition(targetSystem)
    );
  }

  private _normalizeOffsetValue(value: number | undefined): number {
    return value === MAVLINK_POSITION_SENTINEL ? 0 : (value ?? 0);
  }

  private _updatePlannedTargetPosition(
    targetSystem: number,
    position: PlannedTargetPosition,
  ): void {
    this.pendingMissionTargetCache.set(targetSystem, position);
  }

  private _resolvePlannedTargetPosition(
    command: Command,
    params: {
      command: number;
      param5?: number;
      param6?: number;
      param7?: number;
      target_system?: number;
    },
  ): PlannedTargetPosition {
    const targetSystem = params.target_system ?? 1;
    const base = this._getPlannedBasePosition(targetSystem);

    let target: PlannedTargetPosition;

    switch (command.action) {
      case CommandAction.MOVE_DRONE:
      case CommandAction.MOVE_XYZ:
        target = {
          x: base.x + this._normalizeOffsetValue(params.param5),
          y: base.y + this._normalizeOffsetValue(params.param6),
          z: base.z + this._normalizeOffsetValue(params.param7),
          heading: base.heading,
        };
        break;
      case CommandAction.MOVE_DIRECTION: {
        const direction = (command.params as any)?.direction;
        const distance = (command.params as any)?.distance ?? 0;
        const offset = this._rotateDirectionOffset(
          direction,
          distance,
          base.heading,
        );

        target = {
          x: base.x + offset.x,
          y: base.y + offset.y,
          z: base.z + offset.z,
          heading: base.heading,
        };
        break;
      }
      case CommandAction.TAKEOFF:
      case CommandAction.TAKEOFF_ALL:
        target = {
          x: base.x,
          y: base.y,
          z: params.param7 ?? base.z,
          heading: base.heading,
        };
        break;
      case CommandAction.LAND:
      case CommandAction.LAND_ALL:
        target = {
          x: base.x,
          y: base.y,
          z: 0,
          heading: base.heading,
        };
        break;
      case CommandAction.HOVER:
      case CommandAction.SET_SPEED:
        target = {
          x: base.x,
          y: base.y,
          z: base.z,
          heading: base.heading,
        };
        break;
      case CommandAction.ROTATE: {
        const direction = (command.params as any)?.direction || "CW";
        const degrees = (command.params as any)?.degrees ?? 0;
        const yawDelta = direction === "CCW" ? -degrees : degrees;
        const targetHeading = this._normalizeHeading(base.heading + yawDelta);
        const offset = this._rotateDirectionOffset(
          "forward",
          ROTATE_WAYPOINT_OFFSET_METERS,
          targetHeading,
        );
        target = {
          x: base.x + offset.x,
          y: base.y + offset.y,
          z: base.z,
          heading: targetHeading,
        };
        break;
      }
      default:
        target = {
          x:
            params.param5 === MAVLINK_POSITION_SENTINEL
              ? base.x
              : (params.param5 ?? base.x),
          y:
            params.param6 === MAVLINK_POSITION_SENTINEL
              ? base.y
              : (params.param6 ?? base.y),
          z:
            params.param7 === MAVLINK_POSITION_SENTINEL
              ? base.z
              : (params.param7 ?? base.z),
          heading: base.heading,
        };
        break;
    }

    this._updatePlannedTargetPosition(targetSystem, target);
    return target;
  }

  private _rotateDirectionOffset(
    direction: string | undefined,
    distance: number,
    headingDeg: number,
  ): { x: number; y: number; z: number } {
    const normalizedDirection = direction || "forward";
    const normalizedHeading = this._normalizeHeading(headingDeg);
    const headingRad = ((normalizedHeading + 180) * Math.PI) / 180;
    const forwardX = Math.cos(headingRad);
    const forwardY = Math.sin(headingRad);
    const rightRad = headingRad + Math.PI / 2;
    const rightX = Math.cos(rightRad);
    const rightY = Math.sin(rightRad);
    let bodyZ = 0;

    switch (normalizedDirection) {
      case "forward":
        return {
          x: forwardX * distance,
          y: forwardY * distance,
          z: 0,
        };
      case "backward":
        return {
          x: -forwardX * distance,
          y: -forwardY * distance,
          z: 0,
        };
      case "left":
        return {
          x: -rightX * distance,
          y: -rightY * distance,
          z: 0,
        };
      case "right":
        return {
          x: rightX * distance,
          y: rightY * distance,
          z: 0,
        };
      case "up":
        bodyZ = -distance;
        break;
      case "down":
        bodyZ = distance;
        break;
    }

    return {
      x: 0,
      y: 0,
      z: bodyZ,
    };
  }

  private _normalizeHeading(heading: number): number {
    const normalized = heading % 360;
    return normalized < 0 ? normalized + 360 : normalized;
  }

  private _resolveCommandParamsForExecution(
    command: Command,
    params: {
      command: number;
      param1?: number;
      param2?: number;
      param3?: number;
      param4?: number;
      param5?: number;
      param6?: number;
      param7?: number;
      target_system?: number;
      target_component?: number;
      confirmation?: number;
    },
  ) {
    if (!this._isMissionProtocolCandidate(command)) {
      return params;
    }

    const target = this._resolvePlannedTargetPosition(command, params);

    return {
      ...params,
      param5: target.x,
      param6: target.y,
      param7: target.z,
    };
  }

  private _clearMissionBuffer(): void {
    this.pendingMissionItems = [];
  }

  private _clearPendingMissionTargetCache(): void {
    this.pendingMissionTargetCache.clear();
  }

  private _resetMissionUploadState(abortReason?: string): void {
    if (this.pendingMissionRequestWaiter) {
      const waiter = this.pendingMissionRequestWaiter;
      clearTimeout(this.pendingMissionRequestWaiter.timeoutId);
      this.pendingMissionRequestWaiter = null;
      if (abortReason) {
        waiter.reject(new Error(abortReason));
      }
    }

    if (this.pendingMissionAckWaiter) {
      const waiter = this.pendingMissionAckWaiter;
      clearTimeout(this.pendingMissionAckWaiter.timeoutId);
      this.pendingMissionAckWaiter = null;
      if (abortReason) {
        waiter.reject(new Error(abortReason));
      }
    }

    if (this.pendingCommandAckWaiter) {
      const waiter = this.pendingCommandAckWaiter;
      clearTimeout(this.pendingCommandAckWaiter.timeoutId);
      this.pendingCommandAckWaiter = null;
      if (abortReason) {
        waiter.reject(new Error(abortReason));
      }
    }

    if (this.pendingMissionCompletionWaiter) {
      const waiter = this.pendingMissionCompletionWaiter;
      clearTimeout(this.pendingMissionCompletionWaiter.timeoutId);
      this.pendingMissionCompletionWaiter = null;
      if (abortReason) {
        waiter.reject(new Error(abortReason));
      }
    }
  }

  private async _executeBufferedMission(): Promise<void> {
    if (this.pendingMissionItems.length === 0) {
      return;
    }

    try {
      if (!this.transport) {
        throw new Error("Transport not connected");
      }

      const targetSystem = this.pendingMissionItems[0]?.target_system || 1;
      const targetComponent =
        this.pendingMissionItems[0]?.target_component ||
        this._getTargetComponentId(targetSystem);
      const finalSeq =
        this.pendingMissionItems[this.pendingMissionItems.length - 1]?.seq ?? 0;

      await this._sendMissionClearAll(targetSystem, targetComponent);
      await this._sendMissionCount(
        this.pendingMissionItems.length,
        targetSystem,
        targetComponent,
      );
      await this._sendBufferedMissionItems(targetSystem, targetComponent);
      await this._sendMissionStart(targetSystem, targetComponent, finalSeq);

      this._clearMissionBuffer();
      this._clearPendingMissionTargetCache();
      this._resetMissionUploadState();
    } catch (error) {
      this._resetMissionUploadState();
      this._clearMissionBuffer();
      this._clearPendingMissionTargetCache();
      throw error;
    }
  }

  private async _sendMissionClearAll(
    targetSystem: number,
    targetComponent: number,
  ): Promise<void> {
    if (!this.transport) {
      throw new Error("Transport not connected");
    }

    const packet = createMissionClearAll(
      targetSystem,
      targetComponent,
      0,
      this.systemId,
      this.componentId,
    );
    await this.transport.sendPacket(serializePacket(packet));
  }

  private async _sendMissionCount(
    count: number,
    targetSystem: number,
    targetComponent: number,
  ): Promise<void> {
    if (!this.transport) {
      throw new Error("Transport not connected");
    }

    const packet = createMissionCount(
      count,
      targetSystem,
      targetComponent,
      0,
      this.systemId,
      this.componentId,
    );
    await this.transport.sendPacket(serializePacket(packet));
  }

  private async _sendBufferedMissionItems(
    targetSystem: number,
    targetComponent: number,
  ): Promise<void> {
    if (!this.transport) {
      throw new Error("Transport not connected");
    }

    for (const item of this.pendingMissionItems) {
      await this._awaitMissionRequestInt(item.seq);
      const packet = createMissionItemInt(
        {
          ...item,
          target_system: targetSystem,
          target_component: targetComponent,
        },
        this.systemId,
        this.componentId,
      );
      await this.transport.sendPacket(serializePacket(packet));
    }

    await this._awaitMissionAck();
  }

  private async _sendMissionStart(
    targetSystem: number,
    targetComponent: number,
    finalSeq: number,
  ): Promise<void> {
    if (!this.transport) {
      throw new Error("Transport not connected");
    }

    const setCurrentPacket = createMissionSetCurrent(
      0,
      targetSystem,
      targetComponent,
      0,
      this.systemId,
      this.componentId,
    );
    await this.transport.sendPacket(serializePacket(setCurrentPacket));

    const missionStartPacket = createMissionStart(
      targetSystem,
      targetComponent,
      0,
      Math.max(this.pendingMissionItems.length - 1, 0),
      this.systemId,
      this.componentId,
    );
    await this.transport.sendPacket(serializePacket(missionStartPacket));
    await this._awaitCommandAck(MAV_CMD.MISSION_START);
    this._updateMissionProgressState(targetSystem, {
      currentSeq: -1,
    });
    await this._awaitMissionCompletion(finalSeq, targetSystem);
  }

  private _awaitMissionRequestInt(
    seq: number,
    timeoutMs: number = 5000,
  ): Promise<MissionRequestIntMessage | MissionRequestMessage> {
    return new Promise((resolve, reject) => {
      const timeoutId = window.setTimeout(() => {
        this.pendingMissionRequestWaiter = null;
        reject(new Error(`MISSION_REQUEST timeout for seq ${seq}`));
      }, timeoutMs);

      this.pendingMissionRequestWaiter = {
        seq,
        resolve,
        reject,
        timeoutId,
      };
    });
  }

  private _awaitMissionAck(
    timeoutMs: number = 5000,
  ): Promise<MissionAckMessage> {
    return new Promise((resolve, reject) => {
      const timeoutId = window.setTimeout(() => {
        this.pendingMissionAckWaiter = null;
        reject(new Error("MISSION_ACK timeout"));
      }, timeoutMs);

      this.pendingMissionAckWaiter = {
        resolve,
        reject,
        timeoutId,
      };
    });
  }

  private _awaitMissionCompletion(
    finalSeq: number,
    targetSystem: number,
    timeoutMs: number = 30000,
  ): Promise<number> {
    return new Promise((resolve, reject) => {
      const timeoutId = window.setTimeout(() => {
        this.pendingMissionCompletionWaiter = null;
        reject(
          new Error(
            `MISSION completion timeout for system ${targetSystem} final seq ${finalSeq}`,
          ),
        );
      }, timeoutMs);

      this.pendingMissionCompletionWaiter = {
        finalSeq,
        targetSystem,
        resolve,
        reject,
        timeoutId,
      };

      this._tryResolveMissionCompletionFromProgress(targetSystem);
    });
  }

  private _awaitCommandAck(
    command: number,
    timeoutMs: number = 5000,
  ): Promise<{ command: number; result: number }> {
    return new Promise((resolve, reject) => {
      const timeoutId = window.setTimeout(() => {
        this.pendingCommandAckWaiter = null;
        reject(new Error(`COMMAND_ACK timeout for command ${command}`));
      }, timeoutMs);

      this.pendingCommandAckWaiter = {
        command,
        resolve,
        reject,
        timeoutId,
      };
    });
  }

  private async _sendRealCommand(params: any): Promise<void> {
    if (!this.transport) {
      throw new Error("Transport not connected");
    }

    const targetSystem = params.target_system || 1;
    const targetComponent =
      params.target_component || this._getTargetComponentId(targetSystem);
    const cachedPosition = this.missionPositionCache.get(targetSystem);
    const resolvedParam5 =
      params.param5 === MAVLINK_POSITION_SENTINEL
        ? (cachedPosition?.x ?? 0)
        : (params.param5 ?? 0);
    const resolvedParam6 =
      params.param6 === MAVLINK_POSITION_SENTINEL
        ? (cachedPosition?.y ?? 0)
        : (params.param6 ?? 0);
    const resolvedParam7 =
      params.param7 === MAVLINK_POSITION_SENTINEL
        ? (cachedPosition?.z ?? 0)
        : (params.param7 ?? 0);
    console.log(
      `C: ${params.command} S: ${targetSystem} C: ${targetComponent} 7: ${resolvedParam7}`,
    );
    // Create COMMAND_LONG message
    const commandLongPacket = createCommandLong(
      params.command,
      params.param1 || 0,
      params.param2 || 0,
      params.param3 || 0,
      params.param4 || 0,
      resolvedParam5,
      resolvedParam6,
      resolvedParam7,
      targetSystem,
      targetComponent,
      0, // confirmation
      this.systemId,
      this.componentId,
    );

    // Send packet
    await this.transport.sendPacket(serializePacket(commandLongPacket));
  }

  /**
   * Handle formation commands (SET_FORMATION, MOVE_FORMATION)
   * Routes to appropriate formation controller based on mode
   */
  private async _handleFormationCommand(
    command: Command,
  ): Promise<CommandResponse> {
    if (!this.transport) {
      return {
        success: false,
        error: "Transport not connected",
        timestamp: Date.now(),
      };
    }

    try {
      // Route based on formation control mode
      if (this.formationMode === FormationControlMode.VIRTUAL_LEADER) {
        return await this._handleFormationCommandVirtualLeader(command);
      } else {
        return await this._handleFormationCommandGCS(command);
      }
    } catch (error) {
      log.error("Formation command error", { error });
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        timestamp: Date.now(),
      };
    }
  }

  /**
   * Handle formation command using GCS-Coordinated mode (existing implementation)
   */
  private async _handleFormationCommandGCS(
    command: Command,
  ): Promise<CommandResponse> {
    // Get all drone IDs
    const droneIds = Array.from({ length: this.droneCount }, (_, i) => i);

    // Convert formation command to individual waypoints
    const formationWaypoints = MAVLinkConverter.convertFormationCommand(
      command,
      droneIds,
    );

    // Execute waypoint for each drone
    for (const [droneId, params] of formationWaypoints) {
      await this._sendRealCommand(params);
    }

    if (this.listeners.onLog) {
      this.listeners.onLog(
        `[MAVLink] Formation command executed (GCS mode): ${command.action} for ${droneIds.length} drones`,
      );
    }

    return {
      success: true,
      timestamp: Date.now(),
    };
  }

  /**
   * Handle formation command using Virtual Leader mode (new implementation)
   */
  private async _handleFormationCommandVirtualLeader(
    command: Command,
  ): Promise<CommandResponse> {
    // Initialize controller if needed
    if (!this.virtualLeaderController) {
      this._initializeVirtualLeaderController();
    }

    // Extract command parameters
    const params = command.params as any;

    if (command.action === CommandAction.SET_FORMATION) {
      // SET_FORMATION: Set formation shape and position
      const formationType = params.formationType || "line";
      const spacing = params.spacing || 2.0;
      const centerX = params.centerX || 0;
      const centerY = params.centerY || 0;
      const centerZ = params.centerZ || 3.0;
      const leaderDroneId = params.leaderDroneId;

      this.virtualLeaderController!.setFormation(
        formationType,
        spacing,
        { x: centerX, y: centerY, z: centerZ },
        leaderDroneId,
      );

      if (this.listeners.onLog) {
        this.listeners.onLog(
          `[MAVLink] Formation set (Virtual Leader): ${formationType} at (${centerX}, ${centerY}, ${centerZ})`,
        );
      }
    } else if (command.action === CommandAction.MOVE_FORMATION) {
      // MOVE_FORMATION: Move virtual leader (all drones follow)
      const direction = params.direction || "forward";
      const distance = params.distance || 1.0;
      const speed = params.speed || 2.0;

      this.virtualLeaderController!.moveVirtualLeader(
        direction,
        distance,
        speed,
      );

      if (this.listeners.onLog) {
        this.listeners.onLog(
          `[MAVLink] Formation moving (Virtual Leader): ${direction} ${distance}m at ${speed}m/s`,
        );
      }
    }

    return {
      success: true,
      timestamp: Date.now(),
    };
  }

  private async _sendMissionBatch(
    commands: Command[],
  ): Promise<CommandResponse> {
    log.info("Sending command sequence", { count: commands.length });

    if (!this.transport) {
      return {
        success: false,
        error: "Transport not connected",
        timestamp: Date.now(),
      };
    }

    try {
      if (commands.length === 0) {
        return {
          success: true,
          timestamp: Date.now(),
        };
      }

      this._clearMissionBuffer();
      this._clearPendingMissionTargetCache();

      for (let i = 0; i < commands.length; i++) {
        const command = commands[i];

        if (this.listeners.onLog) {
          this.listeners.onLog(
            `[MAVLink] Queueing ${i + 1}/${commands.length}: ${command.action}`,
          );
        }

        if (
          command.action === CommandAction.SET_FORMATION ||
          command.action === CommandAction.MOVE_FORMATION
        ) {
          return {
            success: false,
            error: `Mission batch does not support ${command.action}`,
            timestamp: Date.now(),
          };
        }

        if (!this._isMissionProtocolCandidate(command)) {
          return {
            success: false,
            error: `Mission batch does not support ${command.action}`,
            timestamp: Date.now(),
          };
        }

        const targetSystem = this._resolveTargetSystemId(command);
        const mavlinkCmds = MAVLinkConverter.blocklyToMAVLink(
          command,
          targetSystem,
        );

        if (mavlinkCmds.length === 0) {
          return {
            success: false,
            error: `Mission batch could not convert ${command.action}`,
            timestamp: Date.now(),
          };
        }

        for (const [seq, params] of mavlinkCmds.entries()) {
          const missionItem = this._buildMissionItemFromCommand(
            command,
            params,
            this.pendingMissionItems.length + seq,
          );
          this.pendingMissionItems.push(missionItem);
        }
      }

      await this._executeBufferedMission();

      if (this.listeners.onLog) {
        this.listeners.onLog(
          `[MAVLink] All ${commands.length} commands executed successfully`,
        );
      }

      return {
        success: true,
        timestamp: Date.now(),
      };
    } catch (error) {
      log.error("Command sequence error", { error });
      this._resetMissionUploadState();
      this._clearMissionBuffer();
      this._clearPendingMissionTargetCache();
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        timestamp: Date.now(),
      };
    }
  }

  /**
   * Get execution delay for command (in milliseconds)
   */
  private _getCommandDelay(command: Command): number {
    switch (command.action) {
      case CommandAction.TAKEOFF_ALL:
        return 3000; // 3 seconds for takeoff

      case CommandAction.LAND_ALL:
        return 3000; // 3 seconds for landing

      case CommandAction.SET_FORMATION: {
        // Delay based on formation size
        const droneCount = this.droneCount;
        return Math.max(2000, droneCount * 200); // 200ms per drone, min 2s
      }

      case CommandAction.MOVE_FORMATION:
      case CommandAction.MOVE_DRONE:
      case CommandAction.MOVE_DIRECTION: {
        // Delay based on distance (assuming 2 m/s speed)
        const distance = (command.params as any)?.distance || 1;
        return Math.max(1000, distance * 500); // 500ms per meter, min 1s
      }

      case CommandAction.ROTATE: {
        const degrees = (command.params as any)?.degrees || 90;
        return Math.max(1000, (degrees / 30) * 1000); // 30 deg/s, min 1s
      }

      case CommandAction.HOVER:
        return 1000;

      case CommandAction.SET_SPEED:
        return 500;

      case CommandAction.WAIT: {
        const duration = (command.params as any)?.duration || 1;
        return duration * 1000;
      }

      default:
        return 1000; // Default 1 second
    }
  }

  getStatus(): ConnectionStatus {
    return this.status;
  }

  isConnected(): boolean {
    return this.status === ConnectionStatus.CONNECTED;
  }

  setEventListeners(listeners: ConnectionEventListeners): void {
    this.listeners = { ...this.listeners, ...listeners };
  }

  setMessageListener(listener: (message: unknown) => void): void {
    this.messageListener = listener;
  }

  async emergencyStop(): Promise<CommandResponse> {
    log.warn("EMERGENCY STOP!");

    if (!this.transport) {
      return {
        success: false,
        error: "Transport not connected",
        timestamp: Date.now(),
      };
    }

    const targetSystems = this._getActiveArmedSystems(Date.now());
    if (targetSystems.length === 0) {
      const message =
        "[MAVLink][FAILSAFE] No active armed systems available for manual failsafe";
      log.warn(message);
      if (this.listeners.onLog) {
        this.listeners.onLog(message);
      }
      return {
        success: false,
        error: "No active armed systems available for failsafe",
        timestamp: Date.now(),
      };
    }

    const { landedSystems } = await this._sendFailsafeLanding(
      targetSystems,
      "MANUAL",
    );
    if (landedSystems.length === 0) {
      return {
        success: false,
        error: "Failsafe could not send LAND to any target system",
        timestamp: Date.now(),
      };
    }

    return {
      success: true,
      timestamp: Date.now(),
    };
  }

  async ping(): Promise<number> {
    return Promise.resolve(Math.random() * 100 + 50);
  }

  async reset(): Promise<CommandResponse> {
    log.info("MAVLinkConnectionService", "Resetting drone positions");

    return {
      success: true,
      timestamp: Date.now(),
    };
  }

  cleanup(): void {
    log.info("Cleanup");
    this._stopHeartbeat();
    this._stopFailsafeWatchdog();

    if (this.virtualLeaderController) {
      this.virtualLeaderController.stop();
      this.virtualLeaderController = null;
    }

    this.lastTelemetry.clear();
    this.lastHeartbeatAtBySystem.clear();
    this.lastArmedStateBySystem.clear();
    this.lastFailsafeSentAtBySystem.clear();
    this.missionProgressBySystem.clear();
    this.listeners = {};
    this.messageListener = null;
  }

  /**
   * Set formation control mode
   */
  setFormationMode(mode: FormationControlMode): void {
    log.info("Setting formation mode", { mode });
    this.formationMode = mode;

    // Initialize Virtual Leader controller if needed
    if (
      mode === FormationControlMode.VIRTUAL_LEADER &&
      !this.virtualLeaderController
    ) {
      this._initializeVirtualLeaderController();
    }

    // Stop Virtual Leader controller if switching away
    if (
      mode === FormationControlMode.GCS_COORDINATED &&
      this.virtualLeaderController
    ) {
      this.virtualLeaderController.stop();
      this.virtualLeaderController = null;
    }

    if (this.listeners.onLog) {
      this.listeners.onLog(`[MAVLink] Formation mode set to: ${mode}`);
    }
  }

  /**
   * Get current formation control mode
   */
  getFormationMode(): FormationControlMode {
    return this.formationMode;
  }

  /**
   * Initialize Virtual Leader Formation Controller
   */
  private _initializeVirtualLeaderController(): void {
    log.info("Initializing Virtual Leader Controller", {
      droneCount: this.droneCount,
    });

    // Create position setpoint callback
    const sendPositionSetpoint: PositionSetpointCallback = (
      droneId,
      position,
      velocity,
      yaw,
    ) => {
      // Convert to MAVLink SET_POSITION_TARGET_LOCAL_NED command
      const params = MAVLinkConverter.positionSetpointToMAVLink(
        droneId,
        position,
        velocity,
        yaw,
      );

      if (this.transport) {
        this._sendRealCommand(params).catch((err) => {
          log.error("Failed to send position setpoint", {
            droneId,
            error: err,
          });
        });
      }
    };

    // Create controller
    this.virtualLeaderController = new VirtualLeaderFormationController(
      this.droneCount,
      sendPositionSetpoint,
      10, // 10Hz update rate
    );

    log.info("Virtual Leader Controller initialized");
  }

  // Private helpers

  private _updateStatus(status: ConnectionStatus): void {
    this.status = status;
    if (this.listeners.onStatusChange) {
      this.listeners.onStatusChange(status);
    }
  }
}
