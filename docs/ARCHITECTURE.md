# Architecture

## Purpose
- 현재 코드베이스가 실제로 어떻게 동작하는지 설명하는 기준 문서.
- 미래 로드맵이나 구현 회고는 제외.

## Runtime Overview
애플리케이션은 `React + TypeScript + Vite` 기반 UI 위에 `Zustand` 스토어와 연결 서비스 계층을 올린 구조.

주요 흐름:
1. 사용자가 프로젝트를 생성하거나 연다
2. 앱은 현재 프로젝트를 기준으로 Blockly 워크스페이스를 유지한다
3. 사용자가 프로젝트 문맥 안에서 연결 모드를 선택하거나 변경한다
4. `ConnectionManager`가 선택된 연결 모드에 맞는 서비스 구현체 생성
5. 사용자가 Blockly 워크스페이스에서 시나리오 구성
6. `parseBlocklyWorkspace()`가 Blockly를 단일 `ScenarioPlan`(실행 트리)로 변환
7. `useExecutionStore`가 `ScenarioPlan`을 기준으로 `Interpreter` 구동
8. 연결 서비스가 Unity 임베드, 실제 드론 MAVLink, 테스트 모드 중 하나로 명령 전달
9. 연결 서비스가 전달한 telemetry와 상태 변경은 `useConnectionStore`와 `useTelemetryStore`에 반영

## Connection Model
현재 지원하는 연결 모드는 `src/services/connection/types.ts`의 `ConnectionMode`를 기준으로 함.

- `UNITY`: 브라우저 안에 임베드된 Unity WebGL과 직접 통신
- `MAVLINK`: MAVLink UDP/Serial 기반 실제 드론 연결
- `TEST`: 더미 드론 상태로 동작하는 로컬 테스트 모드

### Unity WebGL
Unity는 별도 WebSocket 서버가 아니라 브라우저 안에 로드되는 임베드 런타임.

- React → Unity: `useUnityBridge`가 `sendMessage("DroneManager", "OnReceiveJson", JSON.stringify(message))` 호출
- Unity → React: 전역 콜백 `window.OnMessageToReact(...)`를 통해 JSON 메시지 수신
- `UnityWebGLConnectionService`는 브리지 준비 상태와 명령 전송 관리

즉, Unity 경로의 기본 모델은 “임베드 + JSON 브리지”.

### MAVLink and Test
- `MAVLINK`는 `MAVLinkConnectionService`가 처리
- `TEST`는 `TestConnectionService`와 `DroneSimulator` 기반 로컬 시뮬레이션으로 처리
- 브리지 서버는 `server/bridge-server.mjs`에 있으며 MAVLink 경로 지원에 사용

## State Responsibilities
상태는 하나의 거대한 스토어가 아니라 역할별로 분리.

- `useConnectionStore`: 연결 모드, 연결 상태, 최신 telemetry, 연결 설정
- `useExecutionStore`: 실행 상태, 현재 노드, 인터프리터, 드론 상태, `scenarioPlan/summary`
- `useTelemetryStore`: 시계열 telemetry history 저장과 pruning
- `useBlocklyStore`: 워크스페이스 참조, `scenarioPlan` 캐시, 저장 여부
- `useProjectStore`: 프로젝트 생성, 저장, 불러오기, 내보내기

프로젝트가 레이아웃 진입 기준이며, 연결 상태는 프로젝트 내부 런타임 상태로 다룬다. 연결이 끊겨도 열린 프로젝트와 워크스페이스는 유지된다.

`useConnectionStore.latestTelemetry`는 가장 최근 연결 이벤트 보관 값. 장기 기록과 시각화용 history는 `useTelemetryStore`가 관리.

## Execution and Data Flow
### Scenario Execution
1. `useExecutionStore.executeScript()`가 Blockly XML 읽기
2. 캐시가 유효하면 `scenarioPlan`을 재사용하고, 아니면 `parseBlocklyWorkspace()`로 재생성
3. `Interpreter`가 `scenarioPlan`을 실행하며, 이동 명령에는 시나리오 속도 컨텍스트를 적용
4. 실행 상태는 `ExecutionState`를 통해 스토어에 반영

### Blockly Model
- 사용자 블록은 의도 중심 카테고리(`비행/이동/군집/제어/변수·판단/설정`)로 구성
- 블록 레지스트리(`src/components/blockly/registry.ts`)가 카테고리/툴박스 기본값의 단일 소스
- `mission_*`, `drone_rc_control`은 사용자 toolbox에서 제거되며 파서에서도 지원하지 않음

### Telemetry Flow
1. 연결 서비스가 `ConnectionEventListeners.onTelemetry` 호출
2. `useConnectionStore`가 최신 telemetry 갱신
3. `TestConnectionService`와 `MAVLinkConnectionService`는 표준 `telemetry` 메시지로 `useExecutionStore.drones`를 갱신
4. 실행/시각화 계층이 드론 상태와 telemetry 소비
5. `useTelemetryStore`는 드론별 history를 쌓고 최대 개수 기준으로 pruning

## Key Source Files
- `src/App.tsx`: 전체 레이아웃과 프로젝트 기준 화면 전환
- `src/services/connection/ConnectionManager.ts`: 연결 서비스 선택과 이벤트 위임
- `src/hooks/useUnityBridge.ts`: Unity WebGL JSON 브리지
- `src/stores/useConnectionStore.ts`: 연결 상태 진입점
- `src/stores/useExecutionStore.ts`: Blockly 실행 진입점

## When To Update This Document
- 연결 모드 추가/삭제 시 갱신
- Unity/Telemetry 흐름 변경 시 갱신
- 스토어 책임 이동 시 갱신
- 실행 파이프라인의 기준 진입점 변경 시 갱신
