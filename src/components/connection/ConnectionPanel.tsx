import { useState, useEffect } from 'react'
import { useConnectionStore } from '@/stores/useConnectionStore'
import { ConnectionStatus as Status } from '@/constants/connection'
import { ConnectionMode } from '@/services/connection'
import { Card } from '@/components/common/Card'
import { Button } from '@/components/common/Button'
import { Input } from '@/components/common/Input'
import { ConnectionStatus } from './ConnectionStatus'

export function ConnectionPanel() {
  const {
    status,
    mode,
    ipAddress,
    port,
    error,
    testModeDroneCount,
    setMode,
    setIpAddress,
    setPort,
    setTestModeDroneCount,
    connect,
    disconnect,
    clearError,
  } = useConnectionStore()

  const isTestMode = mode === ConnectionMode.TEST
  const isSimMode = mode === ConnectionMode.SIMULATION
  const isUnityWebGLMode = mode === ConnectionMode.UNITY_WEBGL

  const [localIp, setLocalIp] = useState(ipAddress)
  const [localPort, setLocalPort] = useState(port.toString())
  const [ipError, setIpError] = useState<string>('')

  useEffect(() => {
    setLocalIp(ipAddress)
  }, [ipAddress])

  useEffect(() => {
    setLocalPort(port.toString())
  }, [port])

  const validateIpAddress = (ip: string): boolean => {
    if (!ip) {
      setIpError('IP address is required')
      return false
    }

    // Simple IP validation (IPv4)
    const ipPattern = /^(\d{1,3}\.){3}\d{1,3}$/
    if (!ipPattern.test(ip)) {
      setIpError('Invalid IP address format')
      return false
    }

    // Check each octet is 0-255
    const octets = ip.split('.')
    for (const octet of octets) {
      const num = parseInt(octet, 10)
      if (num < 0 || num > 255) {
        setIpError('IP address octets must be 0-255')
        return false
      }
    }

    setIpError('')
    return true
  }

  const handleConnect = () => {
    clearError()

    // 테스트 모드 또는 Unity WebGL 모드면 바로 연결
    if (isTestMode || isUnityWebGLMode) {
      connect()
      return
    }

    // WebSocket 모드는 IP 검증 필요
    if (!validateIpAddress(localIp)) {
      return
    }

    const portNum = parseInt(localPort, 10)
    if (isNaN(portNum) || portNum < 1 || portNum > 65535) {
      setIpError('Port must be between 1 and 65535')
      return
    }

    setIpAddress(localIp)
    setPort(portNum)
    connect()
  }

  const handleModeChange = (newMode: ConnectionMode) => {
    if (isConnected || isConnecting) {
      return
    }

    setMode(newMode)
    // 사용자가 설정을 마친 후 수동으로 Connect 버튼을 클릭하도록 함
  }

  const handleDisconnect = () => {
    disconnect()
    clearError()
    setIpError('')
  }

  const isConnected = status === Status.CONNECTED
  const isConnecting = status === Status.CONNECTING

  return (
    <Card
      title="Unity Connection"
      description="Select connection mode and configure settings"
    >
      <div className="space-y-4">
        {/* Mode Selector */}
        <div className="pb-4 border-b border-gray-200">
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Connection Mode
          </label>
          <div className="grid grid-cols-1 gap-2">
            {/* WebSocket Mode */}
            <button
              onClick={() => handleModeChange(ConnectionMode.SIMULATION)}
              disabled={isConnected || isConnecting}
              className={`p-3 rounded-lg border-2 text-left transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                isSimMode
                  ? 'border-primary-600 bg-primary-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center gap-2">
                <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                  isSimMode ? 'border-primary-600' : 'border-gray-300'
                }`}>
                  {isSimMode && <div className="w-2 h-2 rounded-full bg-primary-600" />}
                </div>
                <div>
                  <div className="font-medium text-gray-900">WebSocket Server</div>
                  <div className="text-xs text-gray-600">Connect to separate Unity server</div>
                </div>
              </div>
            </button>

            {/* Unity WebGL Mode */}
            <button
              onClick={() => handleModeChange(ConnectionMode.UNITY_WEBGL)}
              disabled={isConnected || isConnecting}
              className={`p-3 rounded-lg border-2 text-left transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                isUnityWebGLMode
                  ? 'border-primary-600 bg-primary-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center gap-2">
                <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                  isUnityWebGLMode ? 'border-primary-600' : 'border-gray-300'
                }`}>
                  {isUnityWebGLMode && <div className="w-2 h-2 rounded-full bg-primary-600" />}
                </div>
                <div>
                  <div className="font-medium text-gray-900">Unity WebGL Embed</div>
                  <div className="text-xs text-gray-600">Built-in Unity simulator</div>
                </div>
              </div>
            </button>

            {/* Test Mode */}
            <button
              onClick={() => handleModeChange(ConnectionMode.TEST)}
              disabled={isConnected || isConnecting}
              className={`p-3 rounded-lg border-2 text-left transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                isTestMode
                  ? 'border-primary-600 bg-primary-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center gap-2">
                <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                  isTestMode ? 'border-primary-600' : 'border-gray-300'
                }`}>
                  {isTestMode && <div className="w-2 h-2 rounded-full bg-primary-600" />}
                </div>
                <div>
                  <div className="font-medium text-gray-900">🧪 Test Mode</div>
                  <div className="text-xs text-gray-600">Dummy mode (no Unity)</div>
                </div>
              </div>
            </button>
          </div>
        </div>

        {/* Connection Status */}
        <div className="flex items-center justify-between pb-4 border-b border-gray-200">
          <span className="text-sm font-medium text-gray-700">Status:</span>
          <ConnectionStatus status={status} />
        </div>

        {/* Test Mode Settings */}
        {isTestMode && !isConnected && (
          <>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-sm text-blue-800">
                🧪 <strong>Test Mode Enabled</strong>
              </p>
              <p className="text-xs text-blue-700 mt-1">
                You can test the Blockly workspace without Unity. Configure settings below.
              </p>
            </div>

            {/* Drone Count Selector */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Number of Drones: <span className="text-blue-600 font-bold">{testModeDroneCount}</span>
              </label>
              <div className="grid grid-cols-4 gap-2">
                {[2, 4, 6, 8].map((count) => (
                  <button
                    key={count}
                    onClick={() => setTestModeDroneCount(count)}
                    className={`py-2 px-3 rounded-lg border-2 font-medium transition-all ${
                      testModeDroneCount === count
                        ? 'border-blue-600 bg-blue-50 text-blue-700'
                        : 'border-gray-200 hover:border-gray-300 text-gray-700'
                    }`}
                  >
                    {count}
                  </button>
                ))}
              </div>
              <p className="text-xs text-gray-600 mt-2">
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
                {isConnecting ? 'Connecting...' : 'Connect (Test Mode)'}
              </button>
            </div>
          </>
        )}

        {isUnityWebGLMode && !isConnected && (
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
            <p className="text-sm text-purple-800">
              🎮 <strong>Unity WebGL Mode</strong>
            </p>
            <p className="text-xs text-purple-700 mt-1">
              Unity simulator will be embedded in the app. Make sure Unity build files are in <code className="bg-purple-100 px-1 rounded">public/unity/Build/</code>
            </p>
          </div>
        )}

        {/* IP Address Input - Only for WebSocket Mode */}
        {isSimMode && !isConnected && (
          <>
            <Input
              label="Unity Server IP Address"
              type="text"
              placeholder="192.168.0.100"
              value={localIp}
              onChange={(e) => {
                setLocalIp(e.target.value)
                setIpError('')
                clearError()
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
                setLocalPort(e.target.value)
                setIpError('')
                clearError()
              }}
              disabled={isConnected || isConnecting}
              helperText="Default: 8080"
            />
          </>
        )}

        {/* Error Message */}
        {error && !ipError && (
          <div className="bg-danger/10 border border-danger rounded-lg p-3">
            <p className="text-sm text-danger-dark font-medium">
              {error}
            </p>
          </div>
        )}

        {/* Connection Info when connected */}
        {isConnected && (
          <div className="bg-success/10 border border-success rounded-lg p-3">
            <p className="text-sm text-success-dark">
              {isTestMode ? (
                <>🧪 <strong>Test Mode Active</strong> - Blockly workspace ready</>
              ) : isUnityWebGLMode ? (
                <>🎮 <strong>Unity WebGL Ready</strong> - Simulator loaded</>
              ) : (
                <>Connected to <span className="font-mono font-semibold">{ipAddress}:{port}</span></>
              )}
            </p>
          </div>
        )}

        {/* Connect/Disconnect Button - Not for Test Mode (has its own button above) */}
        {!isTestMode && (
          <div className="flex gap-2">
            {!isConnected ? (
              <Button
                variant="primary"
                fullWidth
                onClick={handleConnect}
                disabled={isConnecting}
              >
                {isConnecting ? 'Connecting...' : 'Connect'}
              </Button>
            ) : (
              <Button
                variant="danger"
                fullWidth
                onClick={handleDisconnect}
              >
                Disconnect
            </Button>
            )}
          </div>
        )}

        {/* Disconnect Button for Test Mode */}
        {isTestMode && isConnected && (
          <div className="flex gap-2">
            <Button
              variant="danger"
              fullWidth
              onClick={handleDisconnect}
            >
              Disconnect
            </Button>
          </div>
        )}

        {/* Quick Connect Buttons - Only in WebSocket Mode */}
        {isSimMode && !isConnected && !isConnecting && (
          <div className="pt-4 border-t border-gray-200">
            <p className="text-xs text-gray-600 mb-2">Quick Connect:</p>
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  setLocalIp('localhost')
                  setIpError('')
                }}
              >
                Localhost
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  setLocalIp('192.168.0.100')
                  setIpError('')
                }}
              >
                192.168.0.100
              </Button>
            </div>
          </div>
        )}
      </div>
    </Card>
  )
}
