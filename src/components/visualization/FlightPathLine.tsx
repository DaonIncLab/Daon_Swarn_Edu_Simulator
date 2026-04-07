/**
 * Flight Path Line Component
 *
 * Renders 3D flight path visualization using Three.js
 */

import { useMemo } from 'react'
import { Line } from '@react-three/drei'
import * as THREE from 'three'
import type { DroneHistory } from '@/types/telemetry'

interface FlightPathLineProps {
  droneHistory: DroneHistory
  color?: string
  opacity?: number
  lineWidth?: number
  showTrail?: boolean
  trailLength?: number
  currentTime?: number
}

/**
 * Get color by drone ID (consistent color for each drone)
 */
function getDroneColor(droneId: number): string {
  const colors = [
    '#ef4444', // red
    '#3b82f6', // blue
    '#10b981', // green
    '#f59e0b', // amber
    '#8b5cf6', // violet
    '#ec4899', // pink
    '#14b8a6', // teal
    '#f97316', // orange
  ]
  return colors[droneId % colors.length]
}

export function FlightPathLine({
  droneHistory,
  color,
  opacity = 0.6,
  lineWidth = 2,
  showTrail = false,
  trailLength = 10,
  currentTime,
}: FlightPathLineProps) {
  // Convert data points to 3D positions
  const points = useMemo(() => {
    if (!droneHistory.dataPoints || droneHistory.dataPoints.length === 0) {
      return []
    }

    let dataPoints = droneHistory.dataPoints

    // If showTrail and currentTime specified, only show recent points
    if (showTrail && currentTime !== undefined) {
      // Find data points within trail time window
      const trailStartTime = currentTime - trailLength * 1000 // trailLength in seconds
      dataPoints = droneHistory.dataPoints.filter(
        (point) => point.timestamp >= trailStartTime && point.timestamp <= currentTime
      )
    }

    return dataPoints.map((point) => {
      // Convert Unity coordinates to Three.js coordinates
      // Unity: Y-up, Three.js: Y-up (but we swap Y and Z for better visualization)
      return new THREE.Vector3(
        point.position.x,
        point.position.z, // Height
        -point.position.y // Depth (negative for correct orientation)
      )
    })
  }, [droneHistory.dataPoints, showTrail, currentTime, trailLength])

  // Don't render if not enough points
  if (points.length < 2) {
    return null
  }

  const lineColor = color || getDroneColor(droneHistory.droneId)

  return (
    <Line
      points={points}
      color={lineColor}
      lineWidth={lineWidth}
      transparent
      opacity={opacity}
    />
  )
}

/**
 * Flight Path Trail with Gradient (recent points brighter)
 */
export function FlightPathTrail({
  droneHistory,
  color,
  lineWidth = 3,
  trailLength = 10, // seconds
  currentTime,
}: FlightPathLineProps) {
  const segments = useMemo(() => {
    if (!droneHistory.dataPoints || droneHistory.dataPoints.length === 0 || currentTime === undefined) {
      return []
    }

    // Find data points within trail time window
    const trailStartTime = currentTime - trailLength * 1000
    const trailPoints = droneHistory.dataPoints.filter(
      (point) => point.timestamp >= trailStartTime && point.timestamp <= currentTime
    )

    if (trailPoints.length < 2) {
      return []
    }

    // Create segments with varying opacity (gradient effect)
    const segments: Array<{ points: THREE.Vector3[]; opacity: number }> = []

    for (let i = 0; i < trailPoints.length - 1; i++) {
      const point1 = trailPoints[i]
      const point2 = trailPoints[i + 1]

      const pos1 = new THREE.Vector3(point1.position.x, point1.position.z, -point1.position.y)
      const pos2 = new THREE.Vector3(point2.position.x, point2.position.z, -point2.position.y)

      // Calculate opacity based on time (recent = brighter)
      const timeRatio = (point2.timestamp - trailStartTime) / (trailLength * 1000)
      const opacity = 0.2 + timeRatio * 0.6 // Range: 0.2 to 0.8

      segments.push({
        points: [pos1, pos2],
        opacity,
      })
    }

    return segments
  }, [droneHistory.dataPoints, trailLength, currentTime])

  if (segments.length === 0) {
    return null
  }

  const lineColor = color || getDroneColor(droneHistory.droneId)

  return (
    <>
      {segments.map((segment, index) => (
        <Line
          key={index}
          points={segment.points}
          color={lineColor}
          lineWidth={lineWidth}
          transparent
          opacity={segment.opacity}
        />
      ))}
    </>
  )
}

/**
 * Full Flight Path with Current Position Marker
 */
interface FlightPathWithMarkerProps {
  droneHistory: DroneHistory
  currentTime?: number
  color?: string
  showFullPath?: boolean
  showTrail?: boolean
  trailLength?: number
}

export function FlightPathWithMarker({
  droneHistory,
  currentTime,
  color,
  showFullPath = true,
  showTrail = true,
  trailLength = 10,
}: FlightPathWithMarkerProps) {
  // Find current position based on currentTime
  const currentPosition = useMemo(() => {
    if (currentTime === undefined || !droneHistory.dataPoints || droneHistory.dataPoints.length === 0) {
      return null
    }

    // Find the two points surrounding currentTime
    let beforePoint = droneHistory.dataPoints[0]
    let afterPoint = droneHistory.dataPoints[droneHistory.dataPoints.length - 1]

    for (let i = 0; i < droneHistory.dataPoints.length - 1; i++) {
      if (
        droneHistory.dataPoints[i].timestamp <= currentTime &&
        droneHistory.dataPoints[i + 1].timestamp >= currentTime
      ) {
        beforePoint = droneHistory.dataPoints[i]
        afterPoint = droneHistory.dataPoints[i + 1]
        break
      }
    }

    // Linear interpolation between points
    const t =
      (currentTime - beforePoint.timestamp) /
      (afterPoint.timestamp - beforePoint.timestamp || 1)

    const pos = new THREE.Vector3(
      beforePoint.position.x + (afterPoint.position.x - beforePoint.position.x) * t,
      beforePoint.position.z + (afterPoint.position.z - beforePoint.position.z) * t,
      -(beforePoint.position.y + (afterPoint.position.y - beforePoint.position.y) * t)
    )

    return pos
  }, [droneHistory.dataPoints, currentTime])

  const lineColor = color || getDroneColor(droneHistory.droneId)

  return (
    <>
      {/* Full path (faint) */}
      {showFullPath && (
        <FlightPathLine
          droneHistory={droneHistory}
          color={lineColor}
          opacity={0.3}
          lineWidth={1}
        />
      )}

      {/* Trail (bright gradient) */}
      {showTrail && currentTime !== undefined && (
        <FlightPathTrail
          droneHistory={droneHistory}
          color={lineColor}
          lineWidth={3}
          trailLength={trailLength}
          currentTime={currentTime}
        />
      )}

      {/* Current position marker */}
      {currentPosition && (
        <mesh position={currentPosition}>
          <sphereGeometry args={[0.2, 16, 16]} />
          <meshStandardMaterial color={lineColor} emissive={lineColor} emissiveIntensity={0.5} />
        </mesh>
      )}
    </>
  )
}
