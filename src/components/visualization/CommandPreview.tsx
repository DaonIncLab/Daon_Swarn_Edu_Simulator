import { useState } from "react";
import { useExecutionStore } from "@/stores/useExecutionStore";
import { Button } from "@/components/common/Button";
import { collectScenarioSteps } from "@/services/execution";

export function CommandPreview() {
  const { scenarioPlan, scenarioSummary, currentNodeId, commands } =
    useExecutionStore();
  const [isExpanded, setIsExpanded] = useState(true);
  const [showRaw, setShowRaw] = useState(false);

  const nodes = collectScenarioSteps(scenarioPlan);

  const copyToClipboard = () => {
    const json = JSON.stringify(commands, null, 2);
    navigator.clipboard.writeText(json);
  };

  const renderNode = (node: (typeof nodes)[number], index: number) => {
    const isCurrent = currentNodeId === node.id;
    return (
      <div
        key={`${node.id}-${index}`}
        className={`p-3 rounded-lg border ${
          isCurrent ? "bg-primary-50 border-primary-300" : "bg-white border-gray-200"
        }`}
        style={{ marginLeft: `${node.depth * 12}px` }}
      >
        <div className="text-xs font-mono text-gray-500 mb-1">#{index + 1}</div>
        <div className="text-sm font-semibold text-gray-900">{node.label}</div>
        <div className="text-xs text-gray-600 mt-1">{node.nodeType}</div>
      </div>
    );
  };

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden">
      <div className="bg-gradient-to-r from-indigo-500 to-purple-600 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl">📋</span>
            <h3 className="text-lg font-semibold text-white">Scenario Preview</h3>
          </div>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-white hover:bg-white/20 rounded-lg px-3 py-1 transition-colors"
          >
            {isExpanded ? "▼" : "▶"}
          </button>
        </div>

        {isExpanded && (
          <div className="mt-3 flex items-center gap-2">
            <span className="text-sm text-white/90">
              {scenarioSummary.totalNodes} nodes / {scenarioSummary.commandNodes} executable
            </span>
            {commands.length > 0 && (
              <>
                <span className="text-white/50">•</span>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setShowRaw(!showRaw)}
                  className="!bg-white/20 !text-white hover:!bg-white/30 !border-white/30"
                >
                  {showRaw ? "Scenario" : "{ } Runtime JSON"}
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={copyToClipboard}
                  className="!bg-white/20 !text-white hover:!bg-white/30 !border-white/30"
                >
                  📄 Copy
                </Button>
              </>
            )}
          </div>
        )}
      </div>

      {isExpanded && (
        <div className="p-4">
          {scenarioSummary.totalNodes === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <div className="text-4xl mb-2">🎯</div>
              <p className="text-sm">No scenario yet</p>
              <p className="text-xs mt-1">
                Create blocks in the workspace to build a scenario plan
              </p>
            </div>
          ) : showRaw ? (
            <div className="bg-gray-900 rounded-lg p-4 overflow-auto max-h-96">
              <pre className="text-xs text-green-400 font-mono">
                {JSON.stringify(commands, null, 2)}
              </pre>
            </div>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {nodes.map(renderNode)}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
