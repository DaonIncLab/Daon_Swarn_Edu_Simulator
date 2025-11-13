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
    setMode,
    setIpAddress,
    setPort,
    connect,
    disconnect,
    clearError,
  } = useConnectionStore()

  const isTestMode = mode === ConnectionMode.TEST
  const isSimMode = mode === ConnectionMode.SIMULATION

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

    // 테스트 모드면 바로 연결
    if (isTestMode) {
      connect()
      return
    }

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

  const handleToggleMode = () => {
    if (isConnected || isConnecting) {
      return
    }

    // Test ↔ Simulation 모드 토글
    const newMode = isTestMode ? ConnectionMode.SIMULATION : ConnectionMode.TEST
    setMode(newMode)

    // 테스트 모드로 전환 시 자동 연결
    if (newMode === ConnectionMode.TEST) {
      setTimeout(() => {
        connect()
      }, 100)
    }
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
      description="Connect to Unity Control Server via WebSocket"
    >
      <div className="space-y-4">
        {/* Mode Toggle */}
        <div className="flex items-center justify-between pb-4 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="test-mode"
              checked={isTestMode}
              onChange={handleToggleMode}
              disabled={isConnected || isConnecting}
              className="w-4 h-4 text-primary-600 bg-gray-100 border-gray-300 rounded focus:ring-primary-500 focus:ring-2 disabled:opacity-50"
            />
            <label
              htmlFor="test-mode"
              className="text-sm font-medium text-gray-700 select-none cursor-pointer"
            >
              🧪 Test Mode (No Unity Server)
            </label>
          </div>
        </div>

        {/* Connection Status */}
        <div className="flex items-center justify-between pb-4 border-b border-gray-200">
          <span className="text-sm font-medium text-gray-700">Status:</span>
          <ConnectionStatus status={status} />
        </div>

        {/* Test Mode Info */}
        {isTestMode && !isConnected && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-sm text-blue-800">
              🧪 <strong>Test Mode Enabled</strong>
            </p>
            <p className="text-xs text-blue-700 mt-1">
              You can test the Blockly workspace without connecting to Unity server.
              Click "Connect" to start testing.
            </p>
          </div>
        )}

        {/* IP Address Input - Hidden in Test Mode */}
        {!isTestMode && (
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
                <>🧪 <strong>Test Mode Active</strong> - Blockly workspace ready for testing</>
              ) : (
                <>Connected to <span className="font-mono font-semibold">{ipAddress}:{port}</span></>
              )}
            </p>
          </div>
        )}

        {/* Connect/Disconnect Button */}
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

        {/* Quick Connect Buttons - Only in Simulation Mode */}
        {!isTestMode && !isConnected && !isConnecting && (
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
