import React, { useState, useEffect, useRef } from 'react';
import { Sparkles, History, BookmarkCheck, ArrowRight } from 'lucide-react';

export interface SmartSuggestionItem {
  value: string;
  count?: number;
  source: 'history' | 'schema';
  badge?: string;
}

interface SmartSuggestionOverlayProps {
  currentValue: string;
  fieldKey: string;
  suggestions: SmartSuggestionItem[];
  onSelectSuggestion: (val: string) => void;
  isOpen: boolean;
  onClose: () => void;
}

export const SmartSuggestionOverlay: React.FC<SmartSuggestionOverlayProps> = ({
  currentValue,
  fieldKey,
  suggestions,
  onSelectSuggestion,
  isOpen,
  onClose,
}) => {
  const overlayRef = useRef<HTMLDivElement>(null);
  const [selectedIndex, setSelectedIndex] = useState<number>(-1);

  // Filter suggestions based on what the user has typed so far
  const filteredSuggestions = suggestions.filter((s) => {
    if (!currentValue.trim()) return true;
    return s.value.toLowerCase().includes(currentValue.toLowerCase().trim());
  });

  // Handle outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (overlayRef.current && !overlayRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [isOpen, onClose]);

  // Keyboard navigation within suggestions
  useEffect(() => {
    setSelectedIndex(-1);
  }, [currentValue, isOpen]);

  if (!isOpen || filteredSuggestions.length === 0) return null;

  return (
    <div
      ref={overlayRef}
      role="listbox"
      className="absolute left-0 right-0 top-full mt-1 z-40 bg-white rounded-lg border border-zinc-200 shadow-lg overflow-hidden animate-in fade-in slide-in-from-top-1 duration-150 max-h-56 overflow-y-auto"
    >
      <div className="px-2.5 py-1.5 bg-zinc-50 border-b border-zinc-100 flex items-center justify-between text-[10px] text-zinc-500">
        <span className="flex items-center gap-1 font-semibold text-zinc-700">
          <Sparkles className="w-3 h-3 text-indigo-600" />
          <span>Smart Proposals</span>
        </span>
        <span className="font-mono text-zinc-400">Click or tap to fill</span>
      </div>

      <div className="py-1 divide-y divide-zinc-50">
        {filteredSuggestions.map((item, idx) => {
          const isSelected = selectedIndex === idx;
          const isExact = item.value.toLowerCase() === currentValue.toLowerCase().trim();

          return (
            <button
              key={idx}
              type="button"
              onMouseDown={(e) => {
                e.preventDefault(); // Prevent input blur before click registers
                onSelectSuggestion(item.value);
              }}
              className={`w-full px-3 py-1.5 text-left text-xs flex items-center justify-between transition-colors ${
                isSelected
                  ? 'bg-zinc-100 text-zinc-900'
                  : 'hover:bg-zinc-50 text-zinc-700 hover:text-zinc-900'
              } ${isExact ? 'font-medium' : ''}`}
            >
              <div className="flex items-center space-x-2 truncate mr-2">
                {item.source === 'history' ? (
                  <History className="w-3 h-3 text-emerald-600 shrink-0" />
                ) : (
                  <BookmarkCheck className="w-3 h-3 text-indigo-500 shrink-0" />
                )}
                <span className="truncate">{item.value}</span>
              </div>

              <div className="flex items-center space-x-1.5 shrink-0">
                {item.source === 'history' && item.count && item.count > 0 ? (
                  <span className="text-[9px] font-mono text-zinc-400 bg-zinc-100 px-1.5 py-0.5 rounded">
                    {item.count} past {item.count === 1 ? 'entry' : 'entries'}
                  </span>
                ) : (
                  <span className="text-[9px] font-mono text-zinc-400 bg-zinc-100 px-1.5 py-0.5 rounded">
                    schema
                  </span>
                )}
                <ArrowRight className="w-3 h-3 text-zinc-300 opacity-60" />
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
