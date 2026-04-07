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

interface ConnectionPanelProps {
  onConnected?: () => void;
}

export function ConnectionPanel({ onConnected }: ConnectionPanelProps) {
  const { t } = useTranslation();
  const {
    status,
    mode,
    error,
    testModeDroneCount,
    mavlinkTransportType,
    mavlinkHost,
    mavlinkPort,
    mavlinkSerialDevice,
    mavlinkBaudRate,
    formationMode,
    setMode,
    setTestModeDroneCount,
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
  const isUnityMode = mode === ConnectionMode.UNITY;
  const isMavlinkMode = mode === ConnectionMode.MAVLINK;
  const [hasPendingConnect, setHasPendingConnect] = useState(false);

  useEffect(() => {
    if (status === Status.CONNECTING) {
      setHasPendingConnect(true);
      return;
    }

    if (status === Status.CONNECTED && hasPendingConnect) {
      setHasPendingConnect(false);
      onConnected?.();
      return;
    }

    if (status === Status.DISCONNECTED || status === Status.ERROR) {
      setHasPendingConnect(false);
    }
  }, [hasPendingConnect, onConnected, status]);

  const handleConnect = () => {
    clearError();
    void connect();
  };

  const handleModeChange = (newMode: ConnectionMode) => {
    if (isConnected || isConnecting) {
      return;
    }

    clearError();
    setMode(newMode);
  };

  const handleDisconnect = () => {
    void disconnect();
    clearError();
    setHasPendingConnect(false);
  };

  const isConnected = status === Status.CONNECTED;
  const isConnecting = status === Status.CONNECTING;

  return (
    <Card
      title={t("connection.title")}
      description="Select one of the supported runtime modes and connect"
    >
      <div className="space-y-4">
        <div className="pb-4 border-b border-[var(--border-primary)]">
          <label className="block text-sm font-medium text-[var(--text-secondary)] mb-3">
            {t("connection.mode")}
          </label>
          <div className="grid grid-cols-1 gap-2">
            <ModeCard
              active={isUnityMode}
              disabled={isConnected || isConnecting}
              title="Unity"
              description="Embedded Unity WebGL runtime"
              accent="primary"
              onClick={() => handleModeChange(ConnectionMode.UNITY)}
            />
            <ModeCard
              active={isMavlinkMode}
              disabled={isConnected || isConnecting}
              title="MAVLink"
              description="Real drone connection over UDP or Serial"
              accent="orange"
              onClick={() => handleModeChange(ConnectionMode.MAVLINK)}
            />
            <ModeCard
              active={isTestMode}
              disabled={isConnected || isConnecting}
              title="Test"
              description="Local simulator for Blockly validation"
              accent="blue"
              onClick={() => handleModeChange(ConnectionMode.TEST)}
            />
          </div>
        </div>

        <div className="flex items-center justify-between pb-4 border-b border-[var(--border-primary)]">
          <span className="text-sm font-medium text-[var(--text-secondary)]">
            Status:
          </span>
          <ConnectionStatus status={status} />
        </div>

        {isUnityMode && !isConnected && (
          <>
            <div className="bg-primary-50 border border-primary-200 rounded-lg p-3">
              <p className="text-sm text-primary-900">
                🎮 <strong>Unity WebGL</strong>
              </p>
              <p className="text-xs text-primary-700 mt-1">
                Connect to the embedded Unity runtime already loaded in the app.
              </p>
            </div>

            <Button
              variant="primary"
              fullWidth
              onClick={handleConnect}
              disabled={isConnecting}
            >
              {isConnecting ? "Connecting..." : "Connect Unity"}
            </Button>
          </>
        )}

        {isMavlinkMode && !isConnected && (
          <>
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
              <p className="text-sm text-orange-800">
                🔧 <strong>{t("connection.mavlink.title")}</strong>
              </p>
              <p className="text-xs text-orange-700 mt-1">
                {t("connection.mavlink.description")}
              </p>
            </div>

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
                    setMavlinkPort(parseInt(e.target.value, 10) || 14550)
                  }
                  placeholder="14550"
                  helperText="UDP target port for SITL or hardware telemetry"
                />
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <p className="text-sm text-blue-800 font-medium">
                    💡 {t("connection.mavlink.info.udpTitle")}
                  </p>
                  <p className="text-xs text-blue-700 mt-1">
                    {t("connection.mavlink.info.udpDescription")}
                  </p>
                  <p className="text-xs text-blue-600 mt-2 font-medium">
                    {t("connection.mavlink.info.requiresBridge")}
                  </p>
                </div>
              </>
            )}

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
                      setMavlinkBaudRate(parseInt(e.target.value, 10))
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

            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                Formation Control Mode
              </label>
              <div className="grid grid-cols-1 gap-2">
                <button
                  onClick={() =>
                    setFormationMode(FormationControlMode.GCS_COORDINATED)
                  }
                  className={`p-3 rounded-lg border-2 text-left transition-all ${
                    formationMode === FormationControlMode.GCS_COORDINATED
                      ? "border-orange-600 bg-orange-50"
                      : "border-[var(--border-primary)] hover:border-[var(--border-secondary)]"
                  }`}
                >
                  <div className="font-medium text-[var(--text-primary)]">
                    GCS Coordinated
                  </div>
                  <div className="text-xs text-[var(--text-secondary)]">
                    The GCS computes individual target positions per drone.
                  </div>
                </button>
                <button
                  onClick={() =>
                    setFormationMode(FormationControlMode.VIRTUAL_LEADER)
                  }
                  className={`p-3 rounded-lg border-2 text-left transition-all ${
                    formationMode === FormationControlMode.VIRTUAL_LEADER
                      ? "border-orange-600 bg-orange-50"
                      : "border-[var(--border-primary)] hover:border-[var(--border-secondary)]"
                  }`}
                >
                  <div className="font-medium text-[var(--text-primary)]">
                    Virtual Leader
                  </div>
                  <div className="text-xs text-[var(--text-secondary)]">
                    Keep the existing virtual leader formation logic available.
                  </div>
                </button>
              </div>
            </div>

            <Button
              fullWidth
              onClick={handleConnect}
              disabled={isConnecting}
              className="!bg-orange-600 hover:!bg-orange-700 !text-white"
            >
              {isConnecting
                ? "Connecting..."
                : `Connect (${mavlinkTransportType.toUpperCase()})`}
            </Button>
          </>
        )}

        {isTestMode && !isConnected && (
          <>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-sm text-blue-800">
                🧪 <strong>Test Mode Enabled</strong>
              </p>
              <p className="text-xs text-blue-700 mt-1">
                Run Blockly scenarios against the local simulator without
                hardware or Unity transport.
              </p>
            </div>

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
                Select how many drones the local simulator should spawn.
              </p>
            </div>

            <Button
              fullWidth
              onClick={handleConnect}
              disabled={isConnecting}
              className="!bg-blue-600 hover:!bg-blue-700 !text-white"
            >
              {isConnecting ? "Connecting..." : "Connect Test Mode"}
            </Button>
          </>
        )}

        {error && (
          <div className="bg-danger/10 border border-danger rounded-lg p-3">
            <p className="text-sm text-danger-dark font-medium">{error}</p>
          </div>
        )}

        {isConnected && (
          <div className="bg-success/10 border border-success rounded-lg p-3">
            <p className="text-sm text-success-dark">
              {isUnityMode ? (
                <>
                  🎮 <strong>Unity Ready</strong> - Embedded simulator connected
                </>
              ) : isMavlinkMode ? (
                <>
                  🔧 <strong>MAVLink Connected</strong> - Real drone transport
                  active
                </>
              ) : (
                <>
                  🧪 <strong>Test Mode Active</strong> - Local simulator ready
                </>
              )}
            </p>
          </div>
        )}

        {isConnected && (
          <Button variant="danger" fullWidth onClick={handleDisconnect}>
            {t("connection.disconnect")}
          </Button>
        )}
      </div>
    </Card>
  );
}

interface ModeCardProps {
  active: boolean;
  disabled: boolean;
  title: string;
  description: string;
  accent: "primary" | "orange" | "blue";
  onClick: () => void;
}

function ModeCard({
  active,
  disabled,
  title,
  description,
  accent,
  onClick,
}: ModeCardProps) {
  const accentClasses = {
    primary: active
      ? "border-primary-600 bg-primary-50"
      : "border-[var(--border-primary)] hover:border-[var(--border-secondary)]",
    orange: active
      ? "border-orange-600 bg-orange-50"
      : "border-[var(--border-primary)] hover:border-[var(--border-secondary)]",
    blue: active
      ? "border-blue-600 bg-blue-50"
      : "border-[var(--border-primary)] hover:border-[var(--border-secondary)]",
  }[accent];

  const radioClasses = {
    primary: active ? "border-primary-600" : "border-[var(--border-secondary)]",
    orange: active ? "border-orange-600" : "border-[var(--border-secondary)]",
    blue: active ? "border-blue-600" : "border-[var(--border-secondary)]",
  }[accent];

  const dotClasses = {
    primary: "bg-primary-600",
    orange: "bg-orange-600",
    blue: "bg-blue-600",
  }[accent];

  const textClasses = active ? "text-blue-800" : "text-white";

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`p-3 rounded-lg border-2 text-left transition-all disabled:opacity-50 disabled:cursor-not-allowed ${accentClasses}`}
    >
      <div className="flex items-center gap-2">
        <div
          className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${radioClasses}`}
        >
          {active && <div className={`w-2 h-2 rounded-full ${dotClasses}`} />}
        </div>
        <div>
          <div className={`font-medium ${textClasses}`}>{title}</div>
          <div className={`text-xs ${textClasses}`}>
            {description}
          </div>
        </div>
      </div>
    </button>
  );
}
