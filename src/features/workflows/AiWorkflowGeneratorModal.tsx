import React, { useState } from 'react';
import { api } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import { Sparkles, Loader2, Check, ArrowRight } from 'lucide-react';
import { WorkflowSchema } from '../../types';

interface AiWorkflowGeneratorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectGeneratedSchema: (schema: Partial<WorkflowSchema>) => void;
}

const EXAMPLE_REQUIREMENTS = [
  'Create a workflow for a CSC operator collecting information for a citizen pension application. Collect personal details, date of birth, identity documents, and conditional bank information only for welfare services.',
  'Restaurant order workflow for dine-in, takeaway, and delivery. If delivery, require address. If dine-in, require table number. Collect food items with quantity, coupon code, and payment method.',
  'Clinic patient registration collecting medical history, allergies, emergency contact, and insurance policy details with conditional guardian info for minors.',
];

export const AiWorkflowGeneratorModal: React.FC<AiWorkflowGeneratorModalProps> = ({
  isOpen,
  onClose,
  onSelectGeneratedSchema,
}) => {
  const { organization } = useAuth();
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedDraft, setGeneratedDraft] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    setIsGenerating(true);
    setError(null);
    try {
      const res = await api.generateWorkflowAi(prompt, organization?.id);
      if (res.draftSchema) {
        setGeneratedDraft(res.draftSchema);
      } else {
        throw new Error('No schema returned');
      }
    } catch (e: any) {
      setError(e.message || 'Failed to generate workflow with AI');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleApply = () => {
    if (generatedDraft) {
      onSelectGeneratedSchema(generatedDraft);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-2xs flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full p-6 max-h-[90vh] flex flex-col">
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-3 border-b border-gray-100">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-gray-900">AI Workflow Generator</h3>
              <p className="text-[11px] text-gray-500">Powered by Gemini 3.8 Flash</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 font-bold text-sm"
          >
            ✕
          </button>
        </div>

        {/* Content Body */}
        <div className="mt-4 flex-1 overflow-y-auto space-y-4">
          {!generatedDraft ? (
            <>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                  Describe your data collection requirement in natural language:
                </label>
                <textarea
                  rows={4}
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="e.g. Create a workflow for a CSC operator collecting information for a pension application. Collect personal details, contact details, identity documents, bank information, and eligibility information..."
                  className="w-full text-xs p-3 rounded-lg border border-gray-300 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 focus:outline-hidden"
                />
              </div>

              {/* Example Prompts */}
              <div>
                <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                  Quick Examples:
                </span>
                <div className="mt-2 space-y-2">
                  {EXAMPLE_REQUIREMENTS.map((ex, i) => (
                    <button
                      key={i}
                      onClick={() => setPrompt(ex)}
                      className="w-full text-left p-2.5 rounded-lg border border-gray-200 hover:border-purple-300 hover:bg-purple-50/50 text-xs text-gray-700 transition"
                    >
                      {ex}
                    </button>
                  ))}
                </div>
              </div>

              {error && (
                <div className="text-xs text-rose-600 bg-rose-50 p-2.5 rounded-md border border-rose-200">
                  {error}
                </div>
              )}
            </>
          ) : (
            /* Generated Schema Preview */
            <div className="space-y-4">
              <div className="bg-purple-50/70 p-4 rounded-lg border border-purple-200">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-purple-900">{generatedDraft.name}</h4>
                  <span className="text-[10px] bg-purple-200 text-purple-800 px-2 py-0.5 rounded font-semibold">
                    {generatedDraft.fields?.length || 0} Fields Generated
                  </span>
                </div>
                <p className="text-[11px] text-purple-700 mt-1">{generatedDraft.description}</p>
              </div>

              <div>
                <h5 className="text-xs font-bold text-gray-800 mb-2">Generated Field Sequence:</h5>
                <div className="space-y-1.5 max-h-56 overflow-y-auto">
                  {generatedDraft.fields?.map((f: any, idx: number) => (
                    <div
                      key={idx}
                      className="p-2 rounded bg-gray-50 border border-gray-200 flex items-center justify-between text-xs"
                    >
                      <div>
                        <span className="font-semibold text-gray-900">{f.label}</span>
                        <span className="text-[10px] text-gray-400 font-mono ml-2">({f.key})</span>
                      </div>
                      <div className="flex items-center space-x-2 text-[10px]">
                        <span className="bg-white px-1.5 py-0.5 rounded border border-gray-200 text-gray-600 capitalize">
                          {f.type}
                        </span>
                        {f.required && (
                          <span className="text-rose-600 font-semibold">• Required</span>
                        )}
                        {f.visibleWhen && (
                          <span className="text-amber-600 font-semibold">• Conditional</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between">
          <button
            onClick={() => {
              if (generatedDraft) {
                setGeneratedDraft(null);
              } else {
                onClose();
              }
            }}
            className="text-xs text-gray-600 hover:text-gray-900"
          >
            {generatedDraft ? '← Try another requirement' : 'Cancel'}
          </button>

          {!generatedDraft ? (
            <button
              onClick={handleGenerate}
              disabled={isGenerating || !prompt.trim()}
              className="inline-flex items-center space-x-1.5 px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white text-xs font-semibold rounded-lg shadow-xs transition"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Synthesizing Schema...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Generate Schema</span>
                </>
              )}
            </button>
          ) : (
            <button
              onClick={handleApply}
              className="inline-flex items-center space-x-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg shadow-xs transition"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Load into Workflow Builder</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
