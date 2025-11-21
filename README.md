# Drone Swarm GCS (Ground Control Station)

A browser-based Ground Control Station for programming and controlling drone swarms using visual programming (Blockly).

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![TypeScript](https://img.shields.io/badge/TypeScript-5.9.3-blue.svg)
![React](https://img.shields.io/badge/React-19.2.0-blue.svg)
![Vite](https://img.shields.io/badge/Vite-7.2.2-purple.svg)

---

## 📋 Overview

Drone Swarm GCS is a web-based application that allows users to:

- **Program drone missions** using visual block-based programming (Blockly)
- **Control multiple drones** simultaneously with swarm coordination
- **Monitor real-time telemetry** with 3D visualization and charts
- **Record and replay flights** for analysis and debugging
- **Save and load projects** for reusable mission templates

### Key Features

- 🧩 **Visual Programming**: Drag-and-drop blocks for intuitive mission creation
- 🔌 **Multiple Connection Modes**: WebSocket, Unity WebGL, Test Mode, MAVLink (Phase 2)
- 📊 **Real-time Telemetry**: 3D drone visualization, battery/altitude/velocity charts
- 🎥 **Flight Recording**: Record, save, and replay flights with smooth interpolation
- 💾 **Project Management**: Save, load, export, and import mission projects
- 🎨 **Modern UI**: Responsive design with TailwindCSS 4.x
- 🌓 **Theme System**: Light/dark mode with 70+ semantic CSS variables and smooth transitions
- 🚀 **High Performance**: Caching, memory management, and smooth 60 FPS playback

---

## 🚀 Quick Start

### Prerequisites

- **Node.js** 18+ (recommend v20+)
- **npm** 9+ or **yarn** 1.22+

### Installation

```bash
# Clone repository
git clone https://github.com/your-org/drone-swarm-gcs.git
cd drone-swarm-gcs

# Install dependencies
npm install

# Start development server
npm run dev
```

Open browser at `http://localhost:5173`

### Using Test Mode

1. Click **Connect** in the Simulator Panel
2. Select **Test Mode**
3. Click **Connect** - 4 simulated drones will appear
4. Build your mission in the Blockly workspace
5. Click **Run** to execute

---

## 🏗️ Technology Stack

| Technology | Version | Purpose |
|------------|---------|---------|
| **React** | 19.2.0 | UI framework |
| **TypeScript** | 5.9.3 | Type safety |
| **Vite** | 7.2.2 | Build tool & dev server |
| **Zustand** | 5.0.8 | State management |
| **Blockly** | 12.3.1 | Visual programming |
| **Three.js** | 0.181.1 | 3D visualization |
| **React Three Fiber** | 9.0.0 | React Three.js renderer |
| **Chart.js** | 4.5.1 | Telemetry charts |
| **TailwindCSS** | 4.0.0-beta.20 | Styling |

---

## 📐 Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────┐
│                   Presentation Layer                     │
│  (React Components, Blockly Workspace, 3D Visualizer)   │
└────────────────────┬────────────────────────────────────┘
                     │
┌────────────────────┴────────────────────────────────────┐
│               State Management Layer                     │
│  (Zustand Stores: Blockly, Execution, Connection, etc.) │
└────────────────────┬────────────────────────────────────┘
                     │
┌────────────────────┴────────────────────────────────────┐
│                   Service Layer                          │
│  (ConnectionManager, Interpreter, ProjectService)       │
└────────────────────┬────────────────────────────────────┘
                     │
┌────────────────────┴────────────────────────────────────┐
│            Connection Strategy Layer                     │
│  (WebSocket, Unity WebGL, Test, MAVLink)                │
└─────────────────────────────────────────────────────────┘
```

### Design Patterns

- **Strategy Pattern**: Connection services (WebSocket, Unity WebGL, Test, MAVLink)
- **Interpreter Pattern**: AST-based execution engine
- **Observer Pattern**: Zustand reactive state management
- **Error Boundary Pattern**: React error boundaries for crash recovery
- **Adapter Pattern**: Storage abstraction (IndexedDB/localStorage)

For complete architecture details, see [ARCHITECTURE.md](ARCHITECTURE.md).

---

## 📚 Documentation

### Core Documentation

- [ARCHITECTURE.md](ARCHITECTURE.md) - System architecture and design patterns
- [docs/DIAGRAMS.md](docs/DIAGRAMS.md) - Visual Mermaid diagrams
- [docs/API.md](docs/API.md) - API reference for stores and services
- [docs/CONTRIBUTING.md](docs/CONTRIBUTING.md) - Development guidelines
- [CODING_RULES.md](CODING_RULES.md) - Critical coding rules

### Quick Links

- **Getting Started**: See [Quick Start](#quick-start)
- **Development**: See [docs/CONTRIBUTING.md](docs/CONTRIBUTING.md)
- **API Reference**: See [docs/API.md](docs/API.md)
- **Troubleshooting**: See [Common Issues](docs/CONTRIBUTING.md#common-issues)

---

## 🎯 Project Structure

```
drone-swarm-gcs/
├── src/
│   ├── components/          # React components
│   │   ├── common/          # Reusable UI components
│   │   ├── blockly/         # Blockly workspace
│   │   ├── connection/      # Connection management UI
│   │   ├── telemetry/       # Telemetry dashboard
│   │   ├── project/         # Project management UI
│   │   └── settings/        # Settings panel
│   ├── stores/              # Zustand state stores (6 stores)
│   ├── services/            # Business logic services
│   │   ├── connection/      # Connection strategies
│   │   ├── execution/       # Interpreter & parser
│   │   ├── project/         # Project service
│   │   └── storage/         # Storage adapter
│   ├── types/               # TypeScript type definitions
│   ├── utils/               # Utility functions
│   ├── constants/           # Application constants
│   ├── hooks/               # Custom React hooks
│   └── App.tsx              # Main application
├── docs/                    # Documentation
├── public/                  # Static assets
└── package.json
```

---

## 🔌 Connection Modes

### 1. WebSocket (Simulation)

Connect to Unity simulator via WebSocket.

```typescript
{
  mode: 'simulation',
  websocket: {
    url: 'ws://localhost:8080',
    reconnectInterval: 3000,
  }
}
```

### 2. Unity WebGL

Embed Unity WebGL build directly in browser.

```typescript
{
  mode: 'unity_webgl',
  unityWebGL: {
    instanceName: 'unityInstance',
  }
}
```

### 3. Test Mode (Dummy)

Simulated drones for testing without Unity.

```typescript
{
  mode: 'test',
  test: {
    droneCount: 4,
    updateInterval: 100,
  }
}
```

### 4. MAVLink (Phase 2)

Real drone connection via MAVLink protocol (not yet implemented).

---

## 🧩 Blockly Commands

### Basic Control Blocks (8 blocks)

- 🚁 **모든 드론 이륙** (Takeoff All): Take off all drones to specified altitude
- 🛬 **모든 드론 착륙** (Land All): Land all drones at current position
- 📐 **대형 설정** (Set Formation): Arrange drones in formation (Grid, Line, Circle, V-Shape, etc.)
- ➡️ **대형 이동** (Move Formation): Move formation in direction while maintaining shape
- 🎯 **개별 드론 이동** (Move Drone): Move specific drone to position
- ⏱️ **대기** (Wait): Wait for specified duration
- 🔄 **호버링** (Hover): Hover at current position
- ⏸️ **모든 드론 동기화** (Sync All): Wait for all drones to complete current command

### Control Flow Blocks (6 blocks)

- 🔁 **반복** (Repeat N times): Execute blocks N times
- 🔢 **For 루프** (For Loop): Loop with variable from/to/by
- 🔄 **While 루프** (While Loop): Loop while condition is true
- 🔁 **Repeat Until**: Repeat until condition becomes true
- ❓ **If 조건문** (If): Conditional execution
- ❓ **If-Else**: Conditional with alternative branch

### Formation Types (7 types)

- **LINE**: Arrange drones in a line
- **GRID**: Arrange in grid pattern (customizable rows/cols)
- **CIRCLE**: Arrange in circle (customizable radius)
- **V_SHAPE**: V-formation (leader + wings)
- **TRIANGLE**: Triangle formation
- **SQUARE**: Square formation
- **DIAMOND**: Diamond formation

### 📚 Example: Formation Demo

```blockly
1. 🚁 모든 드론 이륙 (고도: 3m)
2. ⏱️ 대기 (3초)
3. 📐 대형 설정 (일렬 LINE, 간격: 2m)
4. ⏱️ 대기 (2초)
5. 📐 대형 설정 (원형 CIRCLE, 반지름: 5m)
6. ⏱️ 대기 (3초)
7. ➡️ 대형 이동 (앞으로, 3m)
8. ⏱️ 대기 (2초)
9. 🛬 모든 드론 착륙
```

**Expected Result**:
- 4 drones take off to 3m altitude
- Line formation with 2m spacing
- **Transform to circular formation** (radius 5m) - very visible!
- Move forward 3m while maintaining circle
- Land

> 💡 **Tip**: Formation changes are most visible when switching from LINE → CIRCLE or GRID → CIRCLE!

---

## 📊 Telemetry Features

### 3D Visualization

- Real-time 3D drone positions
- Configurable camera views
- Grid and axis helpers
- Drone orientation indicators

### Charts

- **Battery Chart**: Battery level over time
- **Altitude Chart**: Altitude tracking
- **Velocity Chart**: X/Y/Z velocity components

### Drone List

- Drone status (idle, armed, flying, landing, error)
- Position, battery, velocity display
- Selectable for detailed view

---

## 🎥 Flight Recording

### Features

- **Record telemetry** during flight
- **Save recordings** with metadata (name, description, tags)
- **Load and replay** recordings
- **Smooth playback** with interpolation
- **Playback controls**: play, pause, stop, seek, speed adjustment
- **Automatic storage management**: 5MB limit with oldest pruning

### Usage

```typescript
// Start recording
useFlightRecordingStore.getState().startRecording()

// Stop and save
useFlightRecordingStore.getState().stopRecording()
useFlightRecordingStore.getState().saveRecording('Flight 1', 'Test flight')

// Load and play
useFlightRecordingStore.getState().loadRecording('recording-id')
useFlightRecordingStore.getState().playPlayback()
```

---

## 💾 Project Management

### Features

- **Create projects** from templates (blank, basic flight, formations)
- **Save projects** to IndexedDB or localStorage
- **Load projects** with workspace restoration
- **Export projects** as JSON files
- **Import projects** from JSON files
- **Auto-save** with configurable interval

### Templates

- **Blank**: Empty workspace
- **Basic Flight**: Takeoff → Move → Land
- **Repeat Example**: Loop demonstration
- **Conditional Example**: If/else demonstration
- **Formation Example**: Multi-drone formation

---

## 🌓 Theme System

The application supports light and dark modes with a comprehensive theme system.

### Features

- **🌙 Light/Dark Mode**: Seamlessly switch between themes
- **🎨 70+ CSS Variables**: Semantic color tokens for consistency
- **💾 Persistent Selection**: Theme choice saved to localStorage
- **⚡ Smooth Transitions**: 0.2s ease animations between themes
- **♿ Accessible Colors**: WCAG-compliant contrast ratios
- **🔧 Automatic Detection**: Respects system theme preference on first load

### Usage

Click the theme toggle button (🌙/☀️) in the header to switch between light and dark modes. Your preference is automatically saved and persisted across sessions.

### Theme Architecture

The theme system uses:
- **React Context API** for global theme state management
- **Custom Hook** (`useTheme`) for localStorage persistence
- **CSS Variables** for consistent styling across all components
- **TailwindCSS 4.x** arbitrary values for dynamic theming

```typescript
// Example: Using theme in components
import { useThemeContext } from '@/contexts/ThemeContext'

function MyComponent() {
  const { theme, toggle, isDark } = useThemeContext()
  // theme === 'light' | 'dark'
  // isDark === boolean
  // toggle() switches theme
}
```

For theme customization details, see [ARCHITECTURE.md](ARCHITECTURE.md#12-theme-system).

---

## 🛠️ Development

### Available Scripts

```bash
# Start dev server with HMR
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Run ESLint
npm run lint

# Type check
npm run check
```

### Code Standards

- **TypeScript**: Strict mode, type-only imports (`import type`)
- **No Enums**: Use `as const` pattern instead
- **TailwindCSS 4.x**: New syntax with `@import "tailwindcss"`
- **Component Props**: Always define interfaces
- **Zustand Stores**: Separate state and actions clearly

See [CODING_RULES.md](CODING_RULES.md) for critical rules.

---

## 🤝 Contributing

We welcome contributions! Please read [docs/CONTRIBUTING.md](docs/CONTRIBUTING.md) for:

- Development workflow
- Code standards
- Architecture guidelines
- Testing checklist
- Git workflow and PR process
- Code review guidelines

### Quick Contribution Steps

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Make changes following [CODING_RULES.md](CODING_RULES.md)
4. Test thoroughly (see [Testing](docs/CONTRIBUTING.md#testing))
5. Commit with conventional commits (`feat:`, `fix:`, etc.)
6. Push to branch (`git push origin feature/amazing-feature`)
7. Create Pull Request

---

## 🐛 Troubleshooting

### Common Issues

#### "Cannot find module '@/types/...'"

Check `tsconfig.json` has path aliases configured.

#### "The requested module does not provide an export"

Use `import type` for type-only imports:
```typescript
import type { MyType } from '@/types/something'
```

#### TailwindCSS classes not working

Ensure using TailwindCSS 4.x syntax in `index.css`:
```css
@import "tailwindcss";
```

See [Common Issues](docs/CONTRIBUTING.md#common-issues) for more solutions.

---

## 🗺️ Roadmap

### Phase 1 (Current) ✅

- [x] Blockly visual programming
- [x] Connection management (WebSocket, Unity WebGL, Test)
- [x] Execution engine with pause/resume
- [x] Real-time telemetry with 3D visualization
- [x] Flight recording and playback
- [x] Project save/load
- [x] Performance optimizations (caching, memory management)
- [x] Error boundaries
- [x] Comprehensive documentation

### Phase 2 (Planned)

- [ ] **MAVLink Integration**: Real drone connection
- [ ] **Multi-language Support**: i18n
- [ ] **Advanced Formations**: Pre-built formation patterns
- [ ] **Mission Planning**: Waypoint-based planning
- [ ] **Custom Blocks**: User-defined block library

### Phase 3 (Future)

- [ ] **Unit Testing**: Vitest + React Testing Library
- [ ] **E2E Testing**: Playwright
- [ ] **Performance Profiling**: React DevTools Profiler
- [ ] **PWA Support**: Offline capability
- [ ] **Cloud Sync**: Multi-device project sync

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- **Blockly**: Google's visual programming framework
- **React**: Facebook's UI library
- **Three.js**: 3D graphics library
- **Zustand**: Lightweight state management
- **TailwindCSS**: Utility-first CSS framework
- **Vite**: Next-generation build tool

---

## 📞 Contact

- **GitHub Issues**: [Report bugs or request features](https://github.com/your-org/drone-swarm-gcs/issues)
- **Discussions**: [Ask questions or share ideas](https://github.com/your-org/drone-swarm-gcs/discussions)

---

<p align="center">
  <b>Built with ❤️ for the drone community</b>
</p>

<p align="center">
  <sub>Drone Swarm GCS - Making drone programming accessible to everyone</sub>
</p>
