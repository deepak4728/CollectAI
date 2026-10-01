import React, { useState, useRef, useEffect } from 'react';
import { WorkflowSchema, FieldState, ChatMessage } from '../../types';
import {
  Send,
  CheckCircle2,
  Loader2,
  ArrowRight,
  Sparkles,
} from 'lucide-react';

interface ConversationalCollectorProps {
  workflow: WorkflowSchema;
  fieldState: Record<string, FieldState>;
  messages: ChatMessage[];
  onSendMessage: (text: string) => Promise<void>;
  onSubmit: () => Promise<void>;
  isSubmitting?: boolean;
  completionPercentage: number;
  isComplete: boolean;
}

export const ConversationalCollector: React.FC<ConversationalCollectorProps> = ({
  workflow,
  fieldState,
  messages,
  onSendMessage,
  onSubmit,
  isSubmitting = false,
  completionPercentage,
  isComplete,
}) => {
  const [inputText, setInputText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [pendingText, setPendingText] = useState<string | null>(null);
  const [loadingStep, setLoadingStep] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isSending, pendingText, loadingStep]);

  // Dynamic progress status text when processing natural language
  useEffect(() => {
    if (!isSending) {
      setLoadingStep(0);
      return;
    }

    const interval = setInterval(() => {
      setLoadingStep((prev) => (prev + 1) % 3);
    }, 750);

    return () => clearInterval(interval);
  }, [isSending]);

  const loadingStepsText = [
    'Parsing message & matching schema fields...',
    'Running deterministic validation rules...',
    'Updating structured record...',
  ];

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || isSending) return;
    const text = inputText.trim();
    setInputText('');
    setPendingText(text);
    setIsSending(true);
    try {
      await onSendMessage(text);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSending(false);
      setPendingText(null);
    }
  };

  const handleSendChip = async (text: string) => {
    if (isSending) return;
    setPendingText(text);
    setIsSending(true);
    try {
      await onSendMessage(text);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSending(false);
      setPendingText(null);
    }
  };

  const samplePrompts =
    workflow.workflowId === 'wf_restaurant_order'
      ? [
          '🍕 Delivery express: 2 paneer tikka pizzas & 1 cold coffee to 21 Vaishali Nagar, Jaipur. Reach me at 9828112233 (hunger level: maximum)!',
          '🍽️ Table for foodies: Dine-in table 4, Rohit Malvia, 9928334455. Surprise chef specials welcome.',
        ]
      : [
          '🏛️ Citizen dispatch: Applicant is Ramesh Kumar, DOB 1962-04-15, Jaipur — filing for Old Age Pension with all haste.',
          '📑 Verified credentials: Phone 9829012345, Aadhaar 482910394819, Bank IFSC SBIN0001420. Ready for audit!',
        ];

  return (
    <div className="flex flex-col h-[580px] bg-white rounded-lg border border-zinc-200 shadow-2xs overflow-hidden">
      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3 bg-zinc-50/40">
        {messages.map((msg) => {
          const isUser = msg.role === 'user';
          const isOperator = msg.role === 'operator';

          return (
            <div
              key={msg.id}
              className={`flex items-start space-x-2.5 ${isUser || isOperator ? 'justify-end' : 'justify-start'}`}
            >
              {!isUser && !isOperator && (
                <div className="w-6 h-6 rounded bg-zinc-900 text-white flex items-center justify-center shrink-0 text-[10px] font-semibold mt-0.5">
                  AI
                </div>
              )}

              <div
                className={`max-w-[85%] sm:max-w-[75%] rounded-lg px-3.5 py-2.5 text-xs leading-relaxed ${
                  isUser
                    ? 'bg-zinc-900 text-white'
                    : isOperator
                    ? 'bg-zinc-800 text-white'
                    : 'bg-white text-zinc-800 border border-zinc-200 shadow-2xs'
                }`}
              >
                <div className="whitespace-pre-wrap">{msg.content}</div>

                {/* Interactive Disambiguation Block (Yes/No or Multiple Category Options) */}
                {msg.interactiveDisambiguation && msg.interactiveDisambiguation.options.length > 0 && (
                  <div className="mt-3 pt-2 border-t border-zinc-200/60 space-y-1.5">
                    {msg.interactiveDisambiguation.title && (
                      <div className="text-[11px] font-semibold text-zinc-900 flex items-center gap-1">
                        <span>🤔</span>
                        <span>{msg.interactiveDisambiguation.title}</span>
                      </div>
                    )}
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {msg.interactiveDisambiguation.options.map((opt, optIdx) => (
                        <button
                          key={optIdx}
                          type="button"
                          disabled={isSending}
                          onClick={() => {
                            const sendText = opt.actionText || opt.label;
                            handleSendChip(sendText);
                          }}
                          className={`px-2.5 py-1.5 rounded-md text-xs font-medium transition-all shadow-2xs text-left flex items-center gap-1.5 ${
                            opt.value === true
                              ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                              : opt.value === false
                              ? 'bg-zinc-200 hover:bg-zinc-300 text-zinc-800'
                              : 'bg-zinc-900 hover:bg-zinc-800 text-white hover:scale-[1.02]'
                          }`}
                        >
                          <span>{opt.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Structured Extraction summary */}
                {msg.structuredExtraction?.extractedFields &&
                  msg.structuredExtraction.extractedFields.length > 0 && (
                    <div className="mt-2 pt-1.5 border-t border-zinc-200/40 text-[11px] space-y-1">
                      <div className="text-zinc-400">Captured:</div>
                      <div className="flex flex-wrap gap-1">
                        {msg.structuredExtraction.extractedFields.map((f: any, i: number) => (
                          <span
                            key={i}
                            className={`px-1.5 py-0.5 rounded text-[10px] font-mono ${
                              isUser ? 'bg-zinc-800 text-zinc-300' : 'bg-zinc-100 text-zinc-700'
                            }`}
                          >
                            {f.fieldKey}: {typeof f.value === 'object' ? JSON.stringify(f.value) : String(f.value)}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                <div
                  className={`text-[10px] mt-1 text-right font-mono tabular-nums ${
                    isUser || isOperator ? 'text-zinc-400' : 'text-zinc-400'
                  }`}
                >
                  {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            </div>
          );
        })}

        {/* Optimistic pending message bubble while server is processing */}
        {pendingText && (
          <div className="flex items-start space-x-2.5 justify-end animate-in fade-in slide-in-from-bottom-2 duration-200">
            <div className="max-w-[85%] sm:max-w-[75%] rounded-lg px-3.5 py-2.5 text-xs leading-relaxed bg-zinc-900 text-white shadow-sm border border-zinc-800">
              <div className="whitespace-pre-wrap">{pendingText}</div>
              <div className="text-[10px] mt-1 text-right font-mono text-zinc-400 flex items-center justify-end gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-zinc-400 animate-ping inline-block" />
                <span>Sending...</span>
              </div>
            </div>
          </div>
        )}

        {/* Dynamic AI Processing Indicator */}
        {isSending && (
          <div className="flex items-start space-x-2.5 justify-start animate-in fade-in duration-200">
            <div className="w-6 h-6 rounded bg-zinc-900 text-white flex items-center justify-center shrink-0 text-[10px] font-semibold mt-0.5 shadow-2xs">
              AI
            </div>

            <div className="bg-white border border-zinc-200 rounded-lg px-3.5 py-3 text-xs shadow-2xs max-w-[85%] sm:max-w-[75%] space-y-2">
              {/* Pulsing typing wave dots */}
              <div className="flex items-center space-x-1.5 py-0.5">
                <span className="w-2 h-2 rounded-full bg-zinc-900 animate-bounce [animation-delay:-0.3s]" />
                <span className="w-2 h-2 rounded-full bg-zinc-700 animate-bounce [animation-delay:-0.15s]" />
                <span className="w-2 h-2 rounded-full bg-zinc-400 animate-bounce" />
                <span className="ml-2 text-[11px] font-medium text-zinc-700">CollectAI Intake Engine</span>
              </div>

              {/* Progress step label */}
              <div className="text-[11px] text-zinc-500 font-mono flex items-center gap-1.5 pt-0.5">
                <Loader2 className="w-3 h-3 animate-spin text-zinc-600 shrink-0" />
                <span className="transition-all duration-300">
                  {loadingStepsText[loadingStep]}
                </span>
              </div>

              {/* Animated Progress Bar */}
              <div className="w-full bg-zinc-100 rounded-full h-1 overflow-hidden">
                <div
                  className="bg-zinc-900 h-1 rounded-full transition-all duration-500"
                  style={{ width: `${(loadingStep + 1) * 33}%` }}
                />
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Completion Bar */}
      {isComplete && (
        <div className="p-3 bg-zinc-50 border-t border-zinc-200 flex items-center justify-between">
          <div className="flex items-center space-x-2 text-xs text-zinc-800 font-medium">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>All required information collected</span>
          </div>

          <button
            onClick={onSubmit}
            disabled={isSubmitting}
            className="inline-flex items-center space-x-1.5 px-3.5 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-medium rounded-md transition-colors shadow-2xs disabled:opacity-50"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Submitting...</span>
              </>
            ) : (
              <>
                <span>Complete & Submit</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </>
            )}
          </button>
        </div>
      )}

      {/* Prompt Suggestions */}
      {messages.length <= 2 && (
        <div className="px-3.5 py-2.5 bg-zinc-50/80 border-t border-zinc-100 flex items-center space-x-2 overflow-x-auto text-[11px] text-zinc-500">
          <span className="shrink-0 font-medium text-zinc-600 flex items-center gap-1">
            <span>✨</span>
            <span>Speed-run examples:</span>
          </span>
          {samplePrompts.map((p, idx) => (
            <button
              key={idx}
              type="button"
              disabled={isSending}
              onClick={() => handleSendChip(p)}
              className="shrink-0 px-2.5 py-1 rounded-md bg-white hover:bg-zinc-100 text-zinc-700 hover:text-zinc-900 border border-zinc-200 transition-colors text-left shadow-2xs truncate max-w-sm font-medium disabled:opacity-50"
            >
              {p}
            </button>
          ))}
        </div>
      )}

      {/* Message Input Bar */}
      <form onSubmit={handleSend} className="p-2.5 bg-white border-t border-zinc-200 flex items-center space-x-2">
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder={isSending ? "Analyzing and extracting data slots..." : "Speak human, enter data: type a quick sentence or full paragraph..."}
          className="flex-1 text-xs px-3 py-2 rounded-md border border-zinc-200 focus:border-zinc-400 focus:outline-hidden bg-zinc-50/50 placeholder:text-zinc-400 placeholder:italic transition-colors"
          disabled={isSending}
        />

        <button
          type="submit"
          disabled={!inputText.trim() || isSending}
          className="px-3.5 py-2 bg-zinc-900 hover:bg-zinc-800 disabled:opacity-40 text-white text-xs font-medium rounded-md transition-colors shrink-0 flex items-center justify-center min-w-[38px]"
        >
          {isSending ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Send className="w-3.5 h-3.5" />
          )}
        </button>
      </form>
    </div>
  );
};
