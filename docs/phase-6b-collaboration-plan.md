# Phase 6-B: Real-time Collaboration Feature Plan

## Overview

This document outlines the planned implementation of real-time collaboration features for the Drone Swarm GCS (Ground Control Station) application. The goal is to enable multiple users to simultaneously edit Blockly projects, share control, and coordinate drone operations.

## Feature Requirements

1. **Multi-user Project Editing**: Multiple users can edit the same Blockly workspace simultaneously
2. **WebRTC-based P2P Communication**: Direct peer-to-peer connections for low-latency collaboration
3. **Shared Project Management**: Create, join, and manage collaborative sessions

## Architecture Options

### Option A: Pure P2P (Full Mesh)
**Description**: Every client connects directly to every other client

**Pros**:
- No server infrastructure required
- Maximum privacy (no central point)
- Lowest latency for direct communication

**Cons**:
- Complex implementation (n*(n-1)/2 connections)
- Doesn't scale well (>5 users becomes problematic)
- NAT traversal challenges
- No central authority for conflict resolution

### Option B: Star Topology with Host
**Description**: One client acts as the "host" and all others connect to them

**Pros**:
- Simpler than full mesh (n-1 connections)
- Clear authority for conflict resolution
- Easier state synchronization

**Cons**:
- Dependent on host's connection quality
- Host leaving requires migration
- Single point of failure

### Option C: Hybrid (Recommended)
**Description**: WebRTC for P2P data + WebSocket signaling server + optional TURN relay

**Pros**:
- Best of both worlds
- Can leverage existing WebSocket infrastructure (Phase 2)
- Signaling server handles room management
- TURN relay for NAT traversal fallback
- Can store session state on server

**Cons**:
- Requires server infrastructure
- More complex implementation

**Recommendation**: **Option C (Hybrid)** provides the best balance of reliability, scalability, and implementation complexity.

## Conflict Resolution Strategies

### Option 1: Operational Transformation (OT)
**Description**: Transform operations based on concurrent edits (Google Docs approach)

**Pros**:
- Eventually consistent
- Allows truly concurrent editing
- Industry-proven (Google Docs, Etherpad)

**Cons**:
- Very complex to implement correctly
- Requires extensive testing
- Hard to debug

### Option 2: CRDT (Conflict-free Replicated Data Types)
**Description**: Data structures that automatically resolve conflicts

**Pros**:
- Mathematically proven convergence
- Libraries available (Yjs, Automerge)
- Good for text and structured data

**Cons**:
- May not map perfectly to Blockly
- Overhead in data size
- Learning curve for library

### Option 3: Lock-based (Recommended)
**Description**: User editing a block locks it temporarily

**Pros**:
- Simple to implement
- No conflicts possible
- Clear visual feedback
- Easy to understand

**Cons**:
- May slow down collaboration
- Potential deadlocks (mitigated with timeout)
- Less fluid experience

**Recommendation**: **Option 3 (Lock-based)** is the most practical for Blockly, where blocks are discrete units that can be individually locked.

## Collaboration Scope

### Blockly Workspace Sharing
- **Included**: Block creation, deletion, movement, connection, property editing
- **Visual Indicators**: User cursors with names, locked blocks (colored borders)
- **Real-time Sync**: Changes propagate within 100ms

### Execution Control
- **Approach**: Role-based permissions
  - **Host/Owner**: Can execute, pause, stop
  - **Editor**: Can modify workspace but not execute
  - **Viewer**: Read-only access

### Drone Control
- **Approach**: Single operator at a time
  - Only the host can send commands to drones
  - Prevents conflicting commands
  - Safety-critical decision

## User Management

### Authentication
- **Phase 1**: Anonymous with display names
  - Simple join with username
  - No account creation required
  - Room code for access

- **Future**: Optional authentication
  - Google/GitHub OAuth
  - Persistent user profiles
  - Permission management

### Room Management
- **Room Creation**:
  - Generate unique 6-character room code
  - Host creates room, gets shareable link
  - Room persists until host closes or timeout (1 hour inactive)

- **Room Discovery**:
  - Direct link sharing (preferred)
  - Optional: Public room list
  - Room code manual entry

### User Limits
- **Recommended Max**: 5 simultaneous users
- **Hard Limit**: 10 users
- **Reason**: Blockly workspace becomes crowded; performance concerns

### Permission System
```typescript
enum UserRole {
  HOST = 'host',       // Full control
  EDITOR = 'editor',   // Edit workspace
  VIEWER = 'viewer',   // Read-only
}

interface CollaborationUser {
  id: string
  name: string
  role: UserRole
  color: string        // For cursor/selection indicators
  isConnected: boolean
  lastSeen: number
}
```

## Technical Implementation

### Technology Stack

**WebRTC Library**: **PeerJS**
- Pros: Simplifies WebRTC API, handles signaling
- Cons: Less control than raw WebRTC
- Alternative: simple-peer

**Signaling Server**: **Extend existing WebSocket server** (Phase 2)
- Add collaboration message types
- Room management endpoints
- TURN/STUN configuration distribution

**State Synchronization**: **Custom implementation with Blockly events**
- Listen to Blockly workspace events
- Serialize changes to JSON
- Broadcast via WebRTC data channels
- Apply remote changes to local workspace

**Presence System**: **Heartbeat-based**
- Clients send heartbeat every 5 seconds
- Mark as disconnected after 15 seconds
- Auto-reconnect logic

### Data Model

#### Collaboration Session
```typescript
interface CollaborationSession {
  roomId: string
  hostId: string
  projectName: string
  createdAt: number
  users: Map<string, CollaborationUser>
  locks: Map<string, BlockLock> // blockId -> lock info
}

interface BlockLock {
  blockId: string
  userId: string
  acquiredAt: number
  expiresAt: number  // Auto-release after 30 seconds
}
```

#### Messages
```typescript
type CollaborationMessage =
  | { type: 'join'; user: CollaborationUser }
  | { type: 'leave'; userId: string }
  | { type: 'workspace_change'; change: BlocklyChange }
  | { type: 'lock_request'; blockId: string }
  | { type: 'lock_acquired'; blockId: string; userId: string }
  | { type: 'lock_released'; blockId: string }
  | { type: 'cursor_move'; userId: string; position: { x: number; y: number } }
  | { type: 'heartbeat'; userId: string; timestamp: number }
```

### UI Components

#### Collaboration Toolbar
**Location**: Header, next to project name
**Elements**:
- "Share" button (creates/joins room)
- Active users list with avatars
- Connection status indicator

#### User Presence Indicators
- **User Cursors**: Colored cursors with name labels following mouse
- **Locked Blocks**: Border color matching user who locked it
- **User Panel**: Sidebar showing all connected users, roles, status

#### Room Management Dialog
- Room code display with copy button
- Join room input
- User role management (host only)
- Kick user button (host only)

### Integration Points

**1. BlocklyWorkspace Component** ([src/components/blockly/BlocklyWorkspace.tsx](../src/components/blockly/BlocklyWorkspace.tsx))
- Add collaboration mode prop
- Listen to Blockly events, broadcast changes
- Apply remote changes without triggering local events
- Show user cursors overlay

**2. Header Component** ([src/components/common/Header.tsx](../src/components/common/Header.tsx))
- Add collaboration button
- Show active users

**3. New Store**: `useCollaborationStore.ts`
- Manage session state
- Handle WebRTC connections
- User management
- Lock management

**4. New Services**:
- `src/services/collaboration/WebRTCManager.ts`: WebRTC connection management
- `src/services/collaboration/CollaborationSync.ts`: Workspace synchronization
- `src/services/collaboration/PresenceManager.ts`: User presence tracking

## Implementation Phases

### Phase 6-B-1: Foundation (1-2 weeks)
- [ ] Design data models and message protocols
- [ ] Extend WebSocket server with collaboration endpoints
- [ ] Implement useCollaborationStore
- [ ] Set up PeerJS integration

### Phase 6-B-2: Basic Collaboration (2-3 weeks)
- [ ] Room creation and joining
- [ ] WebRTC connection establishment
- [ ] Basic workspace synchronization (create/delete blocks)
- [ ] User presence display

### Phase 6-B-3: Advanced Features (2-3 weeks)
- [ ] Block locking mechanism
- [ ] Cursor tracking
- [ ] Permission system
- [ ] Conflict resolution

### Phase 6-B-4: Polish & Testing (1-2 weeks)
- [ ] UI/UX improvements
- [ ] Error handling and reconnection logic
- [ ] Load testing with multiple users
- [ ] Documentation

**Total Estimated Time**: 6-10 weeks

## Security Considerations

1. **Input Validation**: Sanitize all remote changes before applying
2. **Rate Limiting**: Prevent spam/DoS from malicious users
3. **Encryption**: WebRTC data channels are encrypted by default
4. **Room Access**: Require room code, optional password protection
5. **Kick/Ban**: Host can remove disruptive users

## Performance Considerations

1. **Change Throttling**: Batch small changes, send max 20 updates/second
2. **Selective Sync**: Only sync visible workspace area
3. **Connection Quality**: Adapt to network conditions
4. **Memory Management**: Clean up disconnected user data

## Alternative: Simplified Version

If full implementation is too complex, consider a **simpler "View-Only Sharing"** mode:
- Host shares screen via WebRTC video stream
- Viewers can only watch, not edit
- Much simpler implementation (1-2 weeks)
- Good for demonstrations and training

## References

- [PeerJS Documentation](https://peerjs.com/docs)
- [WebRTC for the Curious](https://webrtcforthecurious.com/)
- [Yjs CRDT Library](https://yjs.dev/)
- [Blockly Events API](https://developers.google.com/blockly/guides/configure/web/events)

## Status

**Current Status**: Planning stage
**Priority**: Medium (Phase 6-C completed first)
**Complexity**: High
**Dependencies**: Phase 2 (WebSocket infrastructure)

---

*Document Version: 1.0*
*Last Updated: 2025-11-13*
*Author: Claude (AI Assistant)*
