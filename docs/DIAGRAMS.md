# System Diagrams

This document contains visual diagrams for understanding the Drone Swarm GCS architecture using Mermaid notation.

## Table of Contents

- [System Architecture Overview](#system-architecture-overview)
- [Connection Strategy Pattern](#connection-strategy-pattern)
- [Execution Flow](#execution-flow)
- [Telemetry Data Flow](#telemetry-data-flow)
- [Component Hierarchy](#component-hierarchy)
- [State Management](#state-management)
- [Flight Recording Flow](#flight-recording-flow)
- [Project Storage Flow](#project-storage-flow)

---

## System Architecture Overview

High-level view of the system architecture showing major modules and their interactions.

```mermaid
graph TB
    subgraph "Presentation Layer"
        UI[React Components]
        Blockly[Blockly Workspace]
        Visualizer[3D Visualizer]
        Charts[Telemetry Charts]
    end

    subgraph "State Management Layer"
        BlocklyStore[BlocklyStore]
        ExecutionStore[ExecutionStore]
        ConnectionStore[ConnectionStore]
        TelemetryStore[TelemetryStore]
        RecordingStore[RecordingStore]
        ProjectStore[ProjectStore]
    end

    subgraph "Service Layer"
        ConnectionMgr[ConnectionManager]
        Interpreter[Interpreter]
        ProjectService[ProjectService]
        StorageAdapter[StorageAdapter]
    end

    subgraph "Connection Strategies"
        WebSocket[WebSocketService]
        UnityWebGL[UnityWebGLService]
        TestMode[TestConnectionService]
        MAVLink[MAVLinkService]
    end

    subgraph "External Systems"
        UnitySimulator[Unity Simulator]
        RealDrone[Real Drones]
        Browser[Browser Storage]
    end

    UI --> BlocklyStore
    UI --> ExecutionStore
    UI --> ConnectionStore
    UI --> TelemetryStore
    UI --> RecordingStore
    UI --> ProjectStore

    Blockly --> BlocklyStore
    Visualizer --> TelemetryStore
    Charts --> TelemetryStore

    ExecutionStore --> Interpreter
    ConnectionStore --> ConnectionMgr
    RecordingStore --> TelemetryStore
    ProjectStore --> ProjectService

    Interpreter --> ConnectionMgr
    ConnectionMgr --> WebSocket
    ConnectionMgr --> UnityWebGL
    ConnectionMgr --> TestMode
    ConnectionMgr --> MAVLink

    ProjectService --> StorageAdapter
    StorageAdapter --> Browser

    WebSocket --> UnitySimulator
    UnityWebGL --> UnitySimulator
    MAVLink --> RealDrone
    TestMode -.->|Simulated| TestMode

    style UI fill:#e3f2fd
    style Blockly fill:#e3f2fd
    style Visualizer fill:#e3f2fd
    style Charts fill:#e3f2fd
    style BlocklyStore fill:#fff3e0
    style ExecutionStore fill:#fff3e0
    style ConnectionStore fill:#fff3e0
    style TelemetryStore fill:#fff3e0
    style RecordingStore fill:#fff3e0
    style ProjectStore fill:#fff3e0
    style ConnectionMgr fill:#e8f5e9
    style Interpreter fill:#e8f5e9
    style ProjectService fill:#e8f5e9
    style StorageAdapter fill:#e8f5e9
```

---

## Connection Strategy Pattern

UML class diagram showing the Strategy Pattern implementation for connection services.

```mermaid
classDiagram
    class IConnectionService {
        <<interface>>
        +connect(config) Promise~void~
        +disconnect() Promise~void~
        +sendCommand(command) Promise~CommandResponse~
        +sendCommands(commands) Promise~CommandResponse~
        +emergencyStop() Promise~CommandResponse~
        +getStatus() ConnectionStatus
        +isConnected() boolean
        +ping() Promise~number~
        +setEventListeners(listeners) void
        +cleanup() void
    }

    class ConnectionManager {
        -currentService: IConnectionService
        -currentMode: ConnectionMode
        -config: ConnectionConfig
        -listeners: ConnectionEventListeners
        +connect(config) Promise~void~
        +disconnect() Promise~void~
        +sendCommand(command) Promise~CommandResponse~
        +sendCommands(commands) Promise~CommandResponse~
        +emergencyStop() Promise~CommandResponse~
        +getStatus() ConnectionStatus
        +isConnected() boolean
        +getCurrentMode() ConnectionMode
        +switchMode(config) Promise~void~
        +cleanup() void
        -createService(mode) IConnectionService
    }

    class WebSocketConnectionService {
        -ws: WebSocket
        -status: ConnectionStatus
        -listeners: ConnectionEventListeners
        +connect(config) Promise~void~
        +disconnect() Promise~void~
        +sendCommand(command) Promise~CommandResponse~
        -handleMessage(message) void
        -reconnect() void
    }

    class UnityWebGLConnectionService {
        -messageQueue: Command[]
        -status: ConnectionStatus
        -listeners: ConnectionEventListeners
        +connect(config) Promise~void~
        +sendCommand(command) Promise~CommandResponse~
        -sendToUnity(data) void
        -receiveFromUnity(message) void
    }

    class TestConnectionService {
        -dummyDrones: Map~number, DummyDrone~
        -intervalId: number
        -status: ConnectionStatus
        +connect(config) Promise~void~
        +disconnect() Promise~void~
        +sendCommand(command) Promise~CommandResponse~
        -simulateDroneMovement() void
        -updateDronePositions() void
    }

    class MAVLinkConnectionService {
        -connection: MAVLinkConnection
        -status: ConnectionStatus
        +connect(config) Promise~void~
        +sendCommand(command) Promise~CommandResponse~
        -parseMAVLinkMessage(message) void
    }

    IConnectionService <|.. WebSocketConnectionService
    IConnectionService <|.. UnityWebGLConnectionService
    IConnectionService <|.. TestConnectionService
    IConnectionService <|.. MAVLinkConnectionService
    ConnectionManager o-- IConnectionService : uses
```

---

## Execution Flow

Sequence diagram showing the complete execution flow from user action to drone commands.

```mermaid
sequenceDiagram
    actor User
    participant UI as BlocklyWorkspace UI
    participant ExecutionStore
    participant BlocklyStore
    participant Interpreter
    participant ConnectionMgr as ConnectionManager
    participant Service as Connection Service
    participant Drone as Drone/Simulator

    User->>UI: Click "Run" button
    UI->>ExecutionStore: executeScript()

    ExecutionStore->>BlocklyStore: getWorkspace()
    BlocklyStore-->>ExecutionStore: workspace

    ExecutionStore->>ExecutionStore: Calculate workspace hash
    ExecutionStore->>BlocklyStore: getWorkspaceHash()

    alt Cache hit
        BlocklyStore-->>ExecutionStore: cached tree
        ExecutionStore->>ExecutionStore: Use cached tree
    else Cache miss
        ExecutionStore->>ExecutionStore: parseBlocklyWorkspace()
        ExecutionStore->>BlocklyStore: setCachedParsedTree(tree, hash)
    end

    ExecutionStore->>Interpreter: new Interpreter(tree)
    ExecutionStore->>Interpreter: start()

    activate Interpreter

    loop For each node in AST
        Interpreter->>Interpreter: executeNode(node)

        alt Check pause
            Interpreter->>Interpreter: checkPause()
            Note over Interpreter: Wait if paused
        end

        alt Command node
            Interpreter->>ConnectionMgr: sendCommand(command)
            ConnectionMgr->>Service: sendCommand(command)
            Service->>Drone: Send command
            Drone-->>Service: Acknowledgment
            Service-->>ConnectionMgr: CommandResponse
            ConnectionMgr-->>Interpreter: CommandResponse
        end

        alt Control flow node (if/while/repeat)
            Interpreter->>Interpreter: Evaluate condition
            Interpreter->>Interpreter: Execute child nodes
        end

        Interpreter->>ExecutionStore: updateExecutionState()
        ExecutionStore->>UI: Notify state change
        UI-->>User: Update UI
    end

    Interpreter->>ExecutionStore: updateState(status: 'completed')
    deactivate Interpreter

    ExecutionStore->>UI: Execution complete
    UI-->>User: Show completion message
```

---

## Telemetry Data Flow

Sequence diagram showing how telemetry data flows from drones to UI components.

```mermaid
sequenceDiagram
    participant Drone as Drone/Simulator
    participant Service as Connection Service
    participant ConnectionStore
    participant TelemetryStore
    participant Visualizer as 3D Visualizer
    participant Charts as Telemetry Charts
    participant Recording as RecordingStore

    loop Continuous telemetry stream
        Drone->>Service: Send telemetry data
        Service->>Service: Parse drone state
        Service->>ConnectionStore: Update connection state
        Service->>ConnectionStore: onTelemetryUpdate(drones)

        ConnectionStore->>TelemetryStore: addTelemetryData(drones)

        activate TelemetryStore
        TelemetryStore->>TelemetryStore: Update drone histories
        TelemetryStore->>TelemetryStore: Check memory limits

        alt Exceeds maxTotalDataPoints
            TelemetryStore->>TelemetryStore: Prune oldest data
        end

        TelemetryStore->>TelemetryStore: Update selectedDroneId if needed
        deactivate TelemetryStore

        TelemetryStore-->>Visualizer: Notify state change
        TelemetryStore-->>Charts: Notify state change

        Visualizer->>Visualizer: Update 3D scene
        Charts->>Charts: Update chart data

        alt Recording active
            TelemetryStore->>Recording: Check if recording
            Recording->>Recording: Append telemetry data
            Recording->>Recording: Check storage size

            alt Exceeds storage limit
                Recording->>Recording: Remove oldest recordings
            end
        end
    end
```

---

## Component Hierarchy

Tree diagram showing the React component hierarchy with Error Boundary placement.

```mermaid
graph TD
    App[App.tsx]

    App --> EB1[ErrorBoundary]
    EB1 --> Header[Header]

    App --> EB2[ErrorBoundary]
    EB2 --> NavPanel[NavigationPanel]

    App --> EB3[ErrorBoundary]
    EB3 --> BlocklyWS[BlocklyWorkspace]
    BlocklyWS --> BlocklyEditor[BlocklyEditor]
    BlocklyWS --> ExecutionControls[ExecutionControls]

    App --> EB4[ErrorBoundary]
    EB4 --> SimPanel[SimulatorPanel]
    SimPanel --> ConnSettings[ConnectionSettings]
    SimPanel --> DroneStatusBtn[DroneStatusButton]
    SimPanel --> DroneStatusModal[DroneStatusModal]

    App --> EB5[ErrorBoundary]
    EB5 --> MonPanel[MonitoringPanel]
    MonPanel --> TelemetryDash[TelemetryDashboard]
    TelemetryDash --> View3D[3DVisualizerView]
    TelemetryDash --> ChartsView[ChartsView]
    TelemetryDash --> DroneList[DroneListView]

    MonPanel --> RecPanel[RecordingPanel]
    RecPanel --> RecControls[RecordingControls]
    RecPanel --> PlaybackControls[PlaybackControls]
    RecPanel --> RecList[RecordingList]

    App --> EB6[ErrorBoundary]
    EB6 --> SettingsPanel[SettingsPanel]

    View3D --> DroneModel[DroneModel]
    View3D --> Grid[GridHelper]

    ChartsView --> BatteryChart[BatteryChart]
    ChartsView --> AltitudeChart[AltitudeChart]
    ChartsView --> VelocityChart[VelocityChart]

    DroneList --> DroneCard[DroneCard]

    style App fill:#1976d2,color:#fff
    style EB1 fill:#f44336,color:#fff
    style EB2 fill:#f44336,color:#fff
    style EB3 fill:#f44336,color:#fff
    style EB4 fill:#f44336,color:#fff
    style EB5 fill:#f44336,color:#fff
    style EB6 fill:#f44336,color:#fff
    style Header fill:#4caf50
    style NavPanel fill:#4caf50
    style BlocklyWS fill:#4caf50
    style SimPanel fill:#4caf50
    style MonPanel fill:#4caf50
    style SettingsPanel fill:#4caf50
```

---

## State Management

Diagram showing all Zustand stores and their relationships.

```mermaid
graph TB
    subgraph "Zustand Stores"
        BlocklyStore[BlocklyStore<br/>- workspace<br/>- parsedTree<br/>- workspaceHash<br/>- hasUnsavedChanges]

        ExecutionStore[ExecutionStore<br/>- status<br/>- currentNodePath<br/>- logs<br/>- variables]

        ConnectionStore[ConnectionStore<br/>- status<br/>- mode<br/>- config<br/>- drones<br/>- manager]

        TelemetryStore[TelemetryStore<br/>- droneHistories<br/>- selectedDroneId<br/>- maxHistoryPoints<br/>- maxTotalDataPoints]

        RecordingStore[RecordingStore<br/>- recordings<br/>- recording state<br/>- playback state]

        ProjectStore[ProjectStore<br/>- projects<br/>- currentProjectId<br/>- autoSave settings]
    end

    subgraph "Components"
        BlocklyWS[BlocklyWorkspace]
        ExecControls[ExecutionControls]
        ConnSettings[ConnectionSettings]
        TelemetryDash[TelemetryDashboard]
        RecPanel[RecordingPanel]
        ProjectMgr[ProjectManager]
    end

    BlocklyWS --> BlocklyStore
    BlocklyWS --> ProjectStore

    ExecControls --> ExecutionStore
    ExecControls --> BlocklyStore

    ConnSettings --> ConnectionStore

    TelemetryDash --> TelemetryStore
    TelemetryDash --> ConnectionStore

    RecPanel --> RecordingStore
    RecPanel --> TelemetryStore

    ProjectMgr --> ProjectStore
    ProjectMgr --> BlocklyStore

    ExecutionStore -.->|reads| BlocklyStore
    ExecutionStore -.->|uses| ConnectionStore

    RecordingStore -.->|reads| TelemetryStore

    ProjectStore -.->|saves/loads| BlocklyStore

    style BlocklyStore fill:#fff3e0
    style ExecutionStore fill:#e3f2fd
    style ConnectionStore fill:#e8f5e9
    style TelemetryStore fill:#f3e5f5
    style RecordingStore fill:#fce4ec
    style ProjectStore fill:#e0f2f1
```

---

## Flight Recording Flow

State machine diagram for flight recording and playback.

```mermaid
stateDiagram-v2
    [*] --> Idle

    Idle --> Recording : startRecording()
    Recording --> Idle : stopRecording()
    Recording --> Recording : addTelemetryData()

    Idle --> LoadingPlayback : loadRecording()
    LoadingPlayback --> ReadyToPlay : Recording loaded
    LoadingPlayback --> Idle : Load failed

    ReadyToPlay --> Playing : play()
    Playing --> Paused : pause()
    Paused --> Playing : resume()
    Playing --> ReadyToPlay : stop()
    Paused --> ReadyToPlay : stop()
    Playing --> ReadyToPlay : Playback complete

    ReadyToPlay --> Idle : unloadRecording()

    note right of Recording
        Telemetry data is continuously
        appended to the recording
        Storage size is checked
    end note

    note right of Playing
        Interpolation is applied
        for smooth playback
        Position updated at 60 FPS
    end note

    note right of LoadingPlayback
        Recording is loaded from
        IndexedDB/localStorage
        Histories are reconstructed
    end note
```

---

## Project Storage Flow

Flowchart showing project save/load operations with error handling.

```mermaid
flowchart TD
    Start([User Action])

    Start --> SaveOrLoad{Save or Load?}

    SaveOrLoad -->|Save| GetWorkspace[Get Blockly workspace XML]
    GetWorkspace --> CreateProject[Create Project object]
    CreateProject --> GenerateThumbnail[Generate thumbnail]
    GenerateThumbnail --> CheckStorage{Storage available?}

    CheckStorage -->|Yes| UseIndexedDB[Use IndexedDB]
    CheckStorage -->|No| UseLocalStorage[Use localStorage]

    UseIndexedDB --> SerializeIDB[Serialize to IndexedDB]
    UseLocalStorage --> SerializeLS[Serialize to localStorage]

    SerializeIDB --> CheckQuota{Within quota?}
    SerializeLS --> CheckQuota

    CheckQuota -->|Yes| SaveSuccess[Save successful]
    CheckQuota -->|No| PruneOldest[Prune oldest projects]
    PruneOldest --> RetryCheck{Retry save?}
    RetryCheck -->|Yes| CheckQuota
    RetryCheck -->|No| SaveFailed[Save failed]

    SaveSuccess --> UpdateStore[Update ProjectStore]
    UpdateStore --> NotifyUI[Notify UI]
    NotifyUI --> End([Done])

    SaveFailed --> ShowError[Show error message]
    ShowError --> End

    SaveOrLoad -->|Load| GetProjectId[Get project ID]
    GetProjectId --> CheckCache{In store cache?}

    CheckCache -->|Yes| ReturnCached[Return cached project]
    CheckCache -->|No| ReadStorage[Read from storage]

    ReadStorage --> Deserialize[Deserialize project]
    Deserialize --> ValidateXML{Valid workspace XML?}

    ValidateXML -->|Yes| LoadWorkspace[Load into Blockly workspace]
    ValidateXML -->|No| LoadFailed[Load failed]

    LoadWorkspace --> UpdateBlocklyStore[Update BlocklyStore]
    UpdateBlocklyStore --> LoadSuccess[Load successful]

    ReturnCached --> LoadWorkspace

    LoadSuccess --> NotifyUI
    LoadFailed --> ShowError

    style SaveSuccess fill:#4caf50,color:#fff
    style LoadSuccess fill:#4caf50,color:#fff
    style SaveFailed fill:#f44336,color:#fff
    style LoadFailed fill:#f44336,color:#fff
    style UseIndexedDB fill:#2196f3,color:#fff
    style UseLocalStorage fill:#ff9800,color:#fff
```

---

## Execution Pipeline

Detailed flowchart of the Interpreter execution pipeline with pause/resume.

```mermaid
flowchart TD
    Start([interpreter.start])
    Start --> InitState[Initialize execution state]
    InitState --> ResetFlags[Reset shouldStop, isPaused]
    ResetFlags --> StartExec[Execute root node]

    StartExec --> ExecuteNode[executeNode current node]

    ExecuteNode --> CheckStop{shouldStop?}
    CheckStop -->|Yes| Stopped[Return early]
    CheckStop -->|No| CheckPause[checkPause]

    CheckPause --> IsPaused{isPaused?}
    IsPaused -->|Yes| WaitResume[Wait for resumePromise]
    WaitResume --> IsPaused
    IsPaused -->|No| GetNodeType[Get node.type]

    GetNodeType --> NodeSwitch{Node Type?}

    NodeSwitch -->|command| SendCommand[Send command via ConnectionManager]
    SendCommand --> LogCommand[Log command]
    LogCommand --> UpdatePath[Update currentNodePath]
    UpdatePath --> NextNode

    NodeSwitch -->|sequence| ExecChildren[Execute child nodes sequentially]
    ExecChildren --> NextNode

    NodeSwitch -->|repeat| RepeatLoop[Repeat N times]
    RepeatLoop --> ExecChildren

    NodeSwitch -->|if| EvalCondition[Evaluate condition]
    EvalCondition --> CondTrue{Condition true?}
    CondTrue -->|Yes| ExecThen[Execute then branch]
    CondTrue -->|No| CheckElse{Has else?}
    CheckElse -->|Yes| ExecElse[Execute else branch]
    CheckElse -->|No| NextNode
    ExecThen --> NextNode
    ExecElse --> NextNode

    NodeSwitch -->|while| WhileLoop[While condition true]
    WhileLoop --> EvalCondition

    NodeSwitch -->|wait| SleepDelay[Sleep for duration]
    SleepDelay --> NextNode

    NodeSwitch -->|variable_set| SetVariable[Set variable in context]
    SetVariable --> NextNode

    NodeSwitch -->|variable_get| GetVariable[Get variable from context]
    GetVariable --> NextNode

    NextNode{More nodes?}
    NextNode -->|Yes| ExecuteNode
    NextNode -->|No| Complete[Update state: completed]

    Complete --> End([Return execution count])
    Stopped --> StoppedState[Update state: stopped]
    StoppedState --> End

    style Start fill:#4caf50,color:#fff
    style Complete fill:#4caf50,color:#fff
    style Stopped fill:#f44336,color:#fff
    style StoppedState fill:#f44336,color:#fff
    style WaitResume fill:#ff9800,color:#fff
    style SendCommand fill:#2196f3,color:#fff
```

---

## 10. Theme System Data Flow

Shows how theme state flows from user interaction through Context to CSS variables.

```mermaid
graph TD
    User[User Clicks Toggle Button] --> Header[Header Component]
    Header --> useThemeContext[useThemeContext Hook]
    useThemeContext --> ThemeContext[ThemeContext]
    ThemeContext --> useTheme[useTheme Hook]

    useTheme --> toggleTheme[toggleTheme Function]
    toggleTheme --> applyTheme[applyTheme Function]

    applyTheme --> DOM[document.documentElement]
    applyTheme --> localStorage[localStorage.setItem]

    DOM --> CSSClass[Toggle 'dark' class]
    CSSClass --> CSSVariables[CSS Variables Update]

    CSSVariables --> Components[All Components Re-render]
    localStorage --> Persistence[Theme Persisted]

    FirstLoad[First Page Load] --> getInitialTheme[getInitialTheme Function]
    getInitialTheme --> CheckStorage{Check localStorage}
    CheckStorage -->|Found| LoadStored[Load Stored Theme]
    CheckStorage -->|Not Found| CheckSystem{Check System Preference}
    CheckSystem -->|Dark Mode| LoadDark[Load Dark Theme]
    CheckSystem -->|Light Mode| LoadLight[Load Light Theme]

    LoadStored --> useTheme
    LoadDark --> useTheme
    LoadLight --> useTheme

    style User fill:#3b82f6,color:#fff
    style ThemeContext fill:#8b5cf6,color:#fff
    style CSSVariables fill:#10b981,color:#fff
    style Components fill:#f59e0b,color:#fff
    style Persistence fill:#06b6d4,color:#fff
```

**Key Points**:
- Theme toggle triggers re-render only in components using `useThemeContext`
- CSS variables handle all visual updates (no component re-renders for colors)
- localStorage ensures theme persists across sessions
- System preference detected on first load if no saved preference

---

## Notes

- All diagrams are rendered using Mermaid syntax
- For best viewing experience, use a Markdown viewer that supports Mermaid (e.g., GitHub, GitLab, VS Code with Mermaid extension)
- These diagrams complement the detailed text documentation in [ARCHITECTURE.md](../ARCHITECTURE.md)
- Diagrams are kept up-to-date with code changes during major refactoring

## Related Documentation

- [ARCHITECTURE.md](../ARCHITECTURE.md) - Comprehensive architecture documentation
- [API.md](./API.md) - API reference for stores and services
- [CONTRIBUTING.md](./CONTRIBUTING.md) - Development guidelines
- [README.md](../README.md) - Project overview and quick start
