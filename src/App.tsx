import { useEffect, useState } from "react";
import { BlocklyWorkspace } from "@/components/blockly";
import { Header } from "@/components/common/Header";
import { NavigationPanel } from "@/components/layout/NavigationPanel";
import { SimulatorPanel } from "@/components/layout/SimulatorPanel";
import { MonitoringPanel } from "@/components/layout/MonitoringPanel";
import { SettingsPanel } from "@/components/layout/SettingsPanel";
import { ErrorBoundary } from "@/components/common/ErrorBoundary";
import { ErrorFallback } from "@/components/common/ErrorFallback";
import { useConnectionStore } from "@/stores/useConnectionStore";
import { useProjectStore } from "@/stores/useProjectStore";
import { ConnectionStatus, ConnectionMode } from "@/constants/connection";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import { initializeProjectStorage } from "@/services/storage";

function App() {
  const { status } = useConnectionStore();
  const { currentProject, saveCurrentProject } = useProjectStore();
  const [showMonitoring, setShowMonitoring] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('basic');

  const isConnected = status === ConnectionStatus.CONNECTED;

  // 프로젝트 저장소 초기화
  useEffect(() => {
    initializeProjectStorage().catch((err) => {
      console.error("[App] Failed to initialize project storage:", err);
    });
  }, []);

  // 키보드 단축키
  useKeyboardShortcuts([
    {
      key: "s",
      ctrl: true,
      handler: () => {
        if (currentProject) {
          saveCurrentProject();
        }
      },
      description: "프로젝트 저장",
    },
    {
      key: "m",
      ctrl: true,
      handler: () => {
        if (isConnected) {
          setShowMonitoring(true);
        }
      },
      description: "모니터링 열기",
    },
    {
      key: ",",
      ctrl: true,
      handler: () => setShowSettings(true),
      description: "설정 열기",
    },
  ]);

  return (
    <ErrorBoundary>
      <div className="h-screen flex flex-col bg-gray-50">
        {/* Header */}
        <ErrorBoundary
          fallback={(error, errorInfo, retry) => (
            <ErrorFallback
              error={error}
              errorInfo={errorInfo}
              retry={retry}
              title="Header Error"
              description="The application header encountered an error."
            />
          )}
        >
          <Header
            onOpenMonitoring={() => setShowMonitoring(true)}
            onOpenSettings={() => setShowSettings(true)}
          />
        </ErrorBoundary>

        {/* Main Work Area - 3 Column Layout */}
        {isConnected ? (
          <div className="flex-1 flex overflow-hidden">
            {/* Left: Navigation Panel (15%) */}
            <ErrorBoundary
              fallback={(error, errorInfo, retry) => (
                <div className="w-[15%] min-w-[200px] max-w-[250px] p-4">
                  <ErrorFallback
                    error={error}
                    errorInfo={errorInfo}
                    retry={retry}
                    title="Navigation Error"
                    description="The navigation panel could not be loaded."
                  />
                </div>
              )}
            >
              <NavigationPanel
                className="w-[15%] min-w-[200px] max-w-[250px]"
                selectedCategory={selectedCategory}
                onCategorySelect={setSelectedCategory}
                onOpenProject={() => setShowSettings(true)}
                onOpenSettings={() => setShowSettings(true)}
                onOpenMonitoring={() => setShowMonitoring(true)}
                isConnected={isConnected}
              />
            </ErrorBoundary>

            {/* Center: Blockly Workspace (40%) */}
            <ErrorBoundary
              fallback={(error, errorInfo, retry) => (
                <div className="w-[40%] flex flex-col bg-white border-r border-gray-200 p-6">
                  <ErrorFallback
                    error={error}
                    errorInfo={errorInfo}
                    retry={retry}
                    title="Blockly Workspace Error"
                    description="The visual programming workspace could not be loaded."
                  />
                </div>
              )}
            >
              <div className="w-[40%] flex flex-col bg-white border-r border-gray-200">
                <BlocklyWorkspace selectedCategory={selectedCategory} />
              </div>
            </ErrorBoundary>

            {/* Right: Simulator Panel (45%) */}
            <ErrorBoundary
              fallback={(error, errorInfo, retry) => (
                <div className="w-[45%] flex flex-col p-6">
                  <ErrorFallback
                    error={error}
                    errorInfo={errorInfo}
                    retry={retry}
                    title="Simulator Error"
                    description="The simulator panel could not be loaded."
                  />
                </div>
              )}
            >
              <div className="w-[45%] flex flex-col">
                <SimulatorPanel />
              </div>
            </ErrorBoundary>
          </div>
        ) : (
        // Not Connected State
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center max-w-md px-6">
            <div className="text-gray-400 mb-6">
              <svg
                className="w-24 h-24 mx-auto"
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
            <h2 className="text-2xl font-bold text-gray-900 mb-3">
              시작하려면 연결이 필요합니다
            </h2>
            <p className="text-gray-600 mb-6">
              Unity 시뮬레이터에 연결하거나 테스트 모드를 활성화하세요
            </p>
            <button
              onClick={() => setShowSettings(true)}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              ⚙️ 연결 설정 열기
            </button>

            {/* Instructions */}
            <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-4 text-left">
              <h4 className="text-sm font-semibold text-blue-900 mb-2">
                📘 시작 가이드
              </h4>
              <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
                <li>Unity Control Server 실행 (또는 Test Mode 활성화)</li>
                <li>Unity에 표시된 IP 주소 확인</li>
                <li>연결 설정에서 IP 주소 입력</li>
                <li>"Connect" 버튼 클릭</li>
                <li>Blockly로 코딩 시작!</li>
              </ol>
            </div>
          </div>
        </div>
      )}

        {/* Monitoring Panel (Full-screen Modal) */}
        <ErrorBoundary
          fallback={(error, errorInfo, retry) => (
            <ErrorFallback
              error={error}
              errorInfo={errorInfo}
              retry={retry}
              title="Monitoring Panel Error"
              description="The monitoring panel could not be loaded."
            />
          )}
        >
          <MonitoringPanel
            isOpen={showMonitoring}
            onClose={() => setShowMonitoring(false)}
          />
        </ErrorBoundary>

        {/* Settings Panel (Full-screen Modal) */}
        <ErrorBoundary
          fallback={(error, errorInfo, retry) => (
            <ErrorFallback
              error={error}
              errorInfo={errorInfo}
              retry={retry}
              title="Settings Panel Error"
              description="The settings panel could not be loaded."
            />
          )}
        >
          <SettingsPanel
            isOpen={showSettings}
            onClose={() => setShowSettings(false)}
          />
        </ErrorBoundary>
      </div>
    </ErrorBoundary>
  );
}

export default App;
