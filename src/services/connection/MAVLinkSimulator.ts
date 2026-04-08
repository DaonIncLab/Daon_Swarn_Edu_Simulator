/**
 * MAVLink Simulator
 *
 * Wraps DroneSimulator to provide MAVLink protocol interface
 * Generates MAVLink telemetry messages from drone states
 */

import type { DroneState } from "@/types/websocket";
import { DroneSimulator } from "./DroneSimulator";
import { MAVLinkConverter } from "@/services/mavlink/MAVLinkConverter";
import { MAV_CMD } from "@/services/mavlink/MAVLinkCommands";
import type { CommandLongParams } from "@/services/mavlink/MAVLinkCommands";
import type { MissionItemIntMessage } from "@/types/mavlink";
import { log } from "@/utils/logger";

/**
 * MAVLink telemetry message
 */
export interface MAVLinkTelemetry {
  msgType:
    | "HEARTBEAT"
    | "GLOBAL_POSITION_INT"
    | "BATTERY_STATUS"
    | "ATTITUDE"
    | "SYS_STATUS";
  timestamp: number;
  systemId: number;
  componentId: number;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: Record<string, any>;
}

/**
 * MAVLink command structure
 */
export interface MAVLinkCommand {
  command: number; // MAV_CMD value
  targetSystem: number;
  targetComponent: number;
  params: CommandLongParams;
}

/**
 * MAVLink Simulator
 * Provides MAVLink protocol interface over DroneSimulator physics engine
 */
export class MAVLinkSimulator {
  private droneSimulator: DroneSimulator;
  private systemIds: Map<number, number> = new Map(); // droneId -> systemId
  private componentId: number = 1;
  private sequenceNumber: number = 0;
  private telemetryCounter: number = 0;

  constructor(droneCount: number = 4) {
    this.droneSimulator = new DroneSimulator(droneCount);
    this.initializeSystemIds(droneCount);
  }

  /**
   * Initialize MAVLink system IDs (1-based)
   */
  private initializeSystemIds(droneCount: number): void {
    for (let i = 0; i < droneCount; i++) {
      this.systemIds.set(i, i + 1);
    }
  }

  /**
   * Start simulation with telemetry callback
   */
  start(onTelemetry: (telemetry: MAVLinkTelemetry[]) => void): void {
    this.droneSimulator.start((droneStates: DroneState[]) => {
      const mavlinkTelemetry = this.convertToMAVLinkTelemetry(droneStates);
      onTelemetry(mavlinkTelemetry);
      this.telemetryCounter++;
    });
  }

  /**
   * Stop simulation
   */
  stop(): void {
    this.droneSimulator.stop();
  }

  /**
   * Convert DroneState array to MAVLink telemetry messages
   */
  private convertToMAVLinkTelemetry(
    droneStates: DroneState[],
  ): MAVLinkTelemetry[] {
    const telemetry: MAVLinkTelemetry[] = [];
    const timestamp = Date.now();

    for (const drone of droneStates) {
      const systemId = this.systemIds.get(drone.id) || drone.id + 1;

      // GLOBAL_POSITION_INT - position and velocity
      const globalPos = MAVLinkConverter.telemetryToMAVLink(drone);
      telemetry.push({
        msgType: "GLOBAL_POSITION_INT",
        timestamp,
        systemId,
        componentId: this.componentId,
        data: {
          time_boot_ms: timestamp,
          lat: globalPos.lat,
          lon: globalPos.lon,
          alt: globalPos.alt,
          relative_alt: globalPos.relativeAlt,
          vx: Math.round(globalPos.vx * 100), // m/s to cm/s
          vy: Math.round(globalPos.vy * 100),
          vz: Math.round(globalPos.vz * 100),
          hdg: Math.round(globalPos.hdg * 100), // deg to cdeg
        },
      });

      // BATTERY_STATUS
      telemetry.push({
        msgType: "BATTERY_STATUS",
        timestamp,
        systemId,
        componentId: this.componentId,
        data: {
          id: 0,
          battery_function: 0,
          type: 2, // Li-Ion
          temperature: 25,
          voltages: this.calculateCellVoltages(drone.battery),
          current_battery: this.calculateCurrent(drone.status),
          current_consumed: 0,
          energy_consumed: 0,
          battery_remaining: drone.battery,
          time_remaining: 0,
          charge_state: 0,
        },
      });

      // ATTITUDE - orientation
      telemetry.push({
        msgType: "ATTITUDE",
        timestamp,
        systemId,
        componentId: this.componentId,
        data: {
          time_boot_ms: timestamp,
          roll: (drone.rotation.x * Math.PI) / 180,
          pitch: (drone.rotation.y * Math.PI) / 180,
          yaw: (drone.rotation.z * Math.PI) / 180,
          rollspeed: 0,
          pitchspeed: 0,
          yawspeed: 0,
        },
      });

      // HEARTBEAT - system status (every 1 second = ~10 telemetry updates at 10Hz)
      if (this.telemetryCounter % 10 === 0) {
        const mavState = MAVLinkConverter.droneStatusToMAVState(drone.status);
        telemetry.push({
          msgType: "HEARTBEAT",
          timestamp,
          systemId,
          componentId: this.componentId,
          data: {
            type: 2, // MAV_TYPE_QUADROTOR
            autopilot: 3, // MAV_AUTOPILOT_ARDUPILOTMEGA
            base_mode: drone.status === "flying" ? 0x81 : 0x01, // Armed/Disarmed
            custom_mode: 0,
            system_status: mavState,
            mavlink_version: 3,
          },
        });
      }
    }

    return telemetry;
  }

  /**
   * Calculate battery cell voltages based on overall percentage
   */
  private calculateCellVoltages(batteryPercent: number): number[] {
    // 4S Li-Ion: 16.8V (full) to 12.8V (empty)
    // Per cell: 4.2V to 3.2V
    const voltagePerCell = 3.2 + (batteryPercent / 100) * (4.2 - 3.2);
    const millivolts = Math.round(voltagePerCell * 1000);
    return [millivolts, millivolts, millivolts, millivolts];
  }

  /**
   * Calculate current draw based on flight status
   */
  private calculateCurrent(status: DroneState["status"]): number {
    // Simulation: Flying = 20A, Hovering = 15A, Landed = 1A
    switch (status) {
      case "flying":
        return 20000; // mA
      case "hovering":
        return 15000;
      default:
        return 1000;
    }
  }

  /**
   * Execute MAVLink command
   */
  executeMAVLinkCommand(command: MAVLinkCommand): void {
    const droneId = this.getDroneIdFromSystemId(command.targetSystem);
    this.executeCommand(droneId, command);
  }

  /**
   * Execute formation command for multiple drones
   */
  executeFormationCommand(command: MAVLinkCommand, droneIds: number[]): void {
    for (const droneId of droneIds) {
      this.executeCommand(droneId, {
        ...command,
        targetSystem: this.systemIds.get(droneId) || droneId + 1,
      });
    }
  }

  /**
   * Route MAVLink command to appropriate DroneSimulator method
   */
  private executeCommand(droneId: number, command: MAVLinkCommand): void {
    const { command: mavCmd, params } = command;

    switch (mavCmd) {
      case MAV_CMD.NAV_TAKEOFF: {
        const altitude = params.param7 || 2;
        this.droneSimulator.executeTakeoffAll(altitude);
        break;
      }

      case MAV_CMD.NAV_LAND: {
        this.droneSimulator.executeLandAll();
        break;
      }

      case MAV_CMD.NAV_WAYPOINT: {
        const x = params.param5 || 0;
        const y = params.param6 || 0;
        const z = params.param7 || 0;
        this.droneSimulator.executeMoveDrone(droneId, x, y, z);
        break;
      }

      case MAV_CMD.NAV_LOITER_UNLIM: {
        // Hover - DroneSimulator handles this automatically when drone reaches target
        break;
      }

      case MAV_CMD.DO_SET_MODE: {
        // Mode changes handled by DroneSimulator state machine
        break;
      }

      default:
        log.warn("Unsupported MAV_CMD", { mavCmd });
    }
  }

  /**
   * Convert MAVLink system ID back to drone ID (0-based)
   */
  private getDroneIdFromSystemId(systemId: number): number {
    for (const [droneId, sysId] of this.systemIds.entries()) {
      if (sysId === systemId) {
        return droneId;
      }
    }
    return systemId - 1; // Fallback
  }

  /**
   * Get current drone states from simulator
   */
  getDroneStates(): DroneState[] {
    return this.droneSimulator.getDroneStates();
  }

  /**
   * Get drone count
   */
  getDroneCount(): number {
    return this.droneSimulator.getDroneCount();
  }

  /**
   * Reset simulation
   */
  reset(): void {
    this.droneSimulator.reset();
    this.sequenceNumber = 0;
    this.telemetryCounter = 0;
  }

  /**
   * Set drone count
   */
  setDroneCount(count: number): void {
    this.droneSimulator.setDroneCount(count);
    this.initializeSystemIds(count);
  }

  /**
   * Emergency stop - land all drones immediately
   */
  emergencyStop(): void {
    this.droneSimulator.emergencyStop();
  }

  async executeMissionItems(items: MissionItemIntMessage[]): Promise<void> {
    this.droneSimulator.clearWaypoints();

    let takeoffAltitude: number | null = null;
    let shouldLand = false;

    for (const item of items) {
      switch (item.command) {
        case MAV_CMD.NAV_TAKEOFF:
          takeoffAltitude = item.z || 2;
          break;
        case MAV_CMD.NAV_WAYPOINT:
          this.droneSimulator.addWaypoint({
            id: `mission_${item.seq}`,
            name: `mission_${item.seq}`,
            x: item.x,
            y: item.y,
            z: item.z,
            holdTime: item.param1,
          });
          break;
        case MAV_CMD.NAV_LAND:
          shouldLand = true;
          break;
        default:
          log.warn("Unsupported mission item in simulator", {
            command: item.command,
          });
      }
    }

    if (takeoffAltitude !== null) {
      this.droneSimulator.executeTakeoffAll(takeoffAltitude);
      await new Promise((resolve) => setTimeout(resolve, 3000));
    }

    await this.droneSimulator.executeMission(false);

    if (shouldLand) {
      this.droneSimulator.executeLandAll();
    }
  }

  /**
   * Get next sequence number (0-255)
   */
  getNextSequence(): number {
    this.sequenceNumber = (this.sequenceNumber + 1) & 0xff;
    return this.sequenceNumber;
  }
}
