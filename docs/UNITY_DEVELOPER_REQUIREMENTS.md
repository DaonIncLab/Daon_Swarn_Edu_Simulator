# Unity 시뮬레이터 개발 요청사항

## 개요

Drone Swarm GCS 웹 앱과 연동되는 Unity 드론 시뮬레이터 개발을 위한 요구사항입니다.

---

## 1. 통신 프로토콜

### 1.1 연결 방식

**WebSocket Server** 구현이 필요합니다.

| 항목 | 값 |
|------|-----|
| 프로토콜 | WebSocket |
| 기본 포트 | 8080 |
| 메시지 형식 | JSON |
| 인코딩 | UTF-8 |

### 1.2 연결 흐름

```
[React 웹 앱] ---(WebSocket)---> [Unity 시뮬레이터]
     |                                    |
     |<--------- 텔레메트리 -------------|
     |---------- 명령 ------------------>|
     |<--------- ACK/완료/에러 ----------|
```

---

## 2. 메시지 형식

### 2.1 React → Unity (명령)

#### 2.1.1 스크립트 실행 (execute_script)

```json
{
  "type": "execute_script",
  "commands": [
    {
      "action": "TAKEOFF_ALL",
      "params": {
        "altitude": 5
      }
    },
    {
      "action": "SET_FORMATION",
      "params": {
        "type": "CIRCLE",
        "spacing": 2
      }
    }
  ],
  "timestamp": 1700000000000
}
```

#### 2.1.2 비상 정지 (emergency_stop)

```json
{
  "type": "emergency_stop",
  "timestamp": 1700000000000
}
```

#### 2.1.3 핑 (ping)

```json
{
  "type": "ping",
  "timestamp": 1700000000000
}
```

---

### 2.2 Unity → React (응답)

#### 2.2.1 텔레메트리 (telemetry) - **주기적 전송 필수**

```json
{
  "type": "telemetry",
  "drones": [
    {
      "id": 1,
      "position": { "x": 0.0, "y": 0.0, "z": 5.0 },
      "rotation": { "x": 0.0, "y": 0.0, "z": 0.0 },
      "velocity": { "x": 0.0, "y": 0.0, "z": 0.0 },
      "battery": 95,
      "isActive": true,
      "status": "flying"
    },
    {
      "id": 2,
      "position": { "x": 2.0, "y": 0.0, "z": 5.0 },
      "rotation": { "x": 0.0, "y": 0.0, "z": 0.0 },
      "velocity": { "x": 0.0, "y": 0.0, "z": 0.0 },
      "battery": 92,
      "isActive": true,
      "status": "flying"
    }
  ],
  "timestamp": 1700000000000
}
```

**전송 주기**: 100ms (10Hz) 권장

#### 2.2.2 명령 완료 (command_finish)

```json
{
  "type": "command_finish",
  "commandIndex": 0,
  "message": "Takeoff completed",
  "timestamp": 1700000000000
}
```

#### 2.2.3 확인 응답 (ack)

```json
{
  "type": "ack",
  "message": "Script received",
  "timestamp": 1700000000000
}
```

#### 2.2.4 에러 (error)

```json
{
  "type": "error",
  "error": "Invalid command parameters",
  "commandIndex": 2,
  "timestamp": 1700000000000
}
```

#### 2.2.5 퐁 (pong)

```json
{
  "type": "pong",
  "timestamp": 1700000000000
}
```

---

## 3. 지원해야 할 명령어

### 3.1 기본 제어 명령

| Action | 설명 | Parameters |
|--------|------|------------|
| `TAKEOFF_ALL` | 전체 드론 이륙 | `altitude`: number (미터) |
| `LAND_ALL` | 전체 드론 착륙 | `speed?`: number |
| `HOVER` | 현재 위치에서 호버링 | `duration`: number (초) |
| `EMERGENCY_STOP` | 비상 정지 | - |
| `SYNC_ALL` | 모든 드론 동기화 (현재 명령 완료 대기) | - |

### 3.2 대형(Formation) 명령

| Action | 설명 | Parameters |
|--------|------|------------|
| `SET_FORMATION` | 대형 설정 | `type`, `spacing`, `rows?`, `cols?`, `radius?` |
| `MOVE_FORMATION` | 대형 전체 이동 | `direction`, `distance`, `speed?` |

**FormationType 값**:
- `LINE` - 일렬
- `GRID` - 격자
- `CIRCLE` - 원형
- `V_SHAPE` - V자형
- `TRIANGLE` - 삼각형
- `SQUARE` - 정사각형
- `DIAMOND` - 마름모

**Direction 값**:
- `FORWARD`, `BACKWARD`, `LEFT`, `RIGHT`, `UP`, `DOWN`

### 3.3 개별 드론 명령

| Action | 설명 | Parameters |
|--------|------|------------|
| `MOVE_DRONE` | 특정 드론 이동 | `droneId`, `x`, `y`, `z`, `speed?` |
| `ROTATE_DRONE` | 특정 드론 회전 | `droneId`, `yaw` |

### 3.4 웨이포인트 미션 명령

| Action | 설명 | Parameters |
|--------|------|------------|
| `ADD_WAYPOINT` | 웨이포인트 추가 | `waypoint`: { id, name?, x, y, z, speed?, holdTime? } |
| `GOTO_WAYPOINT` | 웨이포인트로 이동 | `waypointId`, `speed?` |
| `EXECUTE_MISSION` | 전체 미션 실행 | `loop?`, `speed?` |
| `CLEAR_WAYPOINTS` | 웨이포인트 초기화 | - |

### 3.5 대기 명령

| Action | 설명 | Parameters |
|--------|------|------------|
| `WAIT` | 지정 시간 대기 | `duration`: number (초) |

---

## 4. 드론 상태 (DroneState)

### 4.1 필수 필드

```typescript
interface DroneState {
  id: number              // 드론 고유 ID (1부터 시작)
  position: {
    x: number             // 미터
    y: number             // 미터
    z: number             // 고도 (미터)
  }
  rotation: {
    x: number             // pitch (도)
    y: number             // roll (도)
    z: number             // yaw (도)
  }
  velocity: {
    x: number             // m/s
    y: number             // m/s
    z: number             // m/s
  }
  battery: number         // 0-100 (%)
  isActive: boolean       // 활성화 여부
  status: DroneStatus     // 현재 상태
}
```

### 4.2 DroneStatus 값

| 값 | 설명 |
|----|------|
| `idle` | 대기 중 (지상) |
| `flying` | 비행 중 |
| `landed` | 착륙 완료 |
| `hovering` | 호버링 |
| `error` | 오류 발생 |

---

## 5. 대형 배치 알고리즘

Unity에서 각 대형에 맞게 드론 위치를 계산해야 합니다.

### 5.1 LINE (일렬)

```
드론 4대, spacing=2m:
○ ○ ○ ○
(-3, 0) (-1, 0) (1, 0) (3, 0)
```

### 5.2 CIRCLE (원형)

```
드론 4대:
    ○ (0, r)
  ○     ○
(-r, 0)  (r, 0)
    ○ (0, -r)

반지름 = (spacing × droneCount) / (2π)
```

### 5.3 GRID (격자)

```
드론 6대, 3x2 격자:
○ ○ ○
○ ○ ○
```

### 5.4 V_SHAPE (V자형)

```
드론 5대:
    ○
  ○   ○
○       ○
```

### 5.5 TRIANGLE (삼각형)

```
드론 6대:
    ○
   ○ ○
  ○ ○ ○
```

### 5.6 SQUARE (정사각형)

```
드론 8대:
○ ○ ○
○   ○
○ ○ ○
```

### 5.7 DIAMOND (마름모)

```
드론 8대:
    ○
  ○   ○
○       ○
  ○   ○
    ○
```

---

## 6. 구현 요구사항

### 6.1 필수 기능

1. **WebSocket 서버**
   - 포트: 8080 (설정 가능)
   - 다중 클라이언트 연결 지원
   - 자동 재연결 처리

2. **텔레메트리 스트리밍**
   - 10Hz (100ms 간격) 전송
   - 모든 드론 상태 포함

3. **명령 순차 실행**
   - `execute_script`로 받은 명령을 순서대로 실행
   - 각 명령 완료 시 `command_finish` 전송

4. **대형 전환**
   - 부드러운 전환 (즉시 텔레포트 X)
   - 충돌 회피

5. **배터리 시뮬레이션**
   - 비행 중 점진적 감소
   - 초기값: 100%

### 6.2 권장 기능

1. **물리 시뮬레이션**
   - 현실적인 드론 움직임
   - 가속/감속

2. **충돌 감지**
   - 드론 간 충돌 방지
   - 장애물 충돌

3. **카메라 뷰**
   - 전체 뷰
   - 개별 드론 추적

4. **시각적 피드백**
   - 드론 상태별 색상
   - 비행 경로 표시
   - 대형 가이드라인

### 6.3 설정 옵션

| 설정 | 기본값 | 설명 |
|------|--------|------|
| 드론 수 | 4 | 시뮬레이션 드론 개수 |
| 기본 속도 | 2 m/s | 이동 속도 |
| 이륙 고도 | 5 m | 기본 이륙 높이 |
| 텔레메트리 주기 | 100 ms | 전송 간격 |

---

## 7. 테스트 시나리오

### 7.1 기본 테스트

```json
{
  "type": "execute_script",
  "commands": [
    { "action": "TAKEOFF_ALL", "params": { "altitude": 5 } },
    { "action": "WAIT", "params": { "duration": 2 } },
    { "action": "SET_FORMATION", "params": { "type": "CIRCLE", "spacing": 2 } },
    { "action": "WAIT", "params": { "duration": 3 } },
    { "action": "MOVE_FORMATION", "params": { "direction": "FORWARD", "distance": 5 } },
    { "action": "WAIT", "params": { "duration": 2 } },
    { "action": "LAND_ALL", "params": {} }
  ]
}
```

### 7.2 웨이포인트 미션 테스트

```json
{
  "type": "execute_script",
  "commands": [
    { "action": "TAKEOFF_ALL", "params": { "altitude": 5 } },
    { "action": "ADD_WAYPOINT", "params": { "waypoint": { "id": "WP1", "x": 10, "y": 0, "z": 5, "holdTime": 2 } } },
    { "action": "ADD_WAYPOINT", "params": { "waypoint": { "id": "WP2", "x": 10, "y": 10, "z": 5, "holdTime": 2 } } },
    { "action": "ADD_WAYPOINT", "params": { "waypoint": { "id": "WP3", "x": 0, "y": 10, "z": 5, "holdTime": 2 } } },
    { "action": "EXECUTE_MISSION", "params": { "loop": false } },
    { "action": "LAND_ALL", "params": {} }
  ]
}
```

---

## 8. 에러 처리

### 8.1 에러 코드

| 코드 | 설명 |
|------|------|
| `INVALID_COMMAND` | 알 수 없는 명령어 |
| `INVALID_PARAMS` | 잘못된 파라미터 |
| `DRONE_NOT_FOUND` | 존재하지 않는 드론 ID |
| `WAYPOINT_NOT_FOUND` | 존재하지 않는 웨이포인트 |
| `LOW_BATTERY` | 배터리 부족 |
| `COLLISION` | 충돌 감지 |

### 8.2 에러 응답 예시

```json
{
  "type": "error",
  "error": "INVALID_PARAMS: altitude must be positive",
  "commandIndex": 0,
  "timestamp": 1700000000000
}
```

---

## 9. 개발 일정 제안

| 단계 | 내용 | 예상 기간 |
|------|------|-----------|
| 1 | WebSocket 서버 + 기본 통신 | 1-2일 |
| 2 | 드론 생성 + 텔레메트리 전송 | 1-2일 |
| 3 | 기본 명령 (이륙/착륙/이동) | 2-3일 |
| 4 | 대형 시스템 (7가지) | 3-4일 |
| 5 | 웨이포인트 미션 | 2-3일 |
| 6 | 시각화 + 폴리싱 | 2-3일 |
| **총계** | | **11-17일** |

---

## 10. 참고 자료

### 10.1 웹 앱 저장소

- GitHub: `drone-swarm-gcs`
- 브랜치: `feature/phase2-mavlink`

### 10.2 관련 파일

- `src/types/websocket.ts` - 메시지 타입 정의
- `src/types/unity.ts` - Unity 관련 타입
- `src/services/connection/WebSocketConnectionService.ts` - WebSocket 클라이언트
- `src/constants/commands.ts` - 명령어 상수

### 10.3 테스트 방법

1. 웹 앱 실행: `npm run dev`
2. 연결 모드: "시뮬레이션" 선택
3. IP/포트 설정 후 연결
4. Blockly에서 프로그램 작성 후 실행

---

## 11. 질문 및 연락

개발 중 궁금한 사항이 있으면 언제든 문의해주세요.

- 메시지 형식 변경 가능
- 추가 명령어 요청 가능
- 파라미터 조정 가능

---

**문서 버전**: 1.0
**최종 수정일**: 2025년 11월 25일
