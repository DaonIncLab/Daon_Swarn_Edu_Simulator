# 🏗️ Drone Swarm GCS - Architecture Documentation

> **Version**: 1.0.0
> **Last Updated**: 2025-01-13
> **Status**: Active Development

---

## 📋 Table of Contents

1. [Project Overview](#1-project-overview)
2. [Technology Stack](#2-technology-stack)
3. [Architecture Patterns](#3-architecture-patterns)
4. [Directory Structure](#4-directory-structure)
5. [Core Modules](#5-core-modules)
6. [Data Flow](#6-data-flow)
7. [State Management](#7-state-management-zustand)
8. [Connection System](#8-connection-system-strategy-pattern)
9. [Execution System](#9-execution-system-interpreter-pattern)
10. [Storage System](#10-storage-system)
11. [Component Architecture](#11-component-architecture)
12. [Performance Optimizations](#12-performance-optimizations)
13. [Error Handling](#13-error-handling)
14. [Future Roadmap](#14-future-roadmap)

---

## 1. Project Overview

### 1.1 Purpose
**Drone Swarm GCS (Ground Control Station)** is a web-based visual programming environment for controlling drone swarms using **Blockly**. It provides an intuitive drag-and-drop interface for creating flight missions, real-time telemetry visualization, and flight path recording/playback.

### 1.2 Target Audience
- Educational institutions teaching drone programming
- Researchers developing swarm algorithms
- Hobbyists learning drone control
- Developers prototyping drone missions

### 1.3 Key Features
- ✅ **Visual Programming**: Blockly-based drag-and-drop programming
- ✅ **Real-time Telemetry**: 3D visualization, charts, and drone status
- ✅ **Flight Recording**: Record and replay flight paths
- ✅ **Multiple Connection Modes**: WebSocket (Unity), Unity WebGL, Test Mode
- ✅ **Project Management**: Save/load Blockly workspaces
- ⏳ **MAVLink Support**: Real drone control (planned for Phase 2)

### 1.4 System Requirements
- **Browser**: Chrome 90+, Firefox 88+, Safari 14+
- **Node.js**: 18.x or later (for development)
- **Unity Simulator**: Optional (for simulation mode)
- **Storage**: ~5MB localStorage for projects/recordings

---

## 2. Technology Stack

### 2.1 Frontend Core
| Technology | Version | Purpose |
|------------|---------|---------|
| **React** | 19.2.0 | UI framework |
| **TypeScript** | 5.9.3 | Type safety |
| **Vite** | 7.2.2 | Build tool & dev server |
| **TailwindCSS** | 4.x | Utility-first styling |

### 2.2 State Management
| Library | Version | Purpose |
|---------|---------|---------|
| **Zustand** | 5.0.8 | Lightweight state management |

### 2.3 Visualization Libraries
| Library | Version | Purpose |
|---------|---------|---------|
| **Blockly** | 12.3.1 | Visual programming blocks |
| **Three.js** | 0.181.1 | 3D rendering engine |
| **React Three Fiber** | 9.4.0 | React renderer for Three.js |
| **Chart.js** | 4.5.1 | Telemetry charts |
| **react-chartjs-2** | 5.3.1 | React wrapper for Chart.js |

### 2.4 Communication
- **WebSocket**: Real-time bidirectional communication
- **Unity WebGL**: Embedded Unity instance communication
- **MAVLink**: Planned for real drone control

### 2.5 Storage
- **IndexedDB**: Primary storage for projects (via custom adapter)
- **localStorage**: Fallback storage & flight recordings

---

## 3. Architecture Patterns

### 3.1 Strategy Pattern (Connection Management)
**Purpose**: Support multiple connection types with runtime switching

**Implementation**: `ConnectionManager` + `IConnectionService` interface

**Strategies**:
- `WebSocketConnectionService`: Unity standalone simulator
- `UnityWebGLConnectionService`: Embedded Unity WebGL
- `TestConnectionService`: Dummy data for testing
- `MAVLinkConnectionService`: Real drone control (stub)

**Benefits**:
- Easy addition of new connection types
- No client code changes when switching modes
- Clean separation of concerns

### 3.2 Interpreter Pattern (Execution)
**Purpose**: Execute Blockly visual programs

**Flow**:
1. **Parse**: Blockly workspace → `ExecutableNode` AST
2. **Interpret**: Recursive tree traversal with state machine
3. **Execute**: Send commands via `IConnectionService`

**Features**:
- Pause/Resume support
- Error handling & recovery
- State tracking (current node, path)

### 3.3 Observer Pattern (State Management)
**Purpose**: Reactive UI updates

**Implementation**: Zustand stores with subscribers

**Flow**:
```
State Change → Zustand Store → Subscribers → React Re-render
```

### 3.4 Error Boundary Pattern
**Purpose**: Graceful error recovery

**Implementation**:
- `ErrorBoundary` component (class-based)
- `ErrorFallback` UI components
- Applied at critical component trees (App, Navigation, Blockly, Simulator)

**Benefits**:
- Prevents full app crash
- User-friendly error messages
- Retry capability

### 3.5 Adapter Pattern (Storage)
**Purpose**: Abstract storage backend

**Implementations**:
- `IndexedDBAdapter`: Primary storage
- `LocalStorageAdapter`: Fallback

**Interface**: Unified CRUD API for projects

---

## 4. Directory Structure

```
drone-swarm-gcs/
├── src/
│   ├── components/          # React components
│   │   ├── blockly/         # Blockly workspace & execution
│   │   │   ├── BlocklyWorkspace.tsx
│   │   │   ├── ExecutionPanel.tsx
│   │   │   ├── blocks/      # Custom block definitions
│   │   │   └── generators/  # Code generators
│   │   ├── common/          # Reusable UI components
│   │   │   ├── Button.tsx
│   │   │   ├── ErrorBoundary.tsx
│   │   │   └── ErrorFallback.tsx
│   │   ├── connection/      # Connection status & panel
│   │   ├── layout/          # Layout components (panels, modals)
│   │   ├── project/         # Project management UI
│   │   ├── simulator/       # Unity WebGL embed
│   │   └── visualization/   # Telemetry visualization
│   │       ├── Drone3DView.tsx (Three.js)
│   │       ├── BatteryChart.tsx
│   │       ├── TelemetryDashboard.tsx
│   │       └── RecordingPanel.tsx
│   │
│   ├── stores/              # Zustand state management
│   │   ├── useBlocklyStore.ts       # Workspace, commands, cache
│   │   ├── useConnectionStore.ts    # Connection status
│   │   ├── useExecutionStore.ts     # Interpreter, execution state
│   │   ├── useTelemetryStore.ts     # Drone telemetry history
│   │   ├── useFlightRecordingStore.ts # Recording & playback
│   │   └── useProjectStore.ts       # Project management
│   │
│   ├── services/            # Business logic & external APIs
│   │   ├── connection/      # Strategy pattern implementations
│   │   │   ├── ConnectionManager.ts      # Singleton manager
│   │   │   ├── IConnectionService.ts     # Interface
│   │   │   ├── WebSocketConnectionService.ts
│   │   │   ├── UnityWebGLConnectionService.ts
│   │   │   ├── TestConnectionService.ts
│   │   │   └── MAVLinkConnectionService.ts (stub)
│   │   ├── execution/       # Interpreter pattern
│   │   │   ├── blocklyParser.ts          # Blockly → AST
│   │   │   ├── interpreter.ts            # AST executor
│   │   │   └── conditionEvaluator.ts     # Condition logic
│   │   ├── storage/         # Adapter pattern
│   │   │   ├── projectStorage.ts         # Main API
│   │   │   ├── indexedDBAdapter.ts
│   │   │   └── localStorageAdapter.ts
│   │   └── websocket.ts     # Legacy WebSocket service
│   │
│   ├── types/               # TypeScript type definitions
│   │   ├── blockly.ts       # Blockly command types
│   │   ├── execution.ts     # ExecutableNode, ExecutionState
│   │   ├── telemetry.ts     # Telemetry data types
│   │   ├── project.ts       # Project metadata
│   │   ├── unity.ts         # Unity WebGL types
│   │   └── websocket.ts     # WebSocket message types
│   │
│   ├── constants/           # Application constants
│   │   ├── commands.ts      # Command type constants
│   │   └── connection.ts    # Connection status constants
│   │
│   ├── hooks/               # Custom React hooks
│   │   ├── useKeyboardShortcuts.ts
│   │   └── useUnityBridge.ts
│   │
│   ├── utils/               # Utility functions
│   │   ├── blocklyXml.ts    # Blockly XML helpers
│   │   └── cn.ts            # TailwindCSS class merger
│   │
│   ├── App.tsx              # Root component with Error Boundaries
│   └── main.tsx             # React entry point
│
├── public/                  # Static assets
├── docs/                    # Additional documentation
├── ARCHITECTURE.md          # This file
├── CODING_RULES.md          # Development standards
├── README.md                # Project introduction
└── package.json             # Dependencies & scripts
```

---

## 5. Core Modules

### 5.1 Blockly Module
**Location**: `src/components/blockly/`

**Responsibilities**:
- Render Blockly visual workspace
- Define custom blocks (swarmBlocks.ts)
- Generate code from blocks (swarmGenerator.ts)
- Provide execution controls (ExecutionPanel.tsx)

**Key Files**:
- `BlocklyWorkspace.tsx`: Main workspace component
- `blocks/swarmBlocks.ts`: Custom block definitions (takeoff, land, move, etc.)
- `generators/swarmGenerator.ts`: Block-to-command conversion
- `toolbox.ts`: Block category configuration

### 5.2 Connection Module
**Location**: `src/services/connection/`

**Responsibilities**:
- Manage multiple connection strategies
- Send commands to drone simulator/real drones
- Handle connection lifecycle (connect, disconnect, cleanup)
- Emit connection events

**Key Components**:
- `ConnectionManager`: Singleton that manages active connection
- `IConnectionService`: Interface for all connection types
- Strategy implementations (WebSocket, Unity WebGL, Test, MAVLink)

### 5.3 Execution Module
**Location**: `src/services/execution/`

**Responsibilities**:
- Parse Blockly workspace into executable AST
- Interpret and execute command tree
- Support pause/resume/stop
- Track execution state

**Key Components**:
- `blocklyParser.ts`: Blockly → ExecutableNode tree
- `interpreter.ts`: Tree executor with state machine
- `conditionEvaluator.ts`: Evaluate boolean conditions (sensors, variables)

### 5.4 Telemetry Module
**Location**: `src/stores/useTelemetryStore.ts` + `src/components/visualization/`

**Responsibilities**:
- Collect real-time telemetry data
- Store historical data (with memory limits)
- Provide data for visualization (3D, charts)

**Key Components**:
- `useTelemetryStore`: Telemetry data store (max 10,000 points)
- `Drone3DView.tsx`: Three.js 3D visualization
- `BatteryChart.tsx`, `AltitudeChart.tsx`: Chart.js graphs
- `TelemetryDashboard.tsx`: Tabbed dashboard

### 5.5 Flight Recording Module
**Location**: `src/stores/useFlightRecordingStore.ts` + `src/components/visualization/RecordingPanel.tsx`

**Responsibilities**:
- Record flight paths
- Replay recorded flights with interpolation
- Manage recordings (save, load, delete)

**Key Features**:
- Binary search + linear interpolation for smooth playback
- localStorage size management (5MB limit)
- Playback speed control (0.5x - 2x)

### 5.6 Project Module
**Location**: `src/services/storage/` + `src/stores/useProjectStore.ts`

**Responsibilities**:
- Save/load Blockly workspaces
- Manage project metadata
- Handle storage backend (IndexedDB/localStorage)

**Key Components**:
- `projectStorage.ts`: Main API
- `indexedDBAdapter.ts`: Primary storage
- `localStorageAdapter.ts`: Fallback storage

---

## 6. Data Flow

### 6.1 Execution Flow

```
┌──────────────┐
│ User Actions │
│ (Drag blocks)│
└──────┬───────┘
       │
       ▼
┌──────────────────┐
│ BlocklyWorkspace │
│ (React Component)│
└──────┬───────────┘
       │
       ▼
┌──────────────────┐     ┌─────────────────┐
│ useBlocklyStore  │────▶│ Parsing Cache   │
│ (Zustand)        │     │ (workspaceHash) │
└──────┬───────────┘     └─────────────────┘
       │
       │ Execute Command
       ▼
┌─────────────────────┐
│ useExecutionStore   │
│ .executeScript()    │
└──────┬──────────────┘
       │
       ▼
┌─────────────────────┐
│ blocklyParser       │
│ Workspace → AST     │
└──────┬──────────────┘
       │
       ▼
┌─────────────────────┐
│ Interpreter         │
│ Execute tree        │
└──────┬──────────────┘
       │
       ▼
┌─────────────────────┐
│ ConnectionManager   │
│ .sendCommand()      │
└──────┬──────────────┘
       │
       ▼
┌─────────────────────┐
│ IConnectionService  │
│ (WebSocket/Unity/..)|
└──────┬──────────────┘
       │
       ▼
┌─────────────────────┐
│ Unity Simulator /   │
│ Real Drone          │
└─────────────────────┘
```

### 6.2 Telemetry Flow

```
┌─────────────────────┐
│ Unity / Real Drone  │
│ (Telemetry Data)    │
└──────┬──────────────┘
       │
       ▼
┌─────────────────────┐
│ IConnectionService  │
│ .onTelemetry event  │
└──────┬──────────────┘
       │
       ▼
┌─────────────────────┐
│ useTelemetryStore   │
│ .addTelemetryData() │
└──────┬──────────────┘
       │
       ▼
┌─────────────────────┐
│ React Components    │
│ - Drone3DView       │
│ - BatteryChart      │
│ - DroneStatus       │
└─────────────────────┘
```

### 6.3 Connection Flow

```
User Click "Connect"
       │
       ▼
┌─────────────────────┐
│ ConnectionPanel     │
│ (React Component)   │
└──────┬──────────────┘
       │
       ▼
┌─────────────────────┐
│ useConnectionStore  │
│ .connect(config)    │
└──────┬──────────────┘
       │
       ▼
┌─────────────────────┐
│ ConnectionManager   │
│ Strategy selection  │
└──────┬──────────────┘
       │
       ▼
┌─────────────────────┐
│ IConnectionService  │
│ .connect(config)    │
└──────┬──────────────┘
       │
       ▼
┌─────────────────────┐
│ Unity / Test Mode   │
│ Connection established│
└─────────────────────┘
```

---

## 7. State Management (Zustand)

Zustand is used for all global state management. Each store is independent and can be used across components.

### 7.1 useBlocklyStore
**Location**: `src/stores/useBlocklyStore.ts`

**State**:
```typescript
{
  workspace: Blockly.WorkspaceSvg | null
  generatedCommands: Command[]
  hasUnsavedChanges: boolean

  // Caching (P2 optimization)
  parsedTree: ExecutableNode | null
  workspaceHash: string | null
}
```

**Actions**:
- `setWorkspace(workspace)`: Set Blockly workspace instance
- `setGeneratedCommands(commands)`: Update command list
- `setHasUnsavedChanges(hasChanges)`: Mark project as dirty
- `clearWorkspace()`: Clear all blocks
- `invalidateCache()`: Clear parsing cache
- `getCachedParsedTree()`: Get cached AST
- `setCachedParsedTree(tree, hash)`: Cache parsed AST

**Cache Strategy**:
- Calculate workspace XML hash on execution
- Use cached AST if hash matches
- Saves ~50-100ms per execution

### 7.2 useConnectionStore
**Location**: `src/stores/useConnectionStore.ts`

**State**:
```typescript
{
  status: ConnectionStatus  // 'connected' | 'connecting' | 'disconnected' | 'error'
  mode: ConnectionMode | null  // 'simulation' | 'unity_webgl' | 'test' | 'real_drone'
  config: ConnectionConfig | null
  error: string | null
}
```

**Actions**:
- `connect(config)`: Establish connection
- `disconnect()`: Close connection
- `setStatus(status)`: Update connection status
- `setError(error)`: Set error message

### 7.3 useExecutionStore
**Location**: `src/stores/useExecutionStore.ts`

**State**:
```typescript
{
  status: ExecutionStatus  // 'idle' | 'running' | 'paused' | 'completed' | 'error'
  commands: Command[]
  currentCommandIndex: number
  currentNodeId: string | null
  currentNodePath: number[]
  error: string | null
  drones: DroneState[]
  interpreter: Interpreter | null
}
```

**Actions**:
- `executeScript()`: Start execution with cache check
- `stopExecution()`: Stop interpreter
- `pauseExecution()`: Pause interpreter
- `resumeExecution()`: Resume interpreter
- `reset()`: Reset execution state
- `updateExecutionState(state)`: Update from interpreter

### 7.4 useTelemetryStore
**Location**: `src/stores/useTelemetryStore.ts`

**State**:
```typescript
{
  history: Map<number, DroneHistory>  // droneId → history
  maxHistoryPoints: number  // per drone (default: 100)
  maxTotalDataPoints: number  // total (default: 10,000)
  isRecording: boolean
}
```

**Actions**:
- `addTelemetryData(drones)`: Add new data points (with pruning)
- `clearHistory()`: Clear all history
- `startRecording()`: Enable recording
- `stopRecording()`: Disable recording
- `setMaxHistoryPoints(max)`: Update per-drone limit
- `setMaxTotalDataPoints(max)`: Update total limit

**Memory Management**:
- Per-drone limit: 100 points
- Total limit: 10,000 points
- Automatic pruning of oldest data from largest histories

### 7.5 useFlightRecordingStore
**Location**: `src/stores/useFlightRecordingStore.ts`

**State**:
```typescript
{
  recordings: FlightRecording[]
  playback: {
    status: PlaybackStatus
    recording: FlightRecording | null
    currentTime: number
    speed: number
  }
}
```

**Actions**:
- `saveRecording(name, droneHistories)`: Save new recording
- `loadRecording(id)`: Load recording for playback
- `startPlayback()`: Start playback
- `pausePlayback()`: Pause playback
- `stopPlayback()`: Stop playback
- `setPlaybackTime(time)`: Seek to time
- `setPlaybackSpeed(speed)`: Change speed (0.5x - 2x)
- `getCurrentPlaybackData()`: Get interpolated data at current time

**Features**:
- Binary search for surrounding data points
- Linear interpolation for smooth playback
- localStorage size management (5MB limit)

### 7.6 useProjectStore
**Location**: `src/stores/useProjectStore.ts`

**State**:
```typescript
{
  projects: ProjectMetadata[]
  currentProject: Project | null
  isLoading: boolean
  error: string | null
}
```

**Actions**:
- `loadProjects()`: Load all project metadata
- `createProject(options)`: Create new project
- `saveCurrentProject()`: Save current workspace
- `loadProject(id)`: Load project into workspace
- `deleteProject(id)`: Delete project
- `exportProject(id)`: Export as JSON
- `importProject(data)`: Import from JSON

---

## 8. Connection System (Strategy Pattern)

### 8.1 Architecture

```
┌────────────────────────────────────────┐
│        ConnectionManager (Singleton)   │
│  - currentService: IConnectionService  │
│  - currentMode: ConnectionMode         │
│  - connect(config)                     │
│  - disconnect()                        │
│  - sendCommand(cmd)                    │
│  - switchMode(newConfig)               │
└────────────────┬───────────────────────┘
                 │
                 │ manages
                 │
         ┌───────▼───────┐
         │IConnectionService│
         │   (interface)   │
         └───────┬─────────┘
                 │
     ┌───────────┼───────────┬───────────┐
     │           │           │           │
┌────▼────┐ ┌───▼────┐ ┌───▼────┐ ┌───▼────┐
│WebSocket│ │Unity   │ │Test    │ │MAVLink │
│Service  │ │WebGL   │ │Service │ │Service │
│         │ │Service │ │        │ │(stub)  │
└─────────┘ └────────┘ └────────┘ └────────┘
```

### 8.2 IConnectionService Interface

```typescript
interface IConnectionService {
  connect(config: ConnectionConfig): Promise<void>
  disconnect(): Promise<void>
  sendCommand(command: Command): Promise<CommandResponse>
  sendCommands(commands: Command[]): Promise<CommandResponse>
  getStatus(): ConnectionStatus
  isConnected(): boolean
  setEventListeners(listeners: ConnectionEventListeners): void
  emergencyStop(): Promise<CommandResponse>
  ping(): Promise<number>
  cleanup(): void
}
```

### 8.3 Connection Strategies

#### WebSocketConnectionService
- **Purpose**: Connect to Unity standalone simulator via WebSocket
- **Protocol**: Custom JSON-based protocol
- **Features**: Real-time bidirectional communication, auto-reconnect
- **Status**: ✅ Fully implemented

#### UnityWebGLConnectionService
- **Purpose**: Communicate with embedded Unity WebGL build
- **Protocol**: Unity `SendMessage` / `window.receiveUnityMessage`
- **Features**: No network required, embedded in browser
- **Status**: ✅ Fully implemented

#### TestConnectionService
- **Purpose**: Testing without Unity (dummy drone simulator)
- **Features**: Configurable drone count, simulated telemetry, instant commands
- **Status**: ✅ Fully implemented

#### MAVLinkConnectionService
- **Purpose**: Control real drones via MAVLink protocol
- **Protocol**: MAVLink v1/v2
- **Features**: Serial/UDP/TCP support, MAVLink message conversion
- **Status**: ⏳ Stub implementation (Phase 2)

### 8.4 ConnectionManager Singleton

**Responsibilities**:
- Maintain single active connection
- Switch strategies at runtime
- Propagate events to listeners
- Cleanup on disconnect

**Usage**:
```typescript
import { getConnectionManager } from '@/services/connection/ConnectionManager'

const manager = getConnectionManager()
await manager.connect({
  mode: 'simulation',
  websocket: { ipAddress: '127.0.0.1', port: 8080 }
})
```

---

## 9. Execution System (Interpreter Pattern)

### 9.1 Architecture

```
┌──────────────┐
│   Blockly    │
│  Workspace   │
└──────┬───────┘
       │
       │ XML
       ▼
┌──────────────┐
│blocklyParser │
│   .parse()   │
└──────┬───────┘
       │
       │ ExecutableNode AST
       ▼
┌──────────────────┐
│  Interpreter     │
│  .execute(tree)  │
└──────┬───────────┘
       │
       │ Commands
       ▼
┌──────────────────┐
│IConnectionService│
│  .sendCommand()  │
└──────────────────┘
```

### 9.2 ExecutableNode Types

Defined in `src/types/execution.ts`:

```typescript
type ExecutableNode =
  | CommandNode       // Single command (takeoff, land, move)
  | SequenceNode      // Sequential execution
  | RepeatNode        // Fixed repeat count
  | ForLoopNode       // For loop with variable
  | WhileLoopNode     // Condition-based loop
  | UntilLoopNode     // Repeat until condition true
  | IfNode            // Conditional execution
  | IfElseNode        // If-else branches
  | WaitNode          // Delay execution
  | VariableSetNode   // Set variable value
  | VariableGetNode   // Get variable value
  | FunctionDefNode   // Function definition
  | FunctionCallNode  // Function invocation
```

### 9.3 Parsing Process

**File**: `src/services/execution/blocklyParser.ts`

**Steps**:
1. Get all top-level blocks from workspace
2. Recursively traverse block connections
3. Convert each block to corresponding `ExecutableNode`
4. Build tree structure with parent-child relationships
5. Return root `SequenceNode` or single node

**Caching** (P2 optimization):
- Calculate workspace XML hash
- Check if cached tree exists and hash matches
- Use cached tree if valid, otherwise parse and cache

### 9.4 Interpretation Process

**File**: `src/services/execution/interpreter.ts`

**Features**:
- **Recursive Execution**: Tree traversal with DFS
- **State Machine**: Tracks current node, path, variables, functions
- **Pause/Resume**: Promise-based mechanism with `checkPause()`
- **Error Handling**: Catch and report errors at each node
- **Context**: Variable storage, function registry, call stack

**Execution Context**:
```typescript
interface ExecutionContext {
  variables: Map<string, number>     // Variable values
  functions: Map<string, ExecutableNode> // Function definitions
  callStack: string[]                 // Recursion detection
  currentRepeatCount?: number
  currentLoopVariable?: { name: string; value: number }
  executionStartTime?: number
}
```

**Pause/Resume Implementation**:
```typescript
// Pause
pause(): void {
  this.isPaused = true
  this.resumePromise = new Promise(resolve => {
    this.resumeResolver = resolve
  })
  this.updateState({ status: 'paused' })
}

// Resume
resume(): void {
  this.isPaused = false
  this.resumeResolver?.()
  this.resumePromise = null
  this.updateState({ status: 'running' })
}

// Check in execution loop
private async checkPause(): Promise<void> {
  if (this.isPaused && this.resumePromise) {
    await this.resumePromise
  }
}
```

### 9.5 Condition Evaluation

**File**: `src/services/execution/conditionEvaluator.ts`

**Supported Conditions**:
- **Sensor Conditions**: `battery > 50`, `altitude < 10`
- **Variable Conditions**: `count == 5`, `speed != 0`
- **Logical Operators**: `AND`, `OR`, `NOT`
- **Time Conditions**: `elapsed_time > 60`

**Example**:
```typescript
evaluateCondition('battery > 30 AND altitude < 5', context, droneStates)
// → true/false
```

---

## 10. Storage System

### 10.1 Architecture (Adapter Pattern)

```
┌──────────────────┐
│ projectStorage   │
│  (Main API)      │
└────────┬─────────┘
         │
         │ uses adapter
         │
    ┌────▼────┐
    │IAdapter │
    └────┬────┘
         │
    ┌────┼────┐
    │    │    │
┌───▼──┐ │ ┌──▼────────┐
│IndexedDB││localStorage│
│Adapter │││Adapter    │
└────────┘│└───────────┘
  (Primary) (Fallback)
```

### 10.2 Project Structure

```typescript
interface Project {
  id: string              // UUID
  name: string            // User-provided name
  description?: string
  workspaceXml: string    // Blockly workspace XML
  createdAt: string       // ISO 8601 timestamp
  updatedAt: string       // ISO 8601 timestamp
  thumbnail?: string      // Base64 image
  tags?: string[]
}
```

### 10.3 Storage Adapters

#### IndexedDBAdapter (Primary)
- **Database**: `drone-swarm-projects`
- **Object Store**: `projects`
- **Capacity**: ~50MB (varies by browser)
- **Features**: Async, structured storage, good performance

#### LocalStorageAdapter (Fallback)
- **Key Prefix**: `drone-swarm-project:`
- **Capacity**: ~5-10MB (varies by browser)
- **Features**: Synchronous, simple API, limited size

**Auto-Fallback**:
- Try IndexedDB first
- Fall back to localStorage if IndexedDB unavailable
- Transparent to client code

### 10.4 projectStorage API

```typescript
// Initialize storage
await initializeProjectStorage()

// CRUD Operations
const project = await projectStorage.createProject({ name: 'My Project' })
await projectStorage.updateProject(project.id, { name: 'New Name' })
const loaded = await projectStorage.getProject(project.id)
await projectStorage.deleteProject(project.id)

// List & Export
const all = await projectStorage.getAllProjects()
const json = await projectStorage.exportProject(project.id)
await projectStorage.importProject(json)
```

---

## 11. Component Architecture

### 11.1 Component Hierarchy

```
App (Root + Error Boundary)
├─ Header
│  ├─ Logo
│  └─ Action Buttons
├─ NavigationPanel (15%)
│  ├─ Block Categories
│  ├─ Project Buttons
│  └─ Settings Button
├─ BlocklyWorkspace (40%)
│  ├─ Blockly Div
│  └─ ExecutionPanel
│     ├─ Control Buttons
│     └─ Status Display
├─ SimulatorPanel (45%)
│  ├─ Unity WebGL Embed
│  └─ TelemetryDashboard
│     ├─ Drone3DView (Three.js)
│     ├─ BatteryChart (Chart.js)
│     ├─ AltitudeChart (Chart.js)
│     └─ DroneStatus (List)
├─ MonitoringPanel (Modal)
│  ├─ CommandPreview
│  ├─ ExecutionLog
│  └─ RecordingPanel
└─ SettingsPanel (Modal)
   ├─ ConnectionPanel
   └─ ProjectPanel
```

### 11.2 Error Boundaries

Applied at critical levels:

```
<ErrorBoundary>  {/* Root level */}
  <App>
    <ErrorBoundary>  {/* Header */}
      <Header />
    </ErrorBoundary>

    <ErrorBoundary>  {/* Navigation */}
      <NavigationPanel />
    </ErrorBoundary>

    <ErrorBoundary>  {/* Blockly */}
      <BlocklyWorkspace />
    </ErrorBoundary>

    <ErrorBoundary>  {/* Simulator */}
      <SimulatorPanel />
    </ErrorBoundary>

    <ErrorBoundary>  {/* Monitoring */}
      <MonitoringPanel />
    </ErrorBoundary>

    <ErrorBoundary>  {/* Settings */}
      <SettingsPanel />
    </ErrorBoundary>
  </App>
</ErrorBoundary>
```

**Benefits**:
- Component crashes don't crash entire app
- Each panel can fail independently
- User-friendly error messages with retry

### 11.3 Component Patterns

#### Controlled Components
- All form inputs are controlled
- State managed in Zustand stores
- Validation on change

#### Compound Components
- `TelemetryDashboard` with tabs
- `RecordingPanel` with playback controls
- Shared state via context or props

#### Render Props
- `Drone3DView` with camera controls
- Chart components with tooltips

---

## 12. Performance Optimizations

### 12.1 Blockly Parsing Cache
**Problem**: Parsing workspace on every execution (~50-100ms)

**Solution**:
- Calculate workspace XML hash
- Cache parsed `ExecutableNode` tree
- Reuse cache if hash matches

**Impact**: 50-100ms saved per repeated execution

**Implementation**: `useBlocklyStore` caching fields

### 12.2 Telemetry Memory Limits
**Problem**: Unbounded telemetry data growth

**Solution**:
- Per-drone limit: 100 data points
- Total limit: 10,000 data points across all drones
- Automatic pruning of oldest data from largest histories

**Impact**: Prevents memory leaks, stable memory usage

**Implementation**: `useTelemetryStore.addTelemetryData()`

### 12.3 Flight Recording Interpolation
**Problem**: Jerky playback with sparse data points

**Solution**:
- Binary search for surrounding data points
- Linear interpolation for position, rotation, velocity, battery
- Smooth 60 FPS playback

**Impact**: Smooth flight path replay

**Implementation**: `useFlightRecordingStore.getCurrentPlaybackData()`

### 12.4 localStorage Size Management
**Problem**: localStorage quota exceeded (5-10MB)

**Solution**:
- Estimate size before saving recordings
- Remove oldest recordings when limit reached (5MB)
- Log storage size on save

**Impact**: Prevents quota errors, automatic cleanup

**Implementation**: `useFlightRecordingStore.saveRecording()`

### 12.5 ConnectionManager Cleanup
**Problem**: Memory leaks on connection switching

**Solution**:
- Explicit null assignments in `disconnect()`
- Clear all state in `cleanup()`
- Proper service cleanup before new connection

**Impact**: No memory leaks, clean reconnection

**Implementation**: `ConnectionManager.disconnect()`, `ConnectionManager.cleanup()`

---

## 13. Error Handling

### 13.1 Error Boundary Strategy
- **App Level**: Catch all unhandled errors, prevent white screen
- **Component Level**: Isolated failures (Header, Navigation, Blockly, Simulator)
- **Fallback UI**: User-friendly error messages with retry buttons

### 13.2 Service Level Error Handling
- **Connection Errors**: Clear error messages, auto-reconnect option
- **Execution Errors**: Stop interpreter, show error in UI
- **Storage Errors**: Fallback to alternative storage, notify user

### 13.3 User Feedback
- **Error Messages**: Clear, actionable, non-technical when possible
- **MAVLink Stub**: Explicit "Phase 2" message with alternatives
- **Console Logging**: Detailed logs for developers (dev mode only)

---

## 14. Future Roadmap

### Phase 2 (Planned)
- ✈️ **MAVLink Support**: Real drone control via Serial/UDP/TCP
- 🧪 **Testing Infrastructure**: Unit tests, integration tests
- 📚 **API Documentation**: Complete API docs

### Phase 3 (Long-term)
- 🚀 **Performance**: 3D rendering memoization, Web Workers
- 💾 **Auto-save**: Automatic project saving
- 📴 **Offline Mode**: Full offline capability
- 🌐 **Multi-language**: i18n support
- 🎥 **Video Recording**: Record 3D view as video
- 📊 **Analytics**: Usage analytics & telemetry export

---

## 📚 Additional Resources

- [CODING_RULES.md](./CODING_RULES.md): Development standards & best practices
- [docs/API.md](./docs/API.md): Detailed API documentation
- [docs/DIAGRAMS.md](./docs/DIAGRAMS.md): Architecture diagrams
- [docs/CONTRIBUTING.md](./docs/CONTRIBUTING.md): Contribution guidelines

---

**Questions or feedback?** Open an issue on GitHub or contact the development team.

**Last Updated**: 2025-01-13 by Claude Code 🤖
