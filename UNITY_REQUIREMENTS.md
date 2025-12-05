# Unity WebGL Integration Requirements

> **Version**: 1.0
> **Last Updated**: 2025-11-18
> **Target Unity Version**: 2021.3 LTS or higher

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Unity WebGL Build Requirements](#2-unity-webgl-build-requirements)
3. [Message Protocol Specification](#3-message-protocol-specification)
4. [Command Implementation Guide](#4-command-implementation-guide)
5. [Telemetry Data Specification](#5-telemetry-data-specification)
6. [GameManager Implementation Checklist](#6-gamemanager-implementation-checklist)
7. [Testing Scenarios](#7-testing-scenarios)
8. [Performance Requirements](#8-performance-requirements)
9. [Build & Deployment Instructions](#9-build--deployment-instructions)
10. [Troubleshooting Guide](#10-troubleshooting-guide)

**Appendices**:
- [Appendix A: Complete Message Format Reference](#appendix-a-complete-message-format-reference)
- [Appendix B: Coordinate System Reference](#appendix-b-coordinate-system-reference)
- [Appendix C: Resources & References](#appendix-c-resources--references)

---

## 1. Project Overview

### 1.1 System Architecture

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
│  │   - Message sending/receiving                   │       │
│  │   - Connection lifecycle management             │       │
│  └─────────────────────────────────────────────────┘       │
│         │                                        ▲          │
│         │ SendMessage()                          │          │
│         ▼                                        │          │
│  ┌─────────────────────────────────────────────────┐       │
│  │   Unity WebGL (embedded via iframe/canvas)      │       │
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
         │  │   - Position/Rotation          │             │
         │  │   - Formation logic            │             │
         │  │   - Collision detection        │             │
         │  └────────────────────────────────┘             │
         └──────────────────────────────────────────────────┘
```

### 1.2 Communication Flow

1. **Initialization Handshake**:
   ```
   React → Unity: (waits for Unity to load)
   Unity → React: { type: 'unity_ready' }
   React → Unity: { type: 'init', payload: { droneCount: 4 } }
   Unity → React: { type: 'init_complete' }
   ```

2. **Command Execution**:
   ```
   User creates Blockly script → Parser converts to command tree
   React → Unity: { type: 'execute_script', payload: { commands: [...] } }
   Unity executes commands → Updates drone positions
   Unity → React: { type: 'command_finish', commandId: '...' }
   ```

3. **Telemetry Updates (10Hz)**:
   ```
   Unity → React: { type: 'telemetry', payload: { drones: [...] } }
   (Every 100ms)
   ```

### 1.3 Key Technologies

- **React Side**: TypeScript 5.9.6, react-unity-webgl 9.5.2, Zustand 5.0.3
- **Unity Side**: Unity 2021.3 LTS+, WebGL build target
- **Communication**: JavaScript interop via `Application.ExternalCall()` and `window` message listeners
- **Coordinate System**: NED (North-East-Down)

---

## 2. Unity WebGL Build Requirements

### 2.1 Unity Version & Configuration

**Required Unity Version**: 2021.3 LTS or higher (2022 LTS recommended)

**Build Settings**:
```
Platform: WebGL
Compression Format: Gzip (or Brotli if server supports it)
Code Optimization: Runtime Speed
Enable Exceptions: None (or Explicitly Thrown Only)
Data Caching: Enabled
```

**Project Settings**:
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

### 2.2 Required Packages

Install via Unity Package Manager:

1. **Newtonsoft.Json** (for JSON parsing):
   ```
   com.unity.nuget.newtonsoft-json@3.2.1
   ```

### 2.3 Build Output Structure

After building, the output should be organized as:

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

**File Naming Convention**: Use `drone-sim` as the base name (configurable in React via `unityLoaderUrl` prop)

### 2.4 Canvas & Resolution Settings

- **Canvas Resolution**: 1920x1080 (16:9 aspect ratio)
- **Run In Background**: Enabled
- **Display Buffer**: True (required for telemetry updates)

---

## 3. Message Protocol Specification

### 3.1 Communication Architecture

Unity WebGL and React communicate via **two channels**:

1. **React → Unity**: `UnityContext.send(gameObjectName, methodName, parameter)`
   - Example: `unityContext.send('GameManager', 'ReceiveMessage', jsonString)`

2. **Unity → React**: `Application.ExternalCall(functionName, jsonString)`
   - Unity calls JavaScript function: `window.handleUnityMessage(jsonString)`
   - React listens via: `unityContext.on('HandleMessage', (data) => { ... })`

### 3.2 Message Format

All messages must be **JSON strings** with this structure:

```typescript
interface UnityMessage {
  type: MessageType
  payload?: any
  timestamp?: number
  commandId?: string
  error?: string
}

type MessageType =
  | 'unity_ready'        // Unity finished loading
  | 'init'               // Initialize simulation
  | 'init_complete'      // Initialization finished
  | 'execute_script'     // Execute command sequence
  | 'command_finish'     // Command execution completed
  | 'telemetry'          // Periodic telemetry data
  | 'error'              // Error occurred
  | 'ack'                // Acknowledgment
```

### 3.3 Message Flow Examples

#### 3.3.1 Initialization Sequence

**Step 1: Unity signals ready**
```json
{
  "type": "unity_ready",
  "timestamp": 1700000000000
}
```

**Step 2: React requests initialization**
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

**Step 3: Unity confirms initialization**
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

#### 3.3.2 Command Execution

**React → Unity: Execute takeoff command**
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

**Unity → React: Command completed**
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

#### 3.3.3 Telemetry Updates

**Unity → React: Telemetry data (every 100ms)**
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

### 3.4 Error Handling

**Error Message Format**:
```json
{
  "type": "error",
  "error": "Error message description",
  "payload": {
    "errorCode": "INVALID_COMMAND",
    "commandId": "cmd_1234567890",
    "details": "Unknown action type: invalid_action"
  },
  "timestamp": 1700000030000
}
```

**Error Codes**:
- `INVALID_COMMAND`: Command format is incorrect
- `EXECUTION_FAILED`: Command execution failed
- `DRONE_NOT_FOUND`: Specified drone ID does not exist
- `COLLISION_DETECTED`: Collision prevention triggered
- `TIMEOUT`: Command execution timeout

---

## 4. Command Implementation Guide

### 4.1 Command Structure

All commands follow this structure:

```typescript
interface Command {
  action: CommandAction
  params: CommandParams
  droneId?: number  // For single-drone commands
  duration?: number // For time-based commands
}

type CommandAction =
  // Basic Control
  | 'takeoff_all'
  | 'land_all'

  // Formation Control
  | 'set_formation'
  | 'move_formation'

  // Individual Drone Control
  | 'move_drone'
  | 'rotate_drone'

  // Advanced Control
  | 'hover'
  | 'wait'

  // Synchronization
  | 'sync_all'
  | 'wait_all'
```

### 4.2 Command Implementations

#### 4.2.1 takeoff_all

**Description**: All drones takeoff to specified altitude simultaneously

**Parameters**:
```typescript
{
  "action": "takeoff_all",
  "params": {
    "altitude": number,  // Target altitude in meters (NED: negative Y)
    "speed": number      // Climb speed in m/s
  }
}
```

**Example**:
```json
{
  "action": "takeoff_all",
  "params": {
    "altitude": 10.0,
    "speed": 2.0
  }
}
```

**Unity Implementation Requirements**:
1. Check all drones are on ground (`position.y ~= 0`)
2. Set target altitude for each drone
3. Apply upward velocity until target reached
4. Maintain position after reaching altitude
5. Send `command_finish` when ALL drones reach target

**C# Pseudocode**:
```csharp
IEnumerator ExecuteTakeoffAll(float altitude, float speed)
{
    foreach (var drone in drones)
    {
        drone.SetTargetAltitude(altitude);
        drone.SetClimbSpeed(speed);
    }

    // Wait until all drones reach target altitude
    while (drones.Any(d => !d.IsAtTargetAltitude()))
    {
        yield return null;
    }

    SendCommandFinish(currentCommandId);
}
```

#### 4.2.2 land_all

**Description**: All drones land to ground simultaneously

**Parameters**:
```typescript
{
  "action": "land_all",
  "params": {
    "speed": number  // Descent speed in m/s
  }
}
```

**Example**:
```json
{
  "action": "land_all",
  "params": {
    "speed": 1.0
  }
}
```

**Unity Implementation Requirements**:
1. Set target altitude to 0 for all drones
2. Apply downward velocity until ground reached
3. Disarm drones when landed
4. Send `command_finish` when ALL drones landed

#### 4.2.3 set_formation

**Description**: Arrange drones into specified formation pattern

**Parameters**:
```typescript
{
  "action": "set_formation",
  "params": {
    "formationType": 'grid' | 'line' | 'circle' | 'v_shape' | 'triangle' | 'square' | 'diamond',
    "spacing": number,      // Distance between drones (meters)
    "center": Vector3,      // Formation center point (NED)
    "heading": number       // Formation heading in degrees (0 = North)
  }
}
```

**Example**:
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

**Unity Implementation Requirements**:

**Grid Formation (NxN grid)**:
```
Drone 1  Drone 2  Drone 3
Drone 4  Drone 5  Drone 6
Drone 7  Drone 8  Drone 9
```

Positions (spacing = 5m):
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

**Line Formation**:
```
Drone 1 → Drone 2 → Drone 3 → Drone 4
```

**Circle Formation**:
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

**V-Shape Formation**:
```
        Drone 1
      /        \
   Drone 2   Drone 3
   /              \
Drone 4         Drone 5
```

#### 4.2.4 move_formation

**Description**: Move entire formation in specified direction

**Parameters**:
```typescript
{
  "action": "move_formation",
  "params": {
    "direction": 'forward' | 'backward' | 'left' | 'right' | 'up' | 'down',
    "distance": number,  // Distance in meters
    "speed": number      // Movement speed in m/s
  }
}
```

**Example**:
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

**Unity Implementation Requirements**:
1. Calculate direction vector based on `direction` parameter
2. Add offset to ALL drone target positions
3. Move drones maintaining relative positions
4. Send `command_finish` when ALL drones reach targets

**Direction Mapping (NED)**:
```csharp
Vector3 GetDirectionVector(string direction, float distance)
{
    switch (direction)
    {
        case "forward":  return new Vector3(0, 0, -distance);  // -Z (North)
        case "backward": return new Vector3(0, 0, distance);   // +Z (South)
        case "left":     return new Vector3(-distance, 0, 0);  // -X (West)
        case "right":    return new Vector3(distance, 0, 0);   // +X (East)
        case "up":       return new Vector3(0, -distance, 0);  // -Y (Up)
        case "down":     return new Vector3(0, distance, 0);   // +Y (Down)
        default:         return Vector3.zero;
    }
}
```

#### 4.2.5 move_drone

**Description**: Move single drone to target position

**Parameters**:
```typescript
{
  "action": "move_drone",
  "droneId": number,
  "params": {
    "target": Vector3,   // Target position (NED)
    "speed": number      // Movement speed in m/s
  }
}
```

**Example**:
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

**Unity Implementation Requirements**:
1. Validate `droneId` exists
2. Set target position for specified drone
3. Move drone along path (consider collision avoidance)
4. Send `command_finish` when drone reaches target

#### 4.2.6 rotate_drone

**Description**: Rotate single drone to target heading

**Parameters**:
```typescript
{
  "action": "rotate_drone",
  "droneId": number,
  "params": {
    "heading": number,    // Target heading in degrees (0 = North)
    "speed": number       // Rotation speed in degrees/sec
  }
}
```

**Example**:
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

**Unity Implementation Requirements**:
1. Convert heading to Unity rotation (Y-axis rotation)
2. Smoothly rotate drone using speed parameter
3. Send `command_finish` when rotation complete

#### 4.2.7 hover

**Description**: Hold current position for duration

**Parameters**:
```typescript
{
  "action": "hover",
  "params": {
    "duration": number  // Duration in seconds
  }
}
```

**Example**:
```json
{
  "action": "hover",
  "params": {
    "duration": 5.0
  }
}
```

**Unity Implementation Requirements**:
1. Stop all drone movement
2. Maintain current positions
3. Wait for specified duration
4. Send `command_finish` after duration

#### 4.2.8 wait

**Description**: Wait for specified duration (alias for hover)

**Parameters**: Same as `hover`

#### 4.2.9 sync_all

**Description**: Synchronize all drones (wait for all to finish current action)

**Parameters**:
```typescript
{
  "action": "sync_all",
  "params": {}
}
```

**Unity Implementation Requirements**:
1. Check status of all drones
2. Wait until ALL drones are idle/hovering
3. Send `command_finish` when synchronized

#### 4.2.10 wait_all

**Description**: Wait for all drones to complete movements (same as sync_all)

**Parameters**: Same as `sync_all`

### 4.3 Command Execution Flow

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

            // ... other message types
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

            // ... other commands
        }
    }
}
```

---

## 5. Telemetry Data Specification

### 5.1 Telemetry Update Frequency

**Requirement**: Send telemetry data at **10Hz** (every 100ms)

**Unity Implementation**:
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

### 5.2 Telemetry Data Format

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
  position: Vector3      // NED coordinates
  rotation: Vector3      // Euler angles (degrees)
  velocity: Vector3      // m/s in NED frame
  battery: number        // Percentage (0-100)
  armed: boolean
  mode: string          // 'MANUAL' | 'AUTO' | 'GUIDED'
  status: string        // 'idle' | 'takeoff' | 'landing' | 'moving' | 'hovering'
}
```

### 5.3 Example Telemetry Message

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

### 5.4 Battery Simulation

Implement battery drain based on activity:

```csharp
public class Drone : MonoBehaviour
{
    public float battery = 100f; // Percentage

    private const float IDLE_DRAIN = 0.5f;    // %/minute when hovering
    private const float MOVING_DRAIN = 1.0f;  // %/minute when moving
    private const float CLIMB_DRAIN = 1.5f;   // %/minute when climbing

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

## 6. GameManager Implementation Checklist

### 6.1 Core Components

Create these C# scripts in your Unity project:

- [ ] **GameManager.cs** - Main message handler and command coordinator
- [ ] **Drone.cs** - Individual drone physics and control
- [ ] **FormationController.cs** - Formation pattern logic
- [ ] **TelemetryManager.cs** - Telemetry data collection and sending
- [ ] **MessageTypes.cs** - Message structure definitions

### 6.2 GameManager.cs Template

```csharp
using UnityEngine;
using System.Collections;
using System.Collections.Generic;
using Newtonsoft.Json;
using System.Runtime.InteropServices;

public class GameManager : MonoBehaviour
{
    [Header("Drone Settings")]
    public GameObject dronePrefab;
    public int droneCount = 4;

    [Header("Simulation Settings")]
    public float telemetryInterval = 0.1f; // 10Hz

    private List<Drone> drones = new List<Drone>();
    private Queue<Command> commandQueue = new Queue<Command>();
    private bool isExecuting = false;
    private string currentCommandId = "";
    private float lastTelemetryTime = 0f;
    private bool isInitialized = false;

    // JavaScript interop
    [DllImport("__Internal")]
    private static extern void HandleUnityMessage(string message);

    void Start()
    {
        SendMessage("unity_ready");
    }

    void Update()
    {
        if (!isInitialized) return;

        // Send telemetry at 10Hz
        if (Time.time - lastTelemetryTime >= telemetryInterval)
        {
            SendTelemetry();
            lastTelemetryTime = Time.time;
        }
    }

    // Called from React via unityContext.send()
    public void ReceiveMessage(string jsonMessage)
    {
        Debug.Log($"[Unity] Received: {jsonMessage}");

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
                    Debug.LogWarning($"Unknown message type: {message.type}");
                    break;
            }
        }
        catch (System.Exception e)
        {
            SendError($"Message parsing failed: {e.Message}");
        }
    }

    private void InitializeSimulation(object payload)
    {
        var config = JsonConvert.DeserializeObject<InitConfig>(payload.ToString());
        droneCount = config.droneCount;

        // Clear existing drones
        foreach (var drone in drones)
        {
            Destroy(drone.gameObject);
        }
        drones.Clear();

        // Create drones
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
            Debug.Log($"[Unity] Executing: {command.action}");
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
                SendError($"Unknown command: {command.action}");
                break;
        }
    }

    // Command implementations
    private IEnumerator ExecuteTakeoffAll(CommandParams p)
    {
        float altitude = p.altitude;
        float speed = p.speed;

        foreach (var drone in drones)
        {
            drone.TakeOff(altitude, speed);
        }

        // Wait until all drones reach target
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
            drones[i].MoveTo(positions[i], 3.0f); // Default speed
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
            SendError($"Drone not found: {droneId}");
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
            SendError($"Drone not found: {droneId}");
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

    // Telemetry
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

    // Message sending
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

// Message structure classes
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

### 6.3 Drone.cs Template

```csharp
using UnityEngine;

public class Drone : MonoBehaviour
{
    [Header("Drone Identity")]
    public int id;

    [Header("Flight Parameters")]
    public float maxSpeed = 10f;
    public float acceleration = 2f;
    public float rotationSpeed = 90f;

    [Header("Status")]
    public float battery = 100f;
    public bool armed = false;
    public string mode = "AUTO";
    public string status = "idle";

    // Internal state
    public Vector3 velocity = Vector3.zero;
    private Vector3 targetPosition;
    private float targetRotation;
    private bool hasTarget = false;
    private bool hasRotationTarget = false;

    private const float POSITION_THRESHOLD = 0.1f;
    private const float ROTATION_THRESHOLD = 1f;

    void Update()
    {
        UpdateMovement();
        UpdateRotation();
        UpdateBattery();
    }

    private void UpdateMovement()
    {
        if (!hasTarget) return;

        Vector3 direction = targetPosition - transform.position;
        float distance = direction.magnitude;

        if (distance < POSITION_THRESHOLD)
        {
            velocity = Vector3.zero;
            hasTarget = false;
            status = "hovering";
            return;
        }

        // Accelerate towards target
        Vector3 targetVelocity = direction.normalized * maxSpeed;
        velocity = Vector3.MoveTowards(velocity, targetVelocity, acceleration * Time.deltaTime);

        transform.position += velocity * Time.deltaTime;
        status = "moving";
    }

    private void UpdateRotation()
    {
        if (!hasRotationTarget) return;

        float currentRotation = transform.eulerAngles.y;
        float angleDiff = Mathf.DeltaAngle(currentRotation, targetRotation);

        if (Mathf.Abs(angleDiff) < ROTATION_THRESHOLD)
        {
            hasRotationTarget = false;
            return;
        }

        float step = rotationSpeed * Time.deltaTime;
        float newRotation = Mathf.MoveTowardsAngle(currentRotation, targetRotation, step);
        transform.eulerAngles = new Vector3(0, newRotation, 0);
    }

    private void UpdateBattery()
    {
        if (!armed) return;

        float drainRate = 0.5f; // Base drain

        if (velocity.y < -0.1f) drainRate = 1.5f; // Climbing
        else if (velocity.magnitude > 0.1f) drainRate = 1.0f; // Moving

        battery -= drainRate * Time.deltaTime / 60f;
        battery = Mathf.Max(0, battery);

        if (battery <= 0)
        {
            Land(1.0f);
        }
    }

    // Public control methods
    public void TakeOff(float altitude, float speed)
    {
        armed = true;
        targetPosition = new Vector3(transform.position.x, altitude, transform.position.z);
        maxSpeed = speed;
        hasTarget = true;
        status = "takeoff";
    }

    public void Land(float speed)
    {
        targetPosition = new Vector3(transform.position.x, 0, transform.position.z);
        maxSpeed = speed;
        hasTarget = true;
        status = "landing";
    }

    public void MoveTo(Vector3 target, float speed)
    {
        targetPosition = target;
        maxSpeed = speed;
        hasTarget = true;
        status = "moving";
    }

    public void MoveBy(Vector3 offset, float speed)
    {
        targetPosition = transform.position + offset;
        maxSpeed = speed;
        hasTarget = true;
        status = "moving";
    }

    public void RotateTo(float heading, float speed)
    {
        targetRotation = heading;
        rotationSpeed = speed;
        hasRotationTarget = true;
    }

    public void Hover()
    {
        targetPosition = transform.position;
        velocity = Vector3.zero;
        hasTarget = false;
        status = "hovering";
    }

    // State queries
    public bool IsAtTargetAltitude()
    {
        return Mathf.Abs(transform.position.y - targetPosition.y) < POSITION_THRESHOLD;
    }

    public bool IsAtTarget()
    {
        if (!hasTarget) return true;
        return Vector3.Distance(transform.position, targetPosition) < POSITION_THRESHOLD;
    }

    public bool IsAtTargetRotation()
    {
        if (!hasRotationTarget) return true;
        return Mathf.Abs(Mathf.DeltaAngle(transform.eulerAngles.y, targetRotation)) < ROTATION_THRESHOLD;
    }

    public bool IsLanded()
    {
        return transform.position.y < 0.1f && velocity.magnitude < 0.1f;
    }

    public bool IsMoving()
    {
        return velocity.magnitude > 0.1f || hasTarget;
    }
}
```

### 6.4 FormationController.cs Template

```csharp
using UnityEngine;
using System.Collections.Generic;

public static class FormationController
{
    public static List<Vector3> CalculateFormation(
        string formationType,
        int droneCount,
        float spacing,
        Vector3 center,
        float heading)
    {
        List<Vector3> positions = new List<Vector3>();

        switch (formationType)
        {
            case "grid":
                positions = CalculateGrid(droneCount, spacing, center);
                break;

            case "line":
                positions = CalculateLine(droneCount, spacing, center);
                break;

            case "circle":
                positions = CalculateCircle(droneCount, spacing, center);
                break;

            case "v_shape":
                positions = CalculateVShape(droneCount, spacing, center);
                break;

            case "triangle":
                positions = CalculateTriangle(droneCount, spacing, center);
                break;

            case "square":
                positions = CalculateSquare(droneCount, spacing, center);
                break;

            case "diamond":
                positions = CalculateDiamond(droneCount, spacing, center);
                break;

            default:
                Debug.LogError($"Unknown formation type: {formationType}");
                positions = CalculateGrid(droneCount, spacing, center);
                break;
        }

        // Apply heading rotation
        if (heading != 0)
        {
            positions = RotateFormation(positions, center, heading);
        }

        return positions;
    }

    private static List<Vector3> CalculateGrid(int count, float spacing, Vector3 center)
    {
        List<Vector3> positions = new List<Vector3>();
        int gridSize = Mathf.CeilToInt(Mathf.Sqrt(count));

        for (int i = 0; i < count; i++)
        {
            int row = i / gridSize;
            int col = i % gridSize;

            Vector3 pos = center + new Vector3(
                col * spacing - (gridSize - 1) * spacing / 2f,
                0,
                row * spacing - (gridSize - 1) * spacing / 2f
            );

            positions.Add(pos);
        }

        return positions;
    }

    private static List<Vector3> CalculateLine(int count, float spacing, Vector3 center)
    {
        List<Vector3> positions = new List<Vector3>();

        for (int i = 0; i < count; i++)
        {
            Vector3 pos = center + new Vector3(
                i * spacing - (count - 1) * spacing / 2f,
                0,
                0
            );
            positions.Add(pos);
        }

        return positions;
    }

    private static List<Vector3> CalculateCircle(int count, float spacing, Vector3 center)
    {
        List<Vector3> positions = new List<Vector3>();
        float radius = spacing * count / (2 * Mathf.PI);

        for (int i = 0; i < count; i++)
        {
            float angle = (360f / count) * i * Mathf.Deg2Rad;
            Vector3 pos = center + new Vector3(
                radius * Mathf.Sin(angle),
                0,
                radius * Mathf.Cos(angle)
            );
            positions.Add(pos);
        }

        return positions;
    }

    private static List<Vector3> CalculateVShape(int count, float spacing, Vector3 center)
    {
        List<Vector3> positions = new List<Vector3>();
        int halfCount = count / 2;

        for (int i = 0; i < count; i++)
        {
            float x = (i < halfCount) ? -i * spacing : (i - halfCount) * spacing;
            float z = -Mathf.Abs(i - halfCount) * spacing;

            Vector3 pos = center + new Vector3(x, 0, z);
            positions.Add(pos);
        }

        return positions;
    }

    private static List<Vector3> CalculateTriangle(int count, float spacing, Vector3 center)
    {
        List<Vector3> positions = new List<Vector3>();

        // Calculate rows needed
        int row = 0;
        int dronesPlaced = 0;

        while (dronesPlaced < count)
        {
            int dronesInRow = Mathf.Min(row + 1, count - dronesPlaced);

            for (int col = 0; col < dronesInRow; col++)
            {
                Vector3 pos = center + new Vector3(
                    col * spacing - (dronesInRow - 1) * spacing / 2f,
                    0,
                    -row * spacing
                );
                positions.Add(pos);
                dronesPlaced++;

                if (dronesPlaced >= count) break;
            }

            row++;
        }

        return positions;
    }

    private static List<Vector3> CalculateSquare(int count, float spacing, Vector3 center)
    {
        List<Vector3> positions = new List<Vector3>();
        int sideLength = Mathf.CeilToInt(Mathf.Sqrt(count));

        // Fill perimeter first
        for (int i = 0; i < count; i++)
        {
            int side = i / sideLength;
            int pos = i % sideLength;

            Vector3 position = center;

            if (side == 0) // Top
                position += new Vector3(pos * spacing, 0, 0);
            else if (side == 1) // Right
                position += new Vector3(sideLength * spacing, 0, pos * spacing);
            else if (side == 2) // Bottom
                position += new Vector3((sideLength - pos) * spacing, 0, sideLength * spacing);
            else // Left
                position += new Vector3(0, 0, (sideLength - pos) * spacing);

            positions.Add(position);
        }

        return positions;
    }

    private static List<Vector3> CalculateDiamond(int count, float spacing, Vector3 center)
    {
        List<Vector3> positions = new List<Vector3>();
        int halfCount = count / 2;

        for (int i = 0; i < count; i++)
        {
            float angle = (360f / count) * i * Mathf.Deg2Rad + 45 * Mathf.Deg2Rad;
            float radius = spacing * 2;

            Vector3 pos = center + new Vector3(
                radius * Mathf.Sin(angle),
                0,
                radius * Mathf.Cos(angle)
            );
            positions.Add(pos);
        }

        return positions;
    }

    private static List<Vector3> RotateFormation(List<Vector3> positions, Vector3 center, float heading)
    {
        List<Vector3> rotated = new List<Vector3>();
        Quaternion rotation = Quaternion.Euler(0, heading, 0);

        foreach (var pos in positions)
        {
            Vector3 offset = pos - center;
            Vector3 rotatedOffset = rotation * offset;
            rotated.Add(center + rotatedOffset);
        }

        return rotated;
    }
}
```

---

## 7. Testing Scenarios

### 7.1 Unit Tests

Test each command independently:

#### Test 1: Takeoff All
```json
{
  "type": "execute_script",
  "commandId": "test_takeoff_001",
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
  }
}
```

**Expected Result**:
- All drones move from Y=0 to Y=10
- Movement takes ~5 seconds (10m / 2m/s)
- `command_finish` message received
- All drones report `status: "hovering"`

#### Test 2: Grid Formation
```json
{
  "type": "execute_script",
  "commandId": "test_formation_001",
  "payload": {
    "commands": [
      {
        "action": "set_formation",
        "params": {
          "formationType": "grid",
          "spacing": 5.0,
          "center": { "x": 0, "y": 10, "z": 0 },
          "heading": 0
        }
      }
    ]
  }
}
```

**Expected Result** (4 drones):
- Drone 1: (0, 10, 0)
- Drone 2: (5, 10, 0)
- Drone 3: (0, 10, 5)
- Drone 4: (5, 10, 5)

#### Test 3: Move Formation
```json
{
  "type": "execute_script",
  "commandId": "test_move_001",
  "payload": {
    "commands": [
      {
        "action": "move_formation",
        "params": {
          "direction": "forward",
          "distance": 10.0,
          "speed": 3.0
        }
      }
    ]
  }
}
```

**Expected Result**:
- All drones move -10m in Z direction (North)
- Relative spacing maintained
- Movement takes ~3.3 seconds (10m / 3m/s)

### 7.2 Integration Tests

Test command sequences:

#### Test 4: Complete Flight Mission
```json
{
  "type": "execute_script",
  "commandId": "test_integration_001",
  "payload": {
    "commands": [
      { "action": "takeoff_all", "params": { "altitude": 10, "speed": 2 } },
      { "action": "set_formation", "params": { "formationType": "line", "spacing": 5, "center": { "x": 0, "y": 10, "z": 0 }, "heading": 0 } },
      { "action": "move_formation", "params": { "direction": "forward", "distance": 20, "speed": 5 } },
      { "action": "hover", "params": { "duration": 3 } },
      { "action": "move_formation", "params": { "direction": "right", "distance": 10, "speed": 3 } },
      { "action": "land_all", "params": { "speed": 1 } }
    ]
  }
}
```

**Expected Behavior**:
1. Drones takeoff to 10m
2. Arrange in line formation
3. Move forward 20m
4. Hover for 3 seconds
5. Move right 10m
6. Land safely

**Validation Points**:
- Each command completes before next starts
- Telemetry shows smooth transitions
- Final position: drones landed at (10, 0, -20)

### 7.3 Edge Case Tests

#### Test 5: Battery Drain
```json
{
  "type": "execute_script",
  "commandId": "test_battery_001",
  "payload": {
    "commands": [
      { "action": "takeoff_all", "params": { "altitude": 10, "speed": 2 } },
      { "action": "hover", "params": { "duration": 60 } }
    ]
  }
}
```

**Expected Result**:
- Battery drains at ~0.5%/minute while hovering
- After 60 seconds: battery ~99%
- Telemetry reflects battery level

#### Test 6: Invalid Drone ID
```json
{
  "type": "execute_script",
  "commandId": "test_error_001",
  "payload": {
    "commands": [
      {
        "action": "move_drone",
        "droneId": 999,
        "params": { "target": { "x": 10, "y": 10, "z": 10 }, "speed": 5 }
      }
    ]
  }
}
```

**Expected Result**:
- Error message: `{ "type": "error", "error": "Drone not found: 999" }`

### 7.4 Performance Tests

#### Test 7: Large Swarm (10+ drones)
```json
{
  "type": "init",
  "payload": {
    "droneCount": 16,
    "startFormation": "grid",
    "startAltitude": 10,
    "spacing": 5
  }
}
```

**Performance Requirements**:
- Frame rate: ≥30 FPS
- Telemetry: Consistent 10Hz updates
- Command latency: <100ms

---

## 8. Performance Requirements

### 8.1 Frame Rate

**Target**: 30 FPS minimum, 60 FPS preferred

**Optimization Tips**:
- Use object pooling for drone prefabs
- Limit physics calculations (use kinematic Rigidbody)
- Reduce mesh complexity for drones
- Use LOD (Level of Detail) for distant drones

### 8.2 Message Latency

**Target**: <100ms round-trip latency

**Measurement**:
```typescript
// React side
const startTime = Date.now()
unityContext.send('GameManager', 'ReceiveMessage', JSON.stringify(message))

// Unity responds
unityContext.on('HandleMessage', (data) => {
  const latency = Date.now() - startTime
  console.log(`Latency: ${latency}ms`)
})
```

### 8.3 Memory Usage

**Target**: <256MB WebGL heap

**Monitor with**:
```csharp
void Update()
{
    if (Time.frameCount % 300 == 0) // Every 5 seconds at 60fps
    {
        Debug.Log($"Memory: {System.GC.GetTotalMemory(false) / 1024 / 1024}MB");
    }
}
```

### 8.4 Telemetry Frequency

**Requirement**: Exactly 10Hz (100ms interval)

**Validation**:
```typescript
let lastTimestamp = 0
unityContext.on('HandleMessage', (data) => {
  if (data.type === 'telemetry') {
    const interval = data.payload.timestamp - lastTimestamp
    console.log(`Telemetry interval: ${interval}ms`) // Should be ~100ms
    lastTimestamp = data.payload.timestamp
  }
})
```

---

## 9. Build & Deployment Instructions

### 9.1 Unity Build Steps

1. **Set Build Platform**:
   - File → Build Settings
   - Select "WebGL"
   - Click "Switch Platform"

2. **Configure Player Settings**:
   ```
   Player Settings → WebGL tab:
   - Compression Format: Gzip
   - Code Optimization: Runtime Speed
   - Exception Support: None
   - Data Caching: Enabled
   - Memory Size: 512MB
   ```

3. **Build Project**:
   - Build Settings → Build
   - Output folder: `Build/WebGL`
   - Build name: `drone-sim`

4. **Copy Build Files**:
   ```bash
   # From Unity build output
   cp -r Build/WebGL/Build/* ../drone-swarm-gcs/public/unity/Build/
   cp -r Build/WebGL/TemplateData/* ../drone-swarm-gcs/public/unity/TemplateData/
   ```

### 9.2 Integration with React

Place Unity build files in this structure:

```
drone-swarm-gcs/
└── public/
    └── unity/
        ├── Build/
        │   ├── drone-sim.loader.js
        │   ├── drone-sim.framework.js.gz
        │   ├── drone-sim.data.gz
        │   └── drone-sim.wasm.gz
        ├── TemplateData/
        │   └── style.css
        └── README.md
```

### 9.3 React Configuration

Ensure `UnityWebGLConnectionService.ts` points to correct loader:

```typescript
const unityContext = new UnityContext({
  loaderUrl: '/unity/Build/drone-sim.loader.js',
  dataUrl: '/unity/Build/drone-sim.data.gz',
  frameworkUrl: '/unity/Build/drone-sim.framework.js.gz',
  codeUrl: '/unity/Build/drone-sim.wasm.gz',
})
```

### 9.4 Testing Build

1. **Start React Dev Server**:
   ```bash
   cd drone-swarm-gcs
   npm run dev
   ```

2. **Open Browser**:
   ```
   http://localhost:3000
   ```

3. **Select Unity WebGL Mode**:
   - Connection Panel → Mode: "Unity WebGL Simulation"
   - Click "Connect"

4. **Verify**:
   - Unity canvas loads successfully
   - Console shows: `[Unity] Received: {"type":"init",...}`
   - Telemetry updates at 10Hz

---

## 10. Troubleshooting Guide

### 10.1 Common Issues

#### Issue 1: Unity Not Loading

**Symptoms**:
- Blank canvas
- Console error: `Failed to fetch unity loader`

**Solutions**:
1. Check file paths in `UnityWebGLConnectionService.ts`
2. Verify build files exist in `public/unity/Build/`
3. Check browser console for CORS errors
4. Ensure dev server is running (`npm run dev`)

#### Issue 2: No Telemetry Data

**Symptoms**:
- Connection established
- No drone position updates in UI

**Solutions**:
1. Verify `TelemetryManager` is calling `SendTelemetry()` at 10Hz
2. Check Unity console for JSON serialization errors
3. Verify `HandleUnityMessage` function exists in browser window
4. Check React listener: `unityContext.on('HandleMessage', ...)`

#### Issue 3: Commands Not Executing

**Symptoms**:
- Commands sent but drones don't move
- No `command_finish` message

**Solutions**:
1. Verify `GameManager.ReceiveMessage()` is being called
2. Check Unity console for command parsing errors
3. Add debug logs in `ExecuteCommand()` switch statement
4. Verify command format matches expected JSON structure

#### Issue 4: Performance Issues

**Symptoms**:
- FPS drops below 30
- Laggy drone movement

**Solutions**:
1. Reduce drone count (test with 4 drones first)
2. Simplify drone mesh/materials
3. Use kinematic Rigidbody (no physics simulation)
4. Profile with Unity Profiler (Window → Analysis → Profiler)

#### Issue 5: Message Format Errors

**Symptoms**:
- JSON parsing errors in Unity
- `Newtonsoft.Json` exceptions

**Solutions**:
1. Validate JSON in React before sending:
   ```typescript
   try {
     JSON.parse(JSON.stringify(message))
   } catch (e) {
     console.error('Invalid JSON:', e)
   }
   ```

2. Use exact property names (case-sensitive):
   ```csharp
   // Correct
   public class Command {
       public string action;  // lowercase
       public CommandParams @params;
   }

   // Wrong
   public class Command {
       public string Action;  // uppercase
   }
   ```

3. Handle missing fields gracefully:
   ```csharp
   float altitude = p.altitude != 0 ? p.altitude : 10f; // Default value
   ```

### 10.2 Debugging Tips

#### Enable Verbose Logging

**Unity**:
```csharp
public void ReceiveMessage(string jsonMessage)
{
    Debug.Log($"[RECV] {jsonMessage}");
    // ... process message
}

private void SendMessage(string type, object payload = null)
{
    string json = JsonConvert.SerializeObject(message);
    Debug.Log($"[SEND] {json}");
    HandleUnityMessage(json);
}
```

**React**:
```typescript
unityContext.send('GameManager', 'ReceiveMessage', jsonString)
console.log('[React → Unity]', jsonString)

unityContext.on('HandleMessage', (data) => {
  console.log('[Unity → React]', data)
})
```

#### Validate Message Flow

Add timestamps to track delays:

```typescript
// React
const sendTime = Date.now()
unityContext.send('GameManager', 'ReceiveMessage', JSON.stringify({
  ...message,
  _debugSendTime: sendTime
}))

// Unity
Debug.Log($"Latency: {Time.time * 1000 - message._debugSendTime}ms");
```

### 10.3 Browser Compatibility

**Supported Browsers**:
- Chrome 90+ ✅
- Firefox 88+ ✅
- Edge 90+ ✅
- Safari 14+ ⚠️ (WebGL performance may vary)

**Not Supported**:
- Internet Explorer (any version)
- Mobile browsers (performance limitations)

---

## Appendix A: Complete Message Format Reference

### A.1 React → Unity Messages

#### init
```json
{
  "type": "init",
  "payload": {
    "droneCount": 4,
    "startFormation": "grid",
    "startAltitude": 10.0,
    "spacing": 5.0
  },
  "timestamp": 1700000000000
}
```

#### execute_script
```json
{
  "type": "execute_script",
  "commandId": "cmd_1234567890",
  "payload": {
    "commands": [
      {
        "action": "takeoff_all",
        "params": { "altitude": 10, "speed": 2 }
      },
      {
        "action": "set_formation",
        "params": {
          "formationType": "circle",
          "spacing": 5,
          "center": { "x": 0, "y": 10, "z": 0 },
          "heading": 0
        }
      }
    ]
  },
  "timestamp": 1700000010000
}
```

### A.2 Unity → React Messages

#### unity_ready
```json
{
  "type": "unity_ready",
  "timestamp": 1700000000000
}
```

#### init_complete
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

#### command_finish
```json
{
  "type": "command_finish",
  "commandId": "cmd_1234567890",
  "payload": {
    "executedCommands": 5,
    "totalDuration": 23.5
  },
  "timestamp": 1700000033500
}
```

#### telemetry
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
      }
    ],
    "timestamp": 1700000020000
  }
}
```

#### error
```json
{
  "type": "error",
  "error": "Drone not found: 999",
  "payload": {
    "errorCode": "DRONE_NOT_FOUND",
    "commandId": "cmd_error_001",
    "details": "Requested drone ID does not exist in simulation"
  },
  "timestamp": 1700000030000
}
```

---

## Appendix B: Coordinate System Reference

### B.1 NED Coordinate System

**NED** = North-East-Down

```
        North (-Z)
           ▲
           │
           │
           │
West ◄─────┼─────► East
 (-X)      │       (+X)
           │
           │
           ▼
        South (+Z)

    Up (-Y) ┌─── Down (+Y)
```

### B.2 Unity Coordinate Mapping

| NED Direction | Unity Vector3 | Value |
|---------------|---------------|-------|
| North         | -Z            | `new Vector3(0, 0, -distance)` |
| South         | +Z            | `new Vector3(0, 0, distance)` |
| East          | +X            | `new Vector3(distance, 0, 0)` |
| West          | -X            | `new Vector3(-distance, 0, 0)` |
| Up            | -Y            | `new Vector3(0, -distance, 0)` |
| Down          | +Y            | `new Vector3(0, distance, 0)` |

### B.3 Altitude Convention

- **Ground Level**: Y = 0
- **10m Altitude**: Y = 10
- **Takeoff Direction**: +Y (down in NED, but Unity Y-up convention)

**Important**: While NED uses down as positive Y, Unity uses up as positive Y. The simulation uses Unity's convention internally, but telemetry data is reported in Unity coordinates (not converted to NED).

---

## Appendix C: Resources & References

### C.1 Documentation Links

- **Unity WebGL Documentation**: https://docs.unity3d.com/Manual/webgl.html
- **react-unity-webgl**: https://github.com/jeffreylanters/react-unity-webgl
- **Newtonsoft.Json for Unity**: https://docs.unity3d.com/Packages/com.unity.nuget.newtonsoft-json@3.2/manual/index.html
- **MAVLink Protocol**: https://mavlink.io/en/

### C.2 Example Projects

- **Drone Swarm GCS Repository**: (your GitHub repo URL)
- **Backend Requirements**: See `BACKEND_REQUIREMENTS.md`
- **Development Log**: See `DEVELOPMENT_LOG.md`

### C.3 Contact & Support

For questions or issues:
1. Check troubleshooting guide (Section 10)
2. Review Unity console logs
3. Enable verbose logging (Section 10.2)
4. Contact development team with:
   - Unity version
   - Browser version
   - Console error logs
   - Network tab (for message inspection)

---

**END OF DOCUMENT**

---

## Quick Start Checklist

Use this checklist for rapid Unity integration:

- [ ] Install Unity 2021.3 LTS+
- [ ] Add Newtonsoft.Json package
- [ ] Create GameManager.cs with ReceiveMessage() method
- [ ] Create Drone.cs with movement logic
- [ ] Create FormationController.cs with pattern calculations
- [ ] Configure WebGL build settings (Gzip, 512MB memory)
- [ ] Build project to `Build/WebGL/`
- [ ] Copy build files to `public/unity/Build/`
- [ ] Test initialization handshake
- [ ] Verify telemetry at 10Hz
- [ ] Test all 14 command types
- [ ] Run performance profiling (30+ FPS target)
- [ ] Test with 4+ drones in formation

**Total Estimated Implementation Time**: 40-60 hours for experienced Unity developer

Good luck! 🚁