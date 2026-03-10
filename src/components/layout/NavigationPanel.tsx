/**
 * Navigation Panel Component
 *
 * Left sidebar navigation with:
 * - Quick action buttons (Project, Settings, Monitoring)
 * - Blockly block categories
 */

export interface Category {
  id: string;
  name: string;
  icon?: string;
  colour: string;
}

// MAVLink Drone SDK 기반 블록 카테고리
// eslint-disable-next-line react-refresh/only-export-components
export const blockCategories: Category[] = [
  { id: "flight", name: "🚁 비행 제어", colour: "230" },
  { id: "movement", name: "➡️ 이동", colour: "160" },
  { id: "group", name: " 🔂 그룹", colour: "250" },
  { id: "rc", name: "🎮 RC 제어", colour: "290" },
  { id: "sensors", name: "📊 센서", colour: "120" },
  { id: "mission", name: "🗺️ 미션", colour: "60" },
  { id: "settings", name: "⚙️ 설정", colour: "330" },
  { id: "sync", name: "⏱️ 대기", colour: "120" },
  { id: "control", name: "🔁 제어 흐름", colour: "210" },
  { id: "variables", name: "📦 변수", colour: "330" },
];

interface NavigationPanelProps {
  className?: string;
  selectedCategory: string;
  onCategorySelect: (categoryId: string) => void;
  onOpenProject: () => void;
  onOpenSettings: () => void;
  onOpenMonitoring: () => void;
  isConnected: boolean;
}

export function NavigationPanel({
  className = "",
  selectedCategory,
  onCategorySelect,
  onOpenProject,
  onOpenSettings,
  onOpenMonitoring,
  isConnected,
}: NavigationPanelProps) {
  return (
    <div
      className={`flex flex-col bg-[var(--bg-tertiary)] border-r border-[var(--border-primary)] ${className}`}
    >
      {/* Header */}
      <div className="px-4 py-3 border-b border-[var(--border-primary)] flex-shrink-0">
        <h2 className="text-sm font-semibold text-[var(--text-primary)]">
          메뉴
        </h2>
      </div>

      {/* Quick Actions */}
      <div className="px-2 py-3 border-b border-[var(--border-primary)] space-y-1 flex-shrink-0">
        <button
          onClick={onOpenProject}
          className="w-full flex items-center gap-3 px-3 py-2 text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] rounded-lg transition-colors"
          title="프로젝트"
        >
          <span className="text-lg">📦</span>
          <span className="font-medium">프로젝트</span>
        </button>

        <button
          onClick={onOpenSettings}
          className="w-full flex items-center gap-3 px-3 py-2 text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] rounded-lg transition-colors"
          title="설정"
        >
          <span className="text-lg">⚙️</span>
          <span className="font-medium">설정</span>
        </button>

        {isConnected && (
          <button
            onClick={onOpenMonitoring}
            className="w-full flex items-center gap-3 px-3 py-2 text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] rounded-lg transition-colors"
            title="모니터링"
          >
            <span className="text-lg">📊</span>
            <span className="font-medium">모니터링</span>
          </button>
        )}
      </div>

      {/* Block Categories */}
      <div className="flex-1 overflow-y-auto">
        <div className="px-2 py-3">
          <h3 className="px-3 text-xs font-semibold text-[var(--text-tertiary)] uppercase tracking-wide mb-2">
            블록 카테고리
          </h3>
          <div className="space-y-1">
            {blockCategories.map((category) => (
              <button
                key={category.id}
                onClick={() => onCategorySelect(category.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm rounded-lg transition-all ${
                  selectedCategory === category.id
                    ? "bg-[var(--nav-active-bg)] text-[var(--nav-active-text)] font-semibold border-l-4 border-[var(--nav-active-border)]"
                    : "text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]"
                }`}
                title={category.name}
              >
                <span className="text-left flex-1">{category.name}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Footer Info */}
      <div className="px-4 py-3 border-t border-[var(--border-primary)] flex-shrink-0">
        <p className="text-xs text-[var(--text-tertiary)] text-center">
          {isConnected ? (
            <span className="flex items-center justify-center gap-1.5">
              <span className="w-2 h-2 bg-[var(--status-online)] rounded-full animate-pulse"></span>
              <span>연결됨</span>
            </span>
          ) : (
            <span className="flex items-center justify-center gap-1.5">
              <span className="w-2 h-2 bg-[var(--status-offline)] rounded-full"></span>
              <span>연결 안 됨</span>
            </span>
          )}
        </p>
      </div>
    </div>
  );
}
