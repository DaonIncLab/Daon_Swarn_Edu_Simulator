/**
 * Telemetry Store
 *
 * Manages historical telemetry data for visualization and analysis
 */

import { create } from 'zustand'
import type { DroneState } from '@/types/websocket'
import type { DroneHistory, DroneHistoryPoint } from '@/types/telemetry'

interface TelemetryStore {
  // State
  history: Map<number, DroneHistory> // droneId -> history
  maxHistoryPoints: number
  isRecording: boolean

  // Actions
  addTelemetryData: (drones: DroneState[]) => void
  clearHistory: () => void
  clearDroneHistory: (droneId: number) => void
  startRecording: () => void
  stopRecording: () => void
  setMaxHistoryPoints: (max: number) => void

  // Getters
  getDroneHistory: (droneId: number) => DroneHistory | undefined
  getAllHistory: () => Map<number, DroneHistory>
}

export const useTelemetryStore = create<TelemetryStore>((set, get) => ({
  // Initial state
  history: new Map(),
  maxHistoryPoints: 100, // Default: keep last 100 data points per drone
  isRecording: true, // Auto-start recording

  // Add new telemetry data from Unity
  addTelemetryData: (drones: DroneState[]) => {
    const { isRecording, maxHistoryPoints, history } = get()

    if (!isRecording) return

    const timestamp = Date.now()
    const newHistory = new Map(history)

    for (const drone of drones) {
      // Get or create drone history
      let droneHistory = newHistory.get(drone.id)

      if (!droneHistory) {
        droneHistory = {
          droneId: drone.id,
          dataPoints: [],
        }
        newHistory.set(drone.id, droneHistory)
      }

      // Create new data point
      const dataPoint: DroneHistoryPoint = {
        timestamp,
        position: { ...drone.position },
        rotation: { ...drone.rotation },
        velocity: { ...drone.velocity },
        battery: drone.battery,
        status: drone.status,
      }

      // Add to history
      droneHistory.dataPoints.push(dataPoint)

      // Trim if exceeds max points (keep most recent)
      if (droneHistory.dataPoints.length > maxHistoryPoints) {
        droneHistory.dataPoints = droneHistory.dataPoints.slice(-maxHistoryPoints)
      }
    }

    set({ history: newHistory })
  },

  // Clear all history
  clearHistory: () => {
    set({ history: new Map() })
  },

  // Clear history for specific drone
  clearDroneHistory: (droneId: number) => {
    const { history } = get()
    const newHistory = new Map(history)
    newHistory.delete(droneId)
    set({ history: newHistory })
  },

  // Start recording telemetry
  startRecording: () => {
    set({ isRecording: true })
  },

  // Stop recording telemetry
  stopRecording: () => {
    set({ isRecording: false })
  },

  // Set maximum history points per drone
  setMaxHistoryPoints: (max: number) => {
    set({ maxHistoryPoints: Math.max(10, max) }) // Minimum 10 points

    // Trim existing history if needed
    const { history } = get()
    const newHistory = new Map(history)

    for (const [droneId, droneHistory] of newHistory.entries()) {
      if (droneHistory.dataPoints.length > max) {
        droneHistory.dataPoints = droneHistory.dataPoints.slice(-max)
      }
    }

    set({ history: newHistory })
  },

  // Get history for specific drone
  getDroneHistory: (droneId: number) => {
    return get().history.get(droneId)
  },

  // Get all history
  getAllHistory: () => {
    return get().history
  },
}))
