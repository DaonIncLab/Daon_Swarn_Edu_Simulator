/**
 * Recording Panel Component
 *
 * UI for managing flight recordings (save/load/delete/export/import)
 */

import { useState, useRef } from 'react'
import { useFlightRecordingStore } from '@/stores/useFlightRecordingStore'
import { useTelemetryStore } from '@/stores/useTelemetryStore'

export function RecordingPanel() {
  const {
    recordings,
    saveRecording,
    deleteRecording,
    renameRecording,
    exportRecording,
    importRecording,
    startPlayback,
  } = useFlightRecordingStore()

  const { history, isRecording, startRecording, stopRecording } = useTelemetryStore()

  const [showSaveDialog, setShowSaveDialog] = useState(false)
  const [recordingName, setRecordingName] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingName, setEditingName] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleSaveCurrentRecording = () => {
    if (!recordingName.trim()) {
      alert('녹화 이름을 입력해주세요')
      return
    }

    saveRecording(recordingName, history)
    setShowSaveDialog(false)
    setRecordingName('')
  }

  const handleDelete = (id: string) => {
    if (confirm('이 녹화를 삭제하시겠습니까?')) {
      deleteRecording(id)
    }
  }

  const handleExport = (id: string) => {
    const json = exportRecording(id)
    if (!json) {
      alert('녹화 내보내기 실패')
      return
    }

    // Download as JSON file
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `flight-recording-${id}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleImport = () => {
    fileInputRef.current?.click()
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      const json = event.target?.result as string
      const success = importRecording(json)
      if (success) {
        alert('녹화를 성공적으로 가져왔습니다')
      } else {
        alert('녹화 가져오기 실패')
      }
    }
    reader.readAsText(file)

    // Reset input
    e.target.value = ''
  }

  const handleRename = (id: string) => {
    if (!editingName.trim()) {
      setEditingId(null)
      return
    }

    renameRecording(id, editingName)
    setEditingId(null)
    setEditingName('')
  }

  const handleLoad = (id: string) => {
    const recording = recordings.find((r) => r.id === id)
    if (recording) {
      startPlayback(recording)
    }
  }

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const formatDuration = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000)
    const minutes = Math.floor(totalSeconds / 60)
    const seconds = totalSeconds % 60
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  }

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Header */}
      <div className="px-6 py-4 bg-white border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">비행 경로 녹화</h3>
          <div className="flex items-center gap-2">
            <button
              onClick={isRecording ? stopRecording : startRecording}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                isRecording
                  ? 'bg-red-600 hover:bg-red-700 text-white'
                  : 'bg-green-600 hover:bg-green-700 text-white'
              }`}
            >
              {isRecording ? '⏹ 녹화 중지' : '⏺ 녹화 시작'}
            </button>
            {history.size > 0 && (
              <button
                onClick={() => setShowSaveDialog(true)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
              >
                💾 저장
              </button>
            )}
            <button
              onClick={handleImport}
              className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-medium transition-colors"
            >
              📥 가져오기
            </button>
          </div>
        </div>

        {/* Recording Status */}
        {isRecording && (
          <div className="mt-3 flex items-center gap-2 text-sm text-red-600">
            <span className="animate-pulse">🔴</span>
            <span className="font-medium">녹화 중... ({history.size} 드론)</span>
          </div>
        )}
      </div>

      {/* Recordings List */}
      <div className="flex-1 overflow-y-auto p-6">
        {recordings.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-400">
            <div className="text-center">
              <div className="text-6xl mb-4">📹</div>
              <p className="text-lg font-medium">저장된 녹화가 없습니다</p>
              <p className="text-sm mt-2">
                드론을 연결하고 비행을 녹화하세요
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {recordings.map((recording) => (
              <div
                key={recording.id}
                className="bg-white rounded-lg border border-gray-200 p-4 hover:border-blue-500 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    {/* Name */}
                    {editingId === recording.id ? (
                      <input
                        type="text"
                        value={editingName}
                        onChange={(e) => setEditingName(e.target.value)}
                        onBlur={() => handleRename(recording.id)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleRename(recording.id)
                          if (e.key === 'Escape') setEditingId(null)
                        }}
                        className="px-2 py-1 border border-blue-500 rounded text-lg font-semibold text-gray-900 w-full"
                        autoFocus
                      />
                    ) : (
                      <h4
                        className="text-lg font-semibold text-gray-900 cursor-pointer hover:text-blue-600"
                        onClick={() => {
                          setEditingId(recording.id)
                          setEditingName(recording.name)
                        }}
                      >
                        {recording.name}
                      </h4>
                    )}

                    {/* Metadata */}
                    <div className="mt-2 space-y-1 text-sm text-gray-600">
                      <div>
                        📅 {formatDate(recording.timestamp)}
                      </div>
                      <div>
                        ⏱️ {formatDuration(recording.duration)} | 🚁 {recording.metadata?.droneCount || 0} 드론
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col gap-2 ml-4">
                    <button
                      onClick={() => handleLoad(recording.id)}
                      className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm font-medium transition-colors"
                    >
                      ▶ 재생
                    </button>
                    <button
                      onClick={() => handleExport(recording.id)}
                      className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white rounded text-sm font-medium transition-colors"
                    >
                      📤 내보내기
                    </button>
                    <button
                      onClick={() => handleDelete(recording.id)}
                      className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-sm font-medium transition-colors"
                    >
                      🗑️ 삭제
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Save Dialog */}
      {showSaveDialog && (
        <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-96">
            <h4 className="text-lg font-semibold text-gray-900 mb-4">녹화 저장</h4>
            <input
              type="text"
              value={recordingName}
              onChange={(e) => setRecordingName(e.target.value)}
              placeholder="녹화 이름 입력..."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSaveCurrentRecording()
                if (e.key === 'Escape') setShowSaveDialog(false)
              }}
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowSaveDialog(false)}
                className="px-4 py-2 bg-gray-300 hover:bg-gray-400 text-gray-900 rounded-lg font-medium transition-colors"
              >
                취소
              </button>
              <button
                onClick={handleSaveCurrentRecording}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
              >
                저장
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Hidden file input for import */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        onChange={handleFileChange}
        className="hidden"
      />
    </div>
  )
}
