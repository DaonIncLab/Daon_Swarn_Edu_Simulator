# Debug Guide

## Connection Checks
`useConnectionStore` 상태 확인.

```js
console.log(useConnectionStore.getState().status)
console.log(useConnectionStore.getState().mode)
console.log(useConnectionStore.getState().latestTelemetry)
```

기대값:
- `status`는 `connected`
- `mode`는 현재 선택 모드와 일치
- telemetry가 들어오는 모드라면 `latestTelemetry`가 갱신

## Unity WebGL Path
Unity는 외부 WebSocket 서버가 아니라 임베드 JSON 브리지.

확인 포인트:
- Unity 빌드가 로드되었는지
- `useUnityBridge`의 `isReady`가 `true`인지
- `window.OnMessageToReact`가 등록되었는지
- `sendMessage("DroneManager", "OnReceiveJson", ...)` 호출 후 오류가 없는지

브라우저 콘솔에서 확인:

```js
console.log(typeof window.OnMessageToReact)
```

## Execution Checks
Blockly 실행 시작 여부 확인.

```js
console.log(useExecutionStore.getState().status)
console.log(useExecutionStore.getState().currentNodeId)
console.log(useExecutionStore.getState().error)
```

확인 순서:
1. Blockly workspace 비어 있지 않은지 확인
2. 연결 서비스 생성 여부 확인
3. 실행 상태가 `idle -> running -> completed` 또는 `error`로 이동하는지 확인

## Telemetry Checks
Telemetry는 최신 이벤트와 history로 분리해서 확인.

```js
console.log(useConnectionStore.getState().latestTelemetry)
console.log(useTelemetryStore.getState().getTotalDataPoints())
console.log(useTelemetryStore.getState().getAllHistory())
```

문제 유형:
- 최신 telemetry는 오는데 history가 비어 있음: `addTelemetryData(...)` 호출 경로 확인
- history는 있는데 UI가 갱신되지 않음: 소비 컴포넌트의 selector 확인
- 드론 상태는 바뀌는데 telemetry가 안 보임: 연결 서비스의 `onTelemetry` 이벤트 확인

## MAVLink / Bridge Checks
- 브리지 서버가 필요하면 `npm run bridge` 실행 여부 확인
- `/mavlink` 경로와 포트 설정이 현재 코드와 맞는지 확인
- UDP/Serial 설정값이 `useConnectionStore`와 일치하는지 확인

## When To Update This Document
- Unity 브리지 방식 변경 시 갱신
- telemetry 저장 위치나 소비 방식 변경 시 갱신
- 디버깅 시 항상 확인해야 하는 기준 상태 변경 시 갱신
