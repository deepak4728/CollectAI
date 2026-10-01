import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../lib/api';
import { WorkflowSchema, CollectionSession, FieldState } from '../../types';
import { SmartSuggestionOverlay, SmartSuggestionItem } from '../../components/SmartSuggestionOverlay';
import {
  CheckCircle2,
  Edit2,
  Check,
  X,
  Loader2,
  ArrowRight,
  Sparkles,
} from 'lucide-react';

interface OperatorAssistedModeProps {
  initialWorkflowId?: string;
  onViewSubmission?: (submissionId: string) => void;
}

export const OperatorAssistedMode: React.FC<OperatorAssistedModeProps> = ({
  initialWorkflowId,
  onViewSubmission,
}) => {
  const { user, organization } = useAuth();
  const [workflows, setWorkflows] = useState<WorkflowSchema[]>([]);
  const [selectedWorkflowId, setSelectedWorkflowId] = useState<string>(initialWorkflowId || '');
  const [workflow, setWorkflow] = useState<WorkflowSchema | null>(null);
  const [session, setSession] = useState<CollectionSession | null>(null);
  const [progress, setProgress] = useState<any>(null);

  const [inputText, setInputText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [pendingNoteText, setPendingNoteText] = useState<string | null>(null);
  const [operatorStep, setOperatorStep] = useState(0);
  const [editingFieldKey, setEditingFieldKey] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<any>('');
  const [submissionSuccess, setSubmissionSuccess] = useState<string | null>(null);
  const [suggestionsMap, setSuggestionsMap] = useState<Record<string, SmartSuggestionItem[]>>({});
  const [isSuggestionsOpen, setIsSuggestionsOpen] = useState(false);

  useEffect(() => {
    async function loadFieldSuggestions() {
      if (!workflow?.workflowId) return;
      try {
        const res = await api.getFieldSuggestions(workflow.workflowId);
        if (res && res.suggestions) {
          setSuggestionsMap(res.suggestions);
        }
      } catch (err) {
        console.warn('Failed to load operator field suggestions:', err);
      }
    }
    loadFieldSuggestions();
  }, [workflow?.workflowId]);

  useEffect(() => {
    if (!isProcessing) {
      setOperatorStep(0);
      return;
    }
    const timer = setInterval(() => {
      setOperatorStep(p => (p + 1) % 3);
    }, 700);
    return () => clearInterval(timer);
  }, [isProcessing]);

  const operatorStepMessages = [
    'Parsing rapid operator notes...',
    'Extracting & verifying field slots...',
    'Updating structured record...',
  ];

  useEffect(() => {
    async function loadWorkflows() {
      if (!organization) return;
      try {
        const res = await api.getWorkflows(organization.id);
        setWorkflows(res.workflows || []);
        if (!selectedWorkflowId && res.workflows && res.workflows.length > 0) {
          setSelectedWorkflowId(res.workflows[0].workflowId);
        }
      } catch (err) {
        console.error(err);
      }
    }
    loadWorkflows();
  }, [organization]);

  const startNewSession = async (wfId: string) => {
    if (!wfId) return;
    setIsProcessing(true);
    setSubmissionSuccess(null);
    try {
      const selectedWf = workflows.find((w) => w.workflowId === wfId) || null;
      setWorkflow(selectedWf);
      const res = await api.startSession({
        workflowId: wfId,
        mode: 'operator',
        respondentName: 'Counter Applicant',
        startedBy: `Operator (${user?.displayName || 'Counter Staff'})`,
      });
      setSession(res.session);
      setProgress(res.progress);
    } catch (err) {
      console.error('Failed to initialize session', err);
    } finally {
      setIsProcessing(false);
    }
  };

  useEffect(() => {
    if (selectedWorkflowId) {
      startNewSession(selectedWorkflowId);
    }
  }, [selectedWorkflowId]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !session || isProcessing) return;
    const text = inputText.trim();
    setInputText('');
    setPendingNoteText(text);
    setIsProcessing(true);
    try {
      const res = await api.sendSessionMessage(session.id, text, 'operator');
      setSession(res.session);
      setProgress(res.progress);
    } catch (err) {
      console.error(err);
    } finally {
      setIsProcessing(false);
      setPendingNoteText(null);
    }
  };

  const handleSaveFieldOverride = async (fieldKey: string) => {
    if (!session) return;
    try {
      const res = await api.updateSessionField(session.id, fieldKey, editValue, true);
      setSession(res.session);
      setProgress(res.progress);
      setEditingFieldKey(null);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSubmit = async () => {
    if (!session) return;
    try {
      setIsProcessing(true);
      const res = await api.submitSession(session.id, {
        userId: user?.id,
        userEmail: user?.email,
      });
      setSubmissionSuccess(res.submission.id);
    } catch (err: any) {
      alert(err.message || 'Submission failed');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 border-b border-zinc-200">
        <div>
          <div className="flex items-center space-x-2 text-xs text-zinc-500 mb-1">
            <span>Intake Session</span>
            <span>·</span>
            <span>{organization?.name || 'Workspace'}</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-zinc-900">
            {workflow ? workflow.name : 'Intake Counter'}
          </h1>
        </div>

        <div className="flex items-center space-x-2">
          <select
            value={selectedWorkflowId}
            onChange={(e) => setSelectedWorkflowId(e.target.value)}
            className="text-xs px-2.5 py-1.5 rounded-md border border-zinc-200 bg-white focus:outline-hidden text-zinc-700"
          >
            {workflows.map((w) => (
              <option key={w.workflowId} value={w.workflowId}>
                {w.name}
              </option>
            ))}
          </select>

          <button
            onClick={() => startNewSession(selectedWorkflowId)}
            className="text-xs px-3 py-1.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-800 rounded-md transition-colors"
          >
            Reset
          </button>
        </div>
      </div>

      {submissionSuccess ? (
        <div className="bg-white p-8 rounded-lg border border-zinc-200 text-center shadow-2xs space-y-3">
          <CheckCircle2 className="w-8 h-8 text-zinc-900 mx-auto" />
          <h2 className="text-base font-semibold text-zinc-900">Record Submitted & Saved</h2>
          <p className="text-xs text-zinc-500 max-w-sm mx-auto">
            Submission ID: <span className="font-mono text-zinc-800">{submissionSuccess}</span>
          </p>
          <div className="flex justify-center space-x-2 pt-2">
            <button
              onClick={() => startNewSession(selectedWorkflowId)}
              className="px-3.5 py-1.5 bg-zinc-900 text-white text-xs font-medium rounded-md hover:bg-zinc-800 transition-colors"
            >
              Start Next Session
            </button>
            {onViewSubmission && (
              <button
                onClick={() => onViewSubmission(submissionSuccess)}
                className="px-3.5 py-1.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-800 text-xs font-medium rounded-md transition-colors"
              >
                View Record
              </button>
            )}
          </div>
        </div>
      ) : (
        /* Split Screen */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* Left Column: Operator Input */}
          <div className="lg:col-span-6 bg-white rounded-lg border border-zinc-200 shadow-2xs flex flex-col h-[600px] overflow-hidden">
            <div className="p-3.5 border-b border-zinc-100 flex items-center justify-between">
              <div>
                <h3 className="text-xs font-semibold text-zinc-900">Transcript & Rapid Notes</h3>
                <p className="text-[11px] text-zinc-400">Natural language multi-field extraction</p>
              </div>
              <span className="text-[11px] text-zinc-400 font-mono">Gemini Flash</span>
            </div>

            {/* Messages Scroll Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-zinc-50/40">
              {session?.messages.map((m) => (
                <div
                  key={m.id}
                  className={`p-3 rounded-md text-xs leading-relaxed ${
                    m.role === 'operator' || m.role === 'user'
                      ? 'bg-zinc-100 text-zinc-900 border border-zinc-200/60 ml-4'
                      : 'bg-white text-zinc-800 border border-zinc-200 mr-4 shadow-2xs'
                  }`}
                >
                  <div className="flex items-center justify-between text-[10px] text-zinc-400 mb-1 font-mono">
                    <span>{m.role === 'assistant' ? 'System' : 'Note'}</span>
                    <span>
                      {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <div>{m.content}</div>

                  {/* Interactive Disambiguation / Quick Decision for Operator */}
                  {m.interactiveDisambiguation && m.interactiveDisambiguation.options.length > 0 && (
                    <div className="mt-2.5 pt-2 border-t border-zinc-200/60 space-y-1">
                      {m.interactiveDisambiguation.title && (
                        <div className="text-[11px] font-semibold text-zinc-900 flex items-center gap-1">
                          <span>🤔</span>
                          <span>{m.interactiveDisambiguation.title}</span>
                        </div>
                      )}
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {m.interactiveDisambiguation.options.map((opt, optIdx) => (
                          <button
                            key={optIdx}
                            type="button"
                            disabled={isProcessing}
                            onClick={async () => {
                              const sendText = opt.actionText || opt.label;
                              if (!session) return;
                              setIsProcessing(true);
                              try {
                                const res = await api.sendSessionMessage(session.id, sendText, 'operator');
                                setSession(res.session);
                                setProgress(res.progress);
                              } catch (err) {
                                console.error(err);
                              } finally {
                                setIsProcessing(false);
                              }
                            }}
                            className={`px-2 py-1 rounded text-xs font-medium transition-all shadow-2xs text-left ${
                              opt.value === true
                                ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                                : opt.value === false
                                ? 'bg-zinc-200 hover:bg-zinc-300 text-zinc-800'
                                : 'bg-zinc-900 hover:bg-zinc-800 text-white'
                            }`}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {m.structuredExtraction?.extractedFields &&
                    m.structuredExtraction.extractedFields.length > 0 && (
                      <div className="mt-2 pt-1.5 border-t border-zinc-200 text-[10px] flex flex-wrap gap-1">
                        {m.structuredExtraction.extractedFields.map((f, idx) => (
                          <span
                            key={idx}
                            className="bg-zinc-200 text-zinc-800 px-1.5 py-0.5 rounded font-mono"
                          >
                            {f.fieldKey}: {typeof f.value === 'object' ? JSON.stringify(f.value) : String(f.value)}
                          </span>
                        ))}
                      </div>
                    )}
                </div>
              ))}

              {/* Optimistic pending operator note bubble */}
              {pendingNoteText && (
                <div className="p-3 rounded-md text-xs leading-relaxed bg-zinc-900 text-white border border-zinc-800 ml-4 animate-in fade-in slide-in-from-bottom-2 duration-200">
                  <div className="flex items-center justify-between text-[10px] text-zinc-400 mb-1 font-mono">
                    <span>Note (Processing)</span>
                    <span className="flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-zinc-400 animate-ping inline-block" />
                      <span>Extracting slots...</span>
                    </span>
                  </div>
                  <div>{pendingNoteText}</div>
                </div>
              )}

              {/* Processing Wave Indicator */}
              {isProcessing && (
                <div className="p-3 rounded-md text-xs bg-white text-zinc-800 border border-zinc-200 mr-4 shadow-2xs space-y-2 animate-in fade-in duration-200">
                  <div className="flex items-center justify-between text-[10px] text-zinc-400 font-mono">
                    <span className="font-semibold text-zinc-700">CollectAI Intake Engine</span>
                    <span className="flex items-center gap-1 text-zinc-500">
                      <Loader2 className="w-3 h-3 animate-spin text-zinc-600" />
                      <span>Gemini Flash</span>
                    </span>
                  </div>

                  <div className="flex items-center space-x-1.5 py-0.5">
                    <span className="w-2 h-2 rounded-full bg-zinc-900 animate-bounce [animation-delay:-0.3s]" />
                    <span className="w-2 h-2 rounded-full bg-zinc-700 animate-bounce [animation-delay:-0.15s]" />
                    <span className="w-2 h-2 rounded-full bg-zinc-400 animate-bounce" />
                    <span className="text-[11px] font-medium text-zinc-600 ml-1.5">
                      {operatorStepMessages[operatorStep]}
                    </span>
                  </div>

                  {/* Progress Line */}
                  <div className="w-full bg-zinc-100 rounded-full h-1 overflow-hidden">
                    <div
                      className="bg-zinc-900 h-1 rounded-full transition-all duration-500"
                      style={{ width: `${(operatorStep + 1) * 33}%` }}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Quick Fill & Input */}
            <form onSubmit={handleSendMessage} className="p-3 border-t border-zinc-200 bg-white space-y-2">
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder="Drop a rapid-fire multi-field note (e.g., 'Ramesh Kumar, 62, pension, Jaipur')..."
                  className="flex-1 text-xs px-3 py-2 rounded-md border border-zinc-200 focus:border-zinc-400 focus:outline-hidden bg-zinc-50/50 placeholder:text-zinc-400 placeholder:italic"
                  disabled={isProcessing}
                />
                <button
                  type="submit"
                  disabled={isProcessing || !inputText.trim()}
                  className="px-3.5 py-2 bg-zinc-900 hover:bg-zinc-800 disabled:opacity-40 text-white text-xs font-medium rounded-md transition-colors shrink-0 flex items-center gap-1.5 min-w-[85px] justify-center"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Extracting...</span>
                    </>
                  ) : (
                    <span>⚡ Extract</span>
                  )}
                </button>
              </div>

              {/* Quick Fill Presets */}
              <div className="flex items-center space-x-1.5 text-[11px] text-zinc-500 overflow-x-auto">
                <span className="text-zinc-500 font-medium shrink-0">⚡ Shortcuts:</span>
                {workflow?.workflowId === 'wf_csc_service_app' ? (
                  <>
                    <button
                      type="button"
                      onClick={() =>
                        setInputText(
                          'Applicant is Ramesh Kumar, age 62, from Jaipur, applying for Old Age Pension (all credentials verified).'
                        )
                      }
                      className="px-2 py-0.5 rounded bg-zinc-100 hover:bg-zinc-200 text-zinc-700 truncate shrink-0"
                    >
                      👴 Ramesh Kumar (Pension)
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setInputText(
                          'DOB 1962-04-15, phone 9829012345, Aadhaar 482910394819, Bank IFSC SBIN0001420'
                        )
                      }
                      className="px-2 py-0.5 rounded bg-zinc-100 hover:bg-zinc-200 text-zinc-700 truncate shrink-0"
                    >
                      🏦 DOB & Bank Credentials
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() =>
                        setInputText(
                          'Express delivery: 2 paneer tikka pizzas and 1 cold coffee to 21 Vaishali Nagar, Jaipur. Phone 9828112233. Extra seasoning please!'
                        )
                      }
                      className="px-2 py-0.5 rounded bg-zinc-100 hover:bg-zinc-200 text-zinc-700 truncate shrink-0"
                    >
                      🍕 Delivery Feast (2 Pizzas + Coffee)
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setInputText('Dine-in at Table 4. Customer Rohit Malvia, phone 9928334455, hungry and ready!')
                      }
                      className="px-2 py-0.5 rounded bg-zinc-100 hover:bg-zinc-200 text-zinc-700 truncate shrink-0"
                    >
                      🍽️ Dine-in Table 4 (Rohit)
                    </button>
                  </>
                )}
              </div>
            </form>
          </div>

          {/* Right Column: Live Structured Record */}
          <div className="lg:col-span-6 bg-white rounded-lg border border-zinc-200 shadow-2xs p-4 sm:p-5 flex flex-col h-[600px]">
            {/* Header */}
            <div className="pb-3 border-b border-zinc-100">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-semibold text-zinc-900">Structured Record</h3>
                  <p className="text-[11px] text-zinc-400 font-mono tabular-nums">
                    {progress?.completedFields || 0} of {progress?.totalRequired || 0} fields complete
                  </p>
                </div>
                <div className="text-right font-mono tabular-nums text-sm font-semibold text-zinc-900">
                  {progress?.completionPercentage || 0}%
                </div>
              </div>

              <div className="w-full bg-zinc-100 rounded-full h-1.5 mt-2.5 overflow-hidden">
                <div
                  className="bg-zinc-900 h-1.5 rounded-full transition-all duration-300"
                  style={{ width: `${progress?.completionPercentage || 0}%` }}
                />
              </div>
            </div>

            {/* Field Table */}
            <div className="flex-1 overflow-y-auto divide-y divide-zinc-100 mt-2 pr-1">
              {workflow?.fields.map((field) => {
                const state = session?.fieldState[field.key];
                const status = state?.status || 'empty';
                const isNotApplicable = status === 'not_applicable';

                if (isNotApplicable) return null;

                const isEditing = editingFieldKey === field.key;

                return (
                  <div key={field.id} className="py-2.5 text-xs flex items-center justify-between">
                    <div className="flex-1 pr-3">
                      <div className="flex items-center space-x-1.5">
                        <span className="font-medium text-zinc-900">{field.label}</span>
                        {field.required && <span className="text-zinc-400 text-[10px]">*</span>}
                        {state?.source === 'calculated' && (
                          <span className="text-[10px] text-zinc-400 font-mono">
                            (calculated)
                          </span>
                        )}
                      </div>

                      {/* Value Display / Edit Input */}
                      {isEditing ? (
                        <div className="mt-1 relative max-w-sm">
                          <div className="flex items-center space-x-1.5">
                            <input
                              type="text"
                              value={editValue}
                              onFocus={() => setIsSuggestionsOpen(true)}
                              onChange={(e) => {
                                setEditValue(e.target.value);
                                setIsSuggestionsOpen(true);
                              }}
                              className="text-xs px-2 py-1 rounded border border-zinc-300 focus:outline-hidden w-full"
                              autoFocus
                            />
                            <button
                              onClick={() => {
                                handleSaveFieldOverride(field.key);
                                setIsSuggestionsOpen(false);
                              }}
                              className="p-1 text-zinc-700 hover:text-zinc-900 shrink-0"
                              title="Save change"
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => {
                                setEditingFieldKey(null);
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
                        <div className="mt-0.5 text-xs text-zinc-600">
                          {state?.value !== undefined && state?.value !== null && state?.value !== '' ? (
                            typeof state.value === 'object' ? (
                              <pre className="text-[10px] bg-zinc-50 p-1 rounded font-mono text-zinc-700">
                                {JSON.stringify(state.value, null, 2)}
                              </pre>
                            ) : (
                              <span className="font-mono text-zinc-900">{String(state.value)}</span>
                            )
                          ) : (
                            <span className="text-zinc-300 italic">Not provided</span>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center space-x-2 shrink-0">
                      <span className="inline-block w-1.5 h-1.5 rounded-full mr-1" style={{
                        backgroundColor: status === 'valid' ? '#18181b' : status === 'needs_confirmation' ? '#d97706' : '#d4d4d8'
                      }} />

                      <button
                        onClick={() => {
                          setEditingFieldKey(field.key);
                          setEditValue(state?.value || '');
                        }}
                        className="p-1 text-zinc-400 hover:text-zinc-700 rounded transition-colors"
                      >
                        <Edit2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Bottom Actions */}
            <div className="pt-3 border-t border-zinc-100 flex items-center justify-between">
              <div className="text-[11px] text-zinc-400">
                {progress?.isComplete ? 'Ready for submission' : 'Awaiting fields'}
              </div>

              <button
                onClick={handleSubmit}
                disabled={isProcessing}
                className="inline-flex items-center space-x-1.5 px-3.5 py-1.5 bg-zinc-900 hover:bg-zinc-800 disabled:opacity-40 text-white text-xs font-medium rounded-md transition-colors shadow-2xs"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Processing...</span>
                  </>
                ) : (
                  <>
                    <span>Complete & Save</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
