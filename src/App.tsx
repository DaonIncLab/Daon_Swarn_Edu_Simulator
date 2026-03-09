import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
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
import { log } from "@/utils/logger";

function App() {
  const { t } = useTranslation();
  const { status, mode } = useConnectionStore();
  const { currentProject, saveCurrentProject } = useProjectStore();
  const [showMonitoring, setShowMonitoring] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState("flight");

  const isConnected = status === ConnectionStatus.CONNECTED;
  // Unity WebGL은 '연결 완료' 전에(= CONNECTING) WebGL 로더가 먼저 떠야 함
  // 단, 사용자가 Disconnect 하면 다시 시작(연결 필요) 화면으로 돌아가야 하므로 DISCONNECTED에서는 숨긴다.
  const shouldShowWorkspace =
    isConnected ||
    (mode === ConnectionMode.UNITY_WEBGL &&
      status === ConnectionStatus.CONNECTING);

  // Initialize project storage
  useEffect(() => {
    initializeProjectStorage().catch((err) => {
      log.error("Failed to initialize project storage", {
        context: "App",
        error: err,
      });
    });
  }, []);

  // Keyboard shortcuts
  useKeyboardShortcuts([
    {
      key: "s",
      ctrl: true,
      handler: () => {
        if (currentProject) {
          saveCurrentProject();
        }
      },
      description: t("common.saveProject"),
    },
    {
      key: "m",
      ctrl: true,
      handler: () => {
        if (isConnected) {
          setShowMonitoring(true);
        }
      },
      description: t("common.openMonitoring"),
    },
    {
      key: ",",
      ctrl: true,
      handler: () => setShowSettings(true),
      description: t("common.openSettings"),
    },
  ]);

  const guideSteps = t("common.guideSteps", {
    returnObjects: true,
  }) as string[];

  return (
    <ErrorBoundary>
      <div className="h-screen flex flex-col bg-[var(--bg-primary)]">
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
        {shouldShowWorkspace ? (
          <div className="flex-1 flex overflow-hidden w-full">
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
                <div className="w-[40%] flex flex-col bg-[var(--bg-secondary)] border-r border-[var(--border-primary)] p-6">
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
              <div className="w-[40%] flex flex-col bg-[var(--bg-secondary)] border-r border-[var(--border-primary)]">
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
              <div className="flex-1 min-w-0 flex flex-col">
                <SimulatorPanel />
              </div>
            </ErrorBoundary>
          </div>
        ) : (
          // Not Connected State
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center max-w-md px-6">
              <div className="text-[var(--text-tertiary)] mb-6">
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
              <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-3">
                {t("common.connectionRequired")}
              </h2>
              <p className="text-[var(--text-secondary)] mb-6">
                {t("common.connectionInstructions")}
              </p>
              <button
                onClick={() => setShowSettings(true)}
                className="px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-medium"
              >
                ⚙️ {t("common.openConnectionSettings")}
              </button>

              {/* Instructions */}
              <div className="mt-8 bg-[var(--info-bg)] border border-[var(--info-border)] rounded-lg p-4 text-left">
                <h4 className="text-sm font-semibold text-[var(--info-text-secondary)] mb-2">
                  📘 {t("common.startGuide")}
                </h4>
                <ol className="text-sm text-[var(--info-text)] space-y-1 list-decimal list-inside">
                  {guideSteps.map((step, index) => (
                    <li key={index}>{step}</li>
                  ))}
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
