# Interfaces Reference

## Purpose
- 외부 공개 API 문서가 아니라 작업자가 자주 확인하는 내부 인터페이스 참조서.
- 구현체의 모든 메서드 나열 대신 상태와 계약의 기준 정리.

## Connection Contracts
### ConnectionMode
연결 모드는 `src/services/connection/types.ts`의 상수를 기준으로 함.

- `UNITY`
- `MAVLINK`
- `TEST`

### ConnectionConfig
모든 연결은 `ConnectionConfig` 하나로 시작.

- `mode`: 필수
- `unityWebGL`: 임베드 Unity 빌드 정보
- `mavlink`: 실제 드론 연결 정보
- `test`: 더미 드론 수

### IConnectionService
모든 연결 구현체는 같은 계약을 따름.

- `connect(config)`
- `disconnect()`
- `sendCommands(commands, context?)`
- `getStatus()`
- `isConnected()`
- `setEventListeners(listeners)`
- `emergencyStop()`
- `ping()`
- `reset()`
- `cleanup()`

구현체는 `UnityWebGLConnectionService`, `MAVLinkConnectionService`, `TestConnectionService`.

`context`는 실행기와 연결 서비스 사이에서 배치 전송 문맥을 전달할 때 사용한다.
기본 기준은 `index`, `total`, `isLast`.

## Core Stores
### useConnectionStore
연결 UI와 런타임 연결 상태의 기준 스토어.

주요 state:
- `status`
- `mode`
- `error`
- `latestTelemetry`
- `testModeDroneCount`
- `mavlinkTransportType`, `mavlinkHost`, `mavlinkPort`, `mavlinkSerialDevice`, `mavlinkBaudRate`
- `formationMode`

주요 action:
- `setMode(...)`
- `setTestModeDroneCount(...)`
- `setMavlinkTransportType(...)`
- `setMavlinkHost(...)`
- `setMavlinkPort(...)`
- `setMavlinkSerialDevice(...)`
- `setMavlinkBaudRate(...)`
- `setFormationMode(...)`
- `connect()`
- `disconnect()`
- `updateTelemetry(...)`

이 스토어는 프로젝트 저장 구조를 바꾸지 않고, 현재 열린 프로젝트 안에서 재사용되는 런타임 연결 상태를 담당한다.

### useExecutionStore
Blockly 실행과 인터프리터 상태 관리.

주요 state:
- `status`
- `scenarioPlan`
- `scenarioSummary`
- `currentNodeId`
- `currentNodePath`
- `error`
- `drones`
- `interpreter`
- `commands` (runtime/debug 파생 결과)

주요 action:
- `setScenarioPlan(...)`
- `executeScript()`
- `stopExecution()`
- `pauseExecution()`
- `resumeExecution()`
- `handleMessage(...)`
- `updateExecutionState(...)`

`drones`는 `TEST` 모드 시뮬레이터와 `MAVLINK` 실시간 텔레메트리가 공통 `telemetry` 메시지 경계로 합류하는 현재 드론 상태의 기준값이다.

### useBlocklyStore
Blockly 워크스페이스와 시나리오 캐시 관리.

주요 state:
- `workspace`
- `scenarioPlan`
- `workspaceHash`
- `hasUnsavedChanges`

주요 action:
- `setWorkspace(...)`
- `setScenarioPlan(...)`
- `setCachedScenarioPlan(...)`
- `invalidateScenarioCache()`
- `setHasUnsavedChanges(...)`

### useTelemetryStore
시계열 telemetry history 저장.

주요 state:
- `history`
- `maxHistoryPoints`
- `maxTotalDataPoints`
- `isRecording`

주요 action:
- `addTelemetryData(drones)`
- `clearHistory()`
- `clearDroneHistory(droneId)`
- `startRecording()`
- `stopRecording()`

### useProjectStore
프로젝트 저장소와 Blockly XML 입출력 연결.

주요 state:
- `currentProject`
- `projects`
- `isLoading`
- `error`

주요 action:
- `createProject(options)`
- `saveCurrentProject(name?)`
- `loadProject(id)`
- `deleteProject(id)`
- `renameProject(id, newName)`
- `exportProjectToFile(id)`
- `importProjectFromFile(file)`
- `refreshProjectList()`

`currentProject`는 앱의 메인 작업 화면 진입 기준이다. 연결 여부와 무관하게 열린 프로젝트가 있으면 워크스페이스와 작업 컨텍스트를 유지한다.
다른 프로젝트로 전환하는 `createProject(...)` 또는 `loadProject(...)` 호출 시 활성 연결은 먼저 종료되어, 새 프로젝트 문맥에서 시뮬레이터/연결을 다시 시작하는 흐름을 기준으로 한다.

## Unity Message Boundary
Unity 경계에서는 JSON 메시지 사용.

- React → Unity: `ReactToUnityMessage`
- Unity → React: `UnityToReactMessage`
- 전송 채널: `sendMessage(..., JSON.stringify(message))`
- 수신 채널: `window.OnMessageToReact(messageJson)`

Unity 명령 변환은 `src/services/connection/unityMessage.ts` 담당.

## Blockly Runtime Boundary
- Blockly 변경 리스너는 generator 기반 평면 명령을 기준으로 하지 않음
- `parseBlocklyWorkspace()`가 단일 실행 모델(`ScenarioPlan`)을 생성
- `drone_set_speed`는 시나리오 속도 컨텍스트로 해석되고, 이동 명령 변환 시 적용
- MAVLink mission mode에서는 이동 명령의 `speed`가 별도 mission item으로 확장되지 않으며, 각 이동 블럭은 waypoint 1개로 유지됨
- MAVLink 미션 모드에서 `wait`는 GCS 지연이 아니라 `NAV_LOITER_TIME`으로 내려감
- MAVLink 미션 모드에서 `hover`는 `NAV_LOITER_UNLIM`으로 내려가며, 이후 진행 의미는 기체/오토파일럿 구현에 의존함

## Telemetry Boundary
Telemetry는 두 층으로 구분.

- 최신 연결 이벤트: `TelemetryData`
- 드론별 누적 history: `DroneHistory`, `DroneHistoryPoint`

MAVLink 3D 표시 기준:
- MAVLink 3D heading의 주 소스는 `ATTITUDE.yaw`이며, `rotation.y`는 해당 yaw를 degree/normalized 형태로 저장
- `ATTITUDE.yaw`는 추가 `+90도` 보정 없이 `rotation.y`로 정규화된다
- `GLOBAL_POSITION_INT.hdg`는 첫 `ATTITUDE` 수신 전 bootstrap fallback으로만 사용되며, `65535`는 unknown sentinel로 처리
- `Drone3DView`, 이동 계산, MAVLink 초기 카메라 배치는 같은 `rotation.y` scene yaw 기준을 사용
- mission/command 전송 경로는 표시용 `rotation.y`를 그대로 재사용하지 않고, 별도의 raw `mavlinkHeading` 값을 사용한다
- `MAVLinkConnectionService`의 mission cache와 planned target은 `sceneHeading`과 `mavlinkHeading`을 함께 유지하며, waypoint/rotate mission `param4`는 raw MAVLink heading 기준으로 생성된다
- MAVLink 시뮬레이터의 초기 yaw와 이동 중 yaw 계산도 같은 scene yaw 계약을 따르며, 수평면은 `x/y`, 높이는 `z`로 취급
- `Drone3DView`의 원뿔 mesh는 scene 전방축과 맞추기 위한 고정 회전 보정을 내부적으로 적용
- `rotation.set(rotation.x, rotation.y, rotation.z)` 호출 구조는 유지하며, heading source는 `hdg`가 아니라 `ATTITUDE.yaw`

실시간 단일 상태와 시계열 기록을 같은 개념으로 다루지 않음.

## When To Update This Document
- 스토어 action/state 변경 시 갱신
- 연결 설정 타입 변경 시 갱신
- Unity 메시지 형태 변경 시 갱신
- 새로운 연결 서비스 구현체 추가 시 갱신
