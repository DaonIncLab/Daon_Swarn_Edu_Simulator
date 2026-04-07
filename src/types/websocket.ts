import {
  MessageType,
  CommandAction,
  FormationType,
  Direction,
} from "../constants/commands";

export interface BaseMessage {
  type: MessageType;
  timestamp?: number;
}

/**
 * Runtime command payload.
 * Kept broad because connection adapters support different subsets.
 */
export interface CommandParams {
  droneId?: number;
  altitude?: number;
  direction?: Direction | string;
  distance?: number;
  x?: number;
  y?: number;
  z?: number;
  speed?: number;
  degrees?: number;
  yaw?: number;
  duration?: number;
  formation?: FormationType | string;
  formationType?: FormationType | string;
  rows?: number;
  cols?: number;
  spacing?: number;
  radius?: number;
  r?: number;
  g?: number;
  b?: number;
  loop?: boolean;
  waypoint?: Record<string, unknown>;
  waypointId?: string;
  waypointIndex?: number;
  holdTime?: number;
  [key: string]: unknown;
}

export interface Command {
  action: CommandAction | string;
  params: CommandParams;
}

export interface CommandResponse {
  success: boolean;
  error?: string;
  timestamp: number;
}

export interface ExecuteScriptMessage extends BaseMessage {
  type: "execute_script";
  commands: Command[];
}

export interface CommandFinishMessage extends BaseMessage {
  type: "command_finish";
  commandIndex: number;
  message?: string;
}

export interface ErrorMessage extends BaseMessage {
  type: "error";
  error: string;
  commandIndex?: number;
}

export interface DroneState {
  id: number;
  position: { x: number; y: number; z: number };
  rotation: { x: number; y: number; z: number };
  velocity: { x: number; y: number; z: number };
  battery: number;
  isActive: boolean;
  status: "idle" | "flying" | "landed" | "hovering" | "error";
}

export interface TelemetryMessage extends BaseMessage {
  type: "telemetry";
  drones: DroneState[];
}

export interface AckMessage extends BaseMessage {
  type: "ack";
  message?: string;
}

export type WSMessage =
  | ExecuteScriptMessage
  | CommandFinishMessage
  | ErrorMessage
  | TelemetryMessage
  | AckMessage;
