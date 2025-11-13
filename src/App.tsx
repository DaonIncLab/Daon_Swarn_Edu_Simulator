import { useEffect, useState } from "react";
import { ConnectionPanel } from "@/components/connection";
import { BlocklyWorkspace, ExecutionPanel } from "@/components/blockly";
import {
  CommandPreview,
  ExecutionLog,
  DroneStatus,
  TelemetryDashboard,
} from "@/components/visualization";
import { DroneStatusButton } from "@/components/visualization/DroneStatusButton";
import { UnitySimulatorPanel } from "@/components/simulator";
import { ProjectPanel } from "@/components/project";
import { useConnectionStore } from "@/stores/useConnectionStore";
import { useProjectStore } from "@/stores/useProjectStore";
import { useBlocklyStore } from "@/stores/useBlocklyStore";
import { ConnectionStatus, ConnectionMode } from "@/constants/connection";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import { initializeProjectStorage } from "@/services/storage";

function App() {
  const { status, mode } = useConnectionStore();
  const { currentProject, saveCurrentProject } = useProjectStore();
  const { hasUnsavedChanges } = useBlocklyStore();
  const [showNewProjectModal, setShowNewProjectModal] = useState(false);
  const [showOpenProjectModal, setShowOpenProjectModal] = useState(false);
  const [showDroneStatusModal, setShowDroneStatusModal] = useState(false);

  const isConnected = status === ConnectionStatus.CONNECTED;
  const isUnityWebGLMode = mode === ConnectionMode.UNITY_WEBGL;

  // 프로젝트 저장소 초기화
  useEffect(() => {
    initializeProjectStorage().catch((err) => {
      console.error("[App] Failed to initialize project storage:", err);
    });
  }, []);

  // 키보드 단축키
  useKeyboardShortcuts([
    {
      key: "n",
      ctrl: true,
      handler: () => setShowNewProjectModal(true),
      description: "새 프로젝트",
    },
    {
      key: "o",
      ctrl: true,
      handler: () => setShowOpenProjectModal(true),
      description: "프로젝트 열기",
    },
    {
      key: "s",
      ctrl: true,
      handler: () => {
        if (currentProject && hasUnsavedChanges) {
          saveCurrentProject();
        }
      },
      description: "프로젝트 저장",
    },
  ]);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3">
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">
                    Drone Swarm Simulator
                  </h1>
                  <p className="text-sm text-gray-600">
                    Google Blockly ↔ Unity Integration
                  </p>
                </div>
                {/* Current Project Badge */}
                {currentProject && (
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 border border-blue-200 rounded-lg">
                    <span className="text-sm font-medium text-blue-900">
                      📄 {currentProject.name}
                    </span>
                    {hasUnsavedChanges && (
                      <span
                        className="text-orange-600 font-bold"
                        title="저장되지 않은 변경사항"
                      >
                        ✱
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Right Side Actions */}
            <div className="flex items-center gap-3">
              {/* Save Button */}
              {currentProject && hasUnsavedChanges && (
                <button
                  onClick={() => saveCurrentProject()}
                  className="px-4 py-2 bg-success text-white rounded-lg hover:bg-success-dark transition-colors text-sm font-medium"
                  title="저장 (Ctrl+S)"
                >
                  💾 저장
                </button>
              )}

              {/* Connection Status Badge */}
              <div className="flex items-center gap-2 px-4 py-2 bg-gray-50 rounded-lg">
                <div
                  className={`w-2 h-2 rounded-full ${
                    isConnected ? "bg-success animate-pulse" : "bg-gray-400"
                  }`}
                />
                <span className="text-sm font-medium text-gray-700">
                  {isConnected ? "Unity Connected" : "Not Connected"}
                </span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
          {/* Left Sidebar - Project, Connection & Drone Status */}
          <div className="xl:col-span-3 space-y-6">
            <ProjectPanel />
            <ConnectionPanel />
            {isConnected && (
              <DroneStatusButton onClick={() => setShowDroneStatusModal(true)} />
            )}
          </div>

          {/* Center - Blockly Workspace OR Unity Simulator */}
          <div className="xl:col-span-6 space-y-6">
            {/* Unity Simulator (WebGL Embed Mode) */}
            {isUnityWebGLMode && isConnected && <UnitySimulatorPanel />}

            {/* Blockly Workspace */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold mb-4 text-gray-900">
                Blockly Workspace
              </h2>

              {isConnected ? (
                <BlocklyWorkspace />
              ) : (
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-12 text-center">
                  <div className="text-gray-400 mb-4">
                    <svg
                      className="w-16 h-16 mx-auto"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M13 10V3L4 14h7v7l9-11h-7z"
                      />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    Connect First
                  </h3>
                  <p className="text-gray-600">
                    Select a connection mode and click "Connect" to get started
                  </p>
                </div>
              )}
            </div>

            {/* Execution Panel */}
            {isConnected && <ExecutionPanel />}

            {/* Instructions */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="text-sm font-semibold text-blue-900 mb-2">
                📘 Getting Started
              </h4>
              <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
                <li>
                  Launch Unity Control Server on your PC (or enable Test Mode)
                </li>
                <li>Note the IP address shown in Unity</li>
                <li>Enter the IP address in the Connection Panel</li>
                <li>Click "Connect" to establish connection</li>
                <li>Start coding with Blockly blocks!</li>
              </ol>
            </div>
          </div>

          {/* Right Sidebar - Command Preview & Logs */}
          <div className="xl:col-span-3 space-y-6">
            {isConnected && (
              <>
                <CommandPreview />
                <ExecutionLog />
              </>
            )}
          </div>
        </div>

        {/* Telemetry Dashboard - Full Width */}
        {isConnected && (
          <div className="mt-6">
            <TelemetryDashboard />
          </div>
        )}
      </main>

      {/* DroneStatus Modal */}
      <DroneStatus
        isOpen={showDroneStatusModal}
        onClose={() => setShowDroneStatusModal(false)}
      />
    </div>
  );
}

export default App;
