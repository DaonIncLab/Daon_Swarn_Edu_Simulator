import { ConnectionPanel } from '@/components/connection'
import { BlocklyWorkspace, ExecutionPanel } from '@/components/blockly'
import { CommandPreview, ExecutionLog, DroneStatus } from '@/components/visualization'
import { useConnectionStore } from '@/stores/useConnectionStore'
import { ConnectionStatus } from '@/constants/connection'

function App() {
  const { status } = useConnectionStore()
  const isConnected = status === ConnectionStatus.CONNECTED

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Drone Swarm Simulator
              </h1>
              <p className="text-sm text-gray-600">
                Google Blockly ↔ Unity Integration
              </p>
            </div>
            {/* Status Badge in Header */}
            <div className="flex items-center gap-2 px-4 py-2 bg-gray-50 rounded-lg">
              <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-success animate-pulse' : 'bg-gray-400'}`} />
              <span className="text-sm font-medium text-gray-700">
                {isConnected ? 'Unity Connected' : 'Not Connected'}
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
          {/* Left Sidebar - Connection & Drone Status */}
          <div className="xl:col-span-3 space-y-6">
            <ConnectionPanel />
            {isConnected && <DroneStatus />}
          </div>

          {/* Center - Blockly Workspace */}
          <div className="xl:col-span-6 space-y-6">
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
                    <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    Connect to Unity First
                  </h3>
                  <p className="text-gray-600">
                    Enter your Unity server IP address in the connection panel to get started
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
                <li>Launch Unity Control Server on your PC (or enable Test Mode)</li>
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
      </main>
    </div>
  )
}

export default App

