/**
 * Simulator Panel Component
 *
 * Right panel that displays:
 * - Three.js 3D simulator (when in Three.js Simulator mode)
 * - 3D Preview using Three.js (when in Test mode)
 * - Connection info (when in Unity External Server mode)
 * - Playback mode for recorded flights
 */

import { useState } from "react";
import { useConnectionStore } from "@/stores/useConnectionStore";
import { ConnectionStatus, ConnectionMode } from "@/constants/connection";
import { Drone3DView } from "@/components/visualization/Drone3DView";
import { PlaybackControls } from "@/components/visualization/PlaybackControls";
import { RecordingPanel } from "@/components/visualization/RecordingPanel";
import { UnitySimulatorPanel } from "@/components/simulator/UnitySimulatorPanel";
import { getConnectionManager } from "@/services/connection";
import {
  useFlightRecordingStore,
  PlaybackStatus,
} from "@/stores/useFlightRecordingStore";

interface SimulatorPanelProps {
  className?: string;
  onOpenConnectionSettings?: () => void;
}

export function SimulatorPanel({
  className = "",
  onOpenConnectionSettings,
}: SimulatorPanelProps) {
  const { mode, status } = useConnectionStore();
  const { playback } = useFlightRecordingStore();
  const [showRecordingPanel, setShowRecordingPanel] = useState(false);
  const [isEmergencyStopping, setIsEmergencyStopping] = useState(false);

  // Check if playback is active
  const isPlaybackActive =
    playback.recording && playback.status !== PlaybackStatus.IDLE;
  const shouldShowEmergencyStop =
    !isPlaybackActive &&
    mode === ConnectionMode.UNITY_WEBGL &&
    status !== ConnectionStatus.DISCONNECTED;

  const handleEmergencyStop = async () => {
    setIsEmergencyStopping(true);
    try {
      await getConnectionManager().emergencyStop();
    } finally {
      setIsEmergencyStopping(false);
    }
  };

  return (
    <div className={`h-full min-h-0 flex flex-col bg-gray-900 ${className}`}>
      {/* Header with View Toggle */}
      <div className="px-6 py-3 bg-gray-800 text-white border-b border-gray-700 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {isPlaybackActive ? (
              <>
                <h3 className="text-lg font-semibold">경로 재생</h3>
                <span className="px-2 py-1 bg-purple-600 text-xs font-medium rounded">
                  Playback
                </span>
              </>
            ) : mode === ConnectionMode.UNITY_WEBGL ? (
              <>
                <h3 className="text-lg font-semibold">
                  Unity WebGL 시뮬레이터
                </h3>
                <span className="px-2 py-1 bg-green-600 text-xs font-medium rounded">
                  WebGL
                </span>
              </>
            ) : mode === ConnectionMode.MAVLINK_SIMULATION ? (
              <>
                <h3 className="text-lg font-semibold">
                  Three.js 3D 시뮬레이터
                </h3>
                <span className="px-2 py-1 bg-green-600 text-xs font-medium rounded">
                  Physics Sim
                </span>
              </>
            ) : mode === ConnectionMode.TEST ? (
              <>
                <h3 className="text-lg font-semibold">3D 미리보기</h3>
                <span className="px-2 py-1 bg-purple-600 text-xs font-medium rounded">
                  Test Mode
                </span>
              </>
            ) : mode === ConnectionMode.REAL_DRONE ? (
              <>
                <h3 className="text-lg font-semibold">실제 드론 연결</h3>
                <span className="px-2 py-1 bg-orange-600 text-xs font-medium rounded">
                  Live
                </span>
              </>
            ) : (
              <>
                <h3 className="text-lg font-semibold">외부 Unity 서버</h3>
                <span className="px-2 py-1 bg-blue-600 text-xs font-medium rounded">
                  External
                </span>
              </>
            )}
          </div>

          {/* Recording Panel Toggle */}
          <div className="flex items-center gap-2">
            {shouldShowEmergencyStop && (
              <button
                onClick={() => void handleEmergencyStop()}
                disabled={isEmergencyStopping}
                className="px-3 py-1.5 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors"
              >
                {isEmergencyStopping ? "정지 중..." : "🛑 긴급 정지"}
              </button>
            )}

            <button
              onClick={() => setShowRecordingPanel(!showRecordingPanel)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                showRecordingPanel
                  ? "bg-red-600 hover:bg-red-700 text-white"
                  : "bg-gray-700 hover:bg-gray-600 text-gray-200"
              }`}
            >
              {showRecordingPanel ? "📹 녹화 관리 닫기" : "📹 녹화 관리"}
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      {showRecordingPanel ? (
        // Recording Management Panel
        <RecordingPanel />
      ) : status === ConnectionStatus.DISCONNECTED ||
        status === ConnectionStatus.ERROR ? (
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="text-center max-w-md">
            <div className="text-gray-500 mb-6">
              <svg
                className="w-20 h-20 mx-auto"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M18.364 5.636a9 9 0 11-12.728 0m12.728 0L12 12m6.364-6.364A9 9 0 0012 3v9"
                />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-white mb-3">
              시뮬레이터 연결이 필요합니다
            </h3>
            <p className="text-gray-400 mb-6 text-sm">
              현재 프로젝트는 유지됩니다. 연결 설정에서 모드를 선택하고 다시
              연결하세요.
            </p>
            {onOpenConnectionSettings && (
              <button
                onClick={onOpenConnectionSettings}
                className="px-5 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-medium"
              >
                ⚙️ 연결 설정 열기
              </button>
            )}
          </div>
        </div>
      ) : isPlaybackActive ? (
        // Playback Mode
        <div className="flex-1 min-h-0 flex flex-col">
          <div className="flex-1 min-h-0">
            <Drone3DView playbackMode={true} className="h-full" />
          </div>
          <PlaybackControls />
        </div>
      ) : mode === ConnectionMode.UNITY_WEBGL ? (
        // Unity WebGL Embed Mode
        <UnitySimulatorPanel />
      ) : mode === ConnectionMode.MAVLINK_SIMULATION ||
        mode === ConnectionMode.REAL_DRONE ||
        mode === ConnectionMode.TEST ? (
        // Three.js 3D Simulator / Test Mode / Real Drone
        <div className="h-full min-h-0 flex flex-col">
          {/* 3D View */}
          <div className="flex-1 min-h-0">
            <Drone3DView className="h-full" />
          </div>

          {/* Footer */}
          <div className="px-4 py-2 bg-gray-800 text-white border-t border-gray-700 flex items-center justify-between text-xs flex-shrink-0">
            <span className="text-gray-400">카메라: 마우스 드래그 / 휠 줌</span>
            <span className="text-gray-400">
              {mode === ConnectionMode.MAVLINK_SIMULATION ? (
                <>Three.js Physics Simulator • MAVLink Protocol</>
              ) : mode === ConnectionMode.REAL_DRONE ? (
                <>Three.js Visualization • Real Drone Telemetry</>
              ) : (
                <>Three.js • React Three Fiber</>
              )}
            </span>
          </div>
        </div>
      ) : (
        // Unity External Server Mode - Connection Info
        <div className="h-full flex items-center justify-center p-6">
          <div className="text-center max-w-md">
            <div className="text-gray-500 mb-6">
              <svg
                className="w-20 h-20 mx-auto"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-white mb-3">
              외부 Unity 시뮬레이터
            </h3>
            <p className="text-gray-400 mb-6 text-sm">
              Unity External Server 모드에서는 Unity가 별도 창에서 실행됩니다
            </p>

            {/* Info Card */}
            <div className="bg-gray-800 border border-gray-700 rounded-lg p-4 text-left">
              <h4 className="text-sm font-semibold text-white mb-2">
                📌 Unity 실행 방법
              </h4>
              <ol className="text-sm text-gray-400 space-y-1 list-decimal list-inside">
                <li>Unity Control Server 프로젝트 열기</li>
                <li>Unity Editor에서 Play 버튼 클릭</li>
                <li>표시된 IP 주소 확인</li>
                <li>설정에서 해당 IP로 연결</li>
              </ol>
            </div>

            <div className="mt-6 bg-green-900/30 border border-green-700/50 rounded-lg p-3 text-left">
              <p className="text-xs text-green-300">
                💡 <strong>Tip:</strong> 브라우저에서 바로 시뮬레이터를 보려면{" "}
                <strong>Unity WebGL</strong> 또는{" "}
                <strong>Three.js Simulator</strong> 모드를 사용하세요
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
