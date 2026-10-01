import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../lib/api';
import { WorkflowSchema, Submission } from '../../types';
import {
  ArrowUpRight,
  Headphones,
  CheckCircle2,
} from 'lucide-react';

interface MainDashboardProps {
  onSelectTab: (tab: string) => void;
  onOpenWorkflow: (workflowId: string) => void;
  onStartOperatorSession: (workflowId: string) => void;
  onViewSubmission: (submissionId: string) => void;
}

export const MainDashboard: React.FC<MainDashboardProps> = ({
  onSelectTab,
  onOpenWorkflow,
  onStartOperatorSession,
  onViewSubmission,
}) => {
  const { organization, firebaseUser } = useAuth();
  const [analytics, setAnalytics] = useState<any>(null);
  const [workflows, setWorkflows] = useState<WorkflowSchema[]>([]);
  const [recentSubmissions, setRecentSubmissions] = useState<Submission[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadDashboard() {
      if (!organization) return;
      setIsLoading(true);
      try {
        const [analyticsRes, wfRes, subRes] = await Promise.all([
          api.getAnalytics(organization.id),
          api.getWorkflows(organization.id),
          api.getSubmissions({ orgId: organization.id }),
        ]);
        setAnalytics(analyticsRes);
        setWorkflows(wfRes.workflows || []);
        setRecentSubmissions(subRes.submissions.slice(0, 6));
      } catch (e) {
        console.error('Failed to load dashboard data', e);
      } finally {
        setIsLoading(false);
      }
    }
    loadDashboard();
  }, [organization]);

  const metrics = analytics?.metrics || {
    totalSessions: 4,
    completedSubmissions: 2,
    incompleteSessions: 1,
    completionRate: 85,
    avgCompletionTimeSeconds: 140,
    activeWorkflows: workflows.length,
    totalWorkflows: workflows.length,
  };

  return (
    <div className="space-y-6">
      {/* Workspace Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-zinc-200">
        <div>
          <div className="flex items-center space-x-2 text-xs text-zinc-500 mb-1">
            <span>{organization?.name || 'Workspace'}</span>
            <span>·</span>
            <span>{organization?.industry.replace('_', ' ') || 'General'}</span>
            {firebaseUser && (
              <>
                <span>·</span>
                <span className="text-zinc-600">Cloud Sync Active</span>
              </>
            )}
          </div>
          <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-zinc-900">
            Overview
          </h1>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => onSelectTab('operator-mode')}
            className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-md bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-medium transition-colors shadow-2xs"
          >
            <Headphones className="w-3.5 h-3.5" />
            <span>Start Intake</span>
          </button>
        </div>
      </div>

      {/* Metrics Row (Zero-Pill, Tabular Numbers) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white p-4 rounded-lg border border-zinc-200 shadow-2xs">
          <p className="text-xs text-zinc-500 font-medium">Active Workflows</p>
          <div className="text-2xl font-semibold tracking-tight text-zinc-900 mt-1 font-mono tabular-nums">
            {workflows.length}
          </div>
          <p className="text-[11px] text-zinc-400 mt-1">Ready for collection</p>
        </div>

        <div className="bg-white p-4 rounded-lg border border-zinc-200 shadow-2xs">
          <p className="text-xs text-zinc-500 font-medium">Submissions</p>
          <div className="text-2xl font-semibold tracking-tight text-zinc-900 mt-1 font-mono tabular-nums">
            {metrics.completedSubmissions}
          </div>
          <p className="text-[11px] text-zinc-400 mt-1">Deterministic validation</p>
        </div>

        <div className="bg-white p-4 rounded-lg border border-zinc-200 shadow-2xs">
          <p className="text-xs text-zinc-500 font-medium">Completion Rate</p>
          <div className="text-2xl font-semibold tracking-tight text-zinc-900 mt-1 font-mono tabular-nums">
            {metrics.completionRate}%
          </div>
          <p className="text-[11px] text-zinc-400 mt-1 font-mono tabular-nums">Avg {metrics.avgCompletionTimeSeconds}s</p>
        </div>

        <div className="bg-white p-4 rounded-lg border border-zinc-200 shadow-2xs">
          <p className="text-xs text-zinc-500 font-medium">Intake Engine</p>
          <div className="text-sm font-semibold tracking-tight text-zinc-800 mt-2">
            Deterministic + Gemini Flash
          </div>
          <p className="text-[11px] text-zinc-400 mt-1">Auto extraction & schema rules</p>
        </div>
      </div>

      {/* Primary Intake Workflows */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-semibold text-zinc-900 tracking-tight">Available Workflows</h2>
          <button
            onClick={() => onSelectTab('workflows')}
            className="text-xs text-zinc-500 hover:text-zinc-900 transition-colors"
          >
            Manage workflows →
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {workflows.map((wf) => (
            <div
              key={wf.workflowId}
              onClick={() => onStartOperatorSession(wf.workflowId)}
              className="bg-white p-4 rounded-lg border border-zinc-200 hover:border-zinc-300 hover:shadow-2xs cursor-pointer transition-all group flex items-start justify-between"
            >
              <div className="space-y-1">
                <div className="flex items-center space-x-2">
                  <h3 className="text-sm font-semibold text-zinc-900 group-hover:text-zinc-700 transition-colors">
                    {wf.name}
                  </h3>
                </div>
                <p className="text-xs text-zinc-500 line-clamp-1 max-w-md">
                  {wf.description}
                </p>
                <div className="flex items-center space-x-2 text-[11px] text-zinc-400 pt-1 font-mono tabular-nums">
                  <span>{wf.fields?.length || 0} fields</span>
                  <span>·</span>
                  <span>v{wf.version}</span>
                </div>
              </div>

              <span className="p-1.5 rounded text-zinc-400 group-hover:text-zinc-800 group-hover:bg-zinc-50 transition-colors">
                <ArrowUpRight className="w-4 h-4" />
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Submissions Table */}
      <div className="bg-white rounded-lg border border-zinc-200 shadow-2xs overflow-hidden">
        <div className="p-4 border-b border-zinc-100 flex items-center justify-between">
          <div>
            <h2 className="text-xs font-semibold text-zinc-900">Recent Submissions</h2>
            <p className="text-[11px] text-zinc-500">Collected records stored in local store and cloud</p>
          </div>
          <button
            onClick={() => onSelectTab('submissions')}
            className="text-xs text-zinc-600 hover:text-zinc-900 font-medium transition-colors"
          >
            All records →
          </button>
        </div>

        {recentSubmissions.length === 0 ? (
          <div className="py-12 text-center text-xs text-zinc-400">
            No submissions recorded yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-zinc-50/70 border-b border-zinc-100 text-zinc-500 text-[11px] font-medium">
                <tr>
                  <th className="py-2.5 px-4 font-normal">Respondent</th>
                  <th className="py-2.5 px-4 font-normal">Workflow</th>
                  <th className="py-2.5 px-4 font-normal">Status</th>
                  <th className="py-2.5 px-4 font-normal">Submitted</th>
                  <th className="py-2.5 px-4 text-right font-normal">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {recentSubmissions.map((sub) => (
                  <tr key={sub.id} className="hover:bg-zinc-50/50 transition-colors">
                    <td className="py-3 px-4 font-medium text-zinc-900">
                      {sub.respondentName || 'Anonymous'}
                    </td>
                    <td className="py-3 px-4 text-zinc-600">{sub.workflowName}</td>
                    <td className="py-3 px-4 text-zinc-600 capitalize">
                      <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5 align-middle" />
                      {sub.status.replace('_', ' ')}
                    </td>
                    <td className="py-3 px-4 text-zinc-400 text-[11px] font-mono tabular-nums">
                      {new Date(sub.submittedAt).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => onViewSubmission(sub.id)}
                        className="text-zinc-600 hover:text-zinc-900 font-medium text-xs transition-colors"
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
