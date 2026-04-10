/**
 * Drone 3D View Component
 *
 * Real-time 3D visualization of drone positions using Three.js
 * Supports playback mode with flight path visualization
 */

import { useRef, useEffect, useState, useMemo, memo } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, Grid, Text, Billboard } from "@react-three/drei";
import * as THREE from "three";
import { useExecutionStore } from "@/stores/useExecutionStore";
import { useConnectionStore } from "@/stores/useConnectionStore";
import {
  useFlightRecordingStore,
  PlaybackStatus,
} from "@/stores/useFlightRecordingStore";
import { ConnectionMode } from "@/constants/connection";
import { FlightPathWithMarker } from "./FlightPathLine";
import type { DroneState } from "@/types/websocket";
import type { DroneHistory } from "@/types/telemetry";
import { getConnectionManager } from "@/services/connection/ConnectionManager";

const DEFAULT_CAMERA_POSITION: [number, number, number] = [10, 8, 10];
const MAVLINK_SIDE_VIEW_DISTANCE = 8;
const MAVLINK_SIDE_VIEW_HEIGHT = 3;

interface OrbitControlsHandle {
  target: THREE.Vector3;
  update: () => void;
}

function hasValidMAVLinkHeading(drone: DroneState): boolean {
  return (
    Number.isFinite(drone.rotation.z) && Math.abs(drone.rotation.z) > 0.001
  );
}

function getMAVLinkSideViewPose(drone: DroneState): {
  position: THREE.Vector3;
  target: THREE.Vector3;
} {
  const target = new THREE.Vector3(
    drone.position.x,
    drone.position.z,
    -drone.position.y,
  );

  const sideOffset = new THREE.Vector3(
    -MAVLINK_SIDE_VIEW_DISTANCE,
    MAVLINK_SIDE_VIEW_HEIGHT,
    0,
  );

  return {
    position: target.clone().add(sideOffset),
    target,
  };
}

/**
 * Individual Drone 3D Model
 * Optimized with React.memo and useFrame for smooth animation
 */
const Drone3DModel = memo(
  ({ drone }: { drone: DroneState }) => {
    const meshRef = useRef<THREE.Mesh>(null);

    // Optimized: Use useFrame for animation loop updates instead of useEffect
    useFrame(() => {
      if (!meshRef.current) return;

      meshRef.current.position.set(
        drone.position.x,
        drone.position.z,
        -drone.position.y,
      );

      console.log(
        `${drone.rotation.x}, ${drone.rotation.y}, ${drone.rotation.z}`,
      );

      meshRef.current.rotation.set(
        THREE.MathUtils.degToRad(drone.rotation.x),
        THREE.MathUtils.degToRad(-drone.rotation.z) - Math.PI / 2,
        THREE.MathUtils.degToRad(-drone.rotation.y) + Math.PI / 2,
      );
    });

    // Optimized: Memoize status color calculation
    const statusColor = useMemo(() => {
      switch (drone.status) {
        case "flying":
          return "#10b981"; // green
        case "hovering":
          return "#3b82f6"; // blue
        case "landed":
          return "#6b7280"; // gray
        case "error":
          return "#ef4444"; // red
        default:
          return "#9ca3af"; // light gray
      }
    }, [drone.status]);

    // Optimized: Memoize battery color
    const batteryColor = useMemo(() => {
      return drone.battery > 60
        ? "#10b981"
        : drone.battery > 30
          ? "#eab308"
          : "#ef4444";
    }, [drone.battery]);

    return (
      <group>
        {/* Drone body (cone shape) */}
        <mesh ref={meshRef} castShadow>
          <coneGeometry args={[0.3, 0.6, 8]} />
          <meshStandardMaterial color={statusColor} />
        </mesh>

        {/* Drone ID Label */}
        <Billboard
          position={[
            drone.position.x,
            drone.position.z + 0.8,
            -drone.position.y,
          ]}
        >
          <Text fontSize={0.3} color="white" anchorX="center" anchorY="middle">
            #{drone.id}
          </Text>
        </Billboard>

        {/* Battery indicator (small sphere) */}
        <mesh
          position={[
            drone.position.x,
            drone.position.z + 0.5,
            -drone.position.y,
          ]}
          castShadow
        >
          <cylinderGeometry args={[0.08, 0.08, 0.2, 16]} />
          <meshStandardMaterial color={batteryColor} />
        </mesh>

        {/* Ground shadow (projected circle) */}
        <mesh
          position={[drone.position.x, 0.01, -drone.position.y]}
          rotation={[-Math.PI / 2, 0, 0]}
          receiveShadow
        >
          <circleGeometry args={[0.4, 16]} />
          <meshBasicMaterial color="#000000" opacity={0.2} transparent />
        </mesh>

        {/* Altitude line */}
        {drone.position.z > 0.1 &&
          (() => {
            const positions = new Float32Array([
              drone.position.x,
              0.01,
              -drone.position.y, // ground point
              drone.position.x,
              drone.position.z,
              -drone.position.y, // drone point
            ]);

            return (
              <line>
                <bufferGeometry>
                  <bufferAttribute
                    attach="attributes-position"
                    args={[positions, 3]}
                  />
                </bufferGeometry>
                <lineBasicMaterial color="#94a3b8" opacity={0.5} transparent />
              </line>
            );
          })()}
      </group>
    );
  },
  (prevProps, nextProps) => {
    // Custom comparison: only re-render if drone data actually changed
    const prev = prevProps.drone;
    const next = nextProps.drone;

    return (
      prev.id === next.id &&
      prev.status === next.status &&
      prev.battery === next.battery &&
      prev.position.x === next.position.x &&
      prev.position.y === next.position.y &&
      prev.position.z === next.position.z &&
      prev.rotation.x === next.rotation.x &&
      prev.rotation.y === next.rotation.y &&
      prev.rotation.z === next.rotation.z
    );
  },
);

/**
 * 3D Scene Content
 */
interface SceneProps {
  playbackMode?: boolean;
  droneHistories?: Map<number, DroneHistory>;
  currentTime?: number;
  controlsRef: React.RefObject<OrbitControlsHandle | null>;
  mavlinkRearViewDrone?: DroneState | null;
  shouldInitializeMavlinkRearView?: boolean;
  onInitializeMavlinkRearView?: () => void;
}

function MAVLinkRearViewInitializer({
  controlsRef,
  drone,
  enabled,
  onInitialized,
}: {
  controlsRef: React.RefObject<OrbitControlsHandle | null>;
  drone: DroneState | null;
  enabled: boolean;
  onInitialized?: () => void;
}) {
  const { camera } = useThree();

  useEffect(() => {
    if (!enabled || !drone) {
      return;
    }

    const { position, target } = getMAVLinkSideViewPose(drone);
    camera.position.copy(position);
    camera.lookAt(target);

    if (controlsRef.current) {
      controlsRef.current.target.copy(target);
      controlsRef.current.update();
    }

    onInitialized?.();
  }, [camera, controlsRef, drone, enabled, onInitialized]);

  return null;
}

function Scene({
  playbackMode = false,
  droneHistories,
  currentTime,
  controlsRef,
  mavlinkRearViewDrone = null,
  shouldInitializeMavlinkRearView = false,
  onInitializeMavlinkRearView,
}: SceneProps) {
  const { drones } = useExecutionStore();

  return (
    <>
      {/* Lighting */}
      <ambientLight intensity={0.5} />
      <directionalLight
        position={[10, 10, 5]}
        intensity={1}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
      />

      {/* Grid */}
      <Grid
        args={[20, 20]}
        cellSize={1}
        cellThickness={0.5}
        cellColor="#6b7280"
        sectionSize={5}
        sectionThickness={1}
        sectionColor="#374151"
        fadeDistance={30}
        fadeStrength={1}
        followCamera={false}
      />

      {/* Playback Mode: Show flight paths */}
      {playbackMode && droneHistories && currentTime !== undefined && (
        <>
          {Array.from(droneHistories.values()).map((droneHistory) => (
            <FlightPathWithMarker
              key={droneHistory.droneId}
              droneHistory={droneHistory}
              currentTime={currentTime}
              showFullPath={true}
              showTrail={true}
              trailLength={5}
            />
          ))}
        </>
      )}

      {/* Live Mode: Show real-time drones */}
      {!playbackMode &&
        drones.map((drone) => <Drone3DModel key={drone.id} drone={drone} />)}

      <MAVLinkRearViewInitializer
        controlsRef={controlsRef}
        drone={mavlinkRearViewDrone}
        enabled={shouldInitializeMavlinkRearView}
        onInitialized={onInitializeMavlinkRearView}
      />

      {/* Camera Controls */}
      <OrbitControls
        ref={controlsRef}
        makeDefault
        minDistance={5}
        maxDistance={50}
        enablePan={true}
        enableZoom={true}
        enableRotate={true}
      />
    </>
  );
}

/**
 * Main Drone 3D View Component
 */
interface Drone3DViewProps {
  playbackMode?: boolean;
  className?: string;
}

export function Drone3DView({
  playbackMode = false,
  className = "",
}: Drone3DViewProps) {
  const { drones } = useExecutionStore();
  const { mode } = useConnectionStore();
  const { playback } = useFlightRecordingStore();
  const [isResetting, setIsResetting] = useState(false);
  const [hasInitializedMavlinkRearView, setHasInitializedMavlinkRearView] =
    useState(false);
  const controlsRef = useRef<OrbitControlsHandle | null>(null);

  // Determine what to display
  const isPlaybackActive =
    playbackMode &&
    playback.recording &&
    playback.status !== PlaybackStatus.IDLE;
  const droneHistories = isPlaybackActive
    ? playback.recording?.droneHistories
    : undefined;
  const currentTime = isPlaybackActive ? playback.currentTime : undefined;

  // For stats
  const droneCount =
    playbackMode && droneHistories ? droneHistories.size : drones.length;

  const showEmpty = !playbackMode && drones.length === 0;
  const showResetButton = !playbackMode && mode === ConnectionMode.TEST;
  const mavlinkRearViewDrone =
    !playbackMode && mode === ConnectionMode.MAVLINK
      ? (drones.find(hasValidMAVLinkHeading) ?? null)
      : null;

  useEffect(() => {
    if (mode !== ConnectionMode.MAVLINK || playbackMode) {
      setHasInitializedMavlinkRearView(false);
    }
  }, [mode, playbackMode]);

  // Reset handler
  const handleReset = async () => {
    setIsResetting(true);
    try {
      const connectionManager = getConnectionManager();
      await connectionManager.reset();
    } catch (error) {
      console.error("Failed to reset:", error);
    } finally {
      setTimeout(() => setIsResetting(false), 1000);
    }
  };

  return (
    <div
      className={`relative w-full h-[600px] bg-gray-900 rounded-lg overflow-hidden ${className}`}
    >
      {showEmpty ? (
        <div className="flex items-center justify-center h-full text-gray-400">
          <div className="text-center">
            <div className="text-6xl mb-4">🚁</div>
            <p className="text-lg font-medium">No drones to display</p>
            <p className="text-sm mt-2">
              Connect to Unity, MAVLink, or Test mode to see live drone
              positions
            </p>
          </div>
        </div>
      ) : (
        <Canvas
          camera={{ position: DEFAULT_CAMERA_POSITION, fov: 50 }}
          shadows
          gl={{ antialias: true }}
          style={{ width: "100%", height: "100%" }}
        >
          <Scene
            playbackMode={playbackMode}
            droneHistories={droneHistories}
            currentTime={currentTime}
            controlsRef={controlsRef}
            mavlinkRearViewDrone={mavlinkRearViewDrone}
            shouldInitializeMavlinkRearView={!hasInitializedMavlinkRearView}
            onInitializeMavlinkRearView={() =>
              setHasInitializedMavlinkRearView(true)
            }
          />
        </Canvas>
      )}

      {/* Reset Button */}
      {showResetButton && (
        <button
          onClick={handleReset}
          disabled={isResetting}
          className="absolute top-4 left-4 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white text-sm font-medium px-4 py-2 rounded shadow-lg backdrop-blur-sm transition-colors flex items-center gap-2"
        >
          <span>{isResetting ? "🔄" : "↻"}</span>
          <span>{isResetting ? "초기화 중..." : "위치 초기화"}</span>
        </button>
      )}

      {/* Controls Info */}
      <div className="absolute bottom-4 left-4 bg-black/50 text-white text-xs px-3 py-2 rounded backdrop-blur-sm">
        <div>🖱️ Left Click + Drag: Rotate</div>
        <div>🖱️ Right Click + Drag: Pan</div>
        <div>🖱️ Scroll: Zoom</div>
      </div>

      {/* Stats */}
      <div className="absolute top-4 right-4 bg-black/50 text-white text-sm px-4 py-2 rounded backdrop-blur-sm">
        {playbackMode ? (
          <>
            <div className="font-semibold flex items-center gap-2">
              <span className="text-purple-400">▶</span>
              Playback Mode
            </div>
            <div className="text-xs text-gray-300 mt-1">
              {droneCount} Drone{droneCount !== 1 ? "s" : ""}
            </div>
          </>
        ) : (
          <>
            <div className="font-semibold">
              {droneCount} Drone{droneCount !== 1 ? "s" : ""}
            </div>
            <div className="text-xs text-gray-300 mt-1">
              Flying: {drones.filter((d) => d.status === "flying").length}
            </div>
            <div className="text-xs text-gray-300">
              Hovering: {drones.filter((d) => d.status === "hovering").length}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
