/**
 * Playback Controls Component
 *
 * Timeline controls for flight path playback with play/pause/slider/speed
 */

import { useEffect, useRef } from 'react'
import {
  useFlightRecordingStore,
  PlaybackStatus,
} from '@/stores/useFlightRecordingStore'

export function PlaybackControls() {
  const { playback, pausePlayback, resumePlayback, stopPlayback, seekTo, setPlaybackSpeed, updatePlaybackTime } =
    useFlightRecordingStore()
  const animationFrameRef = useRef<number>()
  const lastTimeRef = useRef<number>(Date.now())

  // Animation loop for playback
  useEffect(() => {
    if (playback.status === PlaybackStatus.PLAYING) {
      const animate = () => {
        const now = Date.now()
        const deltaTime = now - lastTimeRef.current
        lastTimeRef.current = now

        updatePlaybackTime(deltaTime)
        animationFrameRef.current = requestAnimationFrame(animate)
      }

      lastTimeRef.current = Date.now()
      animationFrameRef.current = requestAnimationFrame(animate)
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }
  }, [playback.status, updatePlaybackTime])

  if (!playback.recording) {
    return (
      <div className="flex items-center justify-center h-16 bg-gray-800 text-gray-400">
        <p className="text-sm">녹화를 선택하여 재생하세요</p>
      </div>
    )
  }

  const isPlaying = playback.status === PlaybackStatus.PLAYING
  const isPaused = playback.status === PlaybackStatus.PAUSED
  const duration = playback.recording.duration
  const currentTime = playback.currentTime
  const progress = duration > 0 ? (currentTime / duration) * 100 : 0

  const formatTime = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000)
    const minutes = Math.floor(totalSeconds / 60)
    const seconds = totalSeconds % 60
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  }

  const handlePlayPause = () => {
    if (isPlaying) {
      pausePlayback()
    } else if (isPaused) {
      resumePlayback()
    } else {
      // Restart from beginning if stopped
      seekTo(0)
      resumePlayback()
    }
  }

  const handleStop = () => {
    stopPlayback()
  }

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newProgress = parseFloat(e.target.value)
    const newTime = (newProgress / 100) * duration
    seekTo(newTime)
  }

  const handleSpeedChange = (newSpeed: number) => {
    setPlaybackSpeed(newSpeed)
  }

  const speedOptions = [0.5, 1, 2, 4]

  return (
    <div className="bg-gray-800 text-white px-6 py-3 space-y-3">
      {/* Timeline Slider */}
      <div className="space-y-1">
        <input
          type="range"
          min="0"
          max="100"
          step="0.1"
          value={progress}
          onChange={handleSeek}
          className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
          style={{
            background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${progress}%, #374151 ${progress}%, #374151 100%)`,
          }}
        />
        <div className="flex justify-between text-xs text-gray-400">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between">
        {/* Play/Pause/Stop Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={handlePlayPause}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg font-medium transition-colors"
          >
            {isPlaying ? '⏸ 일시정지' : '▶ 재생'}
          </button>
          <button
            onClick={handleStop}
            className="px-4 py-2 bg-gray-600 hover:bg-gray-700 rounded-lg font-medium transition-colors"
          >
            ⏹ 정지
          </button>
        </div>

        {/* Speed Control */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-400">속도:</span>
          {speedOptions.map((speed) => (
            <button
              key={speed}
              onClick={() => handleSpeedChange(speed)}
              className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                playback.speed === speed
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              {speed}x
            </button>
          ))}
        </div>

        {/* Recording Info */}
        <div className="text-sm text-gray-400">
          <span className="font-medium text-white">{playback.recording.name}</span>
          <span className="ml-2">
            ({playback.recording.metadata?.droneCount || 0} 드론)
          </span>
        </div>
      </div>

      {/* Progress Bar Visual */}
      <div className="relative h-1 bg-gray-700 rounded-full overflow-hidden">
        <div
          className="absolute h-full bg-blue-500 transition-all duration-100"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  )
}
