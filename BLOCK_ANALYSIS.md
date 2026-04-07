# 블록별 상세 분석

## 1️⃣ swarm_takeoff_all (모든 드론 이륙)

### 블록 정의 (swarmBlocks.ts:11-23)
```javascript
필드: ALTITUDE (고도)
- 기본값: 2
- 범위: 0-10
- 단위: m
```

### 파서 (blocklyParser.ts:477-483)
```typescript
case 'swarm_takeoff_all':
  return {
    action: CommandAction.TAKEOFF_ALL,
    params: {
      altitude: block.getFieldValue('ALTITUDE') as number  ✅
    }
  }
```

### 실행 (TestConnectionService.ts:183-185)
```typescript
case CommandAction.TAKEOFF_ALL:
  this.simulator.executeTakeoffAll((params as any).altitude || 2)  ✅
```

### DroneSimulator 구현 (DroneSimulator.ts:240-254)
```typescript
executeTakeoffAll(altitude: number = 2): void {
  for (const drone of this.drones.values()) {
    drone.targetPosition = {
      x: drone.position.x,
      y: drone.position.y,
      z: altitude  ✅
    }
    drone.isMoving = true
  }
}
```

**결과**: ✅ 정상 작동


---

## 2️⃣ swarm_land_all (모든 드론 착륙)

### 블록 정의 (swarmBlocks.ts:28-38)
```javascript
필드: 없음
```

### 파서 (blocklyParser.ts:485-489)
```typescript
case 'swarm_land_all':
  return {
    action: CommandAction.LAND_ALL,
    params: {}  ✅
  }
```

### 실행 (TestConnectionService.ts:187-189)
```typescript
case CommandAction.LAND_ALL:
  this.simulator.executeLandAll()  ✅
```

### DroneSimulator 구현 (DroneSimulator.ts:258-272)
```typescript
executeLandAll(): void {
  for (const drone of this.drones.values()) {
    drone.targetPosition = {
      x: drone.position.x,
      y: drone.position.y,
      z: 0  ✅
    }
    drone.isMoving = true
  }
}
```

**결과**: ✅ 정상 작동


---

## 3️⃣ swarm_set_formation (대형 설정)

### 블록 정의 (swarmBlocks.ts:43-70)
```javascript
필드:
- FORMATION_TYPE: grid/line/circle/v_shape/triangle/square/diamond
- ROWS: 행 (기본 2, 범위 1-10)
- COLS: 열 (기본 5, 범위 1-10)
- SPACING: 간격 (기본 2m, 범위 0.5-10)
```

### 파서 (blocklyParser.ts:491-500)
```typescript
case 'swarm_set_formation':
  return {
    action: CommandAction.SET_FORMATION,
    params: {
      type: block.getFieldValue('FORMATION_TYPE') as FormationType,  ✅
      rows: block.getFieldValue('ROWS') as number,  ✅
      cols: block.getFieldValue('COLS') as number,  ✅
      spacing: block.getFieldValue('SPACING') as number  ✅
    }
  }
```

### 실행 (TestConnectionService.ts:191-201)
```typescript
case CommandAction.SET_FORMATION:
  this.simulator.executeSetFormation(
    (params as any).type,      ✅
    {
      rows: (params as any).rows,     ✅
      cols: (params as any).cols,     ✅
      spacing: (params as any).spacing,  ✅
      radius: (params as any).radius,   ❓ (블록에 없음, 하지만 optional)
    }
  )
```

### DroneSimulator 구현 분석

#### ❌ **문제 발견!**

**블록에서 `rows`와 `cols`를 받지만, DroneSimulator는 이 값을 일부 대형에서만 사용!**

```typescript
executeSetFormation(type, options) {
  switch (type) {
    case FormationType.LINE:
      // ❌ rows, cols 무시! droneArray.length만 사용
      droneArray.forEach((drone, i) => {
        drone.targetPosition = {
          x: i * this.formationSpacing,
          y: 0,
          z: centerAltitude,
        }
      })
      break;

    case FormationType.GRID:
      // ✅ cols 사용
      const cols = options.cols || Math.ceil(Math.sqrt(droneArray.length))
      // ❌ rows는 무시!
      break;

    case FormationType.CIRCLE:
      // ❌ rows, cols 무시! radius 사용 (블록에 없음!)
      const radius = options.radius || 5
      break;

    case FormationType.V_SHAPE:
      // ❌ rows, cols 무시!
      break;

    case FormationType.TRIANGLE:
      // ❌ rows, cols 무시!
      break;

    case FormationType.SQUARE:
      // ❌ rows, cols 무시!
      break;

    case FormationType.DIAMOND:
      // ❌ rows, cols 무시!
      break;
  }
}
```

**결과**: ⚠️ **심각한 문제!**
- 블록에서 `rows`와 `cols`를 설정해도 대부분의 대형에서 **무시됨**
- `CIRCLE` 대형은 `radius` 필요하지만 **블록에 없음**
- 사용자가 설정을 바꿔도 대형이 안 바뀌는 이유!


---

## 4️⃣ swarm_move_formation (대형 이동)

### 블록 정의 (swarmBlocks.ts:75-96)
```javascript
필드:
- DIRECTION: forward/backward/left/right/up/down
- DISTANCE: 거리 (기본 3m, 범위 0.5-20)
```

### 파서 (blocklyParser.ts:502-509)
```typescript
case 'swarm_move_formation':
  return {
    action: CommandAction.MOVE_FORMATION,
    params: {
      direction: block.getFieldValue('DIRECTION') as Direction,  ✅
      distance: block.getFieldValue('DISTANCE') as number  ✅
    }
  }
```

### 실행 (TestConnectionService.ts:203-208)
```typescript
case CommandAction.MOVE_FORMATION:
  this.simulator.executeMoveFormation(
    (params as any).direction,  ✅
    (params as any).distance    ✅
  )
```

### DroneSimulator 구현 (DroneSimulator.ts:445-481)
```typescript
executeMoveFormation(direction: Direction, distance: number): void {
  let dx = 0, dy = 0, dz = 0

  switch (direction) {
    case Direction.FORWARD:   dy = distance    break  ✅
    case Direction.BACKWARD:  dy = -distance   break  ✅
    case Direction.LEFT:      dx = -distance   break  ✅
    case Direction.RIGHT:     dx = distance    break  ✅
    case Direction.UP:        dz = distance    break  ✅ (방금 수정)
    case Direction.DOWN:      dz = -distance   break  ✅ (방금 수정)
  }

  for (const drone of this.drones.values()) {
    drone.targetPosition = {
      x: drone.position.x + dx,
      y: drone.position.y + dy,
      z: drone.position.z + dz,
    }
    drone.isMoving = true
  }
}
```

**결과**: ✅ 정상 작동 (방금 수정함)


---

## 5️⃣ swarm_move_drone (개별 드론 이동)

### 블록 정의 (swarmBlocks.ts:102-121)
```javascript
필드:
- DRONE_ID: 드론 번호 (기본 1, 범위 1-10)
- X: X좌표 (기본 0, 범위 -10~10)
- Y: Y좌표 (기본 0, 범위 -10~10)
- Z: Z좌표 (기본 0, 범위 -10~10)
```

### 파서 (blocklyParser.ts:511-520)
```typescript
case 'swarm_move_drone':
  return {
    action: CommandAction.MOVE_DRONE,
    params: {
      droneId: block.getFieldValue('DRONE_ID') as number,  ✅
      x: block.getFieldValue('X') as number,               ✅
      y: block.getFieldValue('Y') as number,               ✅
      z: block.getFieldValue('Z') as number                ✅
    }
  }
```

### 실행 (TestConnectionService.ts:210-217)
```typescript
case CommandAction.MOVE_DRONE:
  this.simulator.executeMoveDrone(
    (params as any).droneId,  ✅
    (params as any).x,        ✅
    (params as any).y,        ✅
    (params as any).z         ✅
  )
```

### DroneSimulator 구현 (DroneSimulator.ts:479-487)
```typescript
executeMoveDrone(droneId: number, x: number, y: number, z: number): void {
  const drone = this.drones.get(droneId)
  if (drone) {
    drone.targetPosition = { x, y, z }  ✅
    drone.isMoving = true
  }
}
```

**결과**: ✅ 정상 작동


---

## 🔍 발견된 문제 요약

### ❌ 치명적 문제: swarm_set_formation
**블록과 구현이 완전히 다름!**

1. **블록에 있지만 사용 안 됨:**
   - `ROWS` (행) - 거의 모든 대형에서 무시
   - `COLS` (열) - GRID 외에는 무시

2. **블록에 없지만 필요함:**
   - `CIRCLE` 대형 → `radius` 필요 (현재 하드코딩: 5m)

3. **영향:**
   - 사용자가 rows/cols 바꿔도 대형이 안 바뀜
   - CIRCLE 크기 조절 불가
   - 대형이 항상 드론 개수에만 의존

### 해결 방법 2가지:

#### 방법 1: 블록 수정 (추천)
- 각 대형별로 필요한 옵션만 보이게
- CIRCLE은 radius 필드 추가
- LINE/V_SHAPE 등은 rows/cols 숨기기

#### 방법 2: DroneSimulator 수정
- rows/cols를 실제로 사용하도록 구현 변경
- CIRCLE에 radius 기본값 계산 로직 추가

어떤 방법으로 고칠까요?
