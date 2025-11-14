# API Reference

Complete API reference for all Zustand stores and service classes in the Drone Swarm GCS.

## Table of Contents

- [Zustand Stores](#zustand-stores)
  - [BlocklyStore](#blocklystore)
  - [ExecutionStore](#executionstore)
  - [ConnectionStore](#connectionstore)
  - [TelemetryStore](#telemetrystore)
  - [FlightRecordingStore](#flightrecordingstore)
  - [ProjectStore](#projectstore)
- [Services](#services)
  - [ConnectionManager](#connectionmanager)
  - [Interpreter](#interpreter)
  - [ProjectService](#projectservice)
  - [StorageAdapter](#storageadapter)
- [Connection Services](#connection-services)
  - [IConnectionService](#iconnectionservice)
  - [WebSocketConnectionService](#websocketconnectionservice)
  - [UnityWebGLConnectionService](#unitywebglconnectionservice)
  - [TestConnectionService](#testconnectionservice)
  - [MAVLinkConnectionService](#mavlinkconnectionservice)

---

## Zustand Stores

### BlocklyStore

Manages Blockly workspace state and caching.

**Location**: `src/stores/useBlocklyStore.ts`

#### State

```typescript
interface BlocklyStore {
  workspace: Blockly.WorkspaceSvg | null
  hasUnsavedChanges: boolean
  parsedTree: ExecutableNode | null      // Cached AST
  workspaceHash: string | null           // Cache validation
}
```

#### Actions

##### `setWorkspace(workspace: Blockly.WorkspaceSvg | null): void`

Sets the Blockly workspace instance.

```typescript
import { useBlocklyStore } from '@/stores/useBlocklyStore'

const workspace = Blockly.inject('blocklyDiv', { toolbox })
useBlocklyStore.getState().setWorkspace(workspace)
```

##### `setHasUnsavedChanges(hasChanges: boolean): void`

Marks workspace as having unsaved changes and invalidates cache.

```typescript
workspace.addChangeListener(() => {
  useBlocklyStore.getState().setHasUnsavedChanges(true)
})
```

##### `getParsedTree(): ExecutableNode | null`

Returns cached parsed AST tree.

```typescript
const tree = useBlocklyStore.getState().getParsedTree()
if (tree) {
  console.log('Using cached tree')
}
```

##### `getWorkspaceHash(): string | null`

Returns current workspace hash for cache validation.

```typescript
const hash = useBlocklyStore.getState().getWorkspaceHash()
```

##### `setCachedParsedTree(tree: ExecutableNode | null, hash: string | null): void`

Caches parsed tree with validation hash.

```typescript
const tree = parseBlocklyWorkspace(workspace)
const hash = simpleHash(workspaceXml)
useBlocklyStore.getState().setCachedParsedTree(tree, hash)
```

##### `invalidateCache(): void`

Invalidates cached parsed tree.

```typescript
useBlocklyStore.getState().invalidateCache()
```

---

### ExecutionStore

Manages script execution state.

**Location**: `src/stores/useExecutionStore.ts`

#### State

```typescript
interface ExecutionStore {
  status: 'idle' | 'running' | 'paused' | 'completed' | 'error' | 'stopped'
  currentNodePath: number[]
  logs: ExecutionLog[]
  variables: Record<string, any>
  executionCount: number
  startTime: number | null
  endTime: number | null
}
```

#### Actions

##### `executeScript(): Promise<void>`

Parses workspace and starts execution.

```typescript
import { useExecutionStore } from '@/stores/useExecutionStore'

const { executeScript } = useExecutionStore()
await executeScript()
```

**Algorithm**:
1. Get workspace from BlocklyStore
2. Calculate workspace XML hash
3. Check cache (hit: use cached tree, miss: parse + cache)
4. Create Interpreter instance
5. Start execution
6. Subscribe to execution state updates

##### `pauseExecution(): void`

Pauses current execution.

```typescript
const { pauseExecution } = useExecutionStore()
pauseExecution()
```

##### `resumeExecution(): void`

Resumes paused execution.

```typescript
const { resumeExecution } = useExecutionStore()
resumeExecution()
```

##### `stopExecution(): void`

Stops current execution.

```typescript
const { stopExecution } = useExecutionStore()
stopExecution()
```

##### `addLog(log: Omit<ExecutionLog, 'id'>): void`

Adds execution log entry.

```typescript
useExecutionStore.getState().addLog({
  timestamp: Date.now(),
  level: 'info',
  message: 'Command sent',
  nodeType: 'command',
  nodePath: [0, 1],
})
```

##### `clearLogs(): void`

Clears all execution logs.

```typescript
useExecutionStore.getState().clearLogs()
```

##### `setVariable(name: string, value: any): void`

Sets variable in execution context.

```typescript
useExecutionStore.getState().setVariable('altitude', 10)
```

##### `getVariable(name: string): any`

Gets variable from execution context.

```typescript
const altitude = useExecutionStore.getState().getVariable('altitude')
```

---

### ConnectionStore

Manages connection state and drone information.

**Location**: `src/stores/useConnectionStore.ts`

#### State

```typescript
interface ConnectionStore {
  status: ConnectionStatus
  mode: ConnectionMode | null
  config: ConnectionConfig | null
  drones: DroneState[]
  manager: ConnectionManager
  error: string | null
}
```

#### Actions

##### `connect(config: ConnectionConfig): Promise<void>`

Establishes connection using specified mode.

```typescript
import { useConnectionStore } from '@/stores/useConnectionStore'
import { ConnectionMode } from '@/services/connection/types'

const { connect } = useConnectionStore()
await connect({
  mode: ConnectionMode.SIMULATION,
  websocket: {
    url: 'ws://localhost:8080',
    reconnectInterval: 3000,
  },
})
```

##### `disconnect(): Promise<void>`

Disconnects and cleans up connection.

```typescript
const { disconnect } = useConnectionStore()
await disconnect()
```

##### `sendCommand(command: Command): Promise<CommandResponse>`

Sends single command to drones.

```typescript
import { CommandType } from '@/types/blockly'

const response = await useConnectionStore.getState().sendCommand({
  type: CommandType.TAKEOFF,
  droneIds: [1, 2],
  params: { altitude: 5 },
})

if (response.success) {
  console.log('Command sent successfully')
}
```

##### `sendCommands(commands: Command[]): Promise<CommandResponse>`

Sends batch of commands.

```typescript
const commands = [
  { type: CommandType.TAKEOFF, droneIds: [1, 2], params: { altitude: 5 } },
  { type: CommandType.MOVE_TO, droneIds: [1], params: { x: 10, y: 0, z: 5 } },
  { type: CommandType.LAND, droneIds: [1, 2], params: {} },
]

await useConnectionStore.getState().sendCommands(commands)
```

##### `emergencyStop(): Promise<void>`

Sends emergency stop to all drones.

```typescript
const { emergencyStop } = useConnectionStore()
await emergencyStop()
```

##### `updateDrones(drones: DroneState[]): void`

Updates drone state information (typically called by connection services).

```typescript
// Called internally by connection services
useConnectionStore.getState().updateDrones([
  {
    id: 1,
    position: { x: 0, y: 0, z: 5 },
    rotation: { x: 0, y: 0, z: 0 },
    velocity: { x: 0, y: 0, z: 0 },
    battery: 95,
    status: 'flying',
  },
])
```

---

### TelemetryStore

Manages telemetry history and visualization state.

**Location**: `src/stores/useTelemetryStore.ts`

#### State

```typescript
interface TelemetryStore {
  droneHistories: Map<number, DroneHistory>
  selectedDroneId: number | null
  selectedTab: TelemetryTab
  isLive: boolean
  maxHistoryPoints: number          // Per drone (default: 100)
  maxTotalDataPoints: number        // Total (default: 10,000)
}
```

#### Actions

##### `addTelemetryData(drones: DroneState[]): void`

Adds telemetry data points with automatic memory management.

```typescript
import { useTelemetryStore } from '@/stores/useTelemetryStore'

// Called by connection services
useTelemetryStore.getState().addTelemetryData([
  {
    id: 1,
    position: { x: 5, y: 3, z: 10 },
    rotation: { x: 0, y: 0, z: 45 },
    velocity: { x: 1, y: 0, z: 0 },
    battery: 92,
    status: 'flying',
  },
])
```

**Algorithm**:
1. For each drone, create data point with timestamp
2. Append to drone history
3. Trim to maxHistoryPoints per drone
4. Calculate total data points across all drones
5. If exceeds maxTotalDataPoints, prune oldest from largest histories

##### `setSelectedDroneId(droneId: number | null): void`

Sets selected drone for detailed view.

```typescript
useTelemetryStore.getState().setSelectedDroneId(1)
```

##### `setSelectedTab(tab: TelemetryTab): void`

Sets active telemetry tab.

```typescript
import { TelemetryTab } from '@/types/telemetry'

useTelemetryStore.getState().setSelectedTab(TelemetryTab.CHARTS)
```

##### `clearHistory(): void`

Clears all telemetry history.

```typescript
useTelemetryStore.getState().clearHistory()
```

##### `clearDroneHistory(droneId: number): void`

Clears history for specific drone.

```typescript
useTelemetryStore.getState().clearDroneHistory(1)
```

##### `setIsLive(isLive: boolean): void`

Toggles live data streaming.

```typescript
useTelemetryStore.getState().setIsLive(false) // Pause live updates
```

##### `setMaxHistoryPoints(max: number): void`

Sets maximum points per drone.

```typescript
useTelemetryStore.getState().setMaxHistoryPoints(200)
```

---

### FlightRecordingStore

Manages flight recordings and playback.

**Location**: `src/stores/useFlightRecordingStore.ts`

#### State

```typescript
interface FlightRecordingStore {
  // Recording
  isRecording: boolean
  recordingStartTime: number | null
  currentRecordingData: Map<number, DroneHistory>

  // Playback
  recordings: FlightRecording[]
  playback: {
    recording: FlightRecording | null
    status: PlaybackStatus
    currentTime: number
    playbackSpeed: number
  }
}
```

#### Actions

##### `startRecording(): void`

Starts recording telemetry data.

```typescript
import { useFlightRecordingStore } from '@/stores/useFlightRecordingStore'

const { startRecording } = useFlightRecordingStore()
startRecording()
```

##### `stopRecording(): void`

Stops recording (doesn't save yet).

```typescript
const { stopRecording } = useFlightRecordingStore()
stopRecording()
```

##### `saveRecording(name: string, description?: string, tags?: string[]): void`

Saves current recording to storage with automatic size management.

```typescript
const { saveRecording } = useFlightRecordingStore()
saveRecording('Test Flight 1', 'Basic takeoff and landing', ['test', 'basic'])
```

**Algorithm**:
1. Create FlightRecording object with metadata
2. Add to recordings array
3. Estimate storage size (JSON.stringify length × 2 bytes)
4. While exceeds MAX_STORAGE_SIZE (5MB), remove oldest
5. Save to storage (IndexedDB or localStorage)

##### `deleteRecording(id: string): void`

Deletes recording from storage.

```typescript
useFlightRecordingStore.getState().deleteRecording('recording-id-123')
```

##### `loadRecording(id: string): void`

Loads recording for playback.

```typescript
useFlightRecordingStore.getState().loadRecording('recording-id-123')
```

##### `unloadRecording(): void`

Unloads current playback recording.

```typescript
useFlightRecordingStore.getState().unloadRecording()
```

##### `playPlayback(): void`

Starts playback at current time.

```typescript
const { playPlayback } = useFlightRecordingStore()
playPlayback()
```

##### `pausePlayback(): void`

Pauses playback.

```typescript
useFlightRecordingStore.getState().pausePlayback()
```

##### `stopPlayback(): void`

Stops and resets playback to beginning.

```typescript
useFlightRecordingStore.getState().stopPlayback()
```

##### `seekPlayback(time: number): void`

Seeks to specific time in playback.

```typescript
useFlightRecordingStore.getState().seekPlayback(5000) // Seek to 5 seconds
```

##### `setPlaybackSpeed(speed: number): void`

Sets playback speed multiplier.

```typescript
useFlightRecordingStore.getState().setPlaybackSpeed(2.0) // 2x speed
```

##### `getCurrentPlaybackData(): Map<number, DroneHistory> | null`

Gets interpolated drone states at current playback time.

```typescript
const data = useFlightRecordingStore.getState().getCurrentPlaybackData()
if (data) {
  for (const [droneId, history] of data) {
    console.log(`Drone ${droneId} at`, history.dataPoints[0].position)
  }
}
```

**Algorithm**:
1. For each drone in recording, get data points array
2. Binary search to find surrounding data points (before/after current time)
3. Linear interpolation for position, rotation, velocity, battery
4. Return interpolated snapshot

---

### ProjectStore

Manages project save/load and auto-save.

**Location**: `src/stores/useProjectStore.ts`

#### State

```typescript
interface ProjectStore {
  projects: ProjectMetadata[]
  currentProjectId: string | null
  autoSave: AutoSaveSettings
  isLoading: boolean
  error: string | null
}
```

#### Actions

##### `createProject(options: CreateProjectOptions): Promise<string>`

Creates new project from template.

```typescript
import { useProjectStore } from '@/stores/useProjectStore'
import { ProjectTemplate } from '@/types/project'

const projectId = await useProjectStore.getState().createProject({
  name: 'My First Flight',
  description: 'Basic takeoff and landing',
  template: ProjectTemplate.BASIC_FLIGHT,
})
```

##### `saveProject(projectId?: string): Promise<void>`

Saves current workspace to project.

```typescript
const { saveProject } = useProjectStore()
await saveProject() // Saves to currentProjectId
// or
await saveProject('project-id-123') // Saves to specific project
```

##### `loadProject(projectId: string): Promise<void>`

Loads project into Blockly workspace.

```typescript
const { loadProject } = useProjectStore()
await loadProject('project-id-123')
```

##### `deleteProject(projectId: string): Promise<void>`

Deletes project from storage.

```typescript
await useProjectStore.getState().deleteProject('project-id-123')
```

##### `exportProject(projectId: string): Promise<Blob>`

Exports project as JSON file.

```typescript
const blob = await useProjectStore.getState().exportProject('project-id-123')
const url = URL.createObjectURL(blob)
const a = document.createElement('a')
a.href = url
a.download = 'my-project.json'
a.click()
```

##### `importProject(file: File): Promise<string>`

Imports project from JSON file.

```typescript
const fileInput = document.createElement('input')
fileInput.type = 'file'
fileInput.accept = '.json'
fileInput.onchange = async (e) => {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (file) {
    const projectId = await useProjectStore.getState().importProject(file)
    console.log('Imported project:', projectId)
  }
}
fileInput.click()
```

##### `enableAutoSave(interval: number): void`

Enables auto-save with specified interval.

```typescript
useProjectStore.getState().enableAutoSave(30000) // Auto-save every 30 seconds
```

##### `disableAutoSave(): void`

Disables auto-save.

```typescript
useProjectStore.getState().disableAutoSave()
```

---

## ThemeContext

Context API for global theme state management.

**Location**: `src/contexts/ThemeContext.tsx`

### Context Value

```typescript
interface ThemeContextValue {
  theme: Theme              // Current theme ('light' | 'dark')
  setTheme: (theme: Theme) => void  // Set theme explicitly
  toggle: () => void        // Toggle between themes
  isDark: boolean           // True if dark mode active
}
```

### Provider

```typescript
import { ThemeProvider } from '@/contexts/ThemeContext'

function App() {
  return (
    <ThemeProvider>
      {/* App content */}
    </ThemeProvider>
  )
}
```

### Consumer Hook

#### `useThemeContext()`

Hook for accessing theme context. Must be used within `ThemeProvider`.

```typescript
import { useThemeContext } from '@/contexts/ThemeContext'

function Header() {
  const { theme, toggle, isDark } = useThemeContext()

  return (
    <button onClick={toggle}>
      {isDark ? '☀️ Light Mode' : '🌙 Dark Mode'}
    </button>
  )
}
```

**Returns**: `ThemeContextValue`

**Throws**: Error if used outside `ThemeProvider`

### useTheme Hook

Low-level hook for theme management (used internally by ThemeProvider).

**Location**: `src/hooks/useTheme.ts`

```typescript
import { useTheme } from '@/hooks/useTheme'

function MyComponent() {
  const { theme, setTheme, toggle, isDark } = useTheme()

  // theme: 'light' | 'dark'
  // setTheme: (theme: Theme) => void
  // toggle: () => void
  // isDark: boolean
}
```

**Features**:
- Reads initial theme from localStorage or system preference
- Applies theme by toggling `dark` class on `document.documentElement`
- Saves theme to localStorage on change
- Triggers re-render on theme change

### Theme Utilities

**Location**: `src/utils/theme.ts`

#### `getInitialTheme(): Theme`

Gets initial theme from localStorage or system preference.

```typescript
import { getInitialTheme } from '@/utils/theme'

const theme = getInitialTheme()
// Returns 'light' | 'dark'
```

**Priority**:
1. localStorage value (`'app-theme'`)
2. System preference (`prefers-color-scheme`)
3. Default to `'light'`

#### `applyTheme(theme: Theme): void`

Applies theme by toggling CSS class and saving to localStorage.

```typescript
import { applyTheme } from '@/utils/theme'

applyTheme('dark')
// Adds 'dark' class to document.documentElement
// Saves 'dark' to localStorage
```

#### `toggleTheme(currentTheme: Theme): Theme`

Toggles between light and dark themes.

```typescript
import { toggleTheme } from '@/utils/theme'

const newTheme = toggleTheme('light')
// Returns 'dark'
// Applies theme and saves to localStorage
```

### CSS Variables

Theme colors are defined as CSS variables in `src/index.css`.

**Usage in Components**:
```typescript
// TailwindCSS arbitrary values
<div className="bg-[var(--bg-primary)] text-[var(--text-primary)]">
  Content
</div>
```

**Available Variables** (70+ total):

**Backgrounds**:
- `--bg-primary`, `--bg-secondary`, `--bg-tertiary`
- `--bg-hover`, `--bg-active`

**Text**:
- `--text-primary`, `--text-secondary`, `--text-tertiary`
- `--text-inverted`

**Borders**:
- `--border-primary`, `--border-secondary`, `--border-focus`

**Status**:
- `--status-online`, `--status-offline`, `--status-active`, `--status-idle`
- `--status-armed`, `--status-error`, `--status-warning`, `--status-ok`

**Component-Specific** (50+ more):
- Badge colors, navigation, tabs, toggles
- Connection states, simulator colors
- Info/warning/error panels
- Battery indicators, modal overlays

**See**: [ARCHITECTURE.md#13-theme-system](../ARCHITECTURE.md#13-theme-system) for complete variable list

---

## Services

### ConnectionManager

Strategy pattern implementation for managing multiple connection types.

**Location**: `src/services/connection/ConnectionManager.ts`

#### Constructor

```typescript
const manager = new ConnectionManager()
```

#### Methods

##### `connect(config: ConnectionConfig): Promise<void>`

Connects using specified configuration.

```typescript
import { getConnectionManager } from '@/services/connection/ConnectionManager'
import { ConnectionMode } from '@/services/connection/types'

const manager = getConnectionManager()
await manager.connect({
  mode: ConnectionMode.SIMULATION,
  websocket: {
    url: 'ws://localhost:8080',
    reconnectInterval: 3000,
  },
})
```

##### `disconnect(): Promise<void>`

Disconnects and cleans up resources.

```typescript
await manager.disconnect()
```

##### `sendCommand(command: Command): Promise<CommandResponse>`

Sends single command via active connection.

```typescript
const response = await manager.sendCommand({
  type: CommandType.TAKEOFF,
  droneIds: [1, 2],
  params: { altitude: 5 },
})
```

##### `sendCommands(commands: Command[]): Promise<CommandResponse>`

Sends multiple commands.

```typescript
await manager.sendCommands([command1, command2, command3])
```

##### `emergencyStop(): Promise<CommandResponse>`

Sends emergency stop command.

```typescript
await manager.emergencyStop()
```

##### `getStatus(): ConnectionStatus`

Returns current connection status.

```typescript
const status = manager.getStatus()
```

##### `isConnected(): boolean`

Checks if currently connected.

```typescript
if (manager.isConnected()) {
  console.log('Connected')
}
```

##### `getCurrentMode(): ConnectionMode | null`

Returns current connection mode.

```typescript
const mode = manager.getCurrentMode()
```

##### `setEventListeners(listeners: ConnectionEventListeners): void`

Sets event listeners for connection events.

```typescript
manager.setEventListeners({
  onConnect: () => console.log('Connected'),
  onDisconnect: () => console.log('Disconnected'),
  onError: (error) => console.error('Error:', error),
  onTelemetryUpdate: (drones) => console.log('Telemetry:', drones),
})
```

##### `ping(): Promise<number>`

Tests connection latency.

```typescript
const latency = await manager.ping()
console.log(`Latency: ${latency}ms`)
```

##### `switchMode(newConfig: ConnectionConfig): Promise<void>`

Switches to different connection mode.

```typescript
await manager.switchMode({
  mode: ConnectionMode.TEST,
  test: { droneCount: 4 },
})
```

##### `cleanup(): void`

Complete cleanup of all resources.

```typescript
manager.cleanup()
```

#### Singleton Functions

##### `getConnectionManager(): ConnectionManager`

Gets singleton instance.

```typescript
import { getConnectionManager } from '@/services/connection/ConnectionManager'

const manager = getConnectionManager()
```

##### `resetConnectionManager(): void`

Resets singleton instance (for testing).

```typescript
import { resetConnectionManager } from '@/services/connection/ConnectionManager'

resetConnectionManager()
```

---

### Interpreter

AST-based execution engine with pause/resume support.

**Location**: `src/services/execution/interpreter.ts`

#### Constructor

```typescript
import { Interpreter } from '@/services/execution/interpreter'
import type { ExecutableNode } from '@/types/execution'

const tree: ExecutableNode = parseBlocklyWorkspace(workspace)
const interpreter = new Interpreter(tree)
```

#### Methods

##### `start(): Promise<void>`

Starts execution from root node.

```typescript
interpreter.setOnStateChange((state) => {
  console.log('Execution state:', state.status)
})

await interpreter.start()
```

##### `stop(): void`

Stops execution immediately.

```typescript
interpreter.stop()
```

##### `pause(): void`

Pauses execution (maintains context).

```typescript
interpreter.pause()
```

##### `resume(): void`

Resumes paused execution.

```typescript
interpreter.resume()
```

##### `setOnStateChange(callback: (state: ExecutionState) => void): void`

Sets callback for state changes.

```typescript
interpreter.setOnStateChange((state) => {
  console.log(`Status: ${state.status}`)
  console.log(`Current node: ${state.currentNodePath}`)
  console.log(`Execution count: ${state.executionCount}`)
})
```

##### `getState(): ExecutionState`

Gets current execution state.

```typescript
const state = interpreter.getState()
console.log(state.status, state.variables)
```

---

### ProjectService

High-level project management service.

**Location**: `src/services/project/ProjectService.ts`

#### Methods

##### `createFromTemplate(template: ProjectTemplate): string`

Creates workspace XML from template.

```typescript
import { ProjectService } from '@/services/project/ProjectService'
import { ProjectTemplate } from '@/types/project'

const xml = ProjectService.createFromTemplate(ProjectTemplate.BASIC_FLIGHT)
```

##### `generateThumbnail(workspace: Blockly.WorkspaceSvg): string | undefined`

Generates base64 thumbnail from workspace.

```typescript
const thumbnail = ProjectService.generateThumbnail(workspace)
```

##### `estimateBlockCount(workspaceXml: string): number`

Estimates number of blocks from XML.

```typescript
const count = ProjectService.estimateBlockCount(workspaceXml)
```

##### `validateWorkspaceXml(xml: string): boolean`

Validates workspace XML format.

```typescript
if (ProjectService.validateWorkspaceXml(xml)) {
  console.log('Valid XML')
}
```

---

### StorageAdapter

Adapter pattern for browser storage.

**Location**: `src/services/storage/StorageAdapter.ts`

#### Constructor

```typescript
import { StorageAdapter } from '@/services/storage/StorageAdapter'
import { StorageType } from '@/types/project'

const storage = new StorageAdapter(StorageType.INDEXED_DB)
```

#### Methods

##### `save<T>(key: string, data: T): Promise<void>`

Saves data to storage.

```typescript
await storage.save('projects', projectsArray)
```

##### `load<T>(key: string): Promise<T | null>`

Loads data from storage.

```typescript
const projects = await storage.load<Project[]>('projects')
```

##### `delete(key: string): Promise<void>`

Deletes data from storage.

```typescript
await storage.delete('projects')
```

##### `clear(): Promise<void>`

Clears all data.

```typescript
await storage.clear()
```

##### `getStorageType(): StorageType`

Returns current storage type.

```typescript
const type = storage.getStorageType()
```

---

## Connection Services

### IConnectionService

Interface for all connection service implementations.

**Location**: `src/services/connection/IConnectionService.ts`

#### Interface

```typescript
export interface IConnectionService {
  connect(config: ConnectionConfig): Promise<void>
  disconnect(): Promise<void>
  sendCommand(command: Command): Promise<CommandResponse>
  sendCommands(commands: Command[]): Promise<CommandResponse>
  emergencyStop(): Promise<CommandResponse>
  getStatus(): ConnectionStatus
  isConnected(): boolean
  ping(): Promise<number>
  setEventListeners(listeners: ConnectionEventListeners): void
  cleanup(): void
}
```

---

### WebSocketConnectionService

WebSocket-based connection for Unity simulator.

**Location**: `src/services/connection/WebSocketConnectionService.ts`

#### Usage

```typescript
import { WebSocketConnectionService } from '@/services/connection/WebSocketConnectionService'

const service = new WebSocketConnectionService()

await service.connect({
  mode: ConnectionMode.SIMULATION,
  websocket: {
    url: 'ws://localhost:8080',
    reconnectInterval: 3000,
    maxReconnectAttempts: 5,
  },
})

service.setEventListeners({
  onConnect: () => console.log('WebSocket connected'),
  onDisconnect: () => console.log('WebSocket disconnected'),
  onTelemetryUpdate: (drones) => console.log('Telemetry:', drones),
})
```

#### Features

- Automatic reconnection with exponential backoff
- Message queue for offline commands
- Ping/pong heartbeat
- JSON message protocol

---

### UnityWebGLConnectionService

Unity WebGL build integration via `window.unityInstance`.

**Location**: `src/services/connection/UnityWebGLConnectionService.ts`

#### Usage

```typescript
import { UnityWebGLConnectionService } from '@/services/connection/UnityWebGLConnectionService'

const service = new UnityWebGLConnectionService()

await service.connect({
  mode: ConnectionMode.UNITY_WEBGL,
  unityWebGL: {
    instanceName: 'unityInstance',
  },
})
```

#### Features

- Calls `SendMessage()` on Unity instance
- Receives messages via `window.receiveUnityMessage()`
- No network latency
- Direct memory communication

---

### TestConnectionService

Dummy mode for testing without external dependencies.

**Location**: `src/services/connection/TestConnectionService.ts`

#### Usage

```typescript
import { TestConnectionService } from '@/services/connection/TestConnectionService'

const service = new TestConnectionService(4) // 4 drones

await service.connect({
  mode: ConnectionMode.TEST,
  test: {
    droneCount: 4,
    updateInterval: 100, // 100ms updates
  },
})
```

#### Features

- Simulates N drones with physics
- Auto-generates telemetry data
- Instant command response
- Configurable update rate
- Perfect for UI development

---

### MAVLinkConnectionService

MAVLink protocol for real drones (Phase 2 - not yet implemented).

**Location**: `src/services/connection/MAVLinkConnectionService.ts`

#### Usage

```typescript
import { MAVLinkConnectionService } from '@/services/connection/MAVLinkConnectionService'

const service = new MAVLinkConnectionService()

try {
  await service.connect({
    mode: ConnectionMode.REAL_DRONE,
    mavlink: {
      port: 14550,
      baudRate: 57600,
    },
  })
} catch (error) {
  console.error('MAVLink not implemented yet:', error)
}
```

#### Status

⚠️ **Not yet implemented** - Planned for Phase 2

All methods throw errors with message:
> "MAVLink connection is not yet implemented. This feature is planned for Phase 2. Please use 'Unity WebGL' or 'Test Mode' instead."

---

## Type Definitions

### Command Types

```typescript
import { CommandType } from '@/types/blockly'

const command: Command = {
  type: CommandType.TAKEOFF,
  droneIds: [1, 2, 3],
  params: {
    altitude: 5,
    speed: 2,
  },
}
```

**Available CommandTypes**:
- `TAKEOFF` - Take off to altitude
- `LAND` - Land at current position
- `MOVE_TO` - Move to absolute position
- `MOVE_RELATIVE` - Move relative to current position
- `ROTATE` - Rotate to heading
- `SET_SPEED` - Set movement speed
- `HOVER` - Hover at current position
- `RETURN_TO_HOME` - Return to launch position

### ConnectionStatus

```typescript
import { ConnectionStatus } from '@/constants/connection'

// Values:
ConnectionStatus.DISCONNECTED
ConnectionStatus.CONNECTING
ConnectionStatus.CONNECTED
ConnectionStatus.RECONNECTING
ConnectionStatus.ERROR
```

### ExecutionState

```typescript
interface ExecutionState {
  status: 'idle' | 'running' | 'paused' | 'completed' | 'error' | 'stopped'
  currentNodePath: number[]
  executionCount: number
  variables: Record<string, any>
  logs: ExecutionLog[]
}
```

### DroneState

```typescript
interface DroneState {
  id: number
  position: { x: number; y: number; z: number }
  rotation: { x: number; y: number; z: number }
  velocity: { x: number; y: number; z: number }
  battery: number
  status: 'idle' | 'armed' | 'flying' | 'landing' | 'error'
}
```

---

## Usage Examples

### Complete Execution Flow

```typescript
import { useBlocklyStore } from '@/stores/useBlocklyStore'
import { useExecutionStore } from '@/stores/useExecutionStore'
import { useConnectionStore } from '@/stores/useConnectionStore'
import { ConnectionMode } from '@/services/connection/types'

// 1. Connect to simulator
const { connect } = useConnectionStore()
await connect({
  mode: ConnectionMode.SIMULATION,
  websocket: { url: 'ws://localhost:8080' },
})

// 2. Build Blockly workspace
const workspace = Blockly.inject('blocklyDiv', { toolbox })
useBlocklyStore.getState().setWorkspace(workspace)

// 3. Execute script
const { executeScript, status } = useExecutionStore()
await executeScript()

// 4. Monitor execution
useExecutionStore.subscribe((state) => {
  console.log('Status:', state.status)
  console.log('Logs:', state.logs)
})
```

### Recording and Playback

```typescript
import { useFlightRecordingStore } from '@/stores/useFlightRecordingStore'
import { useTelemetryStore } from '@/stores/useTelemetryStore'

// Start recording
const { startRecording, stopRecording, saveRecording } = useFlightRecordingStore()
startRecording()

// ... fly drones ...

// Stop and save
stopRecording()
saveRecording('My Flight', 'Test recording', ['test'])

// Later: load and play
const { loadRecording, playPlayback } = useFlightRecordingStore()
loadRecording('recording-id')
playPlayback()
```

### Project Management

```typescript
import { useProjectStore } from '@/stores/useProjectStore'
import { ProjectTemplate } from '@/types/project'

// Create new project
const { createProject, loadProject, saveProject } = useProjectStore()
const projectId = await createProject({
  name: 'Formation Flight',
  template: ProjectTemplate.FORMATION_EXAMPLE,
})

// Make changes...

// Save project
await saveProject(projectId)

// Later: load project
await loadProject(projectId)
```

---

## Related Documentation

- [ARCHITECTURE.md](../ARCHITECTURE.md) - System architecture overview
- [DIAGRAMS.md](./DIAGRAMS.md) - Visual diagrams
- [CONTRIBUTING.md](./CONTRIBUTING.md) - Development guidelines
- [README.md](../README.md) - Project overview
