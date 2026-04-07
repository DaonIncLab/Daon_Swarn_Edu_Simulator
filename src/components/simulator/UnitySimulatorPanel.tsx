/**
 * Unity Simulator Panel
 *
 * Unity WebGL 모드일 때 시뮬레이터를 표시하는 패널
 */

import { useUnityBridge } from "@/hooks/useUnityBridge";
import { getConnectionManager } from "@/services/connection";
import type { UnityWebGLConnectionService } from "@/services/connection/UnityWebGLConnectionService";
import { useConnectionStore } from "@/stores/useConnectionStore";
import { log } from "@/utils/logger";
import { UnityWebGLEmbed } from "./UnityWebGLEmbed";

// Unity 빌드 설정 (실제 빌드 파일 경로)
const UNITY_BUILD_CONFIG = {
  loaderUrl: "/unity/Build/DroneSwarmSim.loader.js",
  dataUrl: "/unity/Build/DroneSwarmSim.data",
  frameworkUrl: "/unity/Build/DroneSwarmSim.framework.js",
  codeUrl: "/unity/Build/DroneSwarmSim.wasm",
};

export function UnitySimulatorPanel() {
  const { setError } = useConnectionStore();

  // Unity 브릿지 초기화
  const unityBridge = useUnityBridge({
    buildConfig: UNITY_BUILD_CONFIG,
    onMessage: (message) => {
      // log.debug("Message from Unity", {
      //   context: "UnitySimulatorPanel",
      //   message,
      // });

      // Unity 메시지를 ConnectionService로 전달
      const manager = getConnectionManager();
      const service = (manager as any)
        .currentService as UnityWebGLConnectionService | null;

      if (service && "handleUnityMessage" in service) {
        service.handleUnityMessage(message);
      }
    },
    onReady: () => {
      // log.info("Unity WebGL ready", { context: "UnitySimulatorPanel" });

      // Unity 브릿지를 ConnectionService에 주입
      const manager = getConnectionManager();
      const service = (manager as any)
        .currentService as UnityWebGLConnectionService | null;

      if (service && "setUnityBridge" in service) {
        service.setUnityBridge(unityBridge);
      }
    },
    onError: (error) => {
      log.error("Unity error", { context: "UnitySimulatorPanel", error });
      setError(error);
    },
  });

  return (
    <div className="h-full flex flex-col bg-gray-900">
      {/* Unity WebGL Embed - Full Height */}
      <div className="flex-1 relative">
        <UnityWebGLEmbed
          unityProvider={unityBridge.unityProvider}
          isReady={unityBridge.isReady}
          loadingProgress={unityBridge.loadingProgress}
          height="100%"
        />

        {/* Loading Overlay */}
        {!unityBridge.isReady && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-900 bg-opacity-90">
            <div className="text-center">
              <div className="text-white mb-4">
                <div className="text-4xl mb-2">🎮</div>
                <div className="text-lg font-semibold">
                  Unity 시뮬레이터 로딩 중...
                </div>
              </div>
              <div className="w-64 bg-gray-700 rounded-full h-2">
                <div
                  className="bg-green-500 h-2 rounded-full transition-all duration-300"
                  style={{
                    width: `${Math.round(unityBridge.loadingProgress * 100)}%`,
                  }}
                />
              </div>
              <div className="text-gray-400 text-sm mt-2">
                {Math.round(unityBridge.loadingProgress * 100)}%
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Status Bar */}
      <div className="px-4 py-2 bg-gray-800 text-white flex items-center justify-between text-xs flex-shrink-0">
        <div className="flex items-center gap-4">
          <span className="text-gray-400">시뮬레이터 상태:</span>
          {unityBridge.isReady ? (
            <span className="text-green-400">✓ 명령 수신 준비 완료</span>
          ) : (
            <span className="text-yellow-400">⏳ 초기화 중...</span>
          )}
        </div>
      </div>
    </div>
  );
}
