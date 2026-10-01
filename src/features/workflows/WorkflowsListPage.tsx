import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../lib/api';
import { WorkflowSchema } from '../../types';
import {
  Plus,
  Sparkles,
  Link as LinkIcon,
  Copy,
  Check,
  Edit3,
  Play,
  ArrowUpRight,
} from 'lucide-react';

interface WorkflowsListPageProps {
  onEditWorkflow: (workflowId: string) => void;
  onCreateWorkflow: () => void;
  onOpenAiGenerator: () => void;
  onStartOperatorSession: (workflowId: string) => void;
  onPreviewWorkflow: (workflowId: string) => void;
}

export const WorkflowsListPage: React.FC<WorkflowsListPageProps> = ({
  onEditWorkflow,
  onCreateWorkflow,
  onOpenAiGenerator,
  onStartOperatorSession,
  onPreviewWorkflow,
}) => {
  const { organization } = useAuth();
  const [workflows, setWorkflows] = useState<WorkflowSchema[]>([]);
  const [copiedSlug, setCopiedSlug] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchWorkflows = async () => {
    if (!organization) return;
    setIsLoading(true);
    try {
      const res = await api.getWorkflows(organization.id);
      setWorkflows(res.workflows || []);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchWorkflows();
  }, [organization]);

  const copyPublicLink = (slug: string) => {
    const url = `${window.location.origin}/?collect=${slug}`;
    navigator.clipboard.writeText(url);
    setCopiedSlug(slug);
    setTimeout(() => setCopiedSlug(null), 2000);
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 border-b border-zinc-200">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-zinc-900">
            Workflows
          </h1>
          <p className="text-xs text-zinc-500 mt-0.5">
            Configure schemas to collect through chat, dynamic forms, or operators
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={onOpenAiGenerator}
            title="Generate with AI (Ctrl+Shift+A)"
            className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-md border border-zinc-200 bg-white hover:bg-zinc-50 text-xs font-medium text-zinc-700 transition-colors shadow-2xs"
          >
            <Sparkles className="w-3.5 h-3.5 text-zinc-600" />
            <span>Generate with AI</span>
            <kbd className="hidden md:inline text-[9px] font-mono text-zinc-400 bg-zinc-100 border border-zinc-200 px-1 py-0.2 rounded">Ctrl+Shift+A</kbd>
          </button>

          <button
            onClick={onCreateWorkflow}
            title="Create New Workflow (Ctrl+N)"
            className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-md bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-medium transition-colors shadow-2xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Workflow</span>
            <kbd className="hidden sm:inline text-[9px] font-mono text-zinc-400 bg-zinc-800 border border-zinc-700 px-1 py-0.2 rounded">Ctrl+N</kbd>
          </button>
        </div>
      </div>

      {/* Workflow List */}
      {isLoading ? (
        <div className="py-16 text-center text-xs text-zinc-400">Loading workflows...</div>
      ) : workflows.length === 0 ? (
        <div className="bg-white rounded-lg border border-dashed border-zinc-300 p-12 text-center space-y-3">
          <h3 className="text-sm font-semibold text-zinc-900">No workflows defined yet</h3>
          <p className="text-xs text-zinc-500 max-w-sm mx-auto">
            Create a simple form schema or generate one instantly using Gemini AI.
          </p>
          <div className="flex justify-center space-x-2 pt-1">
            <button
              onClick={onOpenAiGenerator}
              className="px-3.5 py-1.5 bg-zinc-900 text-white text-xs font-medium rounded-md"
            >
              Generate with AI
            </button>
            <button
              onClick={onCreateWorkflow}
              className="px-3.5 py-1.5 bg-zinc-100 text-zinc-700 text-xs font-medium rounded-md hover:bg-zinc-200"
            >
              Build Manually
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {workflows.map((wf) => (
            <div
              key={wf.workflowId}
              className="bg-white rounded-lg border border-zinc-200 shadow-2xs p-4 flex flex-col justify-between hover:border-zinc-300 transition-colors"
            >
              <div className="space-y-2">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-sm font-semibold text-zinc-900">{wf.name}</h3>
                    <p className="text-xs text-zinc-500 line-clamp-2 mt-0.5">{wf.description}</p>
                  </div>
                </div>

                <div className="flex items-center space-x-2 text-[11px] text-zinc-400 font-mono">
                  <span>{wf.fields?.length || 0} fields</span>
                  <span>·</span>
                  <span>/{wf.publicSlug}</span>
                </div>
              </div>

              {/* Simplified Action Footer */}
              <div className="mt-4 pt-3 border-t border-zinc-100 flex items-center justify-between">
                <button
                  onClick={() => onStartOperatorSession(wf.workflowId)}
                  className="inline-flex items-center space-x-1.5 text-xs font-medium text-zinc-900 hover:text-zinc-600 transition-colors"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Start Intake</span>
                </button>

                <div className="flex items-center space-x-1.5">
                  <button
                    onClick={() => copyPublicLink(wf.publicSlug)}
                    title="Copy Public Link"
                    className="p-1.5 text-zinc-400 hover:text-zinc-700 rounded transition-colors"
                  >
                    {copiedSlug === wf.publicSlug ? (
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>

                  <button
                    onClick={() => onEditWorkflow(wf.workflowId)}
                    className="px-2.5 py-1 text-xs text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 rounded transition-colors"
                  >
                    Edit
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
