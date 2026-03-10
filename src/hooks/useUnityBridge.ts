/**
 * Unity WebGL ↔ React 브릿지 Hook
 *
 * Unity와 React 간의 양방향 통신을 담당합니다.
 */

import { useEffect, useCallback, useRef, useState } from "react";
import { useUnityContext } from "react-unity-webgl";
import type {
  UnityBuildConfig,
  UnityToReactMessage,
  ReactToUnityMessage,
} from "@/types/unity";
import { log } from "@/utils/logger";
import { convertBlockToUnityMessage } from "@/services/connection";

interface UseUnityBridgeProps {
  buildConfig: UnityBuildConfig;
  onMessage?: (message: UnityToReactMessage) => void;
  onReady?: () => void;
  onError?: (error: string) => void;
}

/**
 * Unity WebGL 브릿지 Hook
 */
export function useUnityBridge({
  buildConfig,
  onMessage,
  onReady,
  onError,
}: UseUnityBridgeProps) {
  const [isReady, setIsReady] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);

  // const droneCountRef = useRef<number>(1);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const itemsRef = useRef<any[]>([]);

  const nextIdRef = useRef(0);
  const pendingRef = useRef(new Map<string, number>());

  const genRequestId = () =>
    crypto.randomUUID?.() ?? `${Date.now()}-${nextIdRef.current++}`;

  // const addDroneCount = () => {
  //   droneCountRef.current += 1;
  // };
  // const deleteDroneCount = () => {
  //   droneCountRef.current = Math.max(1, droneCountRef.current - 1);
  // };

  const appendMissionItems = useCallback((newItems: unknown[]) => {
    if (!newItems || newItems.length === 0) return;
    itemsRef.current = [...itemsRef.current, ...newItems];
  }, []);

  const clearMissionItems = useCallback(() => {
    itemsRef.current = [];
  }, []);

  // Unity Context 초기화
  const { unityProvider, isLoaded, loadingProgression, sendMessage, unload } =
    useUnityContext({
      loaderUrl: buildConfig.loaderUrl,
      dataUrl: buildConfig.dataUrl,
      frameworkUrl: buildConfig.frameworkUrl,
      codeUrl: buildConfig.codeUrl,
    });

  // 로딩 진행 상태 업데이트
  useEffect(() => {
    setLoadingProgress(loadingProgression);
  }, [loadingProgression]);

  // Unity 로드 완료 시
  useEffect(() => {
    if (isLoaded) {
      log.info("Unity WebGL loaded successfully", { context: "UnityBridge" });
      setIsReady(true);
      onReady?.();
    }
  }, [isLoaded, onReady]);

  /**
   * Unity에 메시지 전송
   * @param message React → Unity 메시지
   */
  const sendToUnity = useCallback(
    (message: ReactToUnityMessage) => {
      if (!isLoaded) {
        log.warn("Unity not loaded yet", { context: "UnityBridge" });
        return false;
      }

      try {
        if (!message.data) {
          onError?.("Failed to send message: Message Data Not Found");
        }

        const { action, params } = message.data.commands[0];
        appendMissionItems(convertBlockToUnityMessage(action, params));
        message.data = [...itemsRef.current];

        if (!message.requestId) {
          onError?.("Failed to send message: RequestId Not Found");
        }

        const timeoutId = window.setTimeout(() => {
          pendingRef.current.delete(message.requestId);
          onError?.("Failed to send message: Time Out");
        }, 5000);

        pendingRef.current.set(message.requestId, timeoutId);
        console.log(message);
        sendMessage("DroneManager", "OnReceiveJson", JSON.stringify(message));
        clearMissionItems();

        log.info("Message sent to Unity", {
          context: "UnityBridge",
          messageType: message.type,
        });

        return true;
      } catch (error) {
        log.error("Failed to send message to Unity", {
          context: "UnityBridge",
          error,
        });
        onError?.(`Failed to send message: ${error}`);
        return false;
      }
    },
    [isLoaded, sendMessage, onError, appendMissionItems, clearMissionItems],
  );

  /**
   * Unity로부터 메시지 수신
   */
  const handleUnityMessage = useCallback(
    (messageJson: string) => {
      try {
        //2
        const message: UnityToReactMessage = JSON.parse(messageJson);

        const pending = pendingRef.current.get(message.requestId);

        if (pending) {
          clearTimeout(pending);
          pendingRef.current.delete(message.requestId);
        }

        if (message.type == "error") {
          const data = `${message.data.code} ${message.data.message} `;
          throw new Error(data);
        }

        log.info("Message received from Unity", {
          context: "UnityBridge",
          messageType: message.type,
          data: message.data,
        });

        onMessage?.(message);
      } catch (error) {
        log.error("Failed to parse Unity message", {
          context: "UnityBridge",
          error,
        });
        onError?.(`Failed to parse Unity message: ${error}`);
      }
    },
    [onMessage, onError],
  );

  // Unity 이벤트 리스너 등록
  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).OnMessageToReact = (messageJson: string) => {
      // useUnityBridge -> UnitySimulatorPanel -> UnityWebGLConnectionService
      handleUnityMessage(messageJson);
    };

    return () => {
      // delete (window as any).OnMessageToReact;
    };
  }, [handleUnityMessage]);

  /**
   * 명령 전송 (편의 함수)
   */
  const executeCommands = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (commands: any[], isLast: boolean) => {
      if (isLast) {
        return sendToUnity({
          type: "execute_script",
          requestId: genRequestId(),
          data: { commands },
          timestamp: Date.now(),
        });
      } else {
        const { action, params } = commands[0];
        appendMissionItems(convertBlockToUnityMessage(action, params));
        return true;
      }
    },
    [sendToUnity, appendMissionItems],
  );

  /**
   * 비상 정지 (편의 함수)
   */
  const emergencyStop = useCallback(() => {
    return sendToUnity({
      type: "emergency_stop",
      data: {},
      timestamp: Date.now(),
      requestId: "",
    });
  }, [sendToUnity]);

  return {
    unityProvider,
    isReady,
    loadingProgress,
    sendToUnity,
    executeCommands,
    emergencyStop,
    unload,
  };
}
