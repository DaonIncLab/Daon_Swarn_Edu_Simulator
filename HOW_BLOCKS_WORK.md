# 🧩 블록 작동 원리 완전 가이드

**작성일**: 2025-11-18

드론 군집 제어 시스템에서 Blockly 블록이 실제 드론 움직임으로 변환되는 전체 과정을 설명합니다.

---

## 📚 목차

1. [전체 흐름 개요](#전체-흐름-개요)
2. [단계 1: 블록 정의](#단계-1-블록-정의)
3. [단계 2: 사용자 인터랙션](#단계-2-사용자-인터랙션)
4. [단계 3: 파싱 (AST 변환)](#단계-3-파싱-ast-변환)
5. [단계 4: 실행 (인터프리터)](#단계-4-실행-인터프리터)
6. [단계 5: 명령 전송](#단계-5-명령-전송)
7. [단계 6: 시뮬레이션](#단계-6-시뮬레이션)
8. [단계 7: 시각화](#단계-7-시각화)
9. [실제 예시: 원형 대형 설정](#실제-예시-원형-대형-설정)
10. [디자인 패턴 분석](#디자인-패턴-분석)

---

## 🌊 전체 흐름 개요

```
┌──────────────────────────────────────────────────────────────────────┐
│                        사용자 액션                                      │
│                          ↓                                            │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │ 1. Blockly Workspace에서 블록 드래그 & 드롭                    │    │
│  │    예: "모든 드론 이륙" + "대형 설정 원형"                       │    │
│  └──────────────────────┬──────────────────────────────────────┘    │
│                         ↓                                            │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │ 2. 실행 버튼 클릭                                              │    │
│  │    → ExecutionStore.executeBlocks() 호출                      │    │
│  └──────────────────────┬──────────────────────────────────────┘    │
│                         ↓                                            │
└─────────────────────────┼────────────────────────────────────────────┘
                          │
        ┌─────────────────▼─────────────────┐
        │   3. PARSING (구문 분석)           │
        │   blocklyParser.ts                │
        │                                   │
        │   Blockly XML/Blocks              │
        │         ↓                         │
        │   ExecutableNode 트리              │
        └─────────────────┬─────────────────┘
                          │
        ┌─────────────────▼─────────────────┐
        │   4. EXECUTION (실행)              │
        │   interpreter.ts                  │
        │                                   │
        │   ExecutableNode 트리 순회         │
        │   각 노드 타입별 실행              │
        │         ↓                         │
        │   Command 객체 생성                │
        └─────────────────┬─────────────────┘
                          │
        ┌─────────────────▼─────────────────┐
        │   5. COMMAND DISPATCH              │
        │   ConnectionService               │
        │                                   │
        │   Strategy 패턴으로 모드 선택:      │
        │   - TestConnectionService         │
        │   - UnityWebGLConnectionService   │
        │   - MAVLinkConnectionService      │
        └─────────────────┬─────────────────┘
                          │
        ┌─────────────────▼─────────────────┐
        │   6. SIMULATION                   │
        │   DroneSimulator.ts               │
        │                                   │
        │   명령에 따라 드론 상태 업데이트:    │
        │   - position 계산                  │
        │   - targetPosition 설정            │
        │   - isMoving 플래그 설정            │
        │         ↓                         │
        │   텔레메트리 메시지 생성 (100ms)    │
        └─────────────────┬─────────────────┘
                          │
        ┌─────────────────▼─────────────────┐
        │   7. STATE MANAGEMENT              │
        │   ExecutionStore                  │
        │                                   │
        │   텔레메트리 메시지 수신            │
        │         ↓                         │
        │   drones 배열 업데이트              │
        │   (Zustand store)                 │
        └─────────────────┬─────────────────┘
                          │
        ┌─────────────────▼─────────────────┐
        │   8. VISUALIZATION                │
        │   Drone3DView.tsx                 │
        │                                   │
        │   React Three Fiber               │
        │   useExecutionStore 구독           │
        │         ↓                         │
        │   Three.js 3D 렌더링 (60 FPS)     │
        └───────────────────────────────────┘
```

---

## 📦 단계 1: 블록 정의

**파일**: `src/components/blockly/blocks/swarmBlocks.ts`

### 블록 정의 예시: "모든 드론 이륙"

```typescript
Blockly.Blocks['swarm_takeoff_all'] = {
  init: function() {
    // 블록 UI 구성
    this.appendDummyInput()
      .appendField('🚁 모든 드론 이륙')           // 라벨
      .appendField('고도(m)')                     // 필드 라벨
      .appendField(
        new Blockly.FieldNumber(2, 0, 10, 0.5),  // 숫자 입력 (기본값: 2, 최소: 0, 최대: 10, 단계: 0.5)
        'ALTITUDE'                               // 필드 이름
      )

    // 블록 연결 규칙
    this.setPreviousStatement(true, null)  // 위쪽에 다른 블록 연결 가능
    this.setNextStatement(true, null)      // 아래쪽에 다른 블록 연결 가능

    // 블록 스타일
    this.setColour(230)                    // 파란색 (HSV 기준)
    this.setTooltip('모든 드론을 지정된 고도로 이륙시킵니다')
    this.setHelpUrl('')
  }
}
```

### 블록 타입 분류

#### Statement Blocks (실행 블록)
- **연결**: 위/아래로 다른 블록과 연결
- **예시**: 이륙, 착륙, 대기, 반복문
- **메서드**: `setPreviousStatement()`, `setNextStatement()`

#### Value Blocks (값 블록)
- **연결**: 다른 블록의 입력으로 연결
- **예시**: 센서 값, 변수, 수식
- **메서드**: `setOutput()`

```typescript
// Value Block 예시: 배터리 센서
Blockly.Blocks['sensor_battery'] = {
  init: function() {
    this.appendDummyInput()
      .appendField('🔋 드론')
      .appendField(new Blockly.FieldNumber(1, 1, 10, 1), 'DRONE_ID')
      .appendField('배터리')

    this.setOutput(true, 'Number')  // 숫자 값 출력
    this.setColour(120)
  }
}
```

---

## 🖱️ 단계 2: 사용자 인터랙션

**파일**: `src/components/blockly/BlocklyWorkspace.tsx`

### 워크스페이스 초기화

```typescript
useEffect(() => {
  if (!blocklyDivRef.current) return

  // Blockly 워크스페이스 생성
  const workspace = Blockly.inject(blocklyDivRef.current, {
    toolbox: toolboxConfig,      // 좌측 툴박스 (블록 팔레트)
    theme: customTheme,           // 커스텀 테마
    grid: {                       // 그리드 설정
      spacing: 20,
      length: 3,
      colour: '#ccc',
      snap: true
    },
    zoom: {                       // 줌 설정
      controls: true,
      wheel: true,
      startScale: 1.0,
      maxScale: 3,
      minScale: 0.3
    }
  })

  workspaceRef.current = workspace
}, [])
```

### 사용자 액션 처리

```typescript
// 실행 버튼 클릭
const handleExecute = () => {
  const workspace = workspaceRef.current
  if (!workspace) return

  // 1. 워크스페이스에서 모든 블록 가져오기
  const allBlocks = workspace.getAllBlocks(false)
  console.log(`총 ${allBlocks.length}개 블록`)

  // 2. ExecutionStore의 실행 함수 호출
  executeBlocks(workspace)
}
```

### Blockly Workspace 구조

```
Workspace
  ├─ Block 1: swarm_takeoff_all
  │    └─ Field: ALTITUDE = 2
  │
  ├─ Block 2: swarm_set_formation
  │    ├─ Field: FORMATION_TYPE = "circle"
  │    ├─ Field: SPACING = 2
  │    └─ Field: RADIUS = 5
  │
  └─ Block 3: swarm_land_all
```

---

## 🔄 단계 3: 파싱 (AST 변환)

**파일**: `src/services/execution/blocklyParser.ts`

### 파싱 과정

```typescript
export function parseBlocklyWorkspace(workspace: Blockly.Workspace): ExecutableNode | null {
  // 1. 최상위 블록들 가져오기 (연결되지 않은 블록 체인의 시작점)
  const topBlocks = workspace.getTopBlocks(true)

  if (topBlocks.length === 0) {
    return null
  }

  // 2. 각 최상위 블록 파싱
  const children: ExecutableNode[] = []
  for (const block of topBlocks) {
    const parsed = parseBlock(block)
    if (parsed) {
      children.push(parsed)
    }
  }

  // 3. 여러 블록 체인을 하나의 시퀀스로 묶기
  if (children.length === 1) {
    return children[0]
  }

  return {
    id: generateNodeId(),
    type: 'sequence',
    children: children
  }
}
```

### 블록 체인 파싱

```typescript
function parseBlock(block: Blockly.Block): ExecutableNode | null {
  const sequence: ExecutableNode[] = []
  let currentBlock: Blockly.Block | null = block

  // 블록 체인을 순회 (getNextBlock()로 연결된 블록 탐색)
  while (currentBlock) {
    const node = parseSingleBlock(currentBlock)
    if (node) {
      sequence.push(node)
    }
    currentBlock = currentBlock.getNextBlock()
  }

  // 시퀀스 노드로 반환
  if (sequence.length === 1) {
    return sequence[0]
  }

  return {
    id: generateNodeId(),
    type: 'sequence',
    children: sequence
  }
}
```

### 단일 블록 파싱

```typescript
function parseSingleBlock(block: Blockly.Block): ExecutableNode | null {
  const type = block.type

  // 제어 흐름 블록
  if (type === 'controls_repeat') {
    return parseRepeatBlock(block)
  }

  if (type === 'controls_for') {
    return parseForLoopBlock(block)
  }

  // 드론 명령 블록
  if (type.startsWith('swarm_')) {
    return parseCommandBlock(block)
  }

  // ...
}
```

### Command 노드 생성 예시

```typescript
function parseCommandBlock(block: Blockly.Block): CommandNode | null {
  const command = blockToCommand(block)
  if (!command) return null

  return {
    id: generateNodeId(),
    type: 'command',
    command: command
  }
}

function blockToCommand(block: Blockly.Block): Command | null {
  switch (block.type) {
    case 'swarm_takeoff_all':
      return {
        action: CommandAction.TAKEOFF_ALL,
        params: {
          altitude: block.getFieldValue('ALTITUDE') as number
        }
      }

    case 'swarm_set_formation':
      return {
        action: CommandAction.SET_FORMATION,
        params: {
          type: block.getFieldValue('FORMATION_TYPE') as FormationType,
          rows: block.getFieldValue('ROWS') as number,
          cols: block.getFieldValue('COLS') as number,
          spacing: block.getFieldValue('SPACING') as number
        }
      }

    // ...
  }
}
```

### 생성된 AST (추상 구문 트리)

```typescript
// 입력: 3개 블록 (이륙 → 대형 설정 → 착륙)
// 출력:
{
  id: 'node_1',
  type: 'sequence',
  children: [
    {
      id: 'node_2',
      type: 'command',
      command: {
        action: 'takeoff_all',
        params: { altitude: 2 }
      }
    },
    {
      id: 'node_3',
      type: 'command',
      command: {
        action: 'set_formation',
        params: {
          type: 'circle',
          rows: 2,
          cols: 2,
          spacing: 2
        }
      }
    },
    {
      id: 'node_4',
      type: 'command',
      command: {
        action: 'land_all',
        params: {}
      }
    }
  ]
}
```

---

## ⚡ 단계 4: 실행 (인터프리터)

**파일**: `src/services/execution/interpreter.ts`

### 인터프리터 초기화

```typescript
export class Interpreter {
  private connectionService: IConnectionService
  private state: ExecutionState
  private shouldStop: boolean = false
  private isPaused: boolean = false

  constructor(connectionService: IConnectionService) {
    this.connectionService = connectionService
    this.state = {
      status: 'idle',
      currentNodeId: null,
      currentNodePath: [],
      error: null,
      context: {
        variables: new Map(),      // 변수 저장소
        functions: new Map(),       // 함수 저장소
        callStack: [],             // 함수 호출 스택
      }
    }
  }
}
```

### 트리 실행

```typescript
async execute(tree: ExecutableNode): Promise<ExecutionResult> {
  log.info('Interpreter', 'Starting execution', tree)

  // 1. 초기 상태 설정
  this.shouldStop = false
  this.isPaused = false
  this.updateState({
    status: 'running',
    currentNodeId: null,
    currentNodePath: [],
    error: null,
    context: {
      variables: new Map(),
      functions: new Map(),
      callStack: [],
      executionStartTime: Date.now()
    }
  })

  let executedNodes = 0

  try {
    // 2. 노드 재귀 실행
    executedNodes = await this.executeNode(tree, [0])

    // 3. 완료 상태 설정
    if (this.shouldStop) {
      this.updateState({ status: 'idle' })
      return { success: false, error: 'Execution stopped by user', executedNodes }
    }

    this.updateState({ status: 'completed', currentNodeId: null })
    return { success: true, executedNodes }
  } catch (error) {
    // 4. 에러 처리
    const errorMsg = error instanceof Error ? error.message : 'Unknown error'
    log.error('Interpreter', 'Execution error:', error)
    this.updateState({ status: 'error', error: errorMsg })
    return { success: false, error: errorMsg, executedNodes }
  }
}
```

### 노드 타입별 실행

```typescript
private async executeNode(node: ExecutableNode, path: number[]): Promise<number> {
  // 중단 신호 확인
  if (this.shouldStop) {
    return 0
  }

  // 일시정지 확인
  await this.checkPause()

  // 현재 노드 업데이트
  this.updateState({ currentNodeId: node.id, currentNodePath: path })

  log.debug('Interpreter', `Executing node ${node.id} (type: ${node.type})`)

  let executedCount = 1

  // 노드 타입에 따른 분기
  switch (node.type) {
    case 'command':
      await this.executeCommand(node)
      break

    case 'sequence':
      executedCount = await this.executeSequence(node, path)
      break

    case 'repeat':
      executedCount = await this.executeRepeat(node, path)
      break

    case 'for_loop':
      executedCount = await this.executeForLoop(node, path)
      break

    case 'if':
      executedCount = await this.executeIf(node, path)
      break

    case 'wait':
      await this.executeWait(node)
      break

    // ...
  }

  return executedCount
}
```

### Command 노드 실행

```typescript
private async executeCommand(node: CommandNode): Promise<void> {
  log.debug('Interpreter', 'Executing command:', node.command.action)

  // 1. ConnectionService를 통해 명령 전송
  const response: CommandResponse = await this.connectionService.sendCommand(node.command)

  // 2. 응답 확인
  if (!response.success) {
    throw new Error(`Command failed: ${response.error || 'Unknown error'}`)
  }

  // 3. 명령 완료 대기 (시뮬레이션)
  await this.delay(100)
}
```

### Sequence 노드 실행

```typescript
private async executeSequence(node: SequenceNode, path: number[]): Promise<number> {
  let totalExecuted = 0

  // 자식 노드들을 순차적으로 실행
  for (let i = 0; i < node.children.length; i++) {
    if (this.shouldStop) break

    const child = node.children[i]
    const childPath = [...path, i]  // 경로 추적
    const executed = await this.executeNode(child, childPath)
    totalExecuted += executed
  }

  return totalExecuted
}
```

### Repeat 노드 실행

```typescript
private async executeRepeat(node: RepeatNode, path: number[]): Promise<number> {
  log.debug('Interpreter', `Repeating ${node.times} times`)

  let totalExecuted = 0

  for (let i = 0; i < node.times; i++) {
    if (this.shouldStop) break

    log.debug('Interpreter', `Repeat iteration ${i + 1}/${node.times}`)

    // 컨텍스트에 반복 횟수 저장
    const oldRepeatCount = this.state.context.currentRepeatCount
    this.state.context.currentRepeatCount = i + 1

    const childPath = [...path, i]
    const executed = await this.executeNode(node.body, childPath)
    totalExecuted += executed

    // 복원
    this.state.context.currentRepeatCount = oldRepeatCount
  }

  return totalExecuted
}
```

### If 노드 실행

```typescript
private async executeIf(node: IfNode, path: number[]): Promise<number> {
  log.debug('Interpreter', `Evaluating condition: ${node.condition}`)

  // 1. 조건 평가 (conditionEvaluator 사용)
  const conditionResult = evaluateCondition(
    node.condition,
    this.droneStates,
    this.state.context
  )

  if (conditionResult.error) {
    log.warn('Interpreter', 'Condition evaluation error:', conditionResult.error)
  }

  log.debug('Interpreter', `Condition result: ${conditionResult.result}`)

  // 2. 조건이 참이면 then 브랜치 실행
  if (conditionResult.result) {
    const childPath = [...path, 0]
    return await this.executeNode(node.thenBranch, childPath)
  }

  return 0
}
```

---

## 📡 단계 5: 명령 전송

**파일**: `src/services/connection/ConnectionManager.ts`

### Strategy 패턴으로 모드 전환

```typescript
export class ConnectionManager {
  private currentService: IConnectionService | null = null
  private mode: ConnectionMode = ConnectionMode.TEST

  connect(mode: ConnectionMode, config?: ConnectionConfig): void {
    this.disconnect()

    // 모드에 따라 적절한 ConnectionService 선택
    switch (mode) {
      case ConnectionMode.TEST:
        this.currentService = new TestConnectionService()
        break

      case ConnectionMode.WEBSOCKET:
        this.currentService = new WebSocketConnectionService()
        break

      case ConnectionMode.UNITY_WEBGL:
        this.currentService = new UnityWebGLConnectionService()
        break

      case ConnectionMode.MAVLINK_SIM:
        this.currentService = new MAVLinkConnectionService()
        break

      case ConnectionMode.REAL_DRONE:
        this.currentService = new RealDroneConnectionService()
        break
    }

    this.mode = mode
    this.currentService?.connect(config)
  }

  async sendCommand(command: Command): Promise<CommandResponse> {
    if (!this.currentService) {
      return { success: false, error: 'Not connected' }
    }

    return this.currentService.sendCommand(command)
  }
}
```

### TestConnectionService 예시

**파일**: `src/services/connection/TestConnectionService.ts`

```typescript
export class TestConnectionService implements IConnectionService {
  private droneSimulator: DroneSimulator
  private messageListener: ((message: WSMessage) => void) | null = null

  constructor() {
    this.droneSimulator = new DroneSimulator(4) // 4대 드론
  }

  connect(): void {
    // 1. 시뮬레이터 시작
    this.droneSimulator.start()

    // 2. 텔레메트리 전송 (100ms 간격)
    this.droneSimulator.onTelemetryUpdate = (telemetry) => {
      if (this.messageListener) {
        this.messageListener({
          type: MessageType.TELEMETRY,
          data: telemetry
        })
      }
    }
  }

  async sendCommand(command: Command): Promise<CommandResponse> {
    log.info('TestConnectionService', 'Command received:', command.action)

    try {
      // 명령을 시뮬레이터로 전달
      this._executeCommand(command)

      return { success: true }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error'
      log.error('TestConnectionService', 'Command failed:', errorMsg)
      return { success: false, error: errorMsg }
    }
  }

  private _executeCommand(command: Command): void {
    switch (command.action) {
      case CommandAction.TAKEOFF_ALL:
        this.droneSimulator.executeTakeoff(command.params.altitude)
        break

      case CommandAction.LAND_ALL:
        this.droneSimulator.executeLand()
        break

      case CommandAction.SET_FORMATION:
        this.droneSimulator.executeSetFormation(
          command.params.type,
          {
            rows: command.params.rows,
            cols: command.params.cols,
            spacing: command.params.spacing,
            radius: command.params.radius
          }
        )
        break

      case CommandAction.MOVE_FORMATION:
        this.droneSimulator.executeMoveFormation(
          command.params.direction,
          command.params.distance
        )
        break

      // ...
    }
  }
}
```

---

## 🎮 단계 6: 시뮬레이션

**파일**: `src/services/connection/DroneSimulator.ts`

### DroneSimulator 구조

```typescript
export class DroneSimulator {
  private drones: Map<number, SimulatedDrone>  // 드론 맵
  private updateInterval: number | null = null  // 업데이트 타이머
  private formationType: FormationType = FormationType.LINE
  private formationSpacing: number = 2

  onTelemetryUpdate: ((telemetry: DroneState[]) => void) | null = null

  constructor(droneCount: number = 4) {
    this.droneCount = droneCount
    this.reset()
  }

  start(): void {
    // 100ms마다 드론 상태 업데이트 (10Hz)
    this.updateInterval = window.setInterval(() => {
      this.updateDrones()
    }, 100)
  }

  stop(): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval)
      this.updateInterval = null
    }
  }
}
```

### 드론 상태 업데이트

```typescript
private updateDrones(): void {
  const telemetry: DroneState[] = []

  this.drones.forEach((drone) => {
    // 1. 목표 위치로 이동
    if (drone.isMoving && drone.targetPosition) {
      const dx = drone.targetPosition.x - drone.position.x
      const dy = drone.targetPosition.y - drone.position.y
      const dz = drone.targetPosition.z - drone.position.z
      const distance = Math.sqrt(dx * dx + dy * dy + dz * dz)

      if (distance > 0.1) {
        // 목표까지 이동 (속도: 1 m/s)
        const speed = 1.0  // m/s
        const dt = 0.1     // 100ms = 0.1초
        const maxDist = speed * dt  // 최대 이동 거리

        const moveRatio = Math.min(maxDist / distance, 1)

        drone.position.x += dx * moveRatio
        drone.position.y += dy * moveRatio
        drone.position.z += dz * moveRatio

        // 속도 계산
        drone.velocity.x = dx * moveRatio / dt
        drone.velocity.y = dy * moveRatio / dt
        drone.velocity.z = dz * moveRatio / dt
      } else {
        // 목표 도착
        drone.position = { ...drone.targetPosition }
        drone.velocity = { x: 0, y: 0, z: 0 }
        drone.isMoving = false
      }
    }

    // 2. 배터리 소모 (비행 중일 때)
    if (drone.position.z > 0.1) {
      drone.battery = Math.max(0, drone.battery - 0.01)  // 0.01% 감소
    }

    // 3. 텔레메트리 메시지 생성
    telemetry.push({
      id: drone.id,
      position: { ...drone.position },
      velocity: { ...drone.velocity },
      battery: drone.battery,
      status: this.getDroneStatus(drone),
      timestamp: Date.now()
    })
  })

  // 4. 텔레메트리 전송
  if (this.onTelemetryUpdate) {
    this.onTelemetryUpdate(telemetry)
  }
}
```

### 이륙 명령 실행

```typescript
executeTakeoff(altitude: number): void {
  log.info('DroneSimulator', `Takeoff all to ${altitude}m`)

  this.drones.forEach((drone) => {
    // 목표 위치 설정 (현재 X, Y 유지, Z만 변경)
    drone.targetPosition = {
      x: drone.position.x,
      y: drone.position.y,
      z: altitude
    }
    drone.isMoving = true
    drone.status = 'flying'

    log.debug('DroneSimulator',
      `Drone ${drone.id}: target set to (${drone.targetPosition.x}, ${drone.targetPosition.y}, ${drone.targetPosition.z})`
    )
  })
}
```

### 대형 설정 명령 실행

```typescript
executeSetFormation(
  type: FormationType,
  options: { rows?: number; cols?: number; spacing?: number; radius?: number } = {}
): void {
  log.info('DroneSimulator', `🔷 Set formation: ${type}`, options)

  this.formationType = type
  this.formationSpacing = options.spacing || 2

  const droneArray = Array.from(this.drones.values())
  const centerAltitude = droneArray[0]?.position.z || 2

  log.debug('DroneSimulator',
    `Formation center altitude: ${centerAltitude}m (from drone 0 z=${droneArray[0]?.position.z})`
  )
  log.debug('DroneSimulator',
    `Formation spacing: ${this.formationSpacing}m, drone count: ${droneArray.length}`
  )

  switch (type) {
    case FormationType.LINE:
      // 일렬 대형: X축으로 간격을 두고 배치
      droneArray.forEach((drone, i) => {
        drone.targetPosition = {
          x: i * this.formationSpacing,
          y: 0,
          z: centerAltitude
        }
        drone.isMoving = true

        log.debug('DroneSimulator',
          `  Drone ${drone.id}: (${drone.position.x.toFixed(1)}, ${drone.position.y.toFixed(1)}, ${drone.position.z.toFixed(1)}) → target (${drone.targetPosition.x.toFixed(1)}, ${drone.targetPosition.y.toFixed(1)}, ${drone.targetPosition.z.toFixed(1)})`
        )
      })
      break

    case FormationType.CIRCLE:
      // 원형 대형: 반지름 r의 원 위에 균등 배치
      const radius = options.radius || 5
      const angleStep = (2 * Math.PI) / droneArray.length

      log.debug('DroneSimulator',
        `Circle formation: radius ${radius}m, angle step ${(angleStep * 180 / Math.PI).toFixed(1)}°`
      )

      droneArray.forEach((drone, i) => {
        const angle = i * angleStep
        drone.targetPosition = {
          x: Math.cos(angle) * radius,
          y: Math.sin(angle) * radius,
          z: centerAltitude
        }
        drone.isMoving = true

        log.debug('DroneSimulator',
          `  Drone ${drone.id}: angle ${(angle * 180 / Math.PI).toFixed(1)}° → target (${drone.targetPosition.x.toFixed(1)}, ${drone.targetPosition.y.toFixed(1)}, ${drone.targetPosition.z.toFixed(1)})`
        )
      })
      break

    case FormationType.V_SHAPE:
      // V자 대형: 선두 1대 + 좌우 날개
      const spacing = this.formationSpacing

      log.debug('DroneSimulator', `V-Shape formation: spacing ${spacing}m`)

      droneArray.forEach((drone, i) => {
        if (i === 0) {
          // 선두 (리더)
          drone.targetPosition = { x: 0, y: 0, z: centerAltitude }
          log.debug('DroneSimulator',
            `  Drone ${drone.id}: leader → target (0.0, 0.0, ${centerAltitude.toFixed(1)})`
          )
        } else {
          // 좌우 날개
          const side = i % 2 === 0 ? 1 : -1  // 짝수는 오른쪽, 홀수는 왼쪽
          const offset = Math.ceil(i / 2)
          drone.targetPosition = {
            x: side * offset * spacing,
            y: -offset * spacing,
            z: centerAltitude
          }
          log.debug('DroneSimulator',
            `  Drone ${drone.id}: ${side > 0 ? 'right' : 'left'} wing, offset ${offset} → target (${drone.targetPosition.x.toFixed(1)}, ${drone.targetPosition.y.toFixed(1)}, ${drone.targetPosition.z.toFixed(1)})`
          )
        }
        drone.isMoving = true
      })
      break

    // GRID, TRIANGLE, SQUARE, DIAMOND 생략...
  }
}
```

---

## 🗄️ 단계 7: 상태 관리 및 시각화

### ExecutionStore (상태 관리)

**파일**: `src/stores/useExecutionStore.ts`

```typescript
interface ExecutionStore {
  drones: DroneState[]

  handleMessage(message: WSMessage): void
}

const handleMessage = (message: WSMessage) => {
  if (message.type === MessageType.TELEMETRY) {
    const telemetry = message.data as DroneState[]

    // 기존 드론 데이터와 병합
    const droneMap = new Map<number, DroneState>()

    get().drones.forEach(d => droneMap.set(d.id, d))
    telemetry.forEach(d => droneMap.set(d.id, d))

    const newDrones = Array.from(droneMap.values()).sort((a, b) => a.id - b.id)

    // Zustand 스토어 업데이트
    set({ drones: newDrones })

    // 텔레메트리 히스토리에 추가
    useTelemetryStore.getState().addTelemetry(telemetry)
  }
}
```

### Drone3DView (Three.js 렌더링)

**파일**: `src/components/visualization/Drone3DView.tsx`

```typescript
export function Drone3DView({ playbackMode = false }: Drone3DViewProps) {
  // Zustand 스토어 구독 (drones 배열만 선택적 구독)
  const drones = useExecutionStore((state) => state.drones)

  return (
    <Canvas camera={{ position: [15, 15, 15], fov: 50 }}>
      <ambientLight intensity={0.5} />
      <directionalLight position={[10, 10, 5]} />

      {/* 그리드 */}
      <Grid />

      {/* 드론 렌더링 */}
      {drones.map((drone) => (
        <Drone3DModel
          key={drone.id}
          drone={drone}
          onClick={() => setSelectedDrone(drone)}
        />
      ))}

      {/* 카메라 컨트롤 */}
      <OrbitControls />
    </Canvas>
  )
}
```

### Drone3DModel 컴포넌트

```typescript
function Drone3DModel({ drone, onClick }: Drone3DModelProps) {
  const meshRef = useRef<THREE.Mesh>(null)

  // 매 프레임 위치 업데이트 (60 FPS)
  useFrame(() => {
    if (meshRef.current) {
      // Three.js는 Y축이 위, Blockly는 Z축이 위
      // 좌표 변환: (x, y, z) → (x, z, -y)
      meshRef.current.position.set(
        drone.position.x,
        drone.position.z,
        -drone.position.y
      )
    }
  })

  return (
    <group>
      {/* 드론 본체 (원뿔 형태) */}
      <mesh ref={meshRef} onClick={onClick}>
        <coneGeometry args={[0.3, 0.8, 4]} />
        <meshStandardMaterial
          color={getDroneColor(drone.battery)}
          emissive={0x222222}
        />
      </mesh>

      {/* 지면 그림자 */}
      <mesh position={[drone.position.x, 0.01, -drone.position.y]}>
        <circleGeometry args={[0.5, 32]} />
        <meshBasicMaterial
          color="#000000"
          opacity={0.3}
          transparent
        />
      </mesh>

      {/* 드론 ID 라벨 */}
      <Html position={[drone.position.x, drone.position.z + 1, -drone.position.y]}>
        <div className="drone-label">
          Drone {drone.id}
        </div>
      </Html>
    </group>
  )
}
```

---

## 🎯 실제 예시: 원형 대형 설정

### 사용자 액션
```
1. Blockly에서 "모든 드론 이륙 (고도: 3m)" 블록 추가
2. "대형 설정 (원형, 반지름: 5m)" 블록 추가
3. 실행 버튼 클릭
```

### 전체 흐름

#### 1단계: Blockly Workspace
```xml
<block type="swarm_takeoff_all">
  <field name="ALTITUDE">3</field>
  <next>
    <block type="swarm_set_formation">
      <field name="FORMATION_TYPE">circle</field>
      <field name="SPACING">2</field>
    </block>
  </next>
</block>
```

#### 2단계: 파싱 결과 (AST)
```typescript
{
  id: 'node_1',
  type: 'sequence',
  children: [
    {
      id: 'node_2',
      type: 'command',
      command: {
        action: 'takeoff_all',
        params: { altitude: 3 }
      }
    },
    {
      id: 'node_3',
      type: 'command',
      command: {
        action: 'set_formation',
        params: {
          type: 'circle',
          spacing: 2
        }
      }
    }
  ]
}
```

#### 3단계: 실행 로그
```
[Interpreter] Starting execution
[Interpreter] Executing node node_1 (type: sequence)
[Interpreter] Executing node node_2 (type: command)
[Interpreter] Executing command: takeoff_all
[TestConnectionService] Command received: takeoff_all
[DroneSimulator] Takeoff all to 3m
[DroneSimulator]   Drone 0: target set to (0.0, 0.0, 3.0)
[DroneSimulator]   Drone 1: target set to (2.0, 0.0, 3.0)
[DroneSimulator]   Drone 2: target set to (4.0, 0.0, 3.0)
[DroneSimulator]   Drone 3: target set to (6.0, 0.0, 3.0)

[Interpreter] Executing node node_3 (type: command)
[Interpreter] Executing command: set_formation
[TestConnectionService] Command received: set_formation
[DroneSimulator] 🔷 Set formation: circle { radius: 5, spacing: 2 }
[DroneSimulator] Formation center altitude: 3m (from drone 0 z=3)
[DroneSimulator] Formation spacing: 2m, drone count: 4
[DroneSimulator] Circle formation: radius 5m, angle step 90.0°
[DroneSimulator]   Drone 0: angle 0.0° → target (5.0, 0.0, 3.0)
[DroneSimulator]   Drone 1: angle 90.0° → target (0.0, 5.0, 3.0)
[DroneSimulator]   Drone 2: angle 180.0° → target (-5.0, 0.0, 3.0)
[DroneSimulator]   Drone 3: angle 270.0° → target (0.0, -5.0, 3.0)

[Interpreter] Execution completed successfully
```

#### 4단계: 시뮬레이터 업데이트 (100ms마다)
```
t=0ms:
  Drone 0: (0, 0, 0) → moving to (5, 0, 3)
  Drone 1: (2, 0, 0) → moving to (0, 5, 3)
  Drone 2: (4, 0, 0) → moving to (-5, 0, 3)
  Drone 3: (6, 0, 0) → moving to (0, -5, 3)

t=100ms:
  Drone 0: (0.1, 0, 0.06) → still moving
  Drone 1: (1.98, 0.1, 0.06) → still moving
  ...

t=5000ms:
  Drone 0: (5, 0, 3) → arrived ✅
  Drone 1: (0, 5, 3) → arrived ✅
  Drone 2: (-5, 0, 3) → arrived ✅
  Drone 3: (0, -5, 3) → arrived ✅
```

#### 5단계: Three.js 렌더링 (60 FPS)
```
Frame 1:
  Drone 0 mesh position: (0, 0, 0)
  Drone 1 mesh position: (2, 0, 0)
  Drone 2 mesh position: (4, 0, 0)
  Drone 3 mesh position: (6, 0, 0)

Frame 60 (1초 후):
  Drone 0 mesh position: (0.5, 0.6, 0)
  Drone 1 mesh position: (1.5, 0.6, -0.5)
  ...

Frame 300 (5초 후):
  Drone 0 mesh position: (5, 3, 0)    ← 원형 완성!
  Drone 1 mesh position: (0, 3, -5)
  Drone 2 mesh position: (-5, 3, 0)
  Drone 3 mesh position: (0, 3, 5)
```

---

## 🎨 디자인 패턴 분석

### 1. Interpreter Pattern (인터프리터 패턴)
**위치**: `interpreter.ts`
**목적**: AST 노드를 재귀적으로 실행

```typescript
interface ExecutableNode {
  id: string
  type: NodeType
}

// 각 노드 타입
CommandNode extends ExecutableNode
SequenceNode extends ExecutableNode { children: ExecutableNode[] }
RepeatNode extends ExecutableNode { body: ExecutableNode, times: number }
```

### 2. Strategy Pattern (전략 패턴)
**위치**: `ConnectionManager.ts`
**목적**: 연결 모드에 따라 다른 ConnectionService 사용

```typescript
interface IConnectionService {
  connect(config?: ConnectionConfig): void
  disconnect(): void
  sendCommand(command: Command): Promise<CommandResponse>
}

// 5가지 구현체
TestConnectionService implements IConnectionService
WebSocketConnectionService implements IConnectionService
UnityWebGLConnectionService implements IConnectionService
MAVLinkConnectionService implements IConnectionService
RealDroneConnectionService implements IConnectionService
```

### 3. Observer Pattern (옵저버 패턴)
**위치**: `useExecutionStore.ts` (Zustand)
**목적**: 상태 변경 시 자동으로 UI 업데이트

```typescript
// 구독
const drones = useExecutionStore((state) => state.drones)

// 발행
set({ drones: newDrones })  // 자동으로 모든 구독자에게 알림
```

### 4. Command Pattern (커맨드 패턴)
**위치**: Command 객체
**목적**: 명령을 객체로 캡슐화

```typescript
interface Command {
  action: CommandAction
  params: Record<string, any>
}

// 명령 생성
const takeoffCommand: Command = {
  action: CommandAction.TAKEOFF_ALL,
  params: { altitude: 3 }
}

// 명령 실행
connectionService.sendCommand(takeoffCommand)
```

### 5. Composite Pattern (복합체 패턴)
**위치**: ExecutableNode 트리
**목적**: 노드를 트리 구조로 구성

```typescript
// 단일 노드
CommandNode

// 복합 노드
SequenceNode {
  children: [
    CommandNode,
    RepeatNode {
      body: SequenceNode {
        children: [CommandNode, CommandNode]
      }
    }
  ]
}
```

---

## 📊 성능 특성

### 타이밍

| 단계 | 소요 시간 | 빈도 |
|------|----------|------|
| 블록 파싱 | 50-200ms | 실행 시작 1회 |
| 명령 실행 | 100ms | 명령당 1회 |
| 시뮬레이터 업데이트 | < 1ms | 10Hz (100ms) |
| 텔레메트리 전송 | < 1ms | 10Hz (100ms) |
| Zustand 업데이트 | < 0.1ms | 10Hz (100ms) |
| Three.js 렌더링 | 16.67ms | 60Hz (60 FPS) |

### 메모리 사용

```
Blockly Workspace: ~2MB
Parsed AST: ~100KB
Execution Context: ~10KB
Drone States (4 drones): ~1KB
Telemetry History (100 points × 4 drones): ~40KB
Three.js Scene: ~50MB
```

---

## 🔧 디버깅 팁

### 1. 블록 파싱 확인
```javascript
// 브라우저 콘솔에서
const workspace = Blockly.getMainWorkspace()
const blocks = workspace.getAllBlocks()
console.log('Total blocks:', blocks.length)
blocks.forEach(b => console.log(b.type, b.getFieldValue('ALTITUDE')))
```

### 2. AST 확인
```javascript
// blocklyParser.ts에 임시 로그 추가
const tree = parseBlocklyWorkspace(workspace)
console.log('Parsed AST:', JSON.stringify(tree, null, 2))
```

### 3. 실행 상태 확인
```javascript
// 브라우저 콘솔에서
const state = useExecutionStore.getState()
console.log('Execution status:', state.status)
console.log('Current node:', state.currentNodeId)
console.log('Drones:', state.drones)
```

### 4. 드론 위치 확인
```javascript
// 브라우저 콘솔에서
const drones = useExecutionStore.getState().drones
drones.forEach(d => {
  console.log(`Drone ${d.id}: pos=(${d.position.x.toFixed(1)}, ${d.position.y.toFixed(1)}, ${d.position.z.toFixed(1)})`)
})
```

---

## 🎓 학습 포인트

### 1. 계층 분리
각 계층이 명확히 분리되어 있어 테스트와 유지보수가 쉽습니다:
- **Presentation**: Blockly UI
- **Application**: Parser, Interpreter
- **Domain**: Command, ExecutableNode
- **Infrastructure**: ConnectionService, DroneSimulator

### 2. 비동기 처리
`async/await`로 명령 실행을 순차적으로 처리하면서도 UI 블로킹을 방지합니다.

### 3. 타입 안전성
TypeScript의 강력한 타입 시스템으로 런타임 에러를 컴파일 타임에 검출합니다.

### 4. 상태 관리
Zustand를 사용한 선택적 구독으로 불필요한 리렌더링을 방지합니다.

### 5. 실시간 시각화
100ms 텔레메트리 + 60 FPS 렌더링으로 부드러운 실시간 피드백을 제공합니다.

---

**문서 작성 완료**: 2025-11-18
**다음 학습**: MAVLink 프로토콜 통합, Unity WebGL 통신
