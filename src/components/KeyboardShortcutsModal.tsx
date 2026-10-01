import React from 'react';
import { X, Command, Keyboard } from 'lucide-react';

export interface ShortcutItem {
  keys: string[];
  description: string;
  category: 'General' | 'Navigation' | 'Workflow Builder' | 'Collector & Operator';
}

export const GLOBAL_SHORTCUTS: ShortcutItem[] = [
  // General & Creation
  { keys: ['Ctrl', 'N'], description: 'Create new workflow (or Cmd+N)', category: 'General' },
  { keys: ['Ctrl', 'S'], description: 'Save current workflow / draft (or Cmd+S)', category: 'General' },
  { keys: ['Ctrl', 'Shift', 'P'], description: 'Publish active workflow version', category: 'Workflow Builder' },
  { keys: ['Ctrl', 'Shift', 'A'], description: 'Open AI Workflow Generator modal', category: 'General' },
  { keys: ['Ctrl', 'K'], description: 'Focus quick command / shortcuts help', category: 'General' },
  { keys: ['?'], description: 'Open Keyboard Shortcuts sheet', category: 'General' },
  { keys: ['Esc'], description: 'Close modals, drawers, or sheets', category: 'General' },

  // Navigation
  { keys: ['G', 'D'], description: 'Go to Main Dashboard', category: 'Navigation' },
  { keys: ['G', 'W'], description: 'Go to Workflows list', category: 'Navigation' },
  { keys: ['G', 'S'], description: 'Go to Submissions repository', category: 'Navigation' },
  { keys: ['G', 'O'], description: 'Go to Operator Counter intake mode', category: 'Navigation' },
  { keys: ['G', 'A'], description: 'Go to Analytics & Metrics', category: 'Navigation' },
  { keys: ['G', 'T'], description: 'Go to Scenario & Engine Testing', category: 'Navigation' },

  // Workflow Builder
  { keys: ['Alt', 'A'], description: 'Add new field in builder', category: 'Workflow Builder' },
  { keys: ['Alt', 'P'], description: 'Preview active workflow in public link view', category: 'Workflow Builder' },
];

interface KeyboardShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const KeyboardShortcutsModal: React.FC<KeyboardShortcutsModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const categories = ['General', 'Navigation', 'Workflow Builder'] as const;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl border border-zinc-200 shadow-xl max-w-lg w-full overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-zinc-100 flex items-center justify-between bg-zinc-50/60">
          <div className="flex items-center space-x-2">
            <div className="w-7 h-7 rounded-md bg-zinc-900 text-white flex items-center justify-center">
              <Keyboard className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-zinc-900">Global Keyboard Shortcuts</h2>
              <p className="text-[11px] text-zinc-500">Fast navigation & power-user hotkeys</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-md text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content list */}
        <div className="p-5 max-h-[70vh] overflow-y-auto space-y-5">
          {categories.map((cat) => {
            const items = GLOBAL_SHORTCUTS.filter((s) => s.category === cat);
            if (items.length === 0) return null;

            return (
              <div key={cat} className="space-y-2">
                <div className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400 px-1">
                  {cat}
                </div>
                <div className="divide-y divide-zinc-100 rounded-lg border border-zinc-100 bg-white overflow-hidden shadow-2xs">
                  {items.map((item, idx) => (
                    <div
                      key={idx}
                      className="px-3.5 py-2.5 flex items-center justify-between text-xs hover:bg-zinc-50/50 transition-colors"
                    >
                      <span className="text-zinc-700 font-medium">{item.description}</span>
                      <div className="flex items-center space-x-1 shrink-0">
                        {item.keys.map((k, kIdx) => (
                          <React.Fragment key={kIdx}>
                            <kbd className="px-2 py-0.5 text-[11px] font-mono font-semibold bg-zinc-100 text-zinc-800 border border-zinc-200 rounded shadow-2xs">
                              {k}
                            </kbd>
                            {kIdx < item.keys.length - 1 && item.keys.length > 1 && item.keys[0] !== 'G' && (
                              <span className="text-zinc-300 text-[10px]">+</span>
                            )}
                          </React.Fragment>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-zinc-100 bg-zinc-50/60 flex items-center justify-between text-[11px] text-zinc-500">
          <span>Press <kbd className="px-1.5 py-0.5 rounded bg-zinc-200 text-zinc-800 font-mono text-[10px]">Esc</kbd> or <kbd className="px-1.5 py-0.5 rounded bg-zinc-200 text-zinc-800 font-mono text-[10px]">?</kbd> to toggle</span>
          <span className="font-mono text-zinc-400">CollectAI OS</span>
        </div>
      </div>
    </div>
  );
};
