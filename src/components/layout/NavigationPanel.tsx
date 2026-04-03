/**
 * Navigation Panel Component
 *
 * Left sidebar navigation with Blockly block categories
 */
import {
  categories as blockCategories,
  type BlocklyCategoryId,
} from "@/components/blockly/toolbox";

export interface Category {
  id: BlocklyCategoryId;
  name: string;
  icon?: string;
  colour: string;
}

interface NavigationPanelProps {
  className?: string;
  selectedCategory: BlocklyCategoryId;
  onCategorySelect: (categoryId: BlocklyCategoryId) => void;
}

export function NavigationPanel({
  className = "",
  selectedCategory,
  onCategorySelect,
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

    </div>
  );
}
