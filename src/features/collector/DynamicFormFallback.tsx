import React, { useRef, useState, useEffect } from 'react';
import { WorkflowSchema, WorkflowField, FieldState } from '../../types';
import { isFieldVisible } from '../../lib/workflowEngine';
import { api } from '../../lib/api';
import { SmartSuggestionOverlay, SmartSuggestionItem } from '../../components/SmartSuggestionOverlay';
import {
  AlertCircle,
  CheckCircle2,
  HelpCircle,
  UploadCloud,
  FileText,
  Star,
  X,
  Sparkles,
} from 'lucide-react';
import { RESTAURANT_MENU } from '../../lib/templates';

interface DynamicFormFallbackProps {
  workflow: WorkflowSchema;
  fieldState: Record<string, FieldState>;
  onUpdateField: (fieldKey: string, value: any) => void;
  onSubmit: () => void;
  isSubmitting?: boolean;
}

export const DynamicFormFallback: React.FC<DynamicFormFallbackProps> = ({
  workflow,
  fieldState,
  onUpdateField,
  onSubmit,
  isSubmitting = false,
}) => {
  // Smart suggestions cache: fieldKey -> items
  const [suggestionsMap, setSuggestionsMap] = useState<Record<string, SmartSuggestionItem[]>>({});
  const [activeSuggestionField, setActiveSuggestionField] = useState<string | null>(null);

  useEffect(() => {
    async function loadSuggestions() {
      if (!workflow?.workflowId) return;
      try {
        const res = await api.getFieldSuggestions(workflow.workflowId);
        if (res && res.suggestions) {
          setSuggestionsMap(res.suggestions);
        }
      } catch (err) {
        console.warn('Failed to load field suggestions:', err);
      }
    }
    loadSuggestions();
  }, [workflow?.workflowId]);

  // Extract flat raw values for visibility check
  const rawValues: Record<string, any> = {};
  for (const [k, v] of Object.entries(fieldState)) {
    rawValues[k] = v.value;
  }

  // Group visible fields by section
  const sections: Record<string, WorkflowField[]> = {};
  for (const field of workflow.fields) {
    if (isFieldVisible(field, rawValues)) {
      const sectionName = field.section || 'General Details';
      if (!sections[sectionName]) {
        sections[sectionName] = [];
      }
      sections[sectionName].push(field);
    }
  }

  const renderFieldInput = (field: WorkflowField) => {
    const state = fieldState[field.key];
    const value = state?.value ?? '';
    const hasError = state?.status === 'invalid';
    const isCompleted = state?.status === 'valid';
    const fieldSuggestions = suggestionsMap[field.key] || [];

    switch (field.type) {
      case 'short_text':
      case 'phone':
      case 'email':
      case 'address':
        return (
          <div className="relative">
            <input
              type={field.type === 'email' ? 'email' : field.type === 'phone' ? 'tel' : 'text'}
              value={value}
              onFocus={() => setActiveSuggestionField(field.key)}
              onChange={(e) => {
                onUpdateField(field.key, e.target.value);
                setActiveSuggestionField(field.key);
              }}
              placeholder={field.placeholder || `Enter ${field.label.toLowerCase()}`}
              className={`w-full text-xs px-3 py-2 rounded-lg border focus:outline-hidden transition ${
                hasError
                  ? 'border-rose-400 focus:border-rose-500 bg-rose-50/20'
                  : 'border-gray-300 focus:border-indigo-500'
              }`}
            />

            {fieldSuggestions.length > 0 && (
              <SmartSuggestionOverlay
                currentValue={String(value)}
                fieldKey={field.key}
                suggestions={fieldSuggestions}
                isOpen={activeSuggestionField === field.key}
                onClose={() => setActiveSuggestionField(null)}
                onSelectSuggestion={(selectedVal) => {
                  onUpdateField(field.key, selectedVal);
                  setActiveSuggestionField(null);
                }}
              />
            )}
          </div>
        );

      case 'number':
      case 'currency':
      case 'quantity':
        return (
          <input
            type="number"
            value={value}
            min={field.min}
            max={field.max}
            onChange={(e) => onUpdateField(field.key, e.target.value === '' ? '' : Number(e.target.value))}
            placeholder={field.placeholder || '0'}
            className="w-full text-xs px-3 py-2 rounded-lg border border-gray-300 focus:border-indigo-500 focus:outline-hidden"
          />
        );

      case 'date':
        return (
          <input
            type="date"
            value={value}
            onChange={(e) => onUpdateField(field.key, e.target.value)}
            className="w-full text-xs px-3 py-2 rounded-lg border border-gray-300 focus:border-indigo-500 focus:outline-hidden"
          />
        );

      case 'single_select':
        return (
          <select
            value={value}
            onChange={(e) => onUpdateField(field.key, e.target.value)}
            className="w-full text-xs px-3 py-2 rounded-lg border border-gray-300 bg-white focus:border-indigo-500 focus:outline-hidden"
          >
            <option value="">Select an option...</option>
            {field.options?.map((opt) => {
              const label = typeof opt === 'string' ? opt : opt.label;
              const val = typeof opt === 'string' ? opt : opt.value;
              return (
                <option key={val} value={val}>
                  {label}
                </option>
              );
            })}
          </select>
        );

      case 'boolean':
        return (
          <label className="flex items-center space-x-2 text-xs text-gray-700 cursor-pointer">
            <input
              type="checkbox"
              checked={Boolean(value)}
              onChange={(e) => onUpdateField(field.key, e.target.checked)}
              className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
            />
            <span className="font-medium">{field.description || 'Yes, I agree and confirm'}</span>
          </label>
        );

      case 'long_text':
        return (
          <textarea
            rows={3}
            value={value}
            onChange={(e) => onUpdateField(field.key, e.target.value)}
            placeholder={field.placeholder || 'Enter notes or details...'}
            className="w-full text-xs px-3 py-2 rounded-lg border border-gray-300 focus:border-indigo-500 focus:outline-hidden"
          />
        );

      case 'multi_select': {
        const selectedValues: string[] = Array.isArray(value) ? value : [];
        return (
          <div className="space-y-1.5 pt-1">
            {field.options?.map((opt) => {
              const label = typeof opt === 'string' ? opt : opt.label;
              const optVal = typeof opt === 'string' ? opt : opt.value;
              const isChecked = selectedValues.includes(optVal);

              return (
                <label
                  key={optVal}
                  className="flex items-center space-x-2 text-xs text-gray-700 cursor-pointer select-none hover:text-gray-900"
                >
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={(e) => {
                      if (e.target.checked) {
                        onUpdateField(field.key, [...selectedValues, optVal]);
                      } else {
                        onUpdateField(field.key, selectedValues.filter((v) => v !== optVal));
                      }
                    }}
                    className="rounded border-gray-300 text-zinc-900 focus:ring-zinc-900"
                  />
                  <span>{label}</span>
                </label>
              );
            })}
          </div>
        );
      }

      case 'rating': {
        const ratingVal = typeof value === 'number' ? value : 0;
        return (
          <div className="flex items-center space-x-1.5 py-1">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                type="button"
                key={star}
                onClick={() => onUpdateField(field.key, star)}
                className="p-1 rounded-sm text-gray-300 hover:text-amber-400 focus:outline-hidden transition"
              >
                <Star
                  className={`w-5 h-5 ${
                    star <= ratingVal ? 'text-amber-400 fill-amber-400' : 'text-gray-200'
                  }`}
                />
              </button>
            ))}
            {ratingVal > 0 && (
              <span className="text-xs font-mono text-gray-500 ml-2">
                {ratingVal} / 5
              </span>
            )}
          </div>
        );
      }

      case 'file_upload':
      case 'image_upload': {
        const isImage = field.type === 'image_upload';
        const fileData = value; // Can be string URL or { name, size, dataUrl }

        return (
          <div className="space-y-2">
            {fileData ? (
              <div className="flex items-center justify-between p-2.5 bg-zinc-50 border border-zinc-200 rounded-lg text-xs">
                <div className="flex items-center space-x-2 truncate">
                  <FileText className="w-4 h-4 text-zinc-600 shrink-0" />
                  <span className="font-mono text-zinc-800 truncate">
                    {typeof fileData === 'object' ? fileData.name : String(fileData).split('/').pop()}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => onUpdateField(field.key, null)}
                  className="p-1 text-zinc-400 hover:text-rose-600 rounded transition"
                  title="Remove file"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-zinc-300 hover:border-zinc-500 rounded-lg cursor-pointer bg-zinc-50/50 hover:bg-zinc-100/50 transition">
                <UploadCloud className="w-5 h-5 text-zinc-500 mb-1" />
                <span className="text-xs font-medium text-zinc-700">
                  Click to upload {isImage ? 'image (PNG, JPG)' : 'document (PDF, Doc)'}
                </span>
                <span className="text-[10px] text-zinc-400 mt-0.5">Secure client-side simulation</span>
                <input
                  type="file"
                  accept={isImage ? 'image/*' : '.pdf,.doc,.docx,.png,.jpg,.jpeg'}
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const reader = new FileReader();
                      reader.onload = () => {
                        onUpdateField(field.key, {
                          name: file.name,
                          size: file.size,
                          type: file.type,
                          dataUrl: reader.result,
                        });
                      };
                      reader.readAsDataURL(file);
                    }
                  }}
                />
              </label>
            )}
          </div>
        );
      }

      case 'calculated':
        return (
          <div className="bg-gray-100 px-3 py-2 rounded-lg border border-gray-200 text-xs font-mono font-bold text-gray-800 flex items-center justify-between">
            <span>{value !== undefined && value !== '' ? String(value) : 'Calculated automatically'}</span>
            <span className="text-[10px] text-purple-600 font-sans font-semibold">Auto-computed</span>
          </div>
        );

      case 'table':
        // Specifically for restaurant ordered items demo
        return (
          <div className="space-y-2">
            <div className="border border-gray-200 rounded-lg overflow-hidden text-xs">
              <table className="w-full text-left">
                <thead className="bg-gray-50 text-[10px] font-semibold text-gray-500 border-b border-gray-200">
                  <tr>
                    <th className="py-2 px-3">Item</th>
                    <th className="py-2 px-2">Price</th>
                    <th className="py-2 px-2">Quantity</th>
                    <th className="py-2 px-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {Array.isArray(value) && value.length > 0 ? (
                    value.map((item: any, idx: number) => (
                      <tr key={idx}>
                        <td className="py-2 px-3 font-medium text-gray-800">{item.name}</td>
                        <td className="py-2 px-2 text-gray-600">₹{item.price}</td>
                        <td className="py-2 px-2">
                          <input
                            type="number"
                            min="1"
                            value={item.quantity || 1}
                            onChange={(e) => {
                              const updated = [...value];
                              updated[idx].quantity = Math.max(1, parseInt(e.target.value) || 1);
                              onUpdateField(field.key, updated);
                            }}
                            className="w-14 px-1.5 py-0.5 border border-gray-300 rounded text-center"
                          />
                        </td>
                        <td className="py-2 px-3 text-right">
                          <button
                            type="button"
                            onClick={() => {
                              const updated = value.filter((_: any, i: number) => i !== idx);
                              onUpdateField(field.key, updated);
                            }}
                            className="text-rose-600 hover:text-rose-800 text-[11px]"
                          >
                            Remove
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4} className="py-3 px-3 text-center text-gray-400">
                        No food items selected yet. Choose from menu below:
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Quick Menu Selection Chips */}
            <div className="flex flex-wrap gap-1.5 pt-1">
              {RESTAURANT_MENU.map((menuItem) => (
                <button
                  type="button"
                  key={menuItem.id}
                  onClick={() => {
                    const currentItems = Array.isArray(value) ? [...value] : [];
                    const existing = currentItems.find((i) => i.name === menuItem.name);
                    if (existing) {
                      existing.quantity += 1;
                    } else {
                      currentItems.push({ name: menuItem.name, price: menuItem.price, quantity: 1 });
                    }
                    onUpdateField(field.key, currentItems);
                  }}
                  className="text-[11px] px-2 py-1 bg-white border border-gray-200 hover:border-indigo-300 rounded-md text-gray-700 hover:text-indigo-600 transition flex items-center space-x-1"
                >
                  <span>+ {menuItem.name}</span>
                  <span className="font-semibold text-gray-500">₹{menuItem.price}</span>
                </button>
              ))}
            </div>
          </div>
        );

      default:
        return (
          <input
            type="text"
            value={value}
            onChange={(e) => onUpdateField(field.key, e.target.value)}
            className="w-full text-xs px-3 py-2 rounded-lg border border-gray-300 focus:border-indigo-500 focus:outline-hidden"
          />
        );
    }
  };

  return (
    <div className="space-y-6">
      {Object.entries(sections).map(([sectionTitle, fields]) => (
        <div key={sectionTitle} className="bg-white p-5 rounded-xl border border-gray-200 shadow-2xs space-y-4">
          <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider pb-2 border-b border-gray-100">
            {sectionTitle}
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {fields.map((field) => {
              const state = fieldState[field.key];
              const hasError = state?.status === 'invalid';
              const isCompleted = state?.status === 'valid';
              const errors = state?.validationErrors || [];

              return (
                <div
                  key={field.id}
                  className={field.type === 'table' || field.type === 'long_text' ? 'sm:col-span-2' : ''}
                >
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-semibold text-gray-800 flex items-center space-x-1">
                      <span>{field.label}</span>
                      {field.required && <span className="text-rose-500 font-bold">*</span>}
                    </label>
                    <div className="flex items-center space-x-2">
                      {suggestionsMap[field.key] && suggestionsMap[field.key].length > 0 && !isCompleted && (
                        <span className="text-[10px] text-indigo-600 font-medium flex items-center gap-0.5 bg-indigo-50 px-1.5 py-0.5 rounded">
                          <Sparkles className="w-2.5 h-2.5 text-indigo-600" />
                          <span>Smart Suggestions</span>
                        </span>
                      )}
                      {isCompleted && (
                        <span className="text-[10px] text-emerald-600 font-medium flex items-center">
                          <CheckCircle2 className="w-3 h-3 mr-0.5" /> Valid
                        </span>
                      )}
                    </div>
                  </div>

                  {field.description && (
                    <p className="text-[11px] text-gray-500 mb-1.5">{field.description}</p>
                  )}

                  {renderFieldInput(field)}

                  {hasError && errors.length > 0 && (
                    <div className="mt-1 text-[11px] text-rose-600 flex items-center space-x-1">
                      <AlertCircle className="w-3 h-3 shrink-0" />
                      <span>{errors.join(' ')}</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}

      <div className="flex justify-end pt-2">
        <button
          onClick={onSubmit}
          disabled={isSubmitting}
          className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg shadow-xs transition"
        >
          {isSubmitting ? 'Submitting Record...' : 'Review & Submit Record'}
        </button>
      </div>
    </div>
  );
};
