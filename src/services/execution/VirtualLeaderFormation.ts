/**
 * Virtual Leader Formation Controller
 *
 * 가상의 리더 포인트를 따라 모든 드론이 동기화되어 움직이는 포메이션 제어 시스템
 * - 부드러운 동기화된 움직임
 * - 실시간 포메이션 변경 가능
 * - 10Hz 위치 업데이트
 */

import type { FormationType } from '@/constants/commands'
import { Direction } from '@/constants/commands'
import { log } from '@/utils/logger'

/**
 * 3D 벡터
 */
export interface Vector3 {
  x: number
  y: number
  z: number
}

/**
 * 가상 리더 상태
 */
export interface VirtualLeaderState {
  position: Vector3
  velocity: Vector3
  yaw: number  // Yaw angle in degrees
  timestamp: number
}

/**
 * 포메이션 오프셋 (각 드론별)
 */
export interface FormationOffset {
  droneId: number
  offset: Vector3  // Relative to virtual leader
  relativeYaw: number  // Relative yaw in degrees
}

/**
 * 경로 웨이포인트
 */
export interface TrajectoryWaypoint {
  t: number  // Time in seconds
  position: Vector3
  velocity?: Vector3  // Optional velocity for smooth interpolation
  yaw?: number  // Optional yaw
}

/**
 * 위치 설정점 전송 콜백
 */
export type PositionSetpointCallback = (
  droneId: number,
  position: Vector3,
  yaw?: number
) => Promise<void>

/**
 * 가상리더 포메이션 컨트롤러
 */
export class VirtualLeaderFormationController {
  // 가상 리더 상태
  private virtualLeader: VirtualLeaderState

  // 포메이션 오프셋 (드론별)
  private formationOffsets: Map<number, FormationOffset>

  // 업데이트 타이머
  private updateInterval: number | null = null

  // 업데이트 주기 (Hz)
  private updateRate: number

  // 위치 명령 전송 콜백
  private sendPositionCallback: PositionSetpointCallback

  // 드론 수
  private droneCount: number

  // 현재 실행 중인 경로
  private currentTrajectory: TrajectoryWaypoint[] | null = null
  private trajectoryStartTime: number = 0

  /**
   * Constructor
   */
  constructor(
    droneCount: number,
    sendPositionCallback: PositionSetpointCallback,
    updateRate: number = 10  // Default 10Hz
  ) {
    this.droneCount = droneCount
    this.sendPositionCallback = sendPositionCallback
    this.updateRate = updateRate

    // 초기 가상 리더 상태
    this.virtualLeader = {
      position: { x: 0, y: 0, z: 0 },
      velocity: { x: 0, y: 0, z: 0 },
      yaw: 0,
      timestamp: Date.now()
    }

    // 초기 포메이션 오프셋 (없음)
    this.formationOffsets = new Map()

    log.info('VirtualLeaderFormation', 'Controller initialized', {
      droneCount,
      updateRate
    })
  }

  /**
   * 포메이션 설정
   */
  setFormation(
    type: FormationType,
    spacing: number,
    centerPos: Vector3,
    leaderDroneId?: number
  ): void {
    log.info('VirtualLeaderFormation', 'Setting formation', {
      type,
      spacing,
      centerPos,
      leaderDroneId
    })

    // 가상 리더를 중심 위치로 설정
    this.virtualLeader.position = { ...centerPos }
    this.virtualLeader.timestamp = Date.now()

    // 포메이션 타입에 따라 오프셋 계산
    this.formationOffsets = this.calculateFormationOffsets(
      type,
      spacing,
      this.droneCount,
      leaderDroneId
    )

    // 즉시 모든 드론에 위치 전송
    this.sendAllPositionSetpoints()
  }

  /**
   * 가상 리더 이동
   */
  moveVirtualLeader(
    direction: Direction,
    distance: number,
    speed: number = 2.0  // m/s
  ): void {
    log.info('VirtualLeaderFormation', 'Moving virtual leader', {
      direction,
      distance,
      speed
    })

    // 경로 계획
    const trajectory = this.planLinearTrajectory(
      this.virtualLeader.position,
      direction,
      distance,
      speed
    )

    // 경로 실행
    this.executeTrajectory(trajectory)
  }

  /**
   * 포메이션 회전
   */
  rotateFormation(angleDegrees: number, duration: number = 3.0): void {
    log.info('VirtualLeaderFormation', 'Rotating formation', {
      angleDegrees,
      duration
    })

    // 회전 경로 생성 (가상 리더 yaw 변경)
    const startYaw = this.virtualLeader.yaw
    const endYaw = startYaw + angleDegrees

    const trajectory: TrajectoryWaypoint[] = [
      { t: 0, position: this.virtualLeader.position, yaw: startYaw },
      { t: duration, position: this.virtualLeader.position, yaw: endYaw }
    ]

    this.executeTrajectory(trajectory)
  }

  /**
   * 포메이션 크기 조정
   */
  scaleFormation(scaleFactor: number, duration: number = 2.0): void {
    log.info('VirtualLeaderFormation', 'Scaling formation', {
      scaleFactor,
      duration
    })

    // 모든 오프셋에 스케일 적용
    const newOffsets = new Map<number, FormationOffset>()

    for (const [droneId, offset] of this.formationOffsets) {
      newOffsets.set(droneId, {
        droneId,
        offset: {
          x: offset.offset.x * scaleFactor,
          y: offset.offset.y * scaleFactor,
          z: offset.offset.z * scaleFactor
        },
        relativeYaw: offset.relativeYaw
      })
    }

    // 부드럽게 전환
    const originalOffsets = new Map(this.formationOffsets)
    const startTime = Date.now()

    const scaleInterval = setInterval(() => {
      const elapsed = (Date.now() - startTime) / 1000
      const t = Math.min(elapsed / duration, 1.0)

      // 선형 보간
      for (const [droneId, originalOffset] of originalOffsets) {
        const newOffset = newOffsets.get(droneId)!
        this.formationOffsets.set(droneId, {
          droneId,
          offset: {
            x: this.lerp(originalOffset.offset.x, newOffset.offset.x, t),
            y: this.lerp(originalOffset.offset.y, newOffset.offset.y, t),
            z: this.lerp(originalOffset.offset.z, newOffset.offset.z, t)
          },
          relativeYaw: originalOffset.relativeYaw
        })
      }

      if (t >= 1.0) {
        clearInterval(scaleInterval)
        this.formationOffsets = newOffsets
        log.info('VirtualLeaderFormation', 'Formation scaling complete')
      }
    }, 50)  // 20Hz for smooth scaling
  }

  /**
   * 경로 실행
   */
  private executeTrajectory(trajectory: TrajectoryWaypoint[]): void {
    // 기존 경로 중지
    this.stopTrajectory()

    this.currentTrajectory = trajectory
    this.trajectoryStartTime = Date.now()

    log.info('VirtualLeaderFormation', 'Executing trajectory', {
      waypoints: trajectory.length,
      duration: trajectory[trajectory.length - 1].t
    })

    // 10Hz (또는 설정된 주기)로 업데이트
    this.updateInterval = window.setInterval(() => {
      const elapsed = (Date.now() - this.trajectoryStartTime) / 1000

      if (!this.currentTrajectory) {
        this.stopTrajectory()
        return
      }

      // 경로에서 현재 위치 보간
      const interpolated = this.interpolateTrajectory(this.currentTrajectory, elapsed)

      // 가상 리더 업데이트
      this.virtualLeader.position = interpolated.position
      if (interpolated.yaw !== undefined) {
        this.virtualLeader.yaw = interpolated.yaw
      }
      this.virtualLeader.timestamp = Date.now()

      // 모든 드론에 위치 전송
      this.sendAllPositionSetpoints()

      // 경로 완료 체크
      const totalDuration = this.currentTrajectory[this.currentTrajectory.length - 1].t
      if (elapsed >= totalDuration) {
        log.info('VirtualLeaderFormation', 'Trajectory complete')
        this.stopTrajectory()
      }
    }, 1000 / this.updateRate)
  }

  /**
   * 경로 중지
   */
  private stopTrajectory(): void {
    if (this.updateInterval !== null) {
      clearInterval(this.updateInterval)
      this.updateInterval = null
    }
    this.currentTrajectory = null
  }

  /**
   * 모든 드론에 위치 설정점 전송
   */
  private sendAllPositionSetpoints(): void {
    for (const [droneId, offset] of this.formationOffsets) {
      const targetPos = this.addVector3(this.virtualLeader.position, offset.offset)
      const targetYaw = this.virtualLeader.yaw + offset.relativeYaw

      this.sendPositionCallback(droneId, targetPos, targetYaw).catch(err => {
        log.error('VirtualLeaderFormation', 'Failed to send position setpoint', {
          droneId,
          error: err
        })
      })
    }
  }

  /**
   * 포메이션 오프셋 계산
   */
  private calculateFormationOffsets(
    type: FormationType,
    spacing: number,
    droneCount: number,
    leaderDroneId?: number
  ): Map<number, FormationOffset> {
    const offsets = new Map<number, FormationOffset>()

    switch (type) {
      case 'LINE': {
        // 일렬로 배치 (X축)
        for (let i = 0; i < droneCount; i++) {
          const xOffset = (i - (droneCount - 1) / 2) * spacing
          offsets.set(i, {
            droneId: i,
            offset: { x: xOffset, y: 0, z: 0 },
            relativeYaw: 0
          })
        }
        break
      }

      case 'GRID': {
        // 격자 배치
        const cols = Math.ceil(Math.sqrt(droneCount))
        const rows = Math.ceil(droneCount / cols)

        for (let i = 0; i < droneCount; i++) {
          const row = Math.floor(i / cols)
          const col = i % cols
          const xOffset = (col - (cols - 1) / 2) * spacing
          const yOffset = (row - (rows - 1) / 2) * spacing

          offsets.set(i, {
            droneId: i,
            offset: { x: xOffset, y: yOffset, z: 0 },
            relativeYaw: 0
          })
        }
        break
      }

      case 'CIRCLE': {
        // 원형 배치
        const radius = (droneCount * spacing) / (2 * Math.PI)

        for (let i = 0; i < droneCount; i++) {
          const angle = (i / droneCount) * 2 * Math.PI
          const xOffset = Math.cos(angle) * radius
          const yOffset = Math.sin(angle) * radius

          offsets.set(i, {
            droneId: i,
            offset: { x: xOffset, y: yOffset, z: 0 },
            relativeYaw: (angle * 180) / Math.PI  // Face outward
          })
        }
        break
      }

      case 'V_SHAPE': {
        // V자 포메이션 (리더 드론 앞쪽 중앙)
        const leaderIdx = leaderDroneId !== undefined ? leaderDroneId : 0

        // 리더는 앞쪽 중앙 (0, 0, 0)
        offsets.set(leaderIdx, {
          droneId: leaderIdx,
          offset: { x: 0, y: 0, z: 0 },
          relativeYaw: 0
        })

        // 나머지 드론들을 V자로 배치
        let wingIdx = 0
        for (let i = 0; i < droneCount; i++) {
          if (i === leaderIdx) continue

          wingIdx++
          const side = wingIdx % 2 === 1 ? -1 : 1  // Alternate left/right
          const rowOffset = Math.ceil(wingIdx / 2)

          offsets.set(i, {
            droneId: i,
            offset: {
              x: side * rowOffset * spacing,
              y: -rowOffset * spacing,  // Behind leader
              z: 0
            },
            relativeYaw: side * 15  // Slight angle outward
          })
        }
        break
      }

      case 'TRIANGLE': {
        // 삼각형 포메이션
        const levels = Math.ceil(Math.sqrt(droneCount))
        let droneIdx = 0

        for (let level = 0; level < levels && droneIdx < droneCount; level++) {
          const dronesInLevel = Math.min(level + 1, droneCount - droneIdx)

          for (let pos = 0; pos < dronesInLevel && droneIdx < droneCount; pos++) {
            const xOffset = (pos - dronesInLevel / 2 + 0.5) * spacing
            const yOffset = -level * spacing

            offsets.set(droneIdx, {
              droneId: droneIdx,
              offset: { x: xOffset, y: yOffset, z: 0 },
              relativeYaw: 0
            })

            droneIdx++
          }
        }
        break
      }

      case 'SQUARE': {
        // 사각형 포메이션
        const sideLength = Math.ceil(Math.sqrt(droneCount))
        for (let i = 0; i < droneCount; i++) {
          const row = Math.floor(i / sideLength)
          const col = i % sideLength
          const xOffset = (col - (sideLength - 1) / 2) * spacing
          const yOffset = (row - (sideLength - 1) / 2) * spacing

          offsets.set(i, {
            droneId: i,
            offset: { x: xOffset, y: yOffset, z: 0 },
            relativeYaw: 0
          })
        }
        break
      }

      case 'DIAMOND': {
        // 다이아몬드 포메이션
        const halfCount = Math.floor(droneCount / 2)
        for (let i = 0; i < droneCount; i++) {
          const angle = ((i / droneCount) * 2 * Math.PI) + Math.PI / 4  // 45° offset
          const radius = spacing * 2
          const xOffset = Math.cos(angle) * radius
          const yOffset = Math.sin(angle) * radius

          offsets.set(i, {
            droneId: i,
            offset: { x: xOffset, y: yOffset, z: 0 },
            relativeYaw: 0
          })
        }
        break
      }

      default:
        log.warn('VirtualLeaderFormation', 'Unknown formation type, using LINE', { type })
        return this.calculateFormationOffsets('LINE', spacing, droneCount, leaderDroneId)
    }

    return offsets
  }

  /**
   * 직선 경로 계획
   */
  private planLinearTrajectory(
    startPos: Vector3,
    direction: Direction,
    distance: number,
    speed: number
  ): TrajectoryWaypoint[] {
    // 방향 벡터 계산
    const dirVector = this.directionToVector(direction)

    // 목표 위치
    const endPos = {
      x: startPos.x + dirVector.x * distance,
      y: startPos.y + dirVector.y * distance,
      z: startPos.z + dirVector.z * distance
    }

    // 이동 시간 계산
    const duration = distance / speed

    return [
      { t: 0, position: startPos, velocity: dirVector },
      { t: duration, position: endPos, velocity: dirVector }
    ]
  }

  /**
   * 경로 보간 (3차 베지어 곡선)
   */
  private interpolateTrajectory(
    trajectory: TrajectoryWaypoint[],
    currentTime: number
  ): { position: Vector3; yaw?: number } {
    // 현재 구간 찾기
    for (let i = 0; i < trajectory.length - 1; i++) {
      const start = trajectory[i]
      const end = trajectory[i + 1]

      if (currentTime >= start.t && currentTime <= end.t) {
        // 정규화된 시간 (0-1)
        const t = (currentTime - start.t) / (end.t - start.t)

        // 3차 베지어 곡선으로 부드럽게 보간
        const position = this.cubicBezierInterpolation(start, end, t)

        // Yaw 선형 보간
        let yaw: number | undefined
        if (start.yaw !== undefined && end.yaw !== undefined) {
          yaw = this.lerp(start.yaw, end.yaw, t)
        }

        return { position, yaw }
      }
    }

    // 경로 끝에 도달
    const lastWaypoint = trajectory[trajectory.length - 1]
    return {
      position: lastWaypoint.position,
      yaw: lastWaypoint.yaw
    }
  }

  /**
   * 3차 베지어 곡선 보간
   */
  private cubicBezierInterpolation(
    start: TrajectoryWaypoint,
    end: TrajectoryWaypoint,
    t: number
  ): Vector3 {
    // 제어점 계산 (속도 기반)
    const dt = end.t - start.t
    const p0 = start.position
    const p3 = end.position

    // 속도가 있으면 베지어 곡선, 없으면 선형 보간
    if (start.velocity && end.velocity) {
      const p1 = this.addVector3(p0, this.scaleVector3(start.velocity, dt / 3))
      const p2 = this.subtractVector3(p3, this.scaleVector3(end.velocity, dt / 3))

      // 베지어 곡선: B(t) = (1-t)³P₀ + 3(1-t)²tP₁ + 3(1-t)t²P₂ + t³P₃
      const u = 1 - t
      const tt = t * t
      const uu = u * u
      const uuu = uu * u
      const ttt = tt * t

      return {
        x: uuu * p0.x + 3 * uu * t * p1.x + 3 * u * tt * p2.x + ttt * p3.x,
        y: uuu * p0.y + 3 * uu * t * p1.y + 3 * u * tt * p2.y + ttt * p3.y,
        z: uuu * p0.z + 3 * uu * t * p1.z + 3 * u * tt * p2.z + ttt * p3.z
      }
    } else {
      // 선형 보간
      return {
        x: this.lerp(p0.x, p3.x, t),
        y: this.lerp(p0.y, p3.y, t),
        z: this.lerp(p0.z, p3.z, t)
      }
    }
  }

  /**
   * Direction을 벡터로 변환
   */
  private directionToVector(direction: Direction): Vector3 {
    switch (direction) {
      case 'forward':
        return { x: 0, y: 1, z: 0 }
      case 'backward':
        return { x: 0, y: -1, z: 0 }
      case 'left':
        return { x: -1, y: 0, z: 0 }
      case 'right':
        return { x: 1, y: 0, z: 0 }
      case 'up':
        return { x: 0, y: 0, z: 1 }
      case 'down':
        return { x: 0, y: 0, z: -1 }
      default:
        return { x: 0, y: 0, z: 0 }
    }
  }

  /**
   * 벡터 덧셈
   */
  private addVector3(a: Vector3, b: Vector3): Vector3 {
    return {
      x: a.x + b.x,
      y: a.y + b.y,
      z: a.z + b.z
    }
  }

  /**
   * 벡터 뺄셈
   */
  private subtractVector3(a: Vector3, b: Vector3): Vector3 {
    return {
      x: a.x - b.x,
      y: a.y - b.y,
      z: a.z - b.z
    }
  }

  /**
   * 벡터 스케일
   */
  private scaleVector3(v: Vector3, scale: number): Vector3 {
    return {
      x: v.x * scale,
      y: v.y * scale,
      z: v.z * scale
    }
  }

  /**
   * 선형 보간
   */
  private lerp(a: number, b: number, t: number): number {
    return a + (b - a) * t
  }

  /**
   * 정리 (cleanup)
   */
  cleanup(): void {
    this.stopTrajectory()
    this.formationOffsets.clear()
    log.info('VirtualLeaderFormation', 'Controller cleaned up')
  }

  /**
   * 현재 가상 리더 위치 가져오기
   */
  getVirtualLeaderPosition(): Vector3 {
    return { ...this.virtualLeader.position }
  }

  /**
   * 현재 포메이션 오프셋 가져오기
   */
  getFormationOffsets(): Map<number, FormationOffset> {
    return new Map(this.formationOffsets)
  }
}
