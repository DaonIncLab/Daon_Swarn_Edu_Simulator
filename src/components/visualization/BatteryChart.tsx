/**
 * Battery Chart Component
 *
 * Real-time battery level visualization using Chart.js
 */

import { useEffect, useRef } from 'react'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  TimeScale,
  Filler,
} from 'chart.js'
import { Line } from 'react-chartjs-2'
import 'chartjs-adapter-date-fns'
import { useTelemetryStore } from '@/stores/useTelemetryStore'
import { useExecutionStore } from '@/stores/useExecutionStore'

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  TimeScale,
  Filler
)

/**
 * Battery Chart Component
 */
export function BatteryChart() {
  const { drones } = useExecutionStore()
  const { getAllHistory } = useTelemetryStore()
  const chartRef = useRef<ChartJS<'line'>>(null)

  // Generate colors for each drone
  const droneColors = [
    { border: 'rgb(59, 130, 246)', bg: 'rgba(59, 130, 246, 0.1)' }, // blue
    { border: 'rgb(16, 185, 129)', bg: 'rgba(16, 185, 129, 0.1)' }, // green
    { border: 'rgb(245, 158, 11)', bg: 'rgba(245, 158, 11, 0.1)' }, // yellow
    { border: 'rgb(239, 68, 68)', bg: 'rgba(239, 68, 68, 0.1)' }, // red
    { border: 'rgb(139, 92, 246)', bg: 'rgba(139, 92, 246, 0.1)' }, // purple
    { border: 'rgb(236, 72, 153)', bg: 'rgba(236, 72, 153, 0.1)' }, // pink
  ]

  const getColorForDrone = (index: number) => {
    return droneColors[index % droneColors.length]
  }

  // Prepare chart data
  const history = getAllHistory()
  const datasets = drones.map((drone, index) => {
    const droneHistory = history.get(drone.id)
    const color = getColorForDrone(index)

    if (!droneHistory || droneHistory.dataPoints.length === 0) {
      return {
        label: `Drone #${drone.id}`,
        data: [],
        borderColor: color.border,
        backgroundColor: color.bg,
        borderWidth: 2,
        tension: 0.4,
        pointRadius: 0,
        pointHoverRadius: 5,
      }
    }

    return {
      label: `Drone #${drone.id}`,
      data: droneHistory.dataPoints.map((point) => ({
        x: point.timestamp,
        y: point.battery,
      })),
      borderColor: color.border,
      backgroundColor: color.bg,
      borderWidth: 2,
      tension: 0.4,
      pointRadius: 0,
      pointHoverRadius: 5,
      fill: true,
    }
  })

  const chartData = {
    datasets,
  }

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index' as const,
      intersect: false,
    },
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          color: '#374151',
          font: {
            size: 12,
          },
          usePointStyle: true,
        },
      },
      title: {
        display: true,
        text: 'Battery Levels Over Time',
        color: '#111827',
        font: {
          size: 16,
          weight: 'bold' as const,
        },
      },
      tooltip: {
        callbacks: {
          label: (context: any) => {
            return `${context.dataset.label}: ${context.parsed.y.toFixed(1)}%`
          },
        },
      },
    },
    scales: {
      x: {
        type: 'time' as const,
        time: {
          unit: 'second' as const,
          displayFormats: {
            second: 'HH:mm:ss',
          },
        },
        title: {
          display: true,
          text: 'Time',
          color: '#6b7280',
        },
        ticks: {
          color: '#6b7280',
        },
        grid: {
          color: '#e5e7eb',
        },
      },
      y: {
        min: 0,
        max: 100,
        title: {
          display: true,
          text: 'Battery (%)',
          color: '#6b7280',
        },
        ticks: {
          color: '#6b7280',
          callback: (value: any) => `${value}%`,
        },
        grid: {
          color: '#e5e7eb',
        },
      },
    },
  }

  // Auto-update chart every second
  useEffect(() => {
    const interval = setInterval(() => {
      if (chartRef.current) {
        chartRef.current.update('none') // Update without animation for performance
      }
    }, 1000)

    return () => clearInterval(interval)
  }, [])

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="h-80">
        {drones.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-500">
            <div className="text-center">
              <div className="text-4xl mb-2">🔋</div>
              <p className="text-sm">No battery data available</p>
              <p className="text-xs mt-1">Connect drones to see battery levels</p>
            </div>
          </div>
        ) : (
          <Line ref={chartRef} data={chartData} options={options} />
        )}
      </div>

      {/* Battery status summary */}
      {drones.length > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {drones.map((drone, index) => {
              const color = getColorForDrone(index)
              return (
                <div
                  key={drone.id}
                  className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded"
                >
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: color.border }}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-medium text-gray-700">
                      Drone #{drone.id}
                    </div>
                    <div
                      className={`text-sm font-bold ${
                        drone.battery > 60
                          ? 'text-green-600'
                          : drone.battery > 30
                          ? 'text-yellow-600'
                          : 'text-red-600'
                      }`}
                    >
                      {drone.battery.toFixed(1)}%
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
