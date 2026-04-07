/**
 * Telemetry Store
 *
 * Manages historical telemetry data for visualization and analysis
 */

import { create } from 'zustand'
import type { DroneState } from '@/types/websocket'
import type { DroneHistory, DroneHistoryPoint } from '@/types/telemetry'
import { log } from '@/utils/logger'

interface TelemetryStore {
  // State
  history: Map<number, DroneHistory> // droneId -> history
  maxHistoryPoints: number // Max points per drone
  maxTotalDataPoints: number // Max total points across all drones
  isRecording: boolean

  // Actions
  addTelemetryData: (drones: DroneState[]) => void
  clearHistory: () => void
  clearDroneHistory: (droneId: number) => void
  startRecording: () => void
  stopRecording: () => void
  setMaxHistoryPoints: (max: number) => void
  setMaxTotalDataPoints: (max: number) => void

  // Getters
  getDroneHistory: (droneId: number) => DroneHistory | undefined
  getAllHistory: () => Map<number, DroneHistory>
  getTotalDataPoints: () => number
}

export const useTelemetryStore = create<TelemetryStore>((set, get) => ({
  // Initial state
  history: new Map(),
  maxHistoryPoints: 100, // Default: keep last 100 data points per drone
  maxTotalDataPoints: 10000, // Default: keep max 10,000 total data points across all drones
  isRecording: true, // Auto-start recording

  // Add new telemetry data from Unity
  addTelemetryData: (drones: DroneState[]) => {
    const { isRecording, maxHistoryPoints, maxTotalDataPoints } = get()

    if (!isRecording) return

    const timestamp = Date.now()

    // Optimized: Use Zustand's set with callback to minimize Map copying
    set((state) => {
      const newHistory = new Map(state.history)

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

        // Optimized: Use circular buffer pattern instead of slice
        if (droneHistory.dataPoints.length >= maxHistoryPoints) {
          droneHistory.dataPoints.shift() // Remove oldest
        }
        droneHistory.dataPoints.push(dataPoint)
      }

      // Optimized: Throttle pruning check - only run every ~5 seconds (approximately every 50 updates at 10Hz)
      const shouldPrune = timestamp % 5000 < 100 // Will be true approximately every 5 seconds

      if (shouldPrune) {
        // Check total data points across all drones
        let totalPoints = 0
        for (const droneHistory of newHistory.values()) {
          totalPoints += droneHistory.dataPoints.length
        }

        // If exceeds max total, prune oldest data from drones with most history
        if (totalPoints > maxTotalDataPoints) {
          const pointsToRemove = totalPoints - maxTotalDataPoints

          // Sort drones by history size (descending)
          const dronesSortedBySize = Array.from(newHistory.values()).sort(
            (a, b) => b.dataPoints.length - a.dataPoints.length
          )

          let removed = 0
          for (const droneHistory of dronesSortedBySize) {
            if (removed >= pointsToRemove) break

            const toRemoveFromThisDrone = Math.min(
              pointsToRemove - removed,
              droneHistory.dataPoints.length - 10 // Keep at least 10 points
            )

            if (toRemoveFromThisDrone > 0) {
              // Optimized: Use splice instead of slice to avoid creating new array
              droneHistory.dataPoints.splice(0, toRemoveFromThisDrone)
              removed += toRemoveFromThisDrone
            }
          }

          log.debug(
            'TelemetryStore',
            `Pruned ${removed} old data points (total was ${totalPoints}, limit is ${maxTotalDataPoints})`
          )
        }
      }

      return { history: newHistory }
    })
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

  // Set maximum total data points across all drones
  setMaxTotalDataPoints: (max: number) => {
    set({ maxTotalDataPoints: Math.max(100, max) }) // Minimum 100 points total
  },

  // Get history for specific drone
  getDroneHistory: (droneId: number) => {
    return get().history.get(droneId)
  },

  // Get all history
  getAllHistory: () => {
    return get().history
  },

  // Get total number of data points across all drones
  getTotalDataPoints: () => {
    let total = 0
    for (const droneHistory of get().history.values()) {
      total += droneHistory.dataPoints.length
    }
    return total
  },
}))
