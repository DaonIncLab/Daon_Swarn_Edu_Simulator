/**
 * MAVLink Converter
 *
 * Converts between Blockly commands and MAVLink messages
 * Handles formation calculations for swarm commands
 */

import { CommandAction, Direction, FormationType } from "@/constants/commands";
import type { GlobalPositionIntMessage } from "@/types/mavlink";
import { MAV_STATE } from "@/types/mavlink"; // Runtime value, not type-only
import type { Command, DroneState } from "@/types/websocket";
import { log } from "@/utils/logger";
import { coordinateConverter } from "./CoordinateConverter";
import { MAV_CMD, type CommandLongParams } from "./MAVLinkCommands";

export const MAVLINK_POSITION_SENTINEL = -999999;

/**
 * MAVLink Converter Class
 */
export class MAVLinkConverter {
  /**
   * Convert Blockly Command to MAVLink COMMAND_LONG message
   *
   * Note: Formation commands (SET_FORMATION, MOVE_FORMATION) return empty arrays
   * because they require multi-drone coordination handled by the simulator/service layer.
   * Use convertFormationCommand() for formation-specific conversion.
   * Movement commands always map to a single waypoint in mission mode, even when
   * scenario speed context is present.
   */
  static blocklyToMAVLink(
    command: Command,
    droneId: number = 0,
  ): CommandLongParams[] {
    const params = command.params || {};

    switch (command.action) {
      case CommandAction.TAKEOFF_ALL:
        return [
          {
            command: MAV_CMD.NAV_TAKEOFF,
            param7: params.altitude || 2, // Altitude in meters
            target_system: droneId,
          },
        ];
      case CommandAction.TAKEOFF:
        return [
          {
            command: MAV_CMD.NAV_TAKEOFF,
            param7: params.altitude || 2, // Altitude in meters
            target_system: droneId,
          },
        ];
      case CommandAction.LAND_ALL:
        return [
          {
            command: MAV_CMD.NAV_LAND,
            target_system: droneId,
          },
        ];

      case CommandAction.LAND:
        return [
          {
            command: MAV_CMD.NAV_LAND,
            target_system: droneId,
          },
        ];

      case CommandAction.HOVER:
        return [
          {
            command: MAV_CMD.NAV_LOITER_UNLIM,
            target_system: droneId,
          },
        ];

      case CommandAction.MOVE_DRONE:
      case CommandAction.MOVE_XYZ:
        return [
          {
            command: MAV_CMD.NAV_WAYPOINT,
            param5: params.x ?? MAVLINK_POSITION_SENTINEL,
            param6: params.y ?? MAVLINK_POSITION_SENTINEL,
            param7: params.z ?? MAVLINK_POSITION_SENTINEL,
            target_system: droneId,
          },
        ];

      case CommandAction.MOVE_DIRECTION: {
        const direction = (params.direction as Direction) || Direction.FORWARD;
        const distance = params.distance ?? 1;
        const offset = this.getDirectionOffset(direction, distance);

        return [
          {
            command: MAV_CMD.NAV_WAYPOINT,
            param5: offset.x,
            param6: offset.y,
            param7: offset.z,
            target_system: droneId,
          },
        ];
      }

      case CommandAction.ROTATE: {
        const direction = (params.direction as string) || "CW";
        const degrees = params.degrees ?? 90;
        const yawDirection = direction === "CCW" ? -1 : 1;

        return [
          {
            command: MAV_CMD.CONDITION_YAW,
            param1: degrees,
            param2: 30, // default yaw speed deg/s
            param3: yawDirection,
            param4: 1, // relative yaw
            target_system: droneId,
          },
        ];
      }

      case CommandAction.SET_SPEED: {
        const speed = params.speed ?? 2;

        return [
          {
            command: MAV_CMD.DO_CHANGE_SPEED,
            param1: 1, // groundspeed
            param2: speed,
            param3: -1, // no throttle change
            param4: 0, // absolute speed
            target_system: droneId,
          },
        ];
      }

      case CommandAction.SET_FORMATION:
      case CommandAction.MOVE_FORMATION:
        // Formation commands handled by convertFormationCommand()
        return [];

      case CommandAction.SET_LED_COLOR:
      case CommandAction.SET_COLOR:
        // LED color is handled at service/simulator layer when supported.
        return [];

      case CommandAction.WAIT:
        return [
          {
            command: MAV_CMD.NAV_LOITER_TIME,
            param1: params.duration ?? 1,
            target_system: droneId,
          },
        ];

      case CommandAction.SYNC_ALL:
      case CommandAction.WAIT_ALL:
        // Synchronization handled by GCS
        return [];

      default:
        log.warn("Unsupported command", { action: command.action });
        return [];
    }
  }

  /**
   * Convert formation command to individual drone waypoints
   * Returns a map of droneId -> CommandLongParams
   */
  static convertFormationCommand(
    command: Command,
    droneIds: number[],
  ): Map<number, CommandLongParams> {
    const params = command.params || {};
    const result = new Map<number, CommandLongParams>();

    if (command.action === CommandAction.SET_FORMATION) {
      // Calculate formation positions
      const formationType = params.formationType || FormationType.LINE;
      const spacing = params.spacing || 2;
      const centerX = params.x || 0;
      const centerY = params.y || 0;
      const centerZ = params.z || 2;

      const positions = this.calculateFormationPositions(
        formationType,
        droneIds.length,
        spacing,
        params.rows,
        params.cols,
        centerX,
        centerY,
        centerZ,
      );

      // Create waypoint for each drone
      droneIds.forEach((droneId, index) => {
        if (index < positions.length) {
          const pos = positions[index];
          result.set(droneId, {
            command: MAV_CMD.NAV_WAYPOINT,
            param5: pos.x,
            param6: pos.y,
            param7: pos.z,
            target_system: droneId,
          });
        }
      });
    } else if (command.action === CommandAction.MOVE_FORMATION) {
      // Move formation by applying direction offset to all drones
      const direction = params.direction || Direction.FORWARD;
      const distance = params.distance || 1;
      const offset = this.getDirectionOffset(direction, distance);

      droneIds.forEach((droneId) => {
        result.set(droneId, {
          command: MAV_CMD.NAV_WAYPOINT,
          // Relative movement - actual position calculated by simulator
          param5: offset.x,
          param6: offset.y,
          param7: offset.z,
          target_system: droneId,
        });
      });
    }

    return result;
  }

  /**
   * Calculate formation positions for all drones
   */
  static calculateFormationPositions(
    formationType: FormationType,
    droneCount: number,
    spacing: number = 2,
    rows?: number,
    cols?: number,
    centerX: number = 0,
    centerY: number = 0,
    centerZ: number = 2,
  ): Array<{ x: number; y: number; z: number }> {
    const positions: Array<{ x: number; y: number; z: number }> = [];

    switch (formationType) {
      case FormationType.GRID:
        {
          const actualRows = rows || Math.ceil(Math.sqrt(droneCount));
          const actualCols = cols || Math.ceil(droneCount / actualRows);

          for (let i = 0; i < droneCount; i++) {
            const row = Math.floor(i / actualCols);
            const col = i % actualCols;

            positions.push({
              x: centerX + (col - (actualCols - 1) / 2) * spacing,
              y: centerY + (row - (actualRows - 1) / 2) * spacing,
              z: centerZ,
            });
          }
        }
        break;

      case FormationType.LINE:
        for (let i = 0; i < droneCount; i++) {
          positions.push({
            x: centerX + (i - (droneCount - 1) / 2) * spacing,
            y: centerY,
            z: centerZ,
          });
        }
        break;

      case FormationType.CIRCLE:
        {
          const radius = (droneCount * spacing) / (2 * Math.PI);
          for (let i = 0; i < droneCount; i++) {
            const angle = (i / droneCount) * 2 * Math.PI;
            positions.push({
              x: centerX + radius * Math.cos(angle),
              y: centerY + radius * Math.sin(angle),
              z: centerZ,
            });
          }
        }
        break;

      case FormationType.V_SHAPE:
        {
          const halfCount = Math.ceil(droneCount / 2);
          for (let i = 0; i < droneCount; i++) {
            const side = i < halfCount ? -1 : 1;
            const idx = i < halfCount ? i : i - halfCount;
            positions.push({
              x: centerX + idx * spacing * side,
              y: centerY - idx * spacing,
              z: centerZ,
            });
          }
        }
        break;

      case FormationType.TRIANGLE:
        {
          const rowCount = Math.ceil((-1 + Math.sqrt(1 + 8 * droneCount)) / 2);
          let droneIdx = 0;

          for (let row = 0; row < rowCount && droneIdx < droneCount; row++) {
            const dronesInRow = row + 1;
            for (
              let col = 0;
              col < dronesInRow && droneIdx < droneCount;
              col++
            ) {
              positions.push({
                x: centerX + (col - row / 2) * spacing,
                y: centerY + row * spacing,
                z: centerZ,
              });
              droneIdx++;
            }
          }
        }
        break;

      case FormationType.SQUARE:
        {
          const sideLength = Math.ceil(Math.sqrt(droneCount));
          for (let i = 0; i < droneCount; i++) {
            const row = Math.floor(i / sideLength);
            const col = i % sideLength;
            positions.push({
              x: centerX + (col - (sideLength - 1) / 2) * spacing,
              y: centerY + (row - (sideLength - 1) / 2) * spacing,
              z: centerZ,
            });
          }
        }
        break;

      case FormationType.DIAMOND:
        {
          const half = Math.ceil(droneCount / 2);
          for (let i = 0; i < droneCount; i++) {
            const isTop = i < half;
            const idx = isTop ? i : droneCount - 1 - i;
            const row = isTop ? idx : half - 1 - (i - half);

            positions.push({
              x:
                centerX +
                (i < half
                  ? (row * spacing) / 2
                  : ((half - 1 - (i - half)) * spacing) / 2),
              y: centerY + (isTop ? row * spacing : -row * spacing),
              z: centerZ,
            });
          }
        }
        break;

      default:
        // Default to line formation
        for (let i = 0; i < droneCount; i++) {
          positions.push({
            x: centerX + i * spacing,
            y: centerY,
            z: centerZ,
          });
        }
    }

    return positions;
  }

  /**
   * Calculate direction offset vector
   */
  static getDirectionOffset(
    direction: Direction,
    distance: number,
  ): { x: number; y: number; z: number } {
    switch (direction) {
      case Direction.FORWARD:
        return { x: 0, y: distance, z: 0 };
      case Direction.BACKWARD:
        return { x: 0, y: -distance, z: 0 };
      case Direction.LEFT:
        return { x: -distance, y: 0, z: 0 };
      case Direction.RIGHT:
        return { x: distance, y: 0, z: 0 };
      case Direction.UP:
        return { x: 0, y: 0, z: distance };
      case Direction.DOWN:
        return { x: 0, y: 0, z: -distance };
      default:
        return { x: 0, y: 0, z: 0 };
    }
  }

  /**
   * Convert MAVLink telemetry to DroneState
   */
  static mavlinkToTelemetry(
    droneId: number,
    globalPos?: GlobalPositionIntMessage,
    battery?: number,
    status?: string,
  ): Partial<DroneState> {
    const state: Partial<DroneState> = {
      id: droneId,
    };

    if (globalPos) {
      // Convert MAVLink GPS position to local NED coordinates
      const localPos = coordinateConverter.mavlinkGlobalToLocal(
        globalPos.lat,
        globalPos.lon,
        globalPos.alt,
        globalPos.relative_alt,
      );

      state.position = {
        x: localPos.x,
        y: localPos.y,
        z: localPos.z,
      };

      state.velocity = {
        x: globalPos.vx / 100, // cm/s to m/s
        y: globalPos.vy / 100,
        z: globalPos.vz / 100,
      };

      state.rotation = {
        x: 0,
        y: 0,
        z: globalPos.hdg / 100, // cdeg to deg
      };
    }

    if (battery !== undefined) {
      state.battery = battery;
    }

    if (status) {
      state.status = status as DroneState["status"];
    }

    return state;
  }

  /**
   * Convert DroneState to MAVLink GLOBAL_POSITION_INT parameters
   */
  static telemetryToMAVLink(drone: DroneState) {
    // Convert local NED coordinates to GPS
    const gpsPos = coordinateConverter.localToMavlinkGlobal(
      drone.position.x,
      drone.position.y,
      drone.position.z,
    );

    return {
      timeBootMs: Date.now(),
      lat: gpsPos.lat,
      lon: gpsPos.lon,
      alt: gpsPos.alt,
      relativeAlt: gpsPos.relativeAlt,
      vx: drone.velocity?.x || 0,
      vy: drone.velocity?.y || 0,
      vz: drone.velocity?.z || 0,
      hdg: drone.rotation?.z || 0,
    };
  }

  /**
   * Map drone status to MAV_STATE
   */
  static droneStatusToMAVState(status: DroneState["status"]): number {
    switch (status) {
      case "landed":
        return MAV_STATE.STANDBY;
      case "flying":
      case "hovering":
        return MAV_STATE.ACTIVE;
      case "error":
        return MAV_STATE.CRITICAL;
      default:
        return MAV_STATE.UNINIT;
    }
  }

  /**
   * Map MAV_STATE to drone status
   */
  static mavStateTodroneStatus(mavState: number): DroneState["status"] {
    switch (mavState) {
      case MAV_STATE.STANDBY:
        return "landed";
      case MAV_STATE.ACTIVE:
        return "flying";
      case MAV_STATE.CRITICAL:
      case MAV_STATE.EMERGENCY:
        return "error";
      default:
        return "landed";
    }
  }

  /**
   * Normalize a partial MAVLink drone snapshot into the UI/runtime shape.
   */
  static normalizeDroneState(
    droneId: number,
    state: Partial<DroneState>,
  ): DroneState {
    return {
      id: state.id ?? droneId,
      position: state.position ?? { x: 0, y: 0, z: 0 },
      rotation: state.rotation ?? { x: 0, y: 0, z: 0 },
      velocity: state.velocity ?? { x: 0, y: 0, z: 0 },
      battery: state.battery ?? 100,
      isActive: state.isActive ?? false,
      status: state.status ?? "landed",
    };
  }

  /**
   * Convert position setpoint (for Virtual Leader) to MAVLink SET_POSITION_TARGET_LOCAL_NED
   *
   * This is used by the Virtual Leader Formation Controller to send individual
   * position setpoints to each drone at 10Hz
   *
   * @param droneId - Drone ID (0-based)
   * @param position - Target position in local NED frame (meters)
   * @param velocity - Target velocity in local NED frame (m/s)
   * @param yaw - Target yaw angle (radians)
   * @returns MAVLink command parameters
   */
  static positionSetpointToMAVLink(
    droneId: number,
    position: { x: number; y: number; z: number },
    velocity: { x: number; y: number; z: number },
    yaw: number,
  ): CommandLongParams {
    // MAV_CMD 84: SET_POSITION_TARGET_LOCAL_NED
    // This command sets position, velocity, and yaw simultaneously
    //
    // Type mask (param1):
    // - 0b0000111111000111 = 0x0FC7 = Use position + velocity + yaw
    // - 0b0000111111111000 = 0x0FF8 = Use position only
    // - 0b0000111000111111 = 0x0E3F = Use velocity only
    //
    // We use position + velocity + yaw for smooth synchronized movement
    const TYPE_MASK_POS_VEL_YAW = 0x0fc7;

    return {
      command: 84, // SET_POSITION_TARGET_LOCAL_NED
      param1: TYPE_MASK_POS_VEL_YAW, // Type mask
      param2: position.x, // X position in NED frame (meters)
      param3: position.y, // Y position in NED frame (meters)
      param4: position.z, // Z position in NED frame (meters, down is positive)
      param5: velocity.x, // X velocity in NED frame (m/s)
      param6: velocity.y, // Y velocity in NED frame (m/s)
      param7: velocity.z, // Z velocity in NED frame (m/s)
      // Note: Yaw is typically sent separately via SET_ATTITUDE_TARGET
      // For simplicity, we include it in param4 of a separate command if needed
      target_system: droneId + 1, // MAVLink system ID (1-based)
    };
  }
}
