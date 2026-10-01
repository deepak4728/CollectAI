import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../lib/api';
import { WorkflowSchema, WorkflowField, FieldType } from '../../types';
import {
  Save,
  Send,
  Plus,
  Trash2,
  Copy,
  ArrowUp,
  ArrowDown,
  Eye,
  Sparkles,
  Code2,
  Check,
  AlertCircle,
  HelpCircle,
} from 'lucide-react';

interface WorkflowBuilderPageProps {
  workflowId: string | null;
  onBack: () => void;
  onPreview: (schema: WorkflowSchema) => void;
}

const ALL_FIELD_TYPES: { type: FieldType; label: string; group: string }[] = [
  { type: 'short_text', label: 'Short Text', group: 'Basic' },
  { type: 'long_text', label: 'Long Text / Paragraph', group: 'Basic' },
  { type: 'number', label: 'Number', group: 'Basic' },
  { type: 'currency', label: 'Currency (₹ / $)', group: 'Financial' },
  { type: 'email', label: 'Email Address', group: 'Contact' },
  { type: 'phone', label: 'Phone Number', group: 'Contact' },
  { type: 'date', label: 'Date', group: 'Date & Time' },
  { type: 'time', label: 'Time', group: 'Date & Time' },
  { type: 'datetime', label: 'Date & Time', group: 'Date & Time' },
  { type: 'address', label: 'Address / Location', group: 'Contact' },
  { type: 'single_select', label: 'Single Select (Dropdown/Radio)', group: 'Selection' },
  { type: 'multi_select', label: 'Multi-Select (Checkboxes)', group: 'Selection' },
  { type: 'boolean', label: 'Yes / No (Boolean)', group: 'Selection' },
  { type: 'rating', label: 'Rating (1 to 5)', group: 'Special' },
  { type: 'quantity', label: 'Quantity Counter', group: 'Basic' },
  { type: 'file_upload', label: 'File Upload (Docs/PDF)', group: 'Media' },
  { type: 'image_upload', label: 'Image Upload', group: 'Media' },
  { type: 'table', label: 'Table / Repeating Items', group: 'Advanced' },
  { type: 'calculated', label: 'Calculated / Derived Field', group: 'Advanced' },
  { type: 'hidden', label: 'Hidden Metadata', group: 'Advanced' },
];

export const WorkflowBuilderPage: React.FC<WorkflowBuilderPageProps> = ({
  workflowId,
  onBack,
  onPreview,
}) => {
  const { organization, role } = useAuth();
  const [schema, setSchema] = useState<WorkflowSchema>({
    workflowId: 'new_' + Date.now(),
    organizationId: organization?.id || 'org_csc_demo',
    name: 'Untitled Data Collection Workflow',
    description: 'Dynamic schema defined for structured intake.',
    version: 1,
    status: 'draft',
    collectionModes: ['conversation', 'form', 'operator'],
    publicSlug: 'intake-' + Math.random().toString(36).substring(2, 7),
    fields: [],
    createdBy: 'admin',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  const [activeField, setActiveField] = useState<WorkflowField | null>(null);
  const [showJsonModal, setShowJsonModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    async function loadWorkflow() {
      if (workflowId && !workflowId.startsWith('new_')) {
        try {
          const res = await api.getWorkflow(workflowId);
          if (res.workflow) {
            setSchema(res.workflow);
            if (res.workflow.fields.length > 0) {
              setActiveField(res.workflow.fields[0]);
            }
          }
        } catch (err) {
          console.error('Failed to load workflow', err);
        }
      } else {
        // Initial sample field
        const sampleField: WorkflowField = {
          id: 'f_' + Date.now(),
          key: 'fullName',
          label: 'Full Name',
          type: 'short_text',
          required: true,
          placeholder: 'e.g. Ramesh Kumar',
          minLength: 3,
          section: 'Basic Details',
          order: 1,
        };
        setSchema((prev) => ({ ...prev, fields: [sampleField] }));
        setActiveField(sampleField);
      }
    }
    loadWorkflow();
  }, [workflowId]);

  const handleAddField = () => {
    const newField: WorkflowField = {
      id: 'f_' + Date.now(),
      key: 'field' + (schema.fields.length + 1),
      label: 'New Field ' + (schema.fields.length + 1),
      type: 'short_text',
      required: false,
      section: 'General',
      order: schema.fields.length + 1,
    };
    setSchema((prev) => ({ ...prev, fields: [...prev.fields, newField] }));
    setActiveField(newField);
  };

  const handleUpdateActiveField = (updates: Partial<WorkflowField>) => {
    if (!activeField) return;
    const updated = { ...activeField, ...updates };
    setActiveField(updated);
    setSchema((prev) => ({
      ...prev,
      fields: prev.fields.map((f) => (f.id === updated.id ? updated : f)),
    }));
  };

  const handleDeleteField = (fieldId: string) => {
    const filtered = schema.fields.filter((f) => f.id !== fieldId);
    setSchema((prev) => ({ ...prev, fields: filtered }));
    if (activeField?.id === fieldId) {
      setActiveField(filtered[0] || null);
    }
  };

  const handleDuplicateField = (field: WorkflowField) => {
    const duplicate: WorkflowField = {
      ...field,
      id: 'f_' + Date.now(),
      key: field.key + '_copy',
      label: field.label + ' (Copy)',
      order: schema.fields.length + 1,
    };
    setSchema((prev) => ({ ...prev, fields: [...prev.fields, duplicate] }));
    setActiveField(duplicate);
  };

  const handleMoveField = (index: number, direction: 'up' | 'down') => {
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= schema.fields.length) return;
    const fieldsCopy = [...schema.fields];
    const [moved] = fieldsCopy.splice(index, 1);
    fieldsCopy.splice(newIndex, 0, moved);
    fieldsCopy.forEach((f, i) => (f.order = i + 1));
    setSchema((prev) => ({ ...prev, fields: fieldsCopy }));
  };

  const handleSave = async (publish = false) => {
    if (!organization) return;
    setIsSaving(true);
    try {
      const payload: WorkflowSchema = {
        ...schema,
        organizationId: organization.id,
        status: publish ? 'published' : 'draft',
      };
      const res = await api.saveWorkflow(payload, organization.id, role);
      setSchema(res.workflow);
      setNotification({
        message: publish
          ? `Workflow published successfully as Version ${res.workflow.version}!`
          : 'Draft schema saved successfully.',
        type: 'success',
      });
      setTimeout(() => setNotification(null), 3000);
    } catch (e: any) {
      setNotification({ message: e.message || 'Failed to save workflow', type: 'error' });
    } finally {
      setIsSaving(false);
    }
  };

  useEffect(() => {
    const handleShortcutSave = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail?.publish) {
        handleSave(true);
      } else {
        handleSave(false);
      }
    };

    const handleShortcutAddField = () => {
      handleAddField();
    };

    const handleShortcutPreview = () => {
      onPreview(schema);
    };

    window.addEventListener('collectai:save-workflow', handleShortcutSave);
    window.addEventListener('collectai:add-field', handleShortcutAddField);
    window.addEventListener('collectai:preview-workflow', handleShortcutPreview);

    return () => {
      window.removeEventListener('collectai:save-workflow', handleShortcutSave);
      window.removeEventListener('collectai:add-field', handleShortcutAddField);
      window.removeEventListener('collectai:preview-workflow', handleShortcutPreview);
    };
  }, [schema, organization, role]);

  return (
    <div className="space-y-6">
      {/* Header bar */}
      <div className="bg-white rounded-xl p-5 border border-gray-200 shadow-2xs flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <button
              onClick={onBack}
              className="text-xs text-gray-500 hover:text-gray-800 font-medium"
            >
              ← Workflows
            </button>
            <span className="text-gray-300">/</span>
            <span className="text-xs font-mono text-indigo-600 font-bold uppercase">
              {schema.status} (v{schema.version})
            </span>
          </div>
          <div className="flex items-center space-x-3 mt-1.5">
            <input
              type="text"
              value={schema.name}
              onChange={(e) => setSchema({ ...schema, name: e.target.value })}
              className="text-lg font-bold text-gray-900 border-b border-transparent hover:border-gray-300 focus:border-indigo-500 focus:outline-hidden px-1 -mx-1"
            />
          </div>
          <input
            type="text"
            value={schema.description}
            onChange={(e) => setSchema({ ...schema, description: e.target.value })}
            placeholder="Workflow purpose and instructions..."
            className="text-xs text-gray-500 border-b border-transparent hover:border-gray-300 focus:border-indigo-500 focus:outline-hidden w-full max-w-xl px-1 -mx-1 mt-1"
          />
        </div>

        <div className="flex items-center space-x-2.5">
          <button
            onClick={() => setShowJsonModal(true)}
            className="p-2 text-gray-600 hover:text-indigo-600 hover:bg-gray-100 rounded-lg border border-gray-200 transition"
            title="View JSON Schema"
          >
            <Code2 className="w-4 h-4" />
          </button>

          <button
            onClick={() => onPreview(schema)}
            className="inline-flex items-center space-x-1.5 px-3 py-2 rounded-lg border border-gray-200 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition"
            title="Preview workflow (Alt+P)"
          >
            <Eye className="w-3.5 h-3.5" />
            <span>Preview</span>
            <kbd className="hidden lg:inline text-[9px] font-mono text-zinc-400 bg-zinc-100 border border-zinc-200 px-1 py-0.2 rounded">Alt+P</kbd>
          </button>

          <button
            onClick={() => handleSave(false)}
            disabled={isSaving}
            className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-lg border border-gray-300 bg-white hover:bg-gray-50 text-xs font-semibold text-gray-800 transition shadow-2xs"
            title="Save Draft (Ctrl+S)"
          >
            <Save className="w-3.5 h-3.5" />
            <span>Save Draft</span>
            <kbd className="hidden lg:inline text-[9px] font-mono text-zinc-400 bg-zinc-100 border border-zinc-200 px-1 py-0.2 rounded">Ctrl+S</kbd>
          </button>

          <button
            onClick={() => handleSave(true)}
            disabled={isSaving}
            className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-xs font-semibold text-white shadow-xs transition"
            title="Publish Version (Ctrl+Shift+P)"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Publish Version {schema.status === 'published' ? schema.version + 1 : schema.version}</span>
            <kbd className="hidden lg:inline text-[9px] font-mono text-indigo-200 bg-indigo-700 border border-indigo-500 px-1 py-0.2 rounded">Ctrl+Shift+P</kbd>
          </button>
        </div>
      </div>

      {notification && (
        <div
          className={`p-3 rounded-lg text-xs font-medium flex items-center space-x-2 ${
            notification.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              : 'bg-rose-50 text-rose-800 border border-rose-200'
          }`}
        >
          {notification.type === 'success' ? (
            <Check className="w-4 h-4 text-emerald-600" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-600" />
          )}
          <span>{notification.message}</span>
        </div>
      )}

      {/* 2-Pane Visual Builder Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Fields Sequence List */}
        <div className="lg:col-span-5 bg-white rounded-xl border border-gray-200 p-4 shadow-2xs space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-gray-100">
            <div>
              <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider">
                Field Sequence ({schema.fields.length})
              </h3>
              <p className="text-[11px] text-gray-400">Deterministic order of collection & conditions</p>
            </div>
            <button
              onClick={handleAddField}
              className="inline-flex items-center space-x-1 text-xs font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-2.5 py-1.5 rounded-md transition"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Field</span>
            </button>
          </div>

          <div className="space-y-2 max-h-[700px] overflow-y-auto pr-1">
            {schema.fields.map((field, idx) => {
              const isSelected = activeField?.id === field.id;
              return (
                <div
                  key={field.id}
                  onClick={() => setActiveField(field)}
                  className={`p-3 rounded-lg border text-left cursor-pointer transition ${
                    isSelected
                      ? 'border-indigo-600 bg-indigo-50/50 shadow-2xs'
                      : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span className="text-[10px] font-mono text-gray-400 font-bold">#{idx + 1}</span>
                      <span className="text-xs font-bold text-gray-900 truncate max-w-[170px]">
                        {field.label}
                      </span>
                    </div>

                    <div className="flex items-center space-x-1" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => handleMoveField(idx, 'up')}
                        disabled={idx === 0}
                        className="p-1 text-gray-400 hover:text-gray-700 disabled:opacity-30"
                      >
                        <ArrowUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleMoveField(idx, 'down')}
                        disabled={idx === schema.fields.length - 1}
                        className="p-1 text-gray-400 hover:text-gray-700 disabled:opacity-30"
                      >
                        <ArrowDown className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDuplicateField(field)}
                        className="p-1 text-gray-400 hover:text-indigo-600"
                        title="Duplicate"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteField(field.id)}
                        className="p-1 text-gray-400 hover:text-rose-600"
                        title="Delete"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="mt-1.5 flex items-center space-x-2 text-[10px] text-gray-500">
                    <span className="bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded font-mono">
                      {field.key}
                    </span>
                    <span className="capitalize">{field.type.replace('_', ' ')}</span>
                    {field.required && (
                      <span className="text-rose-600 font-semibold">• Required</span>
                    )}
                    {field.visibleWhen && (
                      <span className="text-amber-600 font-semibold">• Conditional</span>
                    )}
                    {field.derivedFormula && (
                      <span className="text-purple-600 font-semibold">• Derived</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Active Field Inspector & Settings */}
        <div className="lg:col-span-7 bg-white rounded-xl border border-gray-200 p-6 shadow-2xs">
          {activeField ? (
            <div className="space-y-5">
              <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                <div>
                  <h3 className="text-sm font-bold text-gray-900">Configure Field: {activeField.label}</h3>
                  <p className="text-xs text-gray-400">Key: <span className="font-mono text-indigo-600 font-semibold">{activeField.key}</span></p>
                </div>
                <div className="flex items-center space-x-2">
                  <label className="flex items-center space-x-2 text-xs font-semibold text-gray-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={activeField.required}
                      onChange={(e) => handleUpdateActiveField({ required: e.target.checked })}
                      className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <span>Required Field</span>
                  </label>
                </div>
              </div>

              {/* Form Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Field Label */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Display Label</label>
                  <input
                    type="text"
                    value={activeField.label}
                    onChange={(e) => handleUpdateActiveField({ label: e.target.value })}
                    className="w-full text-xs px-3 py-2 rounded-lg border border-gray-300 focus:border-indigo-500 focus:outline-hidden"
                  />
                </div>

                {/* Field Key */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    System Key (camelCase)
                  </label>
                  <input
                    type="text"
                    value={activeField.key}
                    onChange={(e) => handleUpdateActiveField({ key: e.target.value })}
                    className="w-full text-xs px-3 py-2 rounded-lg border border-gray-300 font-mono text-gray-800 focus:border-indigo-500 focus:outline-hidden"
                  />
                </div>

                {/* Field Type */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Field Type</label>
                  <select
                    value={activeField.type}
                    onChange={(e) => handleUpdateActiveField({ type: e.target.value as FieldType })}
                    className="w-full text-xs px-3 py-2 rounded-lg border border-gray-300 focus:border-indigo-500 focus:outline-hidden bg-white"
                  >
                    {ALL_FIELD_TYPES.map((t) => (
                      <option key={t.type} value={t.type}>
                        [{t.group}] {t.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Section Grouping */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Section Group</label>
                  <input
                    type="text"
                    value={activeField.section || ''}
                    onChange={(e) => handleUpdateActiveField({ section: e.target.value })}
                    placeholder="e.g. Personal Details, Payment, Contact"
                    className="w-full text-xs px-3 py-2 rounded-lg border border-gray-300 focus:border-indigo-500 focus:outline-hidden"
                  />
                </div>

                {/* Placeholder */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Input Placeholder</label>
                  <input
                    type="text"
                    value={activeField.placeholder || ''}
                    onChange={(e) => handleUpdateActiveField({ placeholder: e.target.value })}
                    placeholder="e.g. Enter 10-digit number"
                    className="w-full text-xs px-3 py-2 rounded-lg border border-gray-300 focus:border-indigo-500 focus:outline-hidden"
                  />
                </div>

                {/* Help text / Description */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Help Text / Guidance</label>
                  <input
                    type="text"
                    value={activeField.description || ''}
                    onChange={(e) => handleUpdateActiveField({ description: e.target.value })}
                    placeholder="Instructions shown to user or operator"
                    className="w-full text-xs px-3 py-2 rounded-lg border border-gray-300 focus:border-indigo-500 focus:outline-hidden"
                  />
                </div>
              </div>

              {/* Options Builder (for single_select and multi_select) */}
              {(activeField.type === 'single_select' || activeField.type === 'multi_select') && (
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-gray-800">
                      Allowed Options (Comma-separated)
                    </label>
                    <span className="text-[11px] text-gray-500">e.g. Dine-in, Takeaway, Delivery</span>
                  </div>
                  <input
                    type="text"
                    value={
                      activeField.options
                        ? activeField.options.map((o) => (typeof o === 'string' ? o : o.label)).join(', ')
                        : ''
                    }
                    onChange={(e) => {
                      const items = e.target.value.split(',').map((s) => s.trim()).filter(Boolean);
                      handleUpdateActiveField({ options: items });
                    }}
                    placeholder="Option 1, Option 2, Option 3"
                    className="w-full text-xs px-3 py-2 rounded-lg border border-gray-300 bg-white focus:border-indigo-500 focus:outline-hidden"
                  />
                </div>
              )}

              {/* Conditional Visibility Rules */}
              <div className="bg-amber-50/50 p-4 rounded-lg border border-amber-200/70 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-1.5 text-xs font-bold text-amber-900">
                    <HelpCircle className="w-3.5 h-3.5 text-amber-600" />
                    <span>Conditional Visibility (Visible When)</span>
                  </div>
                  {activeField.visibleWhen ? (
                    <button
                      onClick={() => handleUpdateActiveField({ visibleWhen: undefined })}
                      className="text-[11px] text-rose-600 font-semibold hover:underline"
                    >
                      Remove Rule
                    </button>
                  ) : (
                    <button
                      onClick={() =>
                        handleUpdateActiveField({
                          visibleWhen: { field: '', operator: 'equals', value: '' },
                        })
                      }
                      className="text-[11px] text-indigo-600 font-semibold hover:underline"
                    >
                      + Add Visibility Rule
                    </button>
                  )}
                </div>

                {activeField.visibleWhen && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    <div>
                      <label className="block text-[11px] text-gray-600 font-medium mb-1">Target Field</label>
                      <select
                        value={activeField.visibleWhen.field}
                        onChange={(e) =>
                          handleUpdateActiveField({
                            visibleWhen: { ...activeField.visibleWhen!, field: e.target.value },
                          })
                        }
                        className="w-full text-xs px-2 py-1.5 rounded border border-gray-300 bg-white"
                      >
                        <option value="">Select target field...</option>
                        {schema.fields
                          .filter((f) => f.key !== activeField.key)
                          .map((f) => (
                            <option key={f.key} value={f.key}>
                              {f.label} ({f.key})
                            </option>
                          ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] text-gray-600 font-medium mb-1">Operator</label>
                      <select
                        value={activeField.visibleWhen.operator}
                        onChange={(e) =>
                          handleUpdateActiveField({
                            visibleWhen: { ...activeField.visibleWhen!, operator: e.target.value as any },
                          })
                        }
                        className="w-full text-xs px-2 py-1.5 rounded border border-gray-300 bg-white"
                      >
                        <option value="equals">Equals</option>
                        <option value="not_equals">Does Not Equal</option>
                        <option value="greater_than">Greater Than (&gt;)</option>
                        <option value="less_than">Less Than (&lt;)</option>
                        <option value="contains">Contains</option>
                        <option value="in">In List</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] text-gray-600 font-medium mb-1">Expected Value</label>
                      <input
                        type="text"
                        value={activeField.visibleWhen.value}
                        onChange={(e) =>
                          handleUpdateActiveField({
                            visibleWhen: { ...activeField.visibleWhen!, value: e.target.value },
                          })
                        }
                        placeholder="e.g. Delivery, 18, True"
                        className="w-full text-xs px-2 py-1.5 rounded border border-gray-300 bg-white"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Derived Formulas Builder */}
              {activeField.type === 'calculated' && (
                <div className="bg-purple-50 p-4 rounded-lg border border-purple-200 space-y-3">
                  <div className="flex items-center space-x-1.5 text-xs font-bold text-purple-900">
                    <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                    <span>Deterministic Derived Calculation</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] text-gray-600 font-medium mb-1">Formula Type</label>
                      <select
                        value={activeField.derivedFormula?.type || 'age_from_dob'}
                        onChange={(e) =>
                          handleUpdateActiveField({
                            derivedFormula: { type: e.target.value as any },
                          })
                        }
                        className="w-full text-xs px-2 py-1.5 rounded border border-gray-300 bg-white"
                      >
                        <option value="age_from_dob">Age from Date of Birth</option>
                        <option value="restaurant_totals">Restaurant Order Totals & Tax</option>
                        <option value="custom_math">Custom Math Formula</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {/* Sensitive Data Check */}
              <div className="pt-2 flex items-center space-x-3">
                <label className="flex items-center space-x-2 text-xs text-gray-600 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={Boolean(activeField.sensitive)}
                    onChange={(e) => handleUpdateActiveField({ sensitive: e.target.checked })}
                    className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span>Sensitive Data (Mask in list views & audit tables)</span>
                </label>
              </div>
            </div>
          ) : (
            <div className="py-24 text-center text-xs text-gray-400">
              Select or add a field from the left column to inspect and configure.
            </div>
          )}
        </div>
      </div>

      {/* JSON Schema Viewer Modal */}
      {showJsonModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-3xl w-full max-h-[80vh] flex flex-col p-6">
            <div className="flex items-center justify-between pb-3 border-b border-gray-200">
              <h3 className="text-sm font-bold text-gray-900">Workflow JSON Schema (v{schema.version})</h3>
              <button
                onClick={() => setShowJsonModal(false)}
                className="text-gray-400 hover:text-gray-600 font-bold"
              >
                ✕
              </button>
            </div>
            <div className="mt-4 flex-1 overflow-auto bg-gray-900 text-emerald-400 p-4 rounded-lg font-mono text-xs">
              <pre>{JSON.stringify(schema, null, 2)}</pre>
            </div>
            <div className="mt-4 flex justify-end space-x-2">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(JSON.stringify(schema, null, 2));
                  alert('JSON Schema copied to clipboard');
                }}
                className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-xs font-semibold rounded"
              >
                Copy JSON
              </button>
              <button
                onClick={() => setShowJsonModal(false)}
                className="px-3 py-1.5 bg-indigo-600 text-white text-xs font-semibold rounded"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
