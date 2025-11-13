/**
 * Flight Recording Store
 *
 * Manages flight path recordings with save/load/playback functionality
 */

import { create } from 'zustand'
import type { DroneHistory } from '@/types/telemetry'

/**
 * Saved flight recording
 */
export interface FlightRecording {
  id: string
  name: string
  timestamp: number // Unix timestamp when recording was created
  duration: number // Total duration in milliseconds
  droneHistories: Map<number, DroneHistory> // droneId -> history
  metadata?: {
    droneCount: number
    startTime: number
    endTime: number
  }
}

/**
 * Playback state
 */
export enum PlaybackStatus {
  IDLE = 'idle',
  PLAYING = 'playing',
  PAUSED = 'paused',
  STOPPED = 'stopped',
}

export interface PlaybackState {
  status: PlaybackStatus
  currentTime: number // Current playback time in milliseconds
  speed: number // Playback speed multiplier (0.5x, 1x, 2x, 4x)
  recording: FlightRecording | null
}

interface FlightRecordingStore {
  // State
  recordings: FlightRecording[]
  playback: PlaybackState

  // Recording Actions
  saveRecording: (
    name: string,
    droneHistories: Map<number, DroneHistory>
  ) => void
  loadRecording: (id: string) => FlightRecording | null
  deleteRecording: (id: string) => void
  renameRecording: (id: string, newName: string) => void
  exportRecording: (id: string) => string | null // Export as JSON string
  importRecording: (jsonString: string) => boolean // Import from JSON

  // Playback Actions
  startPlayback: (recording: FlightRecording) => void
  pausePlayback: () => void
  resumePlayback: () => void
  stopPlayback: () => void
  seekTo: (time: number) => void
  setPlaybackSpeed: (speed: number) => void
  updatePlaybackTime: (deltaTime: number) => void

  // Getters
  getAllRecordings: () => FlightRecording[]
  getRecording: (id: string) => FlightRecording | null
  getCurrentPlaybackData: () => Map<number, DroneHistory> | null
}

const STORAGE_KEY = 'drone-swarm-flight-recordings'

// Load recordings from localStorage
function loadRecordingsFromStorage(): FlightRecording[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (!stored) return []

    const parsed = JSON.parse(stored)

    // Convert plain objects back to Maps
    return parsed.map((rec: any) => ({
      ...rec,
      droneHistories: new Map(Object.entries(rec.droneHistories)),
    }))
  } catch (error) {
    console.error('[FlightRecordingStore] Failed to load recordings:', error)
    return []
  }
}

// Save recordings to localStorage
function saveRecordingsToStorage(recordings: FlightRecording[]) {
  try {
    // Convert Maps to plain objects for JSON serialization
    const serializable = recordings.map((rec) => ({
      ...rec,
      droneHistories: Object.fromEntries(rec.droneHistories),
    }))

    localStorage.setItem(STORAGE_KEY, JSON.stringify(serializable))
  } catch (error) {
    console.error('[FlightRecordingStore] Failed to save recordings:', error)
  }
}

export const useFlightRecordingStore = create<FlightRecordingStore>(
  (set, get) => ({
    // Initial state
    recordings: loadRecordingsFromStorage(),
    playback: {
      status: PlaybackStatus.IDLE,
      currentTime: 0,
      speed: 1,
      recording: null,
    },

    // Save a new recording
    saveRecording: (name, droneHistories) => {
      if (droneHistories.size === 0) {
        console.warn('[FlightRecordingStore] Cannot save empty recording')
        return
      }

      // Calculate duration from data points
      let minTime = Infinity
      let maxTime = -Infinity

      for (const history of droneHistories.values()) {
        for (const point of history.dataPoints) {
          minTime = Math.min(minTime, point.timestamp)
          maxTime = Math.max(maxTime, point.timestamp)
        }
      }

      const duration = maxTime - minTime
      const timestamp = Date.now()

      const recording: FlightRecording = {
        id: `rec_${timestamp}_${Math.random().toString(36).substr(2, 9)}`,
        name,
        timestamp,
        duration,
        droneHistories: new Map(droneHistories),
        metadata: {
          droneCount: droneHistories.size,
          startTime: minTime,
          endTime: maxTime,
        },
      }

      const newRecordings = [...get().recordings, recording]
      set({ recordings: newRecordings })
      saveRecordingsToStorage(newRecordings)

      console.log(`[FlightRecordingStore] Saved recording: ${name} (${duration}ms, ${droneHistories.size} drones)`)
    },

    // Load a recording by ID
    loadRecording: (id) => {
      return get().recordings.find((rec) => rec.id === id) || null
    },

    // Delete a recording
    deleteRecording: (id) => {
      const newRecordings = get().recordings.filter((rec) => rec.id !== id)
      set({ recordings: newRecordings })
      saveRecordingsToStorage(newRecordings)

      // Stop playback if the deleted recording is playing
      if (get().playback.recording?.id === id) {
        get().stopPlayback()
      }
    },

    // Rename a recording
    renameRecording: (id, newName) => {
      const newRecordings = get().recordings.map((rec) =>
        rec.id === id ? { ...rec, name: newName } : rec
      )
      set({ recordings: newRecordings })
      saveRecordingsToStorage(newRecordings)
    },

    // Export recording as JSON
    exportRecording: (id) => {
      const recording = get().recordings.find((rec) => rec.id === id)
      if (!recording) return null

      try {
        const serializable = {
          ...recording,
          droneHistories: Object.fromEntries(recording.droneHistories),
        }
        return JSON.stringify(serializable, null, 2)
      } catch (error) {
        console.error('[FlightRecordingStore] Export failed:', error)
        return null
      }
    },

    // Import recording from JSON
    importRecording: (jsonString) => {
      try {
        const parsed = JSON.parse(jsonString)

        // Validate structure
        if (!parsed.id || !parsed.name || !parsed.droneHistories) {
          console.error('[FlightRecordingStore] Invalid recording format')
          return false
        }

        // Convert to FlightRecording
        const recording: FlightRecording = {
          ...parsed,
          droneHistories: new Map(Object.entries(parsed.droneHistories)),
        }

        // Check for duplicate ID
        const existingIds = get().recordings.map((r) => r.id)
        if (existingIds.includes(recording.id)) {
          // Generate new ID
          recording.id = `rec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        }

        const newRecordings = [...get().recordings, recording]
        set({ recordings: newRecordings })
        saveRecordingsToStorage(newRecordings)

        console.log(`[FlightRecordingStore] Imported recording: ${recording.name}`)
        return true
      } catch (error) {
        console.error('[FlightRecordingStore] Import failed:', error)
        return false
      }
    },

    // Start playback
    startPlayback: (recording) => {
      set({
        playback: {
          status: PlaybackStatus.PLAYING,
          currentTime: 0,
          speed: 1,
          recording,
        },
      })
      console.log(`[FlightRecordingStore] Started playback: ${recording.name}`)
    },

    // Pause playback
    pausePlayback: () => {
      const { playback } = get()
      if (playback.status === PlaybackStatus.PLAYING) {
        set({
          playback: {
            ...playback,
            status: PlaybackStatus.PAUSED,
          },
        })
      }
    },

    // Resume playback
    resumePlayback: () => {
      const { playback } = get()
      if (playback.status === PlaybackStatus.PAUSED) {
        set({
          playback: {
            ...playback,
            status: PlaybackStatus.PLAYING,
          },
        })
      }
    },

    // Stop playback
    stopPlayback: () => {
      set({
        playback: {
          status: PlaybackStatus.STOPPED,
          currentTime: 0,
          speed: 1,
          recording: null,
        },
      })
    },

    // Seek to specific time
    seekTo: (time) => {
      const { playback } = get()
      if (!playback.recording) return

      const clampedTime = Math.max(0, Math.min(time, playback.recording.duration))
      set({
        playback: {
          ...playback,
          currentTime: clampedTime,
        },
      })
    },

    // Set playback speed
    setPlaybackSpeed: (speed) => {
      const { playback } = get()
      const validSpeed = Math.max(0.1, Math.min(speed, 10)) // Clamp between 0.1x and 10x
      set({
        playback: {
          ...playback,
          speed: validSpeed,
        },
      })
    },

    // Update playback time (called by animation loop)
    updatePlaybackTime: (deltaTime) => {
      const { playback } = get()

      if (playback.status !== PlaybackStatus.PLAYING || !playback.recording) {
        return
      }

      const newTime = playback.currentTime + deltaTime * playback.speed

      if (newTime >= playback.recording.duration) {
        // Reached end, stop playback
        set({
          playback: {
            ...playback,
            status: PlaybackStatus.STOPPED,
            currentTime: playback.recording.duration,
          },
        })
      } else {
        set({
          playback: {
            ...playback,
            currentTime: newTime,
          },
        })
      }
    },

    // Get all recordings
    getAllRecordings: () => {
      return get().recordings
    },

    // Get specific recording
    getRecording: (id) => {
      return get().recordings.find((rec) => rec.id === id) || null
    },

    // Get current playback data (interpolated drone positions at current time)
    getCurrentPlaybackData: () => {
      const { playback } = get()

      if (!playback.recording || playback.status === PlaybackStatus.IDLE) {
        return null
      }

      // For now, return the full histories
      // TODO: Implement interpolation to get exact positions at currentTime
      return playback.recording.droneHistories
    },
  })
)
