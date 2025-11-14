/**
 * Telemetry history and visualization types
 */

import type { DroneState } from './websocket'

/**
 * Historical data point for a single drone
 */
export interface DroneHistoryPoint {
  timestamp: number // Unix timestamp in ms
  position: { x: number; y: number; z: number }
  rotation: { x: number; y: number; z: number }
  velocity: { x: number; y: number; z: number }
  battery: number
  status: DroneState['status']
}

/**
 * Historical data for a single drone
 */
export interface DroneHistory {
  droneId: number
  dataPoints: DroneHistoryPoint[]
}

/**
 * Chart data point for visualization
 */
export interface ChartDataPoint {
  x: number // timestamp
  y: number // value
}

/**
 * Chart configuration
 */
export interface ChartConfig {
  maxDataPoints: number // Maximum number of points to display
  updateInterval: number // ms between updates
  timeWindow: number // ms of history to show
}

/**
 * Re-export type from constants
 */
export type { TelemetryTab } from '@/constants/telemetry'
