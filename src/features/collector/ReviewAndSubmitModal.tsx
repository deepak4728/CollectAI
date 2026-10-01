import React, { useState, useEffect } from 'react';
import { WorkflowSchema, WorkflowField, FieldState } from '../../types';
import { isFieldVisible } from '../../lib/workflowEngine';
import { api } from '../../lib/api';
import { SmartSuggestionOverlay, SmartSuggestionItem } from '../../components/SmartSuggestionOverlay';
import {
  CheckCircle2,
  AlertCircle,
  Edit2,
  Check,
  X,
  Send,
  Loader2,
  FileCheck2,
} from 'lucide-react';

interface ReviewAndSubmitModalProps {
  isOpen: boolean;
  onClose: () => void;
  workflow: WorkflowSchema;
  fieldState: Record<string, FieldState>;
  onUpdateField: (fieldKey: string, value: any) => Promise<void>;
  onConfirmSubmit: () => Promise<void>;
  isSubmitting?: boolean;
}

export const ReviewAndSubmitModal: React.FC<ReviewAndSubmitModalProps> = ({
  isOpen,
  onClose,
  workflow,
  fieldState,
  onUpdateField,
  onConfirmSubmit,
  isSubmitting = false,
}) => {
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<any>('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [suggestionsMap, setSuggestionsMap] = useState<Record<string, SmartSuggestionItem[]>>({});
  const [isSuggestionsOpen, setIsSuggestionsOpen] = useState(false);

  useEffect(() => {
    async function loadSuggestions() {
      if (!workflow?.workflowId) return;
      try {
        const res = await api.getFieldSuggestions(workflow.workflowId);
        if (res && res.suggestions) {
          setSuggestionsMap(res.suggestions);
        }
      } catch (err) {
        console.warn('Failed to load field suggestions in review modal:', err);
      }
    }
    if (isOpen) {
      loadSuggestions();
    }
  }, [workflow?.workflowId, isOpen]);

  if (!isOpen) return null;

  // Compute raw values for visibility check
  const rawValues: Record<string, any> = {};
  for (const [k, v] of Object.entries(fieldState)) {
    rawValues[k] = v.value;
  }

  // Filter only visible fields
  const visibleFields = workflow.fields.filter((f) => isFieldVisible(f, rawValues));

  const handleStartEdit = (field: WorkflowField) => {
    setEditingKey(field.key);
    setEditValue(fieldState[field.key]?.value ?? '');
  };

  const handleSaveEdit = async (fieldKey: string) => {
    setIsUpdating(true);
    try {
      await onUpdateField(fieldKey, editValue);
      setEditingKey(null);
    } catch (e) {
      console.error('Failed to update field during review:', e);
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-2xs flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[85vh] flex flex-col border border-zinc-200 animate-in fade-in duration-150">
        {/* Header */}
        <div className="p-4 border-b border-zinc-100 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <FileCheck2 className="w-4 h-4 text-zinc-900" />
            <div>
              <h3 className="text-xs font-semibold text-zinc-900 tracking-tight">
                Review & Confirm Details
              </h3>
              <p className="text-[11px] text-zinc-500">{workflow.name}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-zinc-400 hover:text-zinc-700 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content list */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 divide-y divide-zinc-100 text-xs">
          <p className="text-[11px] text-zinc-500 pb-1">
            Please verify all extracted fields before final submission. Click the edit icon to make any instant corrections.
          </p>

          {visibleFields.map((field) => {
            const state = fieldState[field.key];
            const isEditing = editingKey === field.key;
            const isCalculated = state?.source === 'calculated';

            return (
              <div key={field.id} className="pt-2.5 first:pt-0 flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-1.5 text-zinc-500">
                    <span className="font-medium text-zinc-800">{field.label}</span>
                    {field.required && <span className="text-zinc-400 text-[10px]">*</span>}
                    {isCalculated && (
                      <span className="text-[10px] text-zinc-400 font-mono">(calculated)</span>
                    )}
                  </div>

                  {isEditing ? (
                    <div className="mt-1 relative max-w-sm">
                      <div className="flex items-center space-x-1.5">
                        <input
                          type={field.type === 'number' ? 'number' : 'text'}
                          value={editValue}
                          onFocus={() => setIsSuggestionsOpen(true)}
                          onChange={(e) => {
                            setEditValue(e.target.value);
                            setIsSuggestionsOpen(true);
                          }}
                          className="text-xs px-2.5 py-1 rounded border border-zinc-300 focus:outline-hidden w-full"
                          autoFocus
                        />
                        <button
                          onClick={() => handleSaveEdit(field.key)}
                          disabled={isUpdating}
                          className="p-1 text-zinc-900 hover:text-black shrink-0"
                          title="Save change"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => {
                            setEditingKey(null);
                            setIsSuggestionsOpen(false);
                          }}
                          className="p-1 text-zinc-400 hover:text-zinc-600 shrink-0"
                          title="Cancel"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {suggestionsMap[field.key] && suggestionsMap[field.key].length > 0 && (
                        <SmartSuggestionOverlay
                          currentValue={String(editValue)}
                          fieldKey={field.key}
                          suggestions={suggestionsMap[field.key]}
                          isOpen={isSuggestionsOpen}
                          onClose={() => setIsSuggestionsOpen(false)}
                          onSelectSuggestion={(val) => {
                            setEditValue(val);
                            setIsSuggestionsOpen(false);
                          }}
                        />
                      )}
                    </div>
                  ) : (
                    <div className="mt-0.5 text-xs text-zinc-800 font-mono">
                      {state?.value !== undefined && state?.value !== null && state?.value !== '' ? (
                        typeof state.value === 'object' ? (
                          <pre className="text-[10px] bg-zinc-50 p-1.5 rounded text-zinc-700 whitespace-pre-wrap">
                            {JSON.stringify(state.value, null, 2)}
                          </pre>
                        ) : (
                          <span>{String(state.value)}</span>
                        )
                      ) : (
                        <span className="text-zinc-400 italic">None provided</span>
                      )}
                    </div>
                  )}

                  {state?.validationErrors && state.validationErrors.length > 0 && (
                    <p className="text-[10px] text-rose-600 mt-0.5">
                      {state.validationErrors.join(', ')}
                    </p>
                  )}
                </div>

                {!isCalculated && !isEditing && (
                  <button
                    onClick={() => handleStartEdit(field)}
                    className="p-1 text-zinc-400 hover:text-zinc-800 rounded transition-colors shrink-0 mt-0.5"
                    title="Edit field"
                  >
                    <Edit2 className="w-3 h-3" />
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-zinc-100 flex items-center justify-between bg-zinc-50/50 rounded-b-xl">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 text-xs text-zinc-600 hover:text-zinc-900 font-medium"
          >
            Back to Chat
          </button>

          <button
            type="button"
            onClick={onConfirmSubmit}
            disabled={isSubmitting}
            className="inline-flex items-center space-x-1.5 px-4 py-2 bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-medium rounded-md transition-colors shadow-2xs disabled:opacity-50"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Submitting...</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Confirm & Submit Record</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
