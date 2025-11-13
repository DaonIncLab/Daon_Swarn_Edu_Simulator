/**
 * Drone 3D View Component
 *
 * Real-time 3D visualization of drone positions using Three.js
 */

import { useRef, useEffect } from "react";
import { Canvas,} from "@react-three/fiber";
import { OrbitControls, Grid, Text } from "@react-three/drei";
import * as THREE from "three";
import { useExecutionStore } from "@/stores/useExecutionStore";
import type { DroneState } from "@/types/websocket";

/**
 * Individual Drone 3D Model
 */
function Drone3DModel({ drone }: { drone: DroneState }) {
  const meshRef = useRef<THREE.Mesh>(null);

  // Update position and rotation
  useEffect(() => {
    if (meshRef.current) {
      meshRef.current.position.set(
        drone.position.x,
        drone.position.z,
        -drone.position.y
      );
      meshRef.current.rotation.set(
        THREE.MathUtils.degToRad(drone.rotation.x),
        THREE.MathUtils.degToRad(drone.rotation.y),
        THREE.MathUtils.degToRad(drone.rotation.z)
      );
    }
  }, [drone.position, drone.rotation]);

  // Status color
  const getStatusColor = (status: DroneState["status"]) => {
    switch (status) {
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
  };

  return (
    <group>
      {/* Drone body (cone shape) */}
      <mesh ref={meshRef} castShadow>
        <coneGeometry args={[0.3, 0.6, 8]} />
        <meshStandardMaterial color={getStatusColor(drone.status)} />
      </mesh>

      {/* Drone ID Label */}
      <Text
        position={[drone.position.x, drone.position.z + 0.8, -drone.position.y]}
        fontSize={0.3}
        color="black"
        anchorX="center"
        anchorY="middle"
      >
        #{drone.id}
      </Text>

      {/* Battery indicator (small sphere) */}
      <mesh
        position={[drone.position.x, drone.position.z + 0.5, -drone.position.y]}
        castShadow
      >
        <sphereGeometry args={[0.1, 8, 8]} />
        <meshStandardMaterial
          color={
            drone.battery > 60
              ? "#10b981"
              : drone.battery > 30
              ? "#eab308"
              : "#ef4444"
          }
        />
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
}

/**
 * 3D Scene Content
 */
function Scene() {
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

      {/* Drones */}
      {drones.map((drone) => (
        <Drone3DModel key={drone.id} drone={drone} />
      ))}

      {/* Camera Controls */}
      <OrbitControls
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
export function Drone3DView() {
  const { drones } = useExecutionStore();

  return (
    <div className="relative w-full h-[600px] bg-gray-900 rounded-lg overflow-hidden">
      {drones.length === 0 ? (
        <div className="flex items-center justify-center h-full text-gray-400">
          <div className="text-center">
            <div className="text-6xl mb-4">🚁</div>
            <p className="text-lg font-medium">No drones to display</p>
            <p className="text-sm mt-2">
              Connect to Unity to see live drone positions
            </p>
          </div>
        </div>
      ) : (
        <Canvas
          camera={{ position: [10, 8, 10], fov: 50 }}
          shadows
          gl={{ antialias: true }}
          style={{ width: "100%", height: "100%" }}
        >
          <Scene />
        </Canvas>
      )}

      {/* Controls Info */}
      <div className="absolute bottom-4 left-4 bg-black/50 text-white text-xs px-3 py-2 rounded backdrop-blur-sm">
        <div>🖱️ Left Click + Drag: Rotate</div>
        <div>🖱️ Right Click + Drag: Pan</div>
        <div>🖱️ Scroll: Zoom</div>
      </div>

      {/* Stats */}
      <div className="absolute top-4 right-4 bg-black/50 text-white text-sm px-4 py-2 rounded backdrop-blur-sm">
        <div className="font-semibold">
          {drones.length} Drone{drones.length !== 1 ? "s" : ""}
        </div>
        <div className="text-xs text-gray-300 mt-1">
          Flying: {drones.filter((d) => d.status === "flying").length}
        </div>
        <div className="text-xs text-gray-300">
          Hovering: {drones.filter((d) => d.status === "hovering").length}
        </div>
      </div>
    </div>
  );
}
