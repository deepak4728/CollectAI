import React, { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import { Submission, CollectionSession, WorkflowSchema } from '../../types';
import {
  ArrowLeft,
  Calendar,
  User,
  ShieldCheck,
  CheckCircle2,
  FileText,
  MessageSquare,
  Code2,
  Download,
} from 'lucide-react';

interface SubmissionDetailPageProps {
  submissionId: string;
  onBack: () => void;
}

export const SubmissionDetailPage: React.FC<SubmissionDetailPageProps> = ({
  submissionId,
  onBack,
}) => {
  const [submission, setSubmission] = useState<Submission | null>(null);
  const [session, setSession] = useState<CollectionSession | null>(null);
  const [workflow, setWorkflow] = useState<WorkflowSchema | null>(null);
  const [activeTab, setActiveTab] = useState<'fields' | 'transcript' | 'json'>('fields');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setIsLoading(true);
      try {
        const res = await api.getSubmissionDetail(submissionId);
        setSubmission(res.submission);
        setSession(res.session);
        setWorkflow(res.workflow);
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, [submissionId]);

  if (isLoading || !submission) {
    return <div className="py-20 text-center text-xs text-gray-400">Loading record details...</div>;
  }

  const data = submission.structuredData || {};

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-2xs flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <button
            onClick={onBack}
            className="inline-flex items-center space-x-1.5 text-xs text-gray-500 hover:text-gray-800 font-semibold mb-2"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Submissions</span>
          </button>
          <h1 className="text-xl font-bold text-gray-900 tracking-tight">
            Record: {submission.respondentName || submission.id}
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Workflow: <span className="font-semibold text-gray-700">{submission.workflowName}</span> (v{submission.workflowVersion})
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
            <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
            Validated & Stored
          </span>
          <button
            onClick={() => window.print()}
            className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs font-semibold"
          >
            Print Record
          </button>
        </div>
      </div>

      {/* Record Overview Meta Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-gray-200 text-xs">
          <span className="text-gray-400 block text-[10px] uppercase font-bold">Submission ID</span>
          <span className="font-mono text-gray-800 font-semibold truncate block mt-0.5">
            {submission.id}
          </span>
        </div>
        <div className="bg-white p-4 rounded-xl border border-gray-200 text-xs">
          <span className="text-gray-400 block text-[10px] uppercase font-bold">Recorded By</span>
          <span className="text-gray-800 font-semibold block mt-0.5">
            {submission.submittedBy || 'Public Form'}
          </span>
        </div>
        <div className="bg-white p-4 rounded-xl border border-gray-200 text-xs">
          <span className="text-gray-400 block text-[10px] uppercase font-bold">Submitted At</span>
          <span className="text-gray-800 font-semibold block mt-0.5">
            {new Date(submission.submittedAt).toLocaleString()}
          </span>
        </div>
        <div className="bg-white p-4 rounded-xl border border-gray-200 text-xs">
          <span className="text-gray-400 block text-[10px] uppercase font-bold">Tenant Isolation</span>
          <span className="text-indigo-600 font-semibold font-mono block mt-0.5 truncate">
            {submission.organizationId}
          </span>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 flex space-x-6 text-xs font-bold">
        <button
          onClick={() => setActiveTab('fields')}
          className={`pb-3 flex items-center space-x-1.5 transition ${
            activeTab === 'fields'
              ? 'border-b-2 border-indigo-600 text-indigo-600'
              : 'text-gray-500 hover:text-gray-800'
          }`}
        >
          <FileText className="w-3.5 h-3.5" />
          <span>Structured Fields ({Object.keys(data).length})</span>
        </button>

        <button
          onClick={() => setActiveTab('transcript')}
          className={`pb-3 flex items-center space-x-1.5 transition ${
            activeTab === 'transcript'
              ? 'border-b-2 border-indigo-600 text-indigo-600'
              : 'text-gray-500 hover:text-gray-800'
          }`}
        >
          <MessageSquare className="w-3.5 h-3.5" />
          <span>Intake Transcript ({session?.messages.length || 0})</span>
        </button>

        <button
          onClick={() => setActiveTab('json')}
          className={`pb-3 flex items-center space-x-1.5 transition ${
            activeTab === 'json'
              ? 'border-b-2 border-indigo-600 text-indigo-600'
              : 'text-gray-500 hover:text-gray-800'
          }`}
        >
          <Code2 className="w-3.5 h-3.5" />
          <span>Raw JSON Payload</span>
        </button>
      </div>

      {/* Tab 1: Structured Fields */}
      {activeTab === 'fields' && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-2xs divide-y divide-gray-100 overflow-hidden">
          {Object.entries(data).map(([key, val]) => {
            const meta = submission.fieldSources?.[key];
            const schemaField = workflow?.fields.find((f) => f.key === key);

            return (
              <div key={key} className="p-4 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:bg-gray-50 transition">
                <div className="sm:w-1/3">
                  <div className="font-bold text-gray-900">
                    {schemaField ? schemaField.label : key}
                  </div>
                  <span className="font-mono text-[10px] text-gray-400">{key}</span>
                  {schemaField?.sensitive && (
                    <span className="ml-2 text-[10px] bg-rose-50 text-rose-700 px-1.5 py-0.5 rounded border border-rose-200 font-semibold">
                      Sensitive Data
                    </span>
                  )}
                </div>

                <div className="sm:w-1/2 font-mono text-gray-800">
                  {typeof val === 'object' ? (
                    <pre className="text-[11px] bg-gray-50 p-2 rounded border border-gray-200 overflow-x-auto">
                      {JSON.stringify(val, null, 2)}
                    </pre>
                  ) : typeof val === 'boolean' ? (
                    val ? 'Yes (True)' : 'No (False)'
                  ) : (
                    String(val)
                  )}
                </div>

                <div className="sm:w-1/6 text-right text-[11px]">
                  <span className="text-gray-500 capitalize bg-gray-100 px-2 py-0.5 rounded">
                    {meta?.source || 'user_input'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Tab 2: Transcript */}
      {activeTab === 'transcript' && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-2xs p-5 space-y-3">
          {session?.messages && session.messages.length > 0 ? (
            session.messages.map((m) => (
              <div
                key={m.id}
                className={`p-3.5 rounded-xl text-xs max-w-xl ${
                  m.role === 'user' || m.role === 'operator'
                    ? 'bg-indigo-50 border border-indigo-200 text-indigo-900 ml-auto'
                    : 'bg-gray-50 border border-gray-200 text-gray-800'
                }`}
              >
                <div className="font-bold text-[10px] text-gray-400 uppercase tracking-wider mb-1">
                  {m.role} • {new Date(m.createdAt).toLocaleTimeString()}
                </div>
                <div className="whitespace-pre-wrap">{m.content}</div>
              </div>
            ))
          ) : (
            <div className="py-12 text-center text-xs text-gray-400">
              No conversational transcript attached (completed via direct form).
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Raw JSON */}
      {activeTab === 'json' && (
        <div className="bg-gray-900 text-emerald-400 p-5 rounded-xl font-mono text-xs overflow-auto shadow-2xs">
          <pre>{JSON.stringify(submission, null, 2)}</pre>
        </div>
      )}
    </div>
  );
};
