/**
 * Telemetry-related constants
 */

/**
 * Telemetry dashboard tabs
 */
export const TelemetryTab = {
  VIEW_3D: '3d',
  CHARTS: 'charts',
  DRONE_LIST: 'list',
} as const

export type TelemetryTab = typeof TelemetryTab[keyof typeof TelemetryTab]
