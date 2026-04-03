# Diagrams

## Runtime Overview

```mermaid
flowchart LR
    UI[React UI] --> Blockly[Blockly Workspace]
    UI --> Stores[Zustand Stores]
    Blockly --> Execution[Interpreter / Execution]
    Execution --> Manager[ConnectionManager]
    Manager --> Unity[Unity WebGL]
    Manager --> WS[WebSocket Simulation]
    Manager --> MAV[MAVLink Service]
    Manager --> Test[Test Service]
```

## Unity Embedded Bridge

```mermaid
sequenceDiagram
    participant React
    participant Bridge as useUnityBridge
    participant Unity

    React->>Bridge: executeCommands(commands)
    Bridge->>Unity: sendMessage(..., JSON.stringify(message))
    Unity-->>Bridge: window.OnMessageToReact(messageJson)
    Bridge-->>React: onMessage / onError
```

## Telemetry Flow

```mermaid
flowchart TD
    Service[Connection Service] --> Listener[onTelemetry listener]
    Listener --> ConnectionStore[useConnectionStore.latestTelemetry]
    Listener --> TelemetryStore[useTelemetryStore.history]
    ConnectionStore --> UI[Status / latest telemetry UI]
    TelemetryStore --> Charts[Charts / playback / history views]
```

## Notes
- Unity 경로는 임베드 브리지 기준
- WebSocket은 외부 시뮬레이터 또는 브리지 경로에서만 기본 모델로 봄
- 상세 구현 이력은 `docs/archive/` 참고
