# Backend Development Requirements
# 드론 군집 제어 시스템 백엔드 개발 요구사항

**문서 작성일**: 2025-01-18
**프로젝트**: Drone Swarm Ground Control Station (GCS)
**프론트엔드 버전**: v1.0.0
**요청자**: Frontend Development Team

---

## 📋 목차

1. [프로젝트 개요](#1-프로젝트-개요)
2. [현재 프론트엔드 상태](#2-현재-프론트엔드-상태)
3. [통신 프로토콜 사양](#3-통신-프로토콜-사양)
4. [백엔드 구현 요구사항](#4-백엔드-구현-요구사항)
5. [API 명세](#5-api-명세)
6. [데이터 타입 정의](#6-데이터-타입-정의)
7. [테스트 시나리오](#7-테스트-시나리오)
8. [참고 자료](#8-참고-자료)

---

## 1. 프로젝트 개요

### 1.1 시스템 아키텍처

```
┌─────────────────────────────────────────────────────────────┐
│                    Frontend (React + TypeScript)             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   Blockly    │  │ Connection   │  │  Telemetry   │      │
│  │   Editor     │  │   Manager    │  │   Monitor    │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│         │                  │                  │              │
│         └──────────────────┴──────────────────┘              │
│                           │                                  │
└───────────────────────────┼──────────────────────────────────┘
                            │ WebSocket / Unity WebGL
                            │
┌───────────────────────────┼──────────────────────────────────┐
│                    Backend (요구사항)                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │  WebSocket   │  │   Command    │  │  Telemetry   │      │
│  │    Server    │  │  Executor    │  │  Publisher   │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│         │                  │                  │              │
│         └──────────────────┴──────────────────┘              │
│                           │                                  │
└───────────────────────────┼──────────────────────────────────┘
                            │
                    ┌───────┴────────┐
                    │  Drone Swarm   │
                    │ (MAVLink/Unity)│
                    └────────────────┘
```

### 1.2 지원 연결 모드

프론트엔드는 3가지 연결 모드를 지원합니다:

1. **WebSocket Mode**: 실시간 양방향 통신 (권장)
2. **Unity WebGL Embed Mode**: Unity 시뮬레이터 임베드
3. **MAVLink Mode**: 실제 드론 하드웨어 연결 (향후 지원)

**백엔드 개발 요구사항**: **WebSocket Mode 우선 구현**

---

## 2. 현재 프론트엔드 상태

### 2.1 구현 완료 기능 ✅

#### Core Features
- ✅ Blockly 비주얼 프로그래밍 에디터
- ✅ 명령 파싱 및 실행 트리 생성 (`blocklyParser.ts`)
- ✅ Interpreter를 통한 명령 순차 실행
- ✅ WebSocket 연결 관리 (`WebSocketConnectionService.ts`)
- ✅ 텔레메트리 데이터 수신 및 시각화
- ✅ 3D 드론 위치 표시 (Three.js 기반)

#### Blockly 블록 종류 (총 23종)
**기본 제어 블록**:
- `swarm_takeoff_all`: 모든 드론 이륙
- `swarm_land_all`: 모든 드론 착륙
- `swarm_hover`: 호버링
- `swarm_wait`: 대기 (초 단위)
- `swarm_sync_all`: 모든 드론 동기화

**대형 제어 블록**:
- `swarm_set_formation`: 대형 설정 (Grid, Line, Circle, V-Shape, Triangle, Square, Diamond)
- `swarm_move_formation`: 대형 이동 (Forward, Backward, Left, Right, Up, Down)

**개별 드론 제어**:
- `swarm_move_drone`: 개별 드론 이동 (X, Y, Z 좌표)

**제어 흐름 블록**:
- `controls_repeat`: N번 반복
- `controls_for`: For 루프
- `controls_while`: While 루프
- `controls_repeat_until`: Repeat Until 루프
- `controls_if_simple`: If 조건문
- `controls_if_else`: If-Else 조건문

**변수 및 함수**:
- `variables_set`: 변수 설정
- `variables_get`: 변수 값 가져오기
- `procedures_defnoreturn`: 함수 정의
- `procedures_callnoreturn`: 함수 호출

**센서 블록**:
- `sensor_battery`: 배터리 잔량 조회
- `sensor_altitude`: 고도 조회
- `sensor_elapsed_time`: 경과 시간 조회

**논리 블록**:
- `logic_compare`: 비교 연산 (=, ≠, <, ≤, >, ≥)
- `logic_operation`: 논리 연산 (AND, OR)
- `logic_negate`: NOT 연산

### 2.2 최근 수정 사항 (2025-01-18)

#### blocklyParser.ts 수정 내용
1. **함수 정의 블록 수집 로직 추가**
   - 함수 정의 블록(`procedures_defnoreturn`)을 별도로 수집
   - 실행 트리에서 함수 정의를 최상단에 배치

2. **VariableSetNode 타입 확장**
   - 변수 간 할당 지원 (`x = y` 형태)
   - VALUE 입력에 연결된 블록 처리

3. **타입 캐스팅 수정**
   - `FormationType` 타입 명시적 캐스팅
   - `Direction` 타입 명시적 캐스팅

### 2.3 기술 스택

```json
{
  "framework": "React 19.2.0",
  "language": "TypeScript 5.9.6 (strict mode)",
  "stateManagement": "Zustand 5.0.3",
  "visualization": "Three.js + React Three Fiber",
  "blockly": "Blockly 11.1.1",
  "websocket": "Native WebSocket API",
  "bundler": "Vite 7.2.2"
}
```

---

## 3. 통신 프로토콜 사양

### 3.1 WebSocket 연결

#### 연결 설정
```typescript
// Frontend Configuration
interface ConnectionConfig {
  url: string        // 예: "ws://localhost:8080"
  mode: 'websocket'
  reconnectInterval?: number  // 기본값: 3000ms
  maxReconnectAttempts?: number  // 기본값: 5
}
```

#### 연결 흐름
```
Client                          Server
  │                               │
  ├──── WebSocket Connect ───────>│
  │                               │
  │<───── Connection ACK ─────────┤
  │                               │
  ├──── execute_script ──────────>│
  │    (commands: Command[])      │
  │                               │
  │<───── ack ────────────────────┤
  │                               │
  │<───── telemetry (10Hz) ───────┤
  │                               │
  │<───── command_finish ─────────┤
  │                               │
```

### 3.2 메시지 타입

#### 메시지 타입 상수
```typescript
export const MessageType = {
  EXECUTE_SCRIPT: 'execute_script',   // Client → Server
  COMMAND_FINISH: 'command_finish',   // Server → Client
  ERROR: 'error',                     // Server → Client
  TELEMETRY: 'telemetry',             // Server → Client (10Hz)
  ACK: 'ack',                         // Server → Client
} as const
```

---

## 4. 백엔드 구현 요구사항

### 4.1 필수 구현 사항 (Priority: High)

#### ✅ WebSocket Server
- **포트**: `8080` (기본값, 설정 가능해야 함)
- **프로토콜**: WebSocket (RFC 6455)
- **인증**: 현재 미사용 (향후 JWT 토큰 예정)
- **CORS**: 개발 환경에서 모든 Origin 허용 필요

#### ✅ 명령 실행 엔진
다음 명령어 타입을 순차적으로 실행해야 합니다:

1. **기본 제어 명령**
   - `takeoff_all`: 모든 드론 이륙
   - `land_all`: 모든 드론 착륙
   - `hover`: 호버링
   - `sync_all`: 모든 드론 동기화 대기

2. **대형 제어 명령**
   - `set_formation`: 대형 설정
   - `move_formation`: 대형 이동

3. **개별 드론 제어**
   - `move_drone`: 특정 드론 이동

#### ✅ 텔레메트리 스트림
- **주기**: 10Hz (100ms 간격)
- **데이터**: 모든 드론의 실시간 상태 정보
- **형식**: JSON (상세 명세는 5.3 참조)

#### ✅ 에러 처리
- 명령 실행 실패 시 `error` 메시지 전송
- WebSocket 연결 끊김 시 재연결 지원
- 잘못된 메시지 형식 처리

### 4.2 권장 구현 사항 (Priority: Medium)

- 🔹 명령 큐 관리 (FIFO)
- 🔹 명령 실행 타임아웃 처리
- 🔹 로그 기록 (명령 실행 이력)
- 🔹 드론 상태 검증 (배터리, 연결 상태 등)

### 4.3 향후 구현 예정 (Priority: Low)

- 🔸 MAVLink 프로토콜 지원
- 🔸 센서 조건 평가 (배터리, 고도 등)
- 🔸 비상 정지 (Emergency Stop)
- 🔸 사용자 인증 및 권한 관리

---

## 5. API 명세

### 5.1 Client → Server 메시지

#### 5.1.1 스크립트 실행 요청

**메시지 타입**: `execute_script`

```json
{
  "type": "execute_script",
  "commands": [
    {
      "action": "takeoff_all",
      "params": {
        "altitude": 3.0
      }
    },
    {
      "action": "set_formation",
      "params": {
        "type": "grid",
        "rows": 2,
        "cols": 5,
        "spacing": 2.0
      }
    },
    {
      "action": "move_formation",
      "params": {
        "direction": "forward",
        "distance": 5.0
      }
    },
    {
      "action": "land_all",
      "params": {}
    }
  ],
  "timestamp": 1737187200000
}
```

**요구사항**:
- `commands` 배열을 순차적으로 실행
- 각 명령이 완료된 후 다음 명령 실행
- 명령 완료 시 `command_finish` 메시지 전송

---

### 5.2 Server → Client 메시지

#### 5.2.1 ACK (수신 확인)

```json
{
  "type": "ack",
  "message": "Script execution started",
  "timestamp": 1737187200100
}
```

#### 5.2.2 명령 완료 알림

**메시지 타입**: `command_finish`

```json
{
  "type": "command_finish",
  "commandIndex": 0,
  "action": "takeoff_all",
  "success": true,
  "timestamp": 1737187205000
}
```

**실패 시**:
```json
{
  "type": "command_finish",
  "commandIndex": 2,
  "action": "move_formation",
  "success": false,
  "error": "Drone 3 connection lost",
  "timestamp": 1737187210000
}
```

#### 5.2.3 텔레메트리 데이터 (10Hz)

**메시지 타입**: `telemetry`

```json
{
  "type": "telemetry",
  "drones": [
    {
      "droneId": 1,
      "position": { "x": 0.0, "y": 0.0, "z": 3.0 },
      "velocity": { "x": 0.0, "y": 0.0, "z": 0.0 },
      "altitude": 3.0,
      "battery": 87,
      "flightMode": "GUIDED",
      "isArmed": true,
      "heading": 90.0,
      "timestamp": 1737187200000
    },
    {
      "droneId": 2,
      "position": { "x": 2.0, "y": 0.0, "z": 3.0 },
      "velocity": { "x": 0.0, "y": 0.0, "z": 0.0 },
      "altitude": 3.0,
      "battery": 92,
      "flightMode": "GUIDED",
      "isArmed": true,
      "heading": 90.0,
      "timestamp": 1737187200000
    }
  ],
  "timestamp": 1737187200000
}
```

**필수 필드**:
- `droneId`: 드론 고유 ID (1부터 시작)
- `position`: 3D 좌표 (NED 좌표계)
- `altitude`: 고도 (미터)
- `battery`: 배터리 잔량 (0-100%)
- `flightMode`: 비행 모드 문자열
- `isArmed`: Arm 상태 (boolean)

**선택 필드**:
- `velocity`: 속도 벡터
- `heading`: 헤딩 (0-360도)

#### 5.2.4 에러 메시지

```json
{
  "type": "error",
  "error": "Invalid command action: unknown_action",
  "details": {
    "commandIndex": 3,
    "receivedAction": "unknown_action"
  },
  "timestamp": 1737187200000
}
```

---

### 5.3 명령어 상세 명세

#### 5.3.1 `takeoff_all` - 모든 드론 이륙

**파라미터**:
```typescript
interface TakeoffAllParams {
  altitude?: number  // 목표 고도 (미터), 기본값: 3.0
}
```

**실행 조건**:
- 모든 드론이 연결되어 있어야 함
- 모든 드론이 Arm 가능 상태여야 함

**완료 조건**:
- 모든 드론이 목표 고도 ±0.5m 이내 도달

---

#### 5.3.2 `land_all` - 모든 드론 착륙

**파라미터**:
```typescript
interface LandAllParams {
  speed?: number  // 하강 속도 (m/s), 기본값: 1.0
}
```

**완료 조건**:
- 모든 드론이 지면에 착륙 (altitude < 0.2m)
- 모든 드론이 Disarm 상태

---

#### 5.3.3 `set_formation` - 대형 설정

**파라미터**:
```typescript
interface SetFormationParams {
  type: 'grid' | 'line' | 'circle' | 'v_shape' | 'triangle' | 'square' | 'diamond'
  rows?: number      // Grid 전용, 기본값: 2
  cols?: number      // Grid 전용, 기본값: 5
  spacing?: number   // 드론 간 간격 (미터), 기본값: 2.0
  radius?: number    // Circle 전용, 기본값: 5.0
}
```

**대형 타입별 요구사항**:

1. **Grid (그리드)**:
   - `rows` x `cols` 격자 형태
   - 원점: (0, 0, current_altitude)

2. **Line (일렬)**:
   - X축 방향 일렬 배치
   - 간격: `spacing`

3. **Circle (원형)**:
   - 반지름 `radius`의 원형 배치
   - 균등 분포

4. **V-Shape (V자)**:
   - V자 형태, 각도 60도

5. **Triangle (삼각형)**:
   - 정삼각형 형태

6. **Square (사각형)**:
   - 정사각형 형태

7. **Diamond (다이아몬드)**:
   - 마름모 형태

**완료 조건**:
- 모든 드론이 목표 위치 ±0.3m 이내 도달

---

#### 5.3.4 `move_formation` - 대형 이동

**파라미터**:
```typescript
interface MoveFormationParams {
  direction: 'forward' | 'backward' | 'left' | 'right' | 'up' | 'down'
  distance: number   // 이동 거리 (미터)
  speed?: number     // 이동 속도 (m/s), 기본값: 1.0
}
```

**요구사항**:
- 현재 대형을 유지하면서 전체 이동
- 모든 드론이 동시에 이동 시작

**완료 조건**:
- 모든 드론이 목표 위치 ±0.3m 이내 도달

---

#### 5.3.5 `move_drone` - 개별 드론 이동

**파라미터**:
```typescript
interface MoveDroneParams {
  droneId: number    // 드론 ID (1부터 시작)
  x: number          // 목표 X 좌표
  y: number          // 목표 Y 좌표
  z: number          // 목표 Z 좌표 (고도)
  speed?: number     // 이동 속도 (m/s), 기본값: 1.0
}
```

**완료 조건**:
- 해당 드론이 목표 위치 ±0.3m 이내 도달

---

#### 5.3.6 `hover` - 호버링

**파라미터**:
```typescript
interface HoverParams {}  // 빈 객체
```

**요구사항**:
- 모든 드론이 현재 위치에서 호버링

**완료 조건**:
- 즉시 완료 (명령 수신 확인만)

---

#### 5.3.7 `sync_all` - 모든 드론 동기화

**파라미터**:
```typescript
interface SyncAllParams {}  // 빈 객체
```

**요구사항**:
- 현재 실행 중인 모든 명령이 완료될 때까지 대기

**완료 조건**:
- 모든 드론이 목표 위치에 도달하고 정지

---

## 6. 데이터 타입 정의

### 6.1 TypeScript 타입 정의 (참고용)

프론트엔드에서 사용 중인 타입 정의입니다. 백엔드 구현 시 참고하세요.

```typescript
// 명령어 액션 타입
export const CommandAction = {
  TAKEOFF_ALL: 'takeoff_all',
  LAND_ALL: 'land_all',
  SET_FORMATION: 'set_formation',
  MOVE_FORMATION: 'move_formation',
  MOVE_DRONE: 'move_drone',
  ROTATE_DRONE: 'rotate_drone',
  HOVER: 'hover',
  WAIT: 'wait',
  REPEAT: 'repeat',
  FOR_LOOP: 'for_loop',
  IF: 'if',
  IF_ELSE: 'if_else',
  SYNC_ALL: 'sync_all',
  WAIT_ALL: 'wait_all',
} as const

export type CommandAction = typeof CommandAction[keyof typeof CommandAction]

// 대형 타입
export const FormationType = {
  GRID: 'grid',
  LINE: 'line',
  CIRCLE: 'circle',
  V_SHAPE: 'v_shape',
  TRIANGLE: 'triangle',
  SQUARE: 'square',
  DIAMOND: 'diamond',
} as const

export type FormationType = typeof FormationType[keyof typeof FormationType]

// 방향 타입
export const Direction = {
  FORWARD: 'forward',
  BACKWARD: 'backward',
  LEFT: 'left',
  RIGHT: 'right',
  UP: 'up',
  DOWN: 'down',
} as const

export type Direction = typeof Direction[keyof typeof Direction]

// 명령어 인터페이스
export interface Command {
  action: CommandAction
  params: CommandParams
}

// 드론 상태
export interface DroneState {
  droneId: number
  position: { x: number; y: number; z: number }
  velocity: { x: number; y: number; z: number }
  altitude: number
  battery: number
  flightMode: string
  isArmed: boolean
  heading?: number
  timestamp: number
}
```

### 6.2 JSON Schema (참고용)

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "definitions": {
    "Command": {
      "type": "object",
      "required": ["action", "params"],
      "properties": {
        "action": {
          "type": "string",
          "enum": [
            "takeoff_all", "land_all", "set_formation",
            "move_formation", "move_drone", "hover", "sync_all"
          ]
        },
        "params": { "type": "object" }
      }
    },
    "DroneState": {
      "type": "object",
      "required": ["droneId", "position", "altitude", "battery", "flightMode", "isArmed"],
      "properties": {
        "droneId": { "type": "integer", "minimum": 1 },
        "position": {
          "type": "object",
          "required": ["x", "y", "z"],
          "properties": {
            "x": { "type": "number" },
            "y": { "type": "number" },
            "z": { "type": "number" }
          }
        },
        "altitude": { "type": "number", "minimum": 0 },
        "battery": { "type": "integer", "minimum": 0, "maximum": 100 },
        "flightMode": { "type": "string" },
        "isArmed": { "type": "boolean" }
      }
    }
  }
}
```

---

## 7. 테스트 시나리오

### 7.1 기본 시나리오

#### Scenario 1: 이륙 → 대형 설정 → 착륙

```json
{
  "type": "execute_script",
  "commands": [
    {
      "action": "takeoff_all",
      "params": { "altitude": 3.0 }
    },
    {
      "action": "set_formation",
      "params": {
        "type": "grid",
        "rows": 2,
        "cols": 5,
        "spacing": 2.0
      }
    },
    {
      "action": "land_all",
      "params": {}
    }
  ]
}
```

**예상 결과**:
1. 모든 드론이 3m 고도로 이륙
2. 2x5 그리드 대형으로 이동
3. 모든 드론이 착륙

---

#### Scenario 2: 대형 이동 시퀀스

```json
{
  "type": "execute_script",
  "commands": [
    {
      "action": "takeoff_all",
      "params": { "altitude": 5.0 }
    },
    {
      "action": "set_formation",
      "params": {
        "type": "line",
        "spacing": 3.0
      }
    },
    {
      "action": "move_formation",
      "params": {
        "direction": "forward",
        "distance": 10.0
      }
    },
    {
      "action": "move_formation",
      "params": {
        "direction": "right",
        "distance": 5.0
      }
    },
    {
      "action": "land_all",
      "params": {}
    }
  ]
}
```

**예상 결과**:
1. 5m 이륙
2. 일렬 대형 설정
3. 앞으로 10m 이동
4. 오른쪽으로 5m 이동
5. 착륙

---

### 7.2 에러 처리 시나리오

#### Scenario 3: 잘못된 명령어

**요청**:
```json
{
  "type": "execute_script",
  "commands": [
    {
      "action": "invalid_action",
      "params": {}
    }
  ]
}
```

**예상 응답**:
```json
{
  "type": "error",
  "error": "Unknown action: invalid_action",
  "timestamp": 1737187200000
}
```

---

#### Scenario 4: 드론 연결 끊김

**시나리오**:
- 명령 실행 중 드론 3번 연결 끊김

**예상 응답**:
```json
{
  "type": "command_finish",
  "commandIndex": 1,
  "action": "move_formation",
  "success": false,
  "error": "Drone 3 connection lost during execution",
  "timestamp": 1737187205000
}
```

---

### 7.3 성능 테스트 요구사항

1. **텔레메트리 주기**: 정확히 10Hz (100ms ±10ms)
2. **명령 실행 지연**: 명령 수신 후 100ms 이내 실행 시작
3. **WebSocket 안정성**: 1시간 연속 운영 시 연결 유지
4. **동시 드론 수**: 최소 10대 동시 제어 가능

---

## 8. 참고 자료

### 8.1 프론트엔드 소스 코드 위치

```
drone-swarm-gcs/
├── src/
│   ├── services/
│   │   ├── connection/
│   │   │   ├── WebSocketConnectionService.ts  ← WebSocket 연결 구현
│   │   │   ├── ConnectionManager.ts           ← 연결 관리
│   │   │   └── types.ts                       ← 타입 정의
│   │   ├── execution/
│   │   │   ├── blocklyParser.ts               ← Blockly 파싱
│   │   │   └── Interpreter.ts                 ← 명령 실행
│   ├── types/
│   │   ├── websocket.ts                       ← WebSocket 메시지 타입
│   │   └── execution.ts                       ← 실행 노드 타입
│   ├── constants/
│   │   └── commands.ts                        ← 명령어 상수
│   └── stores/
│       ├── useConnectionStore.ts              ← 연결 상태 관리
│       └── useExecutionStore.ts               ← 실행 상태 관리
```

### 8.2 개발 환경 설정

**프론트엔드 실행**:
```bash
cd drone-swarm-gcs
npm install
npm run dev
# → http://localhost:3000
```

**백엔드 WebSocket 서버 요구사항**:
- URL: `ws://localhost:8080`
- 프로토콜: WebSocket
- 메시지 형식: JSON

### 8.3 테스트 도구

프론트엔드에서 제공하는 테스트 모드:
- **Test Mode**: 백엔드 없이 프론트엔드만 테스트
- **WebSocket Mode**: 실제 백엔드 연결 테스트

**WebSocket 테스트 클라이언트** (권장):
- [Postman WebSocket](https://www.postman.com/)
- [websocat](https://github.com/vi/websocat) (CLI 도구)

---

## 9. 구현 우선순위

### Phase 1: 최소 기능 구현 (1주)
- ✅ WebSocket 서버 구축
- ✅ `execute_script` 메시지 수신
- ✅ 기본 명령어 실행 (`takeoff_all`, `land_all`, `hover`)
- ✅ `telemetry` 메시지 10Hz 전송 (Mock 데이터)
- ✅ `command_finish` 메시지 전송

### Phase 2: 대형 제어 구현 (1주)
- ✅ `set_formation` 구현 (Grid, Line)
- ✅ `move_formation` 구현
- ✅ 실제 드론 시뮬레이터 연동 (Unity 또는 SITL)

### Phase 3: 고급 기능 (2주)
- ✅ 모든 대형 타입 구현 (Circle, V-Shape, Triangle, Square, Diamond)
- ✅ `move_drone` 개별 제어
- ✅ 에러 처리 및 재시도 로직
- ✅ 성능 최적화

### Phase 4: 프로덕션 준비 (1주)
- ✅ 로깅 및 모니터링
- ✅ 단위 테스트
- ✅ 부하 테스트 (10대 이상 드론)
- ✅ 문서화

---

## 10. 문의 및 지원

### 10.1 연락처

**프론트엔드 개발팀**:
- Email: frontend-team@example.com
- Slack: #drone-gcs-frontend

### 10.2 이슈 리포트

GitHub Issues: [drone-swarm-gcs/issues](https://github.com/your-org/drone-swarm-gcs/issues)

### 10.3 개발 진행 상황 공유

- **주간 미팅**: 매주 월요일 10:00 AM
- **진행 상황 보고**: Jira 또는 GitHub Projects
- **코드 리뷰**: Pull Request 기반

---

## 부록 A: 전체 명령어 목록

| Action            | 설명                | 우선순위 | Phase |
|-------------------|---------------------|---------|-------|
| `takeoff_all`     | 모든 드론 이륙      | High    | 1     |
| `land_all`        | 모든 드론 착륙      | High    | 1     |
| `hover`           | 호버링              | High    | 1     |
| `sync_all`        | 동기화              | High    | 1     |
| `set_formation`   | 대형 설정           | High    | 2     |
| `move_formation`  | 대형 이동           | High    | 2     |
| `move_drone`      | 개별 드론 이동      | Medium  | 3     |
| `wait`            | 대기 (미구현)       | Low     | 4     |
| `rotate_drone`    | 드론 회전 (미구현)  | Low     | 4     |

---

## 부록 B: WebSocket 메시지 예제 모음

### Example 1: 연결 직후 첫 텔레메트리

```json
{
  "type": "telemetry",
  "drones": [
    {
      "droneId": 1,
      "position": { "x": 0, "y": 0, "z": 0 },
      "velocity": { "x": 0, "y": 0, "z": 0 },
      "altitude": 0,
      "battery": 100,
      "flightMode": "STABILIZE",
      "isArmed": false,
      "timestamp": 1737187200000
    }
  ],
  "timestamp": 1737187200000
}
```

### Example 2: 이륙 완료 후 텔레메트리

```json
{
  "type": "telemetry",
  "drones": [
    {
      "droneId": 1,
      "position": { "x": 0, "y": 0, "z": 3.0 },
      "velocity": { "x": 0, "y": 0, "z": 0 },
      "altitude": 3.0,
      "battery": 95,
      "flightMode": "GUIDED",
      "isArmed": true,
      "timestamp": 1737187205000
    }
  ],
  "timestamp": 1737187205000
}
```

### Example 3: 명령 실행 완료

```json
{
  "type": "command_finish",
  "commandIndex": 0,
  "action": "takeoff_all",
  "success": true,
  "executionTime": 5.2,
  "timestamp": 1737187205000
}
```

---

## 부록 C: 좌표계 정의

### NED 좌표계 (North-East-Down)

```
        North (+Y)
            ↑
            │
            │
            │
            └───────→ East (+X)
           /
          /
         ↓
      Down (+Z)
```

- **X축**: 동쪽 방향 (East)
- **Y축**: 북쪽 방향 (North)
- **Z축**: 아래 방향 (Down, 고도는 음수)

**주의**: 프론트엔드는 고도를 양수로 표시 (`altitude` 필드)

---

**문서 버전**: 1.0.0
**최종 수정일**: 2025-01-18
**작성자**: Frontend Development Team
