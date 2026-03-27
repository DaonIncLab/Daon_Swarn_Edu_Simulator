import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useConnectionStore } from "@/stores/useConnectionStore";
import { ConnectionStatus as Status } from "@/constants/connection";
import { ConnectionMode } from "@/services/connection";
import { FormationControlMode } from "@/services/connection/MAVLinkConnectionService";
import { Card } from "@/components/common/Card";
import { Button } from "@/components/common/Button";
import { Input } from "@/components/common/Input";
import { ConnectionStatus } from "./ConnectionStatus";

export function ConnectionPanel() {
  const { t } = useTranslation();
  const {
    status,
    mode,
    ipAddress,
    port,
    error,
    testModeDroneCount,
    mavlinkDroneCount,
    mavlinkTransportType,
    mavlinkHost,
    mavlinkPort,
    mavlinkSerialDevice,
    mavlinkBaudRate,
    formationMode,
    setMode,
    setIpAddress,
    setPort,
    setTestModeDroneCount,
    setMavlinkDroneCount,
    setMavlinkTransportType,
    setMavlinkHost,
    setMavlinkPort,
    setMavlinkSerialDevice,
    setMavlinkBaudRate,
    setFormationMode,
    connect,
    disconnect,
    clearError,
  } = useConnectionStore();

  const isTestMode = mode === ConnectionMode.TEST;
  const isSimMode = mode === ConnectionMode.SIMULATION;
  const isUnityWebGLMode = mode === ConnectionMode.UNITY_WEBGL;
  const isMAVLinkSimMode = mode === ConnectionMode.MAVLINK_SIMULATION;
  const isRealMAVLinkMode = mode === ConnectionMode.REAL_DRONE;
  const isMAVLinkMode = isMAVLinkSimMode || isRealMAVLinkMode;

  const [localIp, setLocalIp] = useState(ipAddress);
  const [localPort, setLocalPort] = useState(port.toString());
  const [ipError, setIpError] = useState<string>("");

  useEffect(() => {
    setLocalIp(ipAddress);
  }, [ipAddress]);

  useEffect(() => {
    setLocalPort(port.toString());
  }, [port]);

  const validateIpAddress = (ip: string): boolean => {
    if (!ip) {
      setIpError("IP address is required");
      return false;
    }

    // Simple IP validation (IPv4)
    const ipPattern = /^(\d{1,3}\.){3}\d{1,3}$/;
    if (!ipPattern.test(ip)) {
      setIpError("Invalid IP address format");
      return false;
    }

    // Check each octet is 0-255
    const octets = ip.split(".");
    for (const octet of octets) {
      const num = parseInt(octet, 10);
      if (num < 0 || num > 255) {
        setIpError("IP address octets must be 0-255");
        return false;
      }
    }

    setIpError("");
    return true;
  };

  const handleConnect = () => {
    clearError();
    // 테스트 모드, Unity WebGL, MAVLink 시뮬레이션 모드면 바로 연결
    if (
      isTestMode ||
      isUnityWebGLMode ||
      isMAVLinkSimMode ||
      isRealMAVLinkMode
    ) {
      connect();
      return;
    }

    // WebSocket 모드는 IP 검증 필요
    if (!validateIpAddress(localIp)) {
      return;
    }

    const portNum = parseInt(localPort, 10);
    if (isNaN(portNum) || portNum < 1 || portNum > 65535) {
      setIpError("Port must be between 1 and 65535");
      return;
    }

    setIpAddress(localIp);
    setPort(portNum);
    connect();
  };

  const handleModeChange = (newMode: ConnectionMode) => {
    if (isConnected || isConnecting) {
      return;
    }

    setMode(newMode);
    // 사용자가 설정을 마친 후 수동으로 Connect 버튼을 클릭하도록 함
  };

  const handleDisconnect = () => {
    disconnect();
    clearError();
    setIpError("");
  };

  const isConnected = status === Status.CONNECTED;
  const isConnecting = status === Status.CONNECTING;

  return (
    <Card
      title={t("connection.title")}
      description="Select connection mode and configure settings"
    >
      <div className="space-y-4">
        {/* Mode Selector */}
        <div className="pb-4 border-b border-[var(--border-primary)]">
          <label className="block text-sm font-medium text-[var(--text-secondary)] mb-3">
            {t("connection.mode")}
          </label>
          <div className="grid grid-cols-1 gap-2">
            {/* Unity WebGL Mode (Default) */}
            <button
              onClick={() => handleModeChange(ConnectionMode.UNITY_WEBGL)}
              disabled={isConnected || isConnecting}
              className={`p-3 rounded-lg border-2 text-left transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                isUnityWebGLMode
                  ? "border-primary-600 bg-primary-50"
                  : "border-[var(--border-primary)] hover:border-[var(--border-secondary)]"
              }`}
            >
              <div className="flex items-center gap-2">
                <div
                  className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                    isUnityWebGLMode
                      ? "border-primary-600"
                      : "border-[var(--border-secondary)]"
                  }`}
                >
                  {isUnityWebGLMode && (
                    <div className="w-2 h-2 rounded-full bg-primary-600" />
                  )}
                </div>
                <div>
                  <div className="font-medium text-[var(--text-primary)]">
                    🎮 Unity WebGL Embed
                  </div>
                  <div className="text-xs text-[var(--text-secondary)]">
                    Built-in Unity simulator
                  </div>
                </div>
              </div>
            </button>

            {/* Unity WebSocket Mode */}
            <button
              onClick={() => handleModeChange(ConnectionMode.SIMULATION)}
              disabled={isConnected || isConnecting}
              className={`p-3 rounded-lg border-2 text-left transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                isSimMode
                  ? "border-primary-600 bg-primary-50"
                  : "border-[var(--border-primary)] hover:border-[var(--border-secondary)]"
              }`}
            >
              <div className="flex items-center gap-2">
                <div
                  className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                    isSimMode
                      ? "border-primary-600"
                      : "border-[var(--border-secondary)]"
                  }`}
                >
                  {isSimMode && (
                    <div className="w-2 h-2 rounded-full bg-primary-600" />
                  )}
                </div>
                <div>
                  <div className="font-medium text-[var(--text-primary)]">
                    🔌 Unity External Server
                  </div>
                  <div className="text-xs text-[var(--text-secondary)]">
                    Connect to separate Unity WebSocket server
                  </div>
                </div>
              </div>
            </button>

            {/* Three.js Simulator Mode */}
            <button
              onClick={() =>
                handleModeChange(ConnectionMode.MAVLINK_SIMULATION)
              }
              disabled={isConnected || isConnecting}
              className={`p-3 rounded-lg border-2 text-left transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                isMAVLinkSimMode
                  ? "border-green-600 bg-green-50"
                  : "border-[var(--border-primary)] hover:border-[var(--border-secondary)]"
              }`}
            >
              <div className="flex items-center gap-2">
                <div
                  className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                    isMAVLinkSimMode
                      ? "border-green-600"
                      : "border-[var(--border-secondary)]"
                  }`}
                >
                  {isMAVLinkSimMode && (
                    <div className="w-2 h-2 rounded-full bg-green-600" />
                  )}
                </div>
                <div>
                  <div className="font-medium text-[var(--text-primary)]">
                    🚁 Three.js Simulator
                  </div>
                  <div className="text-xs text-[var(--text-secondary)]">
                    Physics simulation with MAVLink protocol
                  </div>
                </div>
              </div>
            </button>

            {/* Real MAVLink Mode */}
            <button
              onClick={() => handleModeChange(ConnectionMode.REAL_DRONE)}
              disabled={isConnected || isConnecting}
              className={`p-3 rounded-lg border-2 text-left transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                isRealMAVLinkMode
                  ? "border-orange-600 bg-orange-50"
                  : "border-[var(--border-primary)] hover:border-[var(--border-secondary)]"
              }`}
            >
              <div className="flex items-center gap-2">
                <div
                  className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                    isRealMAVLinkMode
                      ? "border-orange-600"
                      : "border-[var(--border-secondary)]"
                  }`}
                >
                  {isRealMAVLinkMode && (
                    <div className="w-2 h-2 rounded-full bg-orange-600" />
                  )}
                </div>
                <div>
                  <div className="font-medium text-[var(--text-primary)]">
                    🔧 {t("connection.mavlink.title")}
                  </div>
                  <div className="text-xs text-[var(--text-secondary)]">
                    {t("connection.mavlink.description")}
                  </div>
                </div>
              </div>
            </button>

            {/* Test Mode */}
            <button
              onClick={() => handleModeChange(ConnectionMode.TEST)}
              disabled={isConnected || isConnecting}
              className={`p-3 rounded-lg border-2 text-left transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                isTestMode
                  ? "border-primary-600 bg-primary-50"
                  : "border-[var(--border-primary)] hover:border-[var(--border-secondary)]"
              }`}
            >
              <div className="flex items-center gap-2">
                <div
                  className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                    isTestMode
                      ? "border-primary-600"
                      : "border-[var(--border-secondary)]"
                  }`}
                >
                  {isTestMode && (
                    <div className="w-2 h-2 rounded-full bg-primary-600" />
                  )}
                </div>
                <div>
                  <div className="font-medium text-[var(--text-primary)]">
                    🧪 Test Mode
                  </div>
                  <div className="text-xs text-[var(--text-secondary)]">
                    Dummy mode (no Unity)
                  </div>
                </div>
              </div>
            </button>
          </div>
        </div>

        {/* Connection Status */}
        <div className="flex items-center justify-between pb-4 border-b border-[var(--border-primary)]">
          <span className="text-sm font-medium text-[var(--text-secondary)]">
            Status:
          </span>
          <ConnectionStatus status={status} />
        </div>

        {/* Three.js Simulator Settings */}
        {isMAVLinkSimMode && !isConnected && (
          <>
            <div className="bg-green-50 border border-green-200 rounded-lg p-3">
              <p className="text-sm text-green-800">
                🎮 <strong>Three.js 3D Simulator</strong>
              </p>
              <p className="text-xs text-green-700 mt-1">
                Physics-based drone simulation with Three.js 3D visualization
                and MAVLink protocol support.
              </p>
            </div>

            {/* Drone Count Selector */}
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                Number of Drones:{" "}
                <span className="text-green-600 font-bold">
                  {mavlinkDroneCount}
                </span>
              </label>
              <div className="grid grid-cols-4 gap-2">
                {[2, 4, 6, 8].map((count) => (
                  <button
                    key={count}
                    onClick={() => setMavlinkDroneCount(count)}
                    className={`py-2 px-3 rounded-lg border-2 font-medium transition-all ${
                      mavlinkDroneCount === count
                        ? "border-green-600 bg-green-50 text-green-700"
                        : "border-[var(--border-primary)] hover:border-[var(--border-secondary)] text-[var(--text-secondary)]"
                    }`}
                  >
                    {count}
                  </button>
                ))}
              </div>
              <p className="text-xs text-[var(--text-secondary)] mt-2">
                Three.js physics engine with MAVLink protocol and formation
                flight
              </p>
            </div>

            {/* Formation Control Mode Selector */}
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                Formation Control Mode
              </label>
              <div className="grid grid-cols-1 gap-2">
                {/* GCS Coordinated Mode */}
                <button
                  onClick={() =>
                    setFormationMode(FormationControlMode.GCS_COORDINATED)
                  }
                  className={`p-3 rounded-lg border-2 text-left transition-all ${
                    formationMode === FormationControlMode.GCS_COORDINATED
                      ? "border-green-600 bg-green-50"
                      : "border-[var(--border-primary)] hover:border-[var(--border-secondary)]"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                        formationMode === FormationControlMode.GCS_COORDINATED
                          ? "border-green-600"
                          : "border-[var(--border-secondary)]"
                      }`}
                    >
                      {formationMode ===
                        FormationControlMode.GCS_COORDINATED && (
                        <div className="w-2 h-2 rounded-full bg-green-600" />
                      )}
                    </div>
                    <div>
                      <div className="font-medium text-[var(--text-primary)]">
                        🎯 GCS Coordinated
                      </div>
                      <div className="text-xs text-[var(--text-secondary)]">
                        Each drone receives individual position setpoints
                      </div>
                    </div>
                  </div>
                </button>

                {/* Virtual Leader Mode */}
                <button
                  onClick={() =>
                    setFormationMode(FormationControlMode.VIRTUAL_LEADER)
                  }
                  className={`p-3 rounded-lg border-2 text-left transition-all ${
                    formationMode === FormationControlMode.VIRTUAL_LEADER
                      ? "border-purple-600 bg-purple-50"
                      : "border-[var(--border-primary)] hover:border-[var(--border-secondary)]"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                        formationMode === FormationControlMode.VIRTUAL_LEADER
                          ? "border-purple-600"
                          : "border-[var(--border-secondary)]"
                      }`}
                    >
                      {formationMode ===
                        FormationControlMode.VIRTUAL_LEADER && (
                        <div className="w-2 h-2 rounded-full bg-purple-600" />
                      )}
                    </div>
                    <div>
                      <div className="font-medium text-[var(--text-primary)]">
                        ✨ Virtual Leader
                      </div>
                      <div className="text-xs text-[var(--text-secondary)]">
                        Smooth synchronized movement with formation offsets
                      </div>
                    </div>
                  </div>
                </button>
              </div>
              <p className="text-xs text-[var(--text-secondary)] mt-2">
                {formationMode === FormationControlMode.GCS_COORDINATED
                  ? "📍 GCS calculates each drone position independently"
                  : "🎯 Virtual point moves, drones follow with offsets"}
              </p>
            </div>

            {/* Connect Button for Three.js Simulator */}
            <div className="pt-4">
              <button
                onClick={handleConnect}
                disabled={isConnecting}
                className="w-full px-6 py-3 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isConnecting
                  ? "Starting Simulator..."
                  : "Start Three.js Simulator"}
              </button>
            </div>
          </>
        )}

        {/* Real MAVLink Mode Settings */}
        {isRealMAVLinkMode && !isConnected && (
          <>
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
              <p className="text-sm text-orange-800">
                🔧 <strong>{t("connection.mavlink.title")}</strong>
              </p>
              <p className="text-xs text-orange-700 mt-1">
                {t("connection.mavlink.description")}
              </p>
            </div>

            {/* Transport Type Selector */}
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                {t("connection.mavlink.transportType")}
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setMavlinkTransportType("udp")}
                  className={`py-2 px-4 rounded-lg border-2 font-medium transition-all ${
                    mavlinkTransportType === "udp"
                      ? "border-orange-600 bg-orange-50 text-orange-700"
                      : "border-[var(--border-primary)] hover:border-[var(--border-secondary)] text-[var(--text-secondary)]"
                  }`}
                >
                  📡 {t("connection.mavlink.transportUdp")}
                </button>
                <button
                  onClick={() => setMavlinkTransportType("serial")}
                  className={`py-2 px-4 rounded-lg border-2 font-medium transition-all ${
                    mavlinkTransportType === "serial"
                      ? "border-orange-600 bg-orange-50 text-orange-700"
                      : "border-[var(--border-primary)] hover:border-[var(--border-secondary)] text-[var(--text-secondary)]"
                  }`}
                >
                  🔌 {t("connection.mavlink.transportSerial")}
                </button>
              </div>
            </div>

            {/* UDP Configuration */}
            {mavlinkTransportType === "udp" && (
              <>
                <Input
                  label="Target Host"
                  type="text"
                  value={mavlinkHost}
                  onChange={(e) => setMavlinkHost(e.target.value)}
                  placeholder="127.0.0.1"
                />
                <Input
                  label="Target Port"
                  type="number"
                  value={mavlinkPort.toString()}
                  onChange={(e) =>
                    setMavlinkPort(parseInt(e.target.value) || 14550)
                  }
                  placeholder="14550"
                  helperText="UDP target port for SITL or real drone"
                />
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <p className="text-sm text-blue-800 font-medium">
                    💡 {t("connection.mavlink.info.udpTitle")}
                  </p>
                  <p className="text-xs text-blue-700 mt-1">
                    Target endpoint used by the fixed WebSocket bridge.
                  </p>
                  <p className="text-xs text-blue-600 mt-2 font-medium">
                    ⚠️ Bridge endpoint is fixed in code: ws://localhost:15550/mavlink
                  </p>
                </div>
              </>
            )}

            {/* Serial Configuration */}
            {mavlinkTransportType === "serial" && (
              <>
                <Input
                  label={t("connection.mavlink.serial.device")}
                  type="text"
                  value={mavlinkSerialDevice}
                  onChange={(e) => setMavlinkSerialDevice(e.target.value)}
                  placeholder={t("connection.mavlink.serial.devicePlaceholder")}
                />
                <div>
                  <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                    {t("connection.mavlink.serial.baudRate")}
                  </label>
                  <select
                    value={mavlinkBaudRate}
                    onChange={(e) =>
                      setMavlinkBaudRate(parseInt(e.target.value))
                    }
                    className="w-full px-3 py-2 border border-[var(--border-primary)] rounded-lg bg-[var(--bg-primary)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-primary-600"
                  >
                    <option value={9600}>9600</option>
                    <option value={19200}>19200</option>
                    <option value={38400}>38400</option>
                    <option value={57600}>57600 (Default)</option>
                    <option value={115200}>115200</option>
                  </select>
                  <p className="text-xs text-[var(--text-secondary)] mt-1">
                    {t("connection.mavlink.serial.baudRateDefault")}
                  </p>
                </div>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <p className="text-sm text-blue-800 font-medium">
                    💡 {t("connection.mavlink.info.serialTitle")}
                  </p>
                  <p className="text-xs text-blue-700 mt-1">
                    {t("connection.mavlink.info.serialDescription")}
                  </p>
                </div>
              </>
            )}

            {/* Connect Button for Real MAVLink Mode */}
            <div className="pt-4">
              <button
                onClick={handleConnect}
                disabled={isConnecting}
                className="w-full px-6 py-3 bg-orange-600 hover:bg-orange-700 text-white font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isConnecting
                  ? "Connecting..."
                  : `Connect (${mavlinkTransportType.toUpperCase()})`}
              </button>
            </div>
          </>
        )}

        {/* Test Mode Settings */}
        {isTestMode && !isConnected && (
          <>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-sm text-blue-800">
                🧪 <strong>Test Mode Enabled</strong>
              </p>
              <p className="text-xs text-blue-700 mt-1">
                You can test the Blockly workspace without Unity. Configure
                settings below.
              </p>
            </div>

            {/* Drone Count Selector */}
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                Number of Drones:{" "}
                <span className="text-blue-600 font-bold">
                  {testModeDroneCount}
                </span>
              </label>
              <div className="grid grid-cols-4 gap-2">
                {[2, 4, 6, 8].map((count) => (
                  <button
                    key={count}
                    onClick={() => setTestModeDroneCount(count)}
                    className={`py-2 px-3 rounded-lg border-2 font-medium transition-all ${
                      testModeDroneCount === count
                        ? "border-blue-600 bg-blue-50 text-blue-700"
                        : "border-[var(--border-primary)] hover:border-[var(--border-secondary)] text-[var(--text-secondary)]"
                    }`}
                  >
                    {count}
                  </button>
                ))}
              </div>
              <p className="text-xs text-[var(--text-secondary)] mt-2">
                Select how many drones to simulate
              </p>
            </div>

            {/* Connect Button for Test Mode - Prominent placement */}
            <div className="pt-4">
              <button
                onClick={handleConnect}
                disabled={isConnecting}
                className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isConnecting ? "Connecting..." : "Connect (Test Mode)"}
              </button>
            </div>
          </>
        )}

        {/* IP Address Input - Only for Unity External Server Mode */}
        {isSimMode && !isConnected && (
          <>
            <Input
              label="Unity Server IP Address"
              type="text"
              placeholder="192.168.0.100"
              value={localIp}
              onChange={(e) => {
                setLocalIp(e.target.value);
                setIpError("");
                clearError();
              }}
              error={ipError}
              disabled={isConnected || isConnecting}
              helperText="Enter the IP address shown in Unity simulator"
            />

            {/* Port Input */}
            <Input
              label="WebSocket Port"
              type="number"
              placeholder="8080"
              value={localPort}
              onChange={(e) => {
                setLocalPort(e.target.value);
                setIpError("");
                clearError();
              }}
              disabled={isConnected || isConnecting}
              helperText="Default: 8080"
            />
          </>
        )}

        {/* Error Message */}
        {error && !ipError && (
          <div className="bg-danger/10 border border-danger rounded-lg p-3">
            <p className="text-sm text-danger-dark font-medium">{error}</p>
          </div>
        )}

        {/* Connection Info when connected */}
        {isConnected && (
          <div className="bg-success/10 border border-success rounded-lg p-3">
            <p className="text-sm text-success-dark">
              {isUnityWebGLMode ? (
                <>
                  🎮 <strong>Unity WebGL Ready</strong> - Simulator loaded
                </>
              ) : isMAVLinkSimMode ? (
                <>
                  🚁 <strong>Three.js Simulator Active</strong> -{" "}
                  {mavlinkDroneCount} drones ready
                </>
              ) : isRealMAVLinkMode ? (
                <>
                  🔧 <strong>Real MAVLink Connected</strong> - Live drone
                  telemetry
                </>
              ) : isTestMode ? (
                <>
                  🧪 <strong>Test Mode Active</strong> - Blockly workspace ready
                </>
              ) : (
                <>
                  🔌 <strong>Unity Server Connected</strong> -{" "}
                  <span className="font-mono font-semibold">
                    {ipAddress}:{port}
                  </span>
                </>
              )}
            </p>
          </div>
        )}

        {/* Connect/Disconnect Button - Not for Test or MAVLink Mode (have their own buttons) */}
        {!isTestMode && !isMAVLinkMode && (
          <div className="flex gap-2">
            {!isConnected ? (
              <Button
                variant="primary"
                fullWidth
                onClick={handleConnect}
                disabled={isConnecting}
              >
                {isConnecting
                  ? `${t("connection.connect")}...`
                  : t("connection.connect")}
              </Button>
            ) : (
              <Button variant="danger" fullWidth onClick={handleDisconnect}>
                {t("connection.disconnect")}
              </Button>
            )}
          </div>
        )}

        {/* Disconnect Button for MAVLink Mode */}
        {isMAVLinkMode && isConnected && (
          <div className="flex gap-2">
            <Button variant="danger" fullWidth onClick={handleDisconnect}>
              {t("connection.disconnect")}
            </Button>
          </div>
        )}

        {/* Disconnect Button for Test Mode */}
        {isTestMode && isConnected && (
          <div className="flex gap-2">
            <Button variant="danger" fullWidth onClick={handleDisconnect}>
              {t("connection.disconnect")}
            </Button>
          </div>
        )}

        {/* Quick Connect Buttons - Only in WebSocket Mode */}
        {isSimMode && !isConnected && !isConnecting && (
          <div className="pt-4 border-t border-[var(--border-primary)]">
            <p className="text-xs text-[var(--text-secondary)] mb-2">
              Quick Connect:
            </p>
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  setLocalIp("localhost");
                  setIpError("");
                }}
              >
                Localhost
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  setLocalIp("192.168.0.100");
                  setIpError("");
                }}
              >
                192.168.0.100
              </Button>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}
