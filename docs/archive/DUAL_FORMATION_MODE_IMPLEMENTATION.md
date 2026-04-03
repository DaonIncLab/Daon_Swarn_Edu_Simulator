# Dual Formation Mode Implementation

**날짜:** 2025-11-26
**상태:** ✅ 완료
**기능:** GCS 중앙제어 + Virtual Leader 포메이션 모드

---

## 📋 개요

드론 스웜 포메이션 비행을 위한 두 가지 제어 모드 구현:

1. **GCS-Coordinated Mode (기존):** GCS가 각 드론의 위치를 개별 계산
2. **Virtual Leader Mode (신규):** 가상 리더가 이동하고 드론들이 오프셋으로 추종

사용자는 Settings Panel에서 원하는 모드를 선택할 수 있으며, 실시간으로 전환 가능합니다.

---

## 🎯 구현 내용

### 1. VirtualLeaderFormationController 클래스

**파일:** `src/services/execution/VirtualLeaderFormation.ts` (~700 lines)

**주요 기능:**
- Virtual Leader 상태 추적 (위치, 속도, yaw)
- 7가지 포메이션 타입 지원:
  - LINE (일렬)
  - GRID (격자)
  - CIRCLE (원형)
  - V_SHAPE (V자)
  - TRIANGLE (삼각형)
  - SQUARE (사각형)
  - DIAMOND (다이아몬드)
- Cubic Bezier 보간을 사용한 부드러운 궤적 추종
- 10Hz 위치 업데이트 루프
- 포메이션 회전 및 스케일링 지원

**핵심 메서드:**

```typescript
export class VirtualLeaderFormationController {
  // 포메이션 설정
  setFormation(
    type: FormationType,
    spacing: number,
    centerPos: Vector3,
    leaderDroneId?: number
  ): void

  // 가상 리더 이동 (모든 드론이 추종)
  moveVirtualLeader(
    direction: Direction,
    distance: number,
    speed: number = 2.0
  ): void

  // 포메이션 회전
  rotateFormation(angleDegrees: number, duration: number = 3.0): void

  // 포메이션 크기 조절
  scaleFormation(scaleFactor: number, duration: number = 2.0): void

  // 10Hz 업데이트 시작/중지
  start(): void
  stop(): void
}
```

**특징:**
- Position + Velocity + Yaw를 동시에 전송하여 부드러운 동기화 이동
- Cubic Bezier interpolation으로 자연스러운 가속/감속
- Leader drone 지정 가능 (특정 드론을 포메이션 중심에 배치)

---

### 2. MAVLinkConnectionService 통합

**파일:** `src/services/connection/MAVLinkConnectionService.ts`

**추가된 내용:**

#### FormationControlMode Enum
```typescript
export enum FormationControlMode {
  GCS_COORDINATED = 'gcs_coordinated',  // 기존 방식
  VIRTUAL_LEADER = 'virtual_leader',    // 신규 방식
}
```

#### 새로운 필드 및 메서드
```typescript
class MAVLinkConnectionService {
  private formationMode: FormationControlMode = FormationControlMode.GCS_COORDINATED
  private virtualLeaderController: VirtualLeaderFormationController | null = null

  // 모드 설정/조회
  setFormationMode(mode: FormationControlMode): void
  getFormationMode(): FormationControlMode

  // Virtual Leader 컨트롤러 초기화
  private _initializeVirtualLeaderController(): void

  // 포메이션 명령 라우팅
  private async _handleFormationCommand(command: Command): Promise<CommandResponse>
  private async _handleFormationCommandGCS(command: Command): Promise<CommandResponse>
  private async _handleFormationCommandVirtualLeader(command: Command): Promise<CommandResponse>
}
```

**동작 방식:**
1. `_handleFormationCommand()`가 모드를 확인
2. GCS 모드면 `_handleFormationCommandGCS()` 호출 (기존 로직)
3. Virtual Leader 모드면 `_handleFormationCommandVirtualLeader()` 호출 (신규 로직)

---

### 3. MAVLinkConverter 확장

**파일:** `src/services/mavlink/MAVLinkConverter.ts`

**추가된 메서드:**

```typescript
static positionSetpointToMAVLink(
  droneId: number,
  position: { x: number; y: number; z: number },
  velocity: { x: number; y: number; z: number },
  yaw: number
): CommandLongParams
```

**기능:**
- Virtual Leader Controller가 10Hz로 각 드론에게 위치 setpoint 전송
- MAVLink SET_POSITION_TARGET_LOCAL_NED (MSG ID 84) 사용
- Type mask: `0x0FC7` (position + velocity + yaw)

---

### 4. 상태 관리 (Zustand Store)

**파일:** `src/stores/useConnectionStore.ts`

**추가된 상태:**

```typescript
interface ConnectionStore {
  // Formation control settings
  formationMode: FormationControlMode

  // Actions
  setFormationMode: (mode: FormationControlMode) => void
}
```

**초기값:**
```typescript
formationMode: FormationControlMode.GCS_COORDINATED
```

**setFormationMode 동작:**
1. Store 상태 업데이트
2. ConnectionManager를 통해 MAVLinkConnectionService의 `setFormationMode()` 호출
3. 로그 출력

---

### 5. Settings Panel UI

**파일:** `src/components/connection/ConnectionPanel.tsx`

**추가된 UI 컴포넌트:**

MAVLink Simulation Mode 설정 섹션에 Formation Control Mode 선택기 추가:

```tsx
<div>
  <label>Formation Control Mode</label>
  <div className="grid grid-cols-1 gap-2">
    {/* GCS Coordinated Mode */}
    <button onClick={() => setFormationMode(FormationControlMode.GCS_COORDINATED)}>
      🎯 GCS Coordinated
      <p>Each drone receives individual position setpoints</p>
    </button>

    {/* Virtual Leader Mode */}
    <button onClick={() => setFormationMode(FormationControlMode.VIRTUAL_LEADER)}>
      ✨ Virtual Leader
      <p>Smooth synchronized movement with formation offsets</p>
    </button>
  </div>
  <p className="text-xs">
    {formationMode === GCS_COORDINATED
      ? '📍 GCS calculates each drone position independently'
      : '🎯 Virtual point moves, drones follow with offsets'}
  </p>
</div>
```

**디자인:**
- Radio button 스타일 (선택된 모드 시각적 표시)
- GCS 모드: 초록색 테두리
- Virtual Leader 모드: 보라색 테두리
- 설명 텍스트로 각 모드의 특징 명시

---

## 🧪 테스트 방법

### 1. 브라우저에서 애플리케이션 실행

```bash
npm run dev
```

### 2. Settings Panel 열기
- 화면 우측 상단의 ⚙️ 아이콘 클릭

### 3. MAVLink Simulation Mode 선택
- Connection 탭에서 "🚁 MAVLink Simulation" 선택
- Drone 수 선택 (예: 4대)

### 4. Formation Control Mode 선택

**Option A: GCS-Coordinated Mode (기존)**
- "🎯 GCS Coordinated" 버튼 클릭
- Connect 버튼 클릭

**Option B: Virtual Leader Mode (신규)**
- "✨ Virtual Leader" 버튼 클릭
- Connect 버튼 클릭

### 5. 포메이션 비행 테스트

Blockly 블록 추가:
1. "Takeoff All" 블록
2. "Set Formation" 블록 (LINE, spacing: 2m)
3. "Move Formation" 블록 (forward, 5m)
4. "Land All" 블록

**실행 및 관찰:**

#### GCS-Coordinated Mode:
- 각 드론이 개별 waypoint로 이동
- 로그: `[MAVLink] Formation command executed (GCS mode): SET_FORMATION for 4 drones`

#### Virtual Leader Mode:
- 가상 리더가 중심에서 이동
- 모든 드론이 동시에 부드럽게 추종
- 로그: `[MAVLink] Formation set (Virtual Leader): line at (0, 0, 3)`
- 로그: `[MAVLink] Formation moving (Virtual Leader): forward 5m at 2m/s`

---

## 📊 성능 비교

| 특성 | GCS-Coordinated | Virtual Leader |
|-----|-----------------|----------------|
| **명령 빈도** | 명령당 1회 | 10Hz 지속 업데이트 |
| **대역폭** | 낮음 | 중간 (10Hz × 드론 수) |
| **정밀도** | 높음 (각 드론 독립) | 높음 (동기화) |
| **부드러움** | 보통 | 매우 부드러움 (Bezier) |
| **포메이션 유지** | 보통 | 매우 우수 |
| **복잡한 궤적** | 어려움 | 쉬움 (Virtual Leader만 제어) |
| **CPU 사용** | 낮음 | 중간 (10Hz 업데이트) |

---

## 🔧 기술적 세부사항

### Virtual Leader의 Cubic Bezier Interpolation

**목적:** 급격한 속도 변화 없이 부드러운 가속/감속

**구현:**
```typescript
private cubicBezierInterpolation(
  start: TrajectoryWaypoint,
  end: TrajectoryWaypoint,
  t: number // 0.0 ~ 1.0
): Vector3 {
  // Control points calculated from velocity
  const cp1 = add(start.position, scale(start.velocity, 0.3))
  const cp2 = subtract(end.position, scale(end.velocity, 0.3))

  // Cubic Bezier formula: B(t) = (1-t)³P₀ + 3(1-t)²tP₁ + 3(1-t)t²P₂ + t³P₃
  const oneMinusT = 1 - t
  const oneMinusT2 = oneMinusT * oneMinusT
  const oneMinusT3 = oneMinusT2 * oneMinusT
  const t2 = t * t
  const t3 = t2 * t

  return {
    x: oneMinusT3 * start.position.x + 3 * oneMinusT2 * t * cp1.x +
       3 * oneMinusT * t2 * cp2.x + t3 * end.position.x,
    y: /* ... similar ... */,
    z: /* ... similar ... */
  }
}
```

### 10Hz 업데이트 루프

**코드:**
```typescript
private startUpdateLoop(): void {
  const UPDATE_INTERVAL_MS = 1000 / this.updateRate // 100ms for 10Hz

  this.updateInterval = window.setInterval(() => {
    for (const [droneId, offset] of this.formationOffsets) {
      const dronePosition = {
        x: this.virtualLeader.position.x + offset.x,
        y: this.virtualLeader.position.y + offset.y,
        z: this.virtualLeader.position.z + offset.z,
      }

      // Send position setpoint to drone
      this.sendPositionCallback(
        droneId,
        dronePosition,
        this.virtualLeader.velocity,
        this.virtualLeader.yaw
      )
    }
  }, UPDATE_INTERVAL_MS)
}
```

**네트워크 영향:**
- 4대 드론: 40 messages/sec
- 8대 드론: 80 messages/sec
- 각 메시지: ~32 bytes (MAVLink SET_POSITION_TARGET_LOCAL_NED)
- 총 대역폭 (8대): ~2.5 kbps (매우 낮음)

---

## 📝 수정된 파일 목록

### 신규 생성 (1개)
- ✅ `src/services/execution/VirtualLeaderFormation.ts` (~700 lines)

### 수정 (4개)
- ✅ `src/services/connection/MAVLinkConnectionService.ts` (+120 lines)
- ✅ `src/services/mavlink/MAVLinkConverter.ts` (+45 lines)
- ✅ `src/stores/useConnectionStore.ts` (+20 lines)
- ✅ `src/components/connection/ConnectionPanel.tsx` (+60 lines)

### 타입 체크
- ✅ `npm run check:types` 통과

---

## 🎓 핵심 학습 내용

### 1. Virtual Leader 패턴의 장점
- 복잡한 궤적을 단일 리더로만 제어
- 포메이션 전체가 하나의 단위로 움직임
- Bezier 보간으로 부드러운 동기화 이동

### 2. MAVLink SET_POSITION_TARGET_LOCAL_NED
- Position + Velocity + Yaw를 동시 전송
- Type mask로 제어 모드 선택 가능
- 10Hz 업데이트로 실시간 추종

### 3. Formation Offset 계산
- 각 포메이션 타입마다 수학적 패턴 적용
- Leader drone 지정 시 해당 드론이 중심에 위치
- Rotation과 Scaling을 통한 동적 변형

### 4. Dual Mode 아키텍처 설계
- 단일 진입점(`_handleFormationCommand`)에서 라우팅
- 각 모드별 독립적인 구현 유지
- 런타임 모드 전환 지원

---

## 🚀 향후 확장 가능성

### 1. Trajectory Following (선택 사항)
Virtual Leader가 미리 정의된 경로(waypoint sequence)를 따라 이동:
```typescript
executeTrajectory(waypoints: Vector3[], speed: number): void
```

### 2. Dynamic Formation Change (선택 사항)
비행 중 포메이션 타입 변경:
```typescript
transitionFormation(
  newType: FormationType,
  newSpacing: number,
  duration: number
): void
```

### 3. Obstacle Avoidance (선택 사항)
포메이션 전체가 장애물 회피:
```typescript
avoidObstacle(obstaclePosition: Vector3, safeDistance: number): void
```

### 4. Multi-Leader Formation (고급)
여러 Virtual Leader가 협업하여 대규모 스웜 제어

---

## ✅ 완료 체크리스트

- [x] VirtualLeaderFormationController 클래스 구현
- [x] MAVLinkConnectionService에 포메이션 모드 통합
- [x] FormationControlMode 상태 관리 추가
- [x] Settings Panel UI에 모드 선택 추가
- [x] TypeScript 컴파일 통과
- [x] 문서화 완료

---

## 🎉 결론

Dual Formation Mode 구현이 성공적으로 완료되었습니다!

**주요 성과:**
- ✅ 2가지 포메이션 제어 모드 지원
- ✅ 7가지 포메이션 타입 (LINE, GRID, CIRCLE, V_SHAPE, TRIANGLE, SQUARE, DIAMOND)
- ✅ Cubic Bezier 보간을 통한 부드러운 동기화 이동
- ✅ 10Hz 실시간 위치 업데이트
- ✅ Settings Panel에서 쉬운 모드 전환
- ✅ 기존 GCS 모드 완전히 유지 (하위 호환성)

**사용자 경험:**
1. Settings Panel에서 원하는 모드 선택
2. Blockly로 포메이션 명령 작성
3. 선택한 모드에 따라 자동으로 적절한 제어 방식 적용
4. 부드럽고 정밀한 포메이션 비행 실현!

이제 사용자는 상황에 맞게 최적의 포메이션 제어 모드를 선택할 수 있습니다! 🚁✨
