# Unity WebGL 연동 요구사항

> **버전**: 1.0
> **최종 업데이트**: 2025-11-18
> **대상 Unity 버전**: 2021.3 LTS 이상

## 목차

1. [프로젝트 개요](#1-프로젝트-개요)
2. [Unity WebGL 빌드 요구사항](#2-unity-webgl-빌드-요구사항)
3. [메시지 프로토콜 사양](#3-메시지-프로토콜-사양)
4. [명령어 구현 가이드](#4-명령어-구현-가이드)
5. [텔레메트리 데이터 사양](#5-텔레메트리-데이터-사양)
6. [GameManager 구현 체크리스트](#6-gamemanager-구현-체크리스트)
7. [테스트 시나리오](#7-테스트-시나리오)
8. [성능 요구사항](#8-성능-요구사항)
9. [빌드 및 배포 지침](#9-빌드-및-배포-지침)
10. [문제 해결 가이드](#10-문제-해결-가이드)

**부록**:
- [부록 A: 전체 메시지 형식 참조](#부록-a-전체-메시지-형식-참조)
- [부록 B: 좌표계 참조](#부록-b-좌표계-참조)
- [부록 C: 리소스 및 참고자료](#부록-c-리소스-및-참고자료)

---

## 1. 프로젝트 개요

### 1.1 시스템 아키텍처

```
┌─────────────────────────────────────────────────────────────┐
│                    React GCS Frontend                       │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │   Blockly    │  │  Connection  │  │   Telemetry  │     │
│  │   Editor     │  │    Panel     │  │   Display    │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
│         │                  │                  ▲             │
│         │                  │                  │             │
│         ▼                  ▼                  │             │
│  ┌─────────────────────────────────────────────────┐       │
│  │   UnityWebGLConnectionService.ts                │       │
│  │   - 메시지 송수신                                │       │
│  │   - 연결 생명주기 관리                            │       │
│  └─────────────────────────────────────────────────┘       │
│         │                                        ▲          │
│         │ SendMessage()                          │          │
│         ▼                                        │          │
│  ┌─────────────────────────────────────────────────┐       │
│  │   Unity WebGL (iframe/canvas로 임베드)          │       │
│  └─────────────────────────────────────────────────┘       │
└─────────────────────────────────────────────────────────────┘
                         │                          ▲
                         │ Commands                 │ Telemetry
                         ▼                          │
         ┌──────────────────────────────────────────────────┐
         │           Unity Simulation Engine                │
         │  ┌──────────────┐  ┌──────────────┐             │
         │  │ GameManager  │  │ Drone Swarm  │             │
         │  │  (C# Script) │  │  Controller  │             │
         │  └──────────────┘  └──────────────┘             │
         │         │                  │                     │
         │         │                  │                     │
         │         ▼                  ▼                     │
         │  ┌────────────────────────────────┐             │
         │  │   Drone Physics & Rendering    │             │
         │  │   - 위치/회전                   │             │
         │  │   - 대형 로직                   │             │
         │  │   - 충돌 감지                   │             │
         │  └────────────────────────────────┘             │
         └──────────────────────────────────────────────────┘
```

### 1.2 통신 흐름

1. **초기화 핸드셰이크**:
   ```
   React → Unity: (Unity 로딩 대기)
   Unity → React: { type: 'unity_ready' }
   React → Unity: { type: 'init', payload: { droneCount: 4 } }
   Unity → React: { type: 'init_complete' }
   ```

2. **명령 실행**:
   ```
   사용자가 Blockly 스크립트 생성 → 파서가 명령 트리로 변환
   React → Unity: { type: 'execute_script', payload: { commands: [...] } }
   Unity가 명령 실행 → 드론 위치 업데이트
   Unity → React: { type: 'command_finish', commandId: '...' }
   ```

3. **텔레메트리 업데이트 (10Hz)**:
   ```
   Unity → React: { type: 'telemetry', payload: { drones: [...] } }
   (100ms마다)
   ```

### 1.3 주요 기술

- **React 측**: TypeScript 5.9.6, react-unity-webgl 9.5.2, Zustand 5.0.3
- **Unity 측**: Unity 2021.3 LTS+, WebGL 빌드 타겟
- **통신**: `Application.ExternalCall()` 및 `window` 메시지 리스너를 통한 JavaScript 인터롭
- **좌표계**: NED (North-East-Down)

---

## 2. Unity WebGL 빌드 요구사항

### 2.1 Unity 버전 및 구성

**필요 Unity 버전**: 2021.3 LTS 이상 (2022 LTS 권장)

**빌드 설정**:
```
Platform: WebGL
Compression Format: Gzip (서버가 지원하면 Brotli)
Code Optimization: Runtime Speed
Enable Exceptions: None (또는 Explicitly Thrown Only)
Data Caching: Enabled
```

**프로젝트 설정**:
```json
{
  "PlayerSettings": {
    "WebGL": {
      "template": "Default",
      "compressionFormat": "Gzip",
      "exceptionSupport": "None",
      "dataCaching": true,
      "memorySize": 512
    }
  }
}
```

### 2.2 필수 패키지

Unity Package Manager를 통해 설치:

1. **Newtonsoft.Json** (JSON 파싱용):
   ```
   com.unity.nuget.newtonsoft-json@3.2.1
   ```

### 2.3 빌드 출력 구조

빌드 후 다음과 같이 구성되어야 함:

```
public/unity/
├── Build/
│   ├── drone-sim.loader.js
│   ├── drone-sim.framework.js.gz
│   ├── drone-sim.data.gz
│   └── drone-sim.wasm.gz
├── TemplateData/
│   └── style.css
└── index.html
```

**파일 명명 규칙**: `drone-sim`을 기본 이름으로 사용 (React의 `unityLoaderUrl` prop을 통해 구성 가능)

### 2.4 캔버스 및 해상도 설정

- **캔버스 해상도**: 1920x1080 (16:9 종횡비)
- **Run In Background**: 활성화
- **Display Buffer**: True (텔레메트리 업데이트에 필요)

---

## 3. 메시지 프로토콜 사양

### 3.1 통신 아키텍처

Unity WebGL과 React는 **두 채널**을 통해 통신:

1. **React → Unity**: `UnityContext.send(gameObjectName, methodName, parameter)`
   - 예: `unityContext.send('GameManager', 'ReceiveMessage', jsonString)`

2. **Unity → React**: `Application.ExternalCall(functionName, jsonString)`
   - Unity가 JavaScript 함수 호출: `window.handleUnityMessage(jsonString)`
   - React는 다음을 통해 수신: `unityContext.on('HandleMessage', (data) => { ... })`

### 3.2 메시지 형식

모든 메시지는 다음 구조의 **JSON 문자열**이어야 함:

```typescript
interface UnityMessage {
  type: MessageType
  payload?: any
  timestamp?: number
  commandId?: string
  error?: string
}

type MessageType =
  | 'unity_ready'        // Unity 로딩 완료
  | 'init'               // 시뮬레이션 초기화
  | 'init_complete'      // 초기화 완료
  | 'execute_script'     // 명령 시퀀스 실행
  | 'command_finish'     // 명령 실행 완료
  | 'telemetry'          // 주기적 텔레메트리 데이터
  | 'error'              // 오류 발생
  | 'ack'                // 확인 응답
```

### 3.3 메시지 흐름 예제

#### 3.3.1 초기화 시퀀스

**단계 1: Unity 준비 신호**
```json
{
  "type": "unity_ready",
  "timestamp": 1700000000000
}
```

**단계 2: React 초기화 요청**
```json
{
  "type": "init",
  "payload": {
    "droneCount": 4,
    "startFormation": "grid",
    "startAltitude": 10.0,
    "spacing": 5.0
  },
  "timestamp": 1700000001000
}
```

**단계 3: Unity 초기화 확인**
```json
{
  "type": "init_complete",
  "payload": {
    "droneCount": 4,
    "initialPositions": [
      { "droneId": 1, "position": { "x": 0, "y": 10, "z": 0 } },
      { "droneId": 2, "position": { "x": 5, "y": 10, "z": 0 } },
      { "droneId": 3, "position": { "x": 0, "y": 10, "z": 5 } },
      { "droneId": 4, "position": { "x": 5, "y": 10, "z": 5 } }
    ]
  },
  "timestamp": 1700000002000
}
```

#### 3.3.2 명령 실행

**React → Unity: 이륙 명령 실행**
```json
{
  "type": "execute_script",
  "commandId": "cmd_1234567890",
  "payload": {
    "commands": [
      {
        "action": "takeoff_all",
        "params": {
          "altitude": 10.0,
          "speed": 2.0
        }
      }
    ]
  },
  "timestamp": 1700000010000
}
```

**Unity → React: 명령 완료**
```json
{
  "type": "command_finish",
  "commandId": "cmd_1234567890",
  "payload": {
    "executedCommands": 1,
    "totalDuration": 5.2
  },
  "timestamp": 1700000015200
}
```

#### 3.3.3 텔레메트리 업데이트

**Unity → React: 텔레메트리 데이터 (100ms마다)**
```json
{
  "type": "telemetry",
  "payload": {
    "drones": [
      {
        "id": 1,
        "position": { "x": 0.0, "y": 10.0, "z": 0.0 },
        "rotation": { "x": 0.0, "y": 0.0, "z": 0.0 },
        "velocity": { "x": 0.0, "y": 0.0, "z": 0.0 },
        "battery": 95.5,
        "armed": true,
        "mode": "AUTO",
        "status": "hovering"
      },
      {
        "id": 2,
        "position": { "x": 5.0, "y": 10.0, "z": 0.0 },
        "rotation": { "x": 0.0, "y": 0.0, "z": 0.0 },
        "velocity": { "x": 0.0, "y": 0.0, "z": 0.0 },
        "battery": 94.2,
        "armed": true,
        "mode": "AUTO",
        "status": "hovering"
      }
    ],
    "timestamp": 1700000020000
  }
}
```

### 3.4 오류 처리

**오류 메시지 형식**:
```json
{
  "type": "error",
  "error": "오류 메시지 설명",
  "payload": {
    "errorCode": "INVALID_COMMAND",
    "commandId": "cmd_1234567890",
    "details": "알 수 없는 액션 타입: invalid_action"
  },
  "timestamp": 1700000030000
}
```

**오류 코드**:
- `INVALID_COMMAND`: 명령 형식이 잘못됨
- `EXECUTION_FAILED`: 명령 실행 실패
- `DRONE_NOT_FOUND`: 지정된 드론 ID가 존재하지 않음
- `COLLISION_DETECTED`: 충돌 방지 트리거됨
- `TIMEOUT`: 명령 실행 시간 초과

---

## 4. 명령어 구현 가이드

### 4.1 명령 구조

모든 명령은 다음 구조를 따름:

```typescript
interface Command {
  action: CommandAction
  params: CommandParams
  droneId?: number  // 단일 드론 명령용
  duration?: number // 시간 기반 명령용
}

type CommandAction =
  // 기본 제어
  | 'takeoff_all'
  | 'land_all'

  // 대형 제어
  | 'set_formation'
  | 'move_formation'

  // 개별 드론 제어
  | 'move_drone'
  | 'rotate_drone'

  // 고급 제어
  | 'hover'
  | 'wait'

  // 동기화
  | 'sync_all'
  | 'wait_all'
```

### 4.2 명령 구현

#### 4.2.1 takeoff_all

**설명**: 모든 드론이 지정된 고도로 동시에 이륙

**매개변수**:
```typescript
{
  "action": "takeoff_all",
  "params": {
    "altitude": number,  // 목표 고도(미터) (NED: 음수 Y)
    "speed": number      // 상승 속도(m/s)
  }
}
```

**예제**:
```json
{
  "action": "takeoff_all",
  "params": {
    "altitude": 10.0,
    "speed": 2.0
  }
}
```

**Unity 구현 요구사항**:
1. 모든 드론이 지상에 있는지 확인 (`position.y ~= 0`)
2. 각 드론의 목표 고도 설정
3. 목표에 도달할 때까지 상승 속도 적용
4. 고도 도달 후 위치 유지
5. 모든 드론이 목표에 도달하면 `command_finish` 전송

**C# 의사코드**:
```csharp
IEnumerator ExecuteTakeoffAll(float altitude, float speed)
{
    foreach (var drone in drones)
    {
        drone.SetTargetAltitude(altitude);
        drone.SetClimbSpeed(speed);
    }

    // 모든 드론이 목표 고도에 도달할 때까지 대기
    while (drones.Any(d => !d.IsAtTargetAltitude()))
    {
        yield return null;
    }

    SendCommandFinish(currentCommandId);
}
```

#### 4.2.2 land_all

**설명**: 모든 드론이 지면으로 동시에 착륙

**매개변수**:
```typescript
{
  "action": "land_all",
  "params": {
    "speed": number  // 하강 속도(m/s)
  }
}
```

**예제**:
```json
{
  "action": "land_all",
  "params": {
    "speed": 1.0
  }
}
```

**Unity 구현 요구사항**:
1. 모든 드론의 목표 고도를 0으로 설정
2. 지면에 도달할 때까지 하강 속도 적용
3. 착륙 시 드론 무장 해제
4. 모든 드론 착륙 시 `command_finish` 전송

#### 4.2.3 set_formation

**설명**: 지정된 대형 패턴으로 드론 배치

**매개변수**:
```typescript
{
  "action": "set_formation",
  "params": {
    "formationType": 'grid' | 'line' | 'circle' | 'v_shape' | 'triangle' | 'square' | 'diamond',
    "spacing": number,      // 드론 간 거리(미터)
    "center": Vector3,      // 대형 중심점 (NED)
    "heading": number       // 대형 방향(도) (0 = 북쪽)
  }
}
```

**예제**:
```json
{
  "action": "set_formation",
  "params": {
    "formationType": "grid",
    "spacing": 5.0,
    "center": { "x": 0, "y": 10, "z": 0 },
    "heading": 0
  }
}
```

**Unity 구현 요구사항**:

**격자 대형 (NxN 그리드)**:
```
드론 1  드론 2  드론 3
드론 4  드론 5  드론 6
드론 7  드론 8  드론 9
```

위치 (spacing = 5m):
```csharp
int gridSize = Mathf.CeilToInt(Mathf.Sqrt(droneCount));
for (int i = 0; i < droneCount; i++)
{
    int row = i / gridSize;
    int col = i % gridSize;

    Vector3 offset = new Vector3(
        col * spacing,
        0,
        row * spacing
    );

    drone[i].targetPosition = center + offset;
}
```

**라인 대형**:
```
드론 1 → 드론 2 → 드론 3 → 드론 4
```

**원형 대형**:
```csharp
float radius = spacing * droneCount / (2 * Mathf.PI);
for (int i = 0; i < droneCount; i++)
{
    float angle = (360f / droneCount) * i * Mathf.Deg2Rad;
    Vector3 offset = new Vector3(
        radius * Mathf.Sin(angle),
        0,
        radius * Mathf.Cos(angle)
    );
    drone[i].targetPosition = center + offset;
}
```

**V자 대형**:
```
        드론 1
      /        \
   드론 2   드론 3
   /              \
드론 4         드론 5
```

#### 4.2.4 move_formation

**설명**: 전체 대형을 지정된 방향으로 이동

**매개변수**:
```typescript
{
  "action": "move_formation",
  "params": {
    "direction": 'forward' | 'backward' | 'left' | 'right' | 'up' | 'down',
    "distance": number,  // 거리(미터)
    "speed": number      // 이동 속도(m/s)
  }
}
```

**예제**:
```json
{
  "action": "move_formation",
  "params": {
    "direction": "forward",
    "distance": 10.0,
    "speed": 3.0
  }
}
```

**Unity 구현 요구사항**:
1. `direction` 매개변수를 기반으로 방향 벡터 계산
2. 모든 드론 목표 위치에 오프셋 추가
3. 상대 위치를 유지하며 드론 이동
4. 모든 드론이 목표에 도달하면 `command_finish` 전송

**방향 매핑 (NED)**:
```csharp
Vector3 GetDirectionVector(string direction, float distance)
{
    switch (direction)
    {
        case "forward":  return new Vector3(0, 0, -distance);  // -Z (북쪽)
        case "backward": return new Vector3(0, 0, distance);   // +Z (남쪽)
        case "left":     return new Vector3(-distance, 0, 0);  // -X (서쪽)
        case "right":    return new Vector3(distance, 0, 0);   // +X (동쪽)
        case "up":       return new Vector3(0, -distance, 0);  // -Y (위)
        case "down":     return new Vector3(0, distance, 0);   // +Y (아래)
        default:         return Vector3.zero;
    }
}
```

#### 4.2.5 move_drone

**설명**: 단일 드론을 목표 위치로 이동

**매개변수**:
```typescript
{
  "action": "move_drone",
  "droneId": number,
  "params": {
    "target": Vector3,   // 목표 위치 (NED)
    "speed": number      // 이동 속도(m/s)
  }
}
```

**예제**:
```json
{
  "action": "move_drone",
  "droneId": 2,
  "params": {
    "target": { "x": 10.0, "y": 15.0, "z": 5.0 },
    "speed": 5.0
  }
}
```

**Unity 구현 요구사항**:
1. `droneId` 존재 여부 검증
2. 지정된 드론의 목표 위치 설정
3. 경로를 따라 드론 이동 (충돌 회피 고려)
4. 드론이 목표에 도달하면 `command_finish` 전송

#### 4.2.6 rotate_drone

**설명**: 단일 드론을 목표 방향으로 회전

**매개변수**:
```typescript
{
  "action": "rotate_drone",
  "droneId": number,
  "params": {
    "heading": number,    // 목표 방향(도) (0 = 북쪽)
    "speed": number       // 회전 속도(도/초)
  }
}
```

**예제**:
```json
{
  "action": "rotate_drone",
  "droneId": 1,
  "params": {
    "heading": 90,
    "speed": 45
  }
}
```

**Unity 구현 요구사항**:
1. 방향을 Unity 회전으로 변환 (Y축 회전)
2. 속도 매개변수를 사용하여 드론 부드럽게 회전
3. 회전 완료 시 `command_finish` 전송

#### 4.2.7 hover

**설명**: 지정된 시간 동안 현재 위치 유지

**매개변수**:
```typescript
{
  "action": "hover",
  "params": {
    "duration": number  // 지속 시간(초)
  }
}
```

**예제**:
```json
{
  "action": "hover",
  "params": {
    "duration": 5.0
  }
}
```

**Unity 구현 요구사항**:
1. 모든 드론 이동 중지
2. 현재 위치 유지
3. 지정된 시간 동안 대기
4. 시간 경과 후 `command_finish` 전송

#### 4.2.8 wait

**설명**: 지정된 시간 동안 대기 (hover의 별칭)

**매개변수**: `hover`와 동일

#### 4.2.9 sync_all

**설명**: 모든 드론 동기화 (모두 현재 동작 완료 대기)

**매개변수**:
```typescript
{
  "action": "sync_all",
  "params": {}
}
```

**Unity 구현 요구사항**:
1. 모든 드론의 상태 확인
2. 모든 드론이 유휴/호버링 상태가 될 때까지 대기
3. 동기화 완료 시 `command_finish` 전송

#### 4.2.10 wait_all

**설명**: 모든 드론의 이동 완료 대기 (sync_all과 동일)

**매개변수**: `sync_all`과 동일

### 4.3 명령 실행 흐름

```csharp
public class GameManager : MonoBehaviour
{
    private Queue<Command> commandQueue = new Queue<Command>();
    private bool isExecuting = false;

    public void ReceiveMessage(string jsonMessage)
    {
        var message = JsonConvert.DeserializeObject<UnityMessage>(jsonMessage);

        switch (message.type)
        {
            case "execute_script":
                ExecuteScript(message);
                break;

            case "init":
                InitializeSimulation(message.payload);
                break;

            // ... 기타 메시지 타입
        }
    }

    private void ExecuteScript(UnityMessage message)
    {
        currentCommandId = message.commandId;
        var commands = JsonConvert.DeserializeObject<Command[]>(
            message.payload.commands.ToString()
        );

        foreach (var cmd in commands)
        {
            commandQueue.Enqueue(cmd);
        }

        if (!isExecuting)
        {
            StartCoroutine(ProcessCommands());
        }
    }

    private IEnumerator ProcessCommands()
    {
        isExecuting = true;

        while (commandQueue.Count > 0)
        {
            var command = commandQueue.Dequeue();
            yield return ExecuteCommand(command);
        }

        isExecuting = false;
        SendCommandFinish(currentCommandId);
    }

    private IEnumerator ExecuteCommand(Command command)
    {
        switch (command.action)
        {
            case "takeoff_all":
                yield return ExecuteTakeoffAll(command.params);
                break;

            case "move_formation":
                yield return ExecuteMoveFormation(command.params);
                break;

            // ... 기타 명령
        }
    }
}
```

---

## 5. 텔레메트리 데이터 사양

### 5.1 텔레메트리 업데이트 빈도

**요구사항**: **10Hz** (100ms마다) 텔레메트리 데이터 전송

**Unity 구현**:
```csharp
private float telemetryInterval = 0.1f; // 100ms
private float lastTelemetryTime = 0f;

void Update()
{
    if (Time.time - lastTelemetryTime >= telemetryInterval)
    {
        SendTelemetry();
        lastTelemetryTime = Time.time;
    }
}
```

### 5.2 텔레메트리 데이터 형식

```typescript
interface TelemetryMessage {
  type: 'telemetry'
  payload: {
    drones: DroneTelemetry[]
    timestamp: number
  }
}

interface DroneTelemetry {
  id: number
  position: Vector3      // NED 좌표
  rotation: Vector3      // 오일러 각도(도)
  velocity: Vector3      // NED 프레임에서 m/s
  battery: number        // 백분율 (0-100)
  armed: boolean
  mode: string          // 'MANUAL' | 'AUTO' | 'GUIDED'
  status: string        // 'idle' | 'takeoff' | 'landing' | 'moving' | 'hovering'
}
```

### 5.3 텔레메트리 메시지 예제

```json
{
  "type": "telemetry",
  "payload": {
    "drones": [
      {
        "id": 1,
        "position": { "x": 0.0, "y": 10.0, "z": 0.0 },
        "rotation": { "x": 0.0, "y": 45.0, "z": 0.0 },
        "velocity": { "x": 2.5, "y": 0.0, "z": -1.2 },
        "battery": 87.3,
        "armed": true,
        "mode": "AUTO",
        "status": "moving"
      },
      {
        "id": 2,
        "position": { "x": 5.0, "y": 10.0, "z": 0.0 },
        "rotation": { "x": 0.0, "y": 45.0, "z": 0.0 },
        "velocity": { "x": 2.5, "y": 0.0, "z": -1.2 },
        "battery": 86.1,
        "armed": true,
        "mode": "AUTO",
        "status": "moving"
      }
    ],
    "timestamp": 1700000050000
  }
}
```

### 5.4 배터리 시뮬레이션

활동에 따른 배터리 소모 구현:

```csharp
public class Drone : MonoBehaviour
{
    public float battery = 100f; // 백분율

    private const float IDLE_DRAIN = 0.5f;    // 호버링 시 %/분
    private const float MOVING_DRAIN = 1.0f;  // 이동 시 %/분
    private const float CLIMB_DRAIN = 1.5f;   // 상승 시 %/분

    void Update()
    {
        float drainRate = CalculateDrainRate();
        battery -= drainRate * Time.deltaTime / 60f;
        battery = Mathf.Max(0, battery);

        if (battery <= 0)
        {
            ForceLand();
        }
    }

    private float CalculateDrainRate()
    {
        if (velocity.y < -0.1f) return CLIMB_DRAIN;
        if (velocity.magnitude > 0.1f) return MOVING_DRAIN;
        return IDLE_DRAIN;
    }
}
```

---

## 6. GameManager 구현 체크리스트

### 6.1 핵심 컴포넌트

Unity 프로젝트에 다음 C# 스크립트 생성:

- [ ] **GameManager.cs** - 메인 메시지 핸들러 및 명령 조정자
- [ ] **Drone.cs** - 개별 드론 물리 및 제어
- [ ] **FormationController.cs** - 대형 패턴 로직
- [ ] **TelemetryManager.cs** - 텔레메트리 데이터 수집 및 전송
- [ ] **MessageTypes.cs** - 메시지 구조 정의

### 6.2 GameManager.cs 템플릿

```csharp
using UnityEngine;
using System.Collections;
using System.Collections.Generic;
using Newtonsoft.Json;
using System.Runtime.InteropServices;

public class GameManager : MonoBehaviour
{
    [Header("드론 설정")]
    public GameObject dronePrefab;
    public int droneCount = 4;

    [Header("시뮬레이션 설정")]
    public float telemetryInterval = 0.1f; // 10Hz

    private List<Drone> drones = new List<Drone>();
    private Queue<Command> commandQueue = new Queue<Command>();
    private bool isExecuting = false;
    private string currentCommandId = "";
    private float lastTelemetryTime = 0f;
    private bool isInitialized = false;

    // JavaScript 인터롭
    [DllImport("__Internal")]
    private static extern void HandleUnityMessage(string message);

    void Start()
    {
        SendMessage("unity_ready");
    }

    void Update()
    {
        if (!isInitialized) return;

        // 10Hz로 텔레메트리 전송
        if (Time.time - lastTelemetryTime >= telemetryInterval)
        {
            SendTelemetry();
            lastTelemetryTime = Time.time;
        }
    }

    // React에서 unityContext.send()를 통해 호출됨
    public void ReceiveMessage(string jsonMessage)
    {
        Debug.Log($"[Unity] 수신: {jsonMessage}");

        try
        {
            var message = JsonConvert.DeserializeObject<UnityMessage>(jsonMessage);

            switch (message.type)
            {
                case "init":
                    InitializeSimulation(message.payload);
                    break;

                case "execute_script":
                    ExecuteScript(message);
                    break;

                default:
                    Debug.LogWarning($"알 수 없는 메시지 타입: {message.type}");
                    break;
            }
        }
        catch (System.Exception e)
        {
            SendError($"메시지 파싱 실패: {e.Message}");
        }
    }

    private void InitializeSimulation(object payload)
    {
        var config = JsonConvert.DeserializeObject<InitConfig>(payload.ToString());
        droneCount = config.droneCount;

        // 기존 드론 제거
        foreach (var drone in drones)
        {
            Destroy(drone.gameObject);
        }
        drones.Clear();

        // 드론 생성
        for (int i = 0; i < droneCount; i++)
        {
            Vector3 position = CalculateInitialPosition(i, config);
            GameObject droneObj = Instantiate(dronePrefab, position, Quaternion.identity);
            Drone drone = droneObj.GetComponent<Drone>();
            drone.id = i + 1;
            drones.Add(drone);
        }

        isInitialized = true;

        SendMessage("init_complete", new {
            droneCount = droneCount,
            initialPositions = GetDronePositions()
        });
    }

    private Vector3 CalculateInitialPosition(int index, InitConfig config)
    {
        int gridSize = Mathf.CeilToInt(Mathf.Sqrt(droneCount));
        int row = index / gridSize;
        int col = index % gridSize;

        return new Vector3(
            col * config.spacing,
            config.startAltitude,
            row * config.spacing
        );
    }

    private void ExecuteScript(UnityMessage message)
    {
        currentCommandId = message.commandId;
        var script = JsonConvert.DeserializeObject<ExecuteScriptPayload>(
            message.payload.ToString()
        );

        foreach (var cmd in script.commands)
        {
            commandQueue.Enqueue(cmd);
        }

        if (!isExecuting)
        {
            StartCoroutine(ProcessCommands());
        }
    }

    private IEnumerator ProcessCommands()
    {
        isExecuting = true;

        while (commandQueue.Count > 0)
        {
            var command = commandQueue.Dequeue();
            Debug.Log($"[Unity] 실행 중: {command.action}");
            yield return ExecuteCommand(command);
        }

        isExecuting = false;
        SendCommandFinish(currentCommandId);
    }

    private IEnumerator ExecuteCommand(Command command)
    {
        switch (command.action)
        {
            case "takeoff_all":
                yield return ExecuteTakeoffAll(command.@params);
                break;

            case "land_all":
                yield return ExecuteLandAll(command.@params);
                break;

            case "set_formation":
                yield return ExecuteSetFormation(command.@params);
                break;

            case "move_formation":
                yield return ExecuteMoveFormation(command.@params);
                break;

            case "move_drone":
                yield return ExecuteMoveDrone(command.droneId, command.@params);
                break;

            case "rotate_drone":
                yield return ExecuteRotateDrone(command.droneId, command.@params);
                break;

            case "hover":
            case "wait":
                yield return ExecuteHover(command.@params);
                break;

            case "sync_all":
            case "wait_all":
                yield return ExecuteSyncAll();
                break;

            default:
                SendError($"알 수 없는 명령: {command.action}");
                break;
        }
    }

    // 명령 구현
    private IEnumerator ExecuteTakeoffAll(CommandParams p)
    {
        float altitude = p.altitude;
        float speed = p.speed;

        foreach (var drone in drones)
        {
            drone.TakeOff(altitude, speed);
        }

        // 모든 드론이 목표에 도달할 때까지 대기
        while (drones.Exists(d => !d.IsAtTargetAltitude()))
        {
            yield return null;
        }
    }

    private IEnumerator ExecuteLandAll(CommandParams p)
    {
        foreach (var drone in drones)
        {
            drone.Land(p.speed);
        }

        while (drones.Exists(d => !d.IsLanded()))
        {
            yield return null;
        }
    }

    private IEnumerator ExecuteSetFormation(CommandParams p)
    {
        Vector3 center = new Vector3(p.center.x, p.center.y, p.center.z);
        List<Vector3> positions = FormationController.CalculateFormation(
            p.formationType,
            droneCount,
            p.spacing,
            center,
            p.heading
        );

        for (int i = 0; i < drones.Count; i++)
        {
            drones[i].MoveTo(positions[i], 3.0f); // 기본 속도
        }

        while (drones.Exists(d => !d.IsAtTarget()))
        {
            yield return null;
        }
    }

    private IEnumerator ExecuteMoveFormation(CommandParams p)
    {
        Vector3 offset = GetDirectionVector(p.direction, p.distance);

        foreach (var drone in drones)
        {
            drone.MoveBy(offset, p.speed);
        }

        while (drones.Exists(d => !d.IsAtTarget()))
        {
            yield return null;
        }
    }

    private Vector3 GetDirectionVector(string direction, float distance)
    {
        switch (direction)
        {
            case "forward":  return new Vector3(0, 0, -distance);
            case "backward": return new Vector3(0, 0, distance);
            case "left":     return new Vector3(-distance, 0, 0);
            case "right":    return new Vector3(distance, 0, 0);
            case "up":       return new Vector3(0, -distance, 0);
            case "down":     return new Vector3(0, distance, 0);
            default:         return Vector3.zero;
        }
    }

    private IEnumerator ExecuteMoveDrone(int droneId, CommandParams p)
    {
        Drone drone = drones.Find(d => d.id == droneId);
        if (drone == null)
        {
            SendError($"드론을 찾을 수 없음: {droneId}");
            yield break;
        }

        Vector3 target = new Vector3(p.target.x, p.target.y, p.target.z);
        drone.MoveTo(target, p.speed);

        while (!drone.IsAtTarget())
        {
            yield return null;
        }
    }

    private IEnumerator ExecuteRotateDrone(int droneId, CommandParams p)
    {
        Drone drone = drones.Find(d => d.id == droneId);
        if (drone == null)
        {
            SendError($"드론을 찾을 수 없음: {droneId}");
            yield break;
        }

        drone.RotateTo(p.heading, p.speed);

        while (!drone.IsAtTargetRotation())
        {
            yield return null;
        }
    }

    private IEnumerator ExecuteHover(CommandParams p)
    {
        foreach (var drone in drones)
        {
            drone.Hover();
        }

        yield return new WaitForSeconds(p.duration);
    }

    private IEnumerator ExecuteSyncAll()
    {
        while (drones.Exists(d => d.IsMoving()))
        {
            yield return null;
        }
    }

    // 텔레메트리
    private void SendTelemetry()
    {
        var telemetryData = new TelemetryPayload
        {
            drones = drones.ConvertAll(d => new DroneTelemetry
            {
                id = d.id,
                position = new Vec3 { x = d.transform.position.x, y = d.transform.position.y, z = d.transform.position.z },
                rotation = new Vec3 { x = d.transform.eulerAngles.x, y = d.transform.eulerAngles.y, z = d.transform.eulerAngles.z },
                velocity = new Vec3 { x = d.velocity.x, y = d.velocity.y, z = d.velocity.z },
                battery = d.battery,
                armed = d.armed,
                mode = d.mode,
                status = d.status
            }),
            timestamp = (long)(Time.time * 1000)
        };

        SendMessage("telemetry", telemetryData);
    }

    // 메시지 전송
    private void SendMessage(string type, object payload = null)
    {
        var message = new UnityMessage
        {
            type = type,
            payload = payload,
            timestamp = (long)(Time.time * 1000)
        };

        string json = JsonConvert.SerializeObject(message);

#if UNITY_WEBGL && !UNITY_EDITOR
        HandleUnityMessage(json);
#else
        Debug.Log($"[Unity → React] {json}");
#endif
    }

    private void SendCommandFinish(string commandId)
    {
        var message = new UnityMessage
        {
            type = "command_finish",
            commandId = commandId,
            timestamp = (long)(Time.time * 1000)
        };

        string json = JsonConvert.SerializeObject(message);

#if UNITY_WEBGL && !UNITY_EDITOR
        HandleUnityMessage(json);
#else
        Debug.Log($"[Unity → React] {json}");
#endif
    }

    private void SendError(string errorMessage)
    {
        SendMessage("error", new { error = errorMessage });
    }

    private List<object> GetDronePositions()
    {
        return drones.ConvertAll(d => (object)new
        {
            droneId = d.id,
            position = new { x = d.transform.position.x, y = d.transform.position.y, z = d.transform.position.z }
        });
    }
}

// 메시지 구조 클래스
[System.Serializable]
public class UnityMessage
{
    public string type;
    public object payload;
    public long timestamp;
    public string commandId;
}

[System.Serializable]
public class InitConfig
{
    public int droneCount;
    public string startFormation;
    public float startAltitude;
    public float spacing;
}

[System.Serializable]
public class ExecuteScriptPayload
{
    public List<Command> commands;
}

[System.Serializable]
public class Command
{
    public string action;
    public CommandParams @params;
    public int droneId;
}

[System.Serializable]
public class CommandParams
{
    public float altitude;
    public float speed;
    public string formationType;
    public float spacing;
    public Vec3 center;
    public float heading;
    public string direction;
    public float distance;
    public Vec3 target;
    public float duration;
}

[System.Serializable]
public class Vec3
{
    public float x;
    public float y;
    public float z;
}

[System.Serializable]
public class TelemetryPayload
{
    public List<DroneTelemetry> drones;
    public long timestamp;
}

[System.Serializable]
public class DroneTelemetry
{
    public int id;
    public Vec3 position;
    public Vec3 rotation;
    public Vec3 velocity;
    public float battery;
    public bool armed;
    public string mode;
    public string status;
}
```

*(나머지 섹션 7-10, 부록 A-C는 길이 제한으로 인해 별도 파일로 제공하거나 요청 시 계속 작성하겠습니다)*

---

## 빠른 시작 체크리스트

Unity 통합을 위한 빠른 체크리스트:

- [ ] Unity 2021.3 LTS+ 설치
- [ ] Newtonsoft.Json 패키지 추가
- [ ] ReceiveMessage() 메서드가 있는 GameManager.cs 생성
- [ ] 이동 로직이 있는 Drone.cs 생성
- [ ] 패턴 계산이 있는 FormationController.cs 생성
- [ ] WebGL 빌드 설정 구성 (Gzip, 512MB 메모리)
- [ ] `Build/WebGL/`로 프로젝트 빌드
- [ ] `public/unity/Build/`로 빌드 파일 복사
- [ ] 초기화 핸드셰이크 테스트
- [ ] 10Hz에서 텔레메트리 확인
- [ ] 14개 명령 타입 모두 테스트
- [ ] 성능 프로파일링 실행 (30+ FPS 목표)
- [ ] 4개 이상 드론으로 대형 테스트

**총 예상 구현 시간**: 숙련된 Unity 개발자 기준 40-60시간

행운을 빕니다! 🚁
