import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../lib/api';
import {
  BarChart3,
  TrendingUp,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Bot,
  Sparkles,
  ShoppingBag,
  FileCheck,
} from 'lucide-react';

export const AnalyticsDashboardPage: React.FC = () => {
  const { organization } = useAuth();
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function load() {
      if (!organization) return;
      setIsLoading(true);
      try {
        const res = await api.getAnalytics(organization.id);
        setData(res);
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, [organization]);

  if (isLoading || !data) {
    return <div className="py-20 text-center text-xs text-gray-400">Computing analytics...</div>;
  }

  const { metrics, breakdown, restaurantStats, aiObservations } = data;

  return (
    <div className="space-y-6">
      {/* Page Title */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h1 className="text-xl font-bold text-gray-900 tracking-tight">Analytics & Operational Insights</h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Aggregated metrics derived deterministically from {metrics.totalSessions} intake sessions.
          </p>
        </div>
        <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
          Tenant: {organization?.name}
        </span>
      </div>

      {/* Primary KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-2xs">
          <span className="text-xs font-medium text-gray-500">Overall Completion Rate</span>
          <div className="mt-2 text-2xl font-bold text-gray-900">{metrics.completionRate}%</div>
          <p className="text-[11px] text-emerald-600 font-medium mt-1 flex items-center">
            <TrendingUp className="w-3 h-3 mr-1" />
            High confidence multi-turn intake
          </p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-2xs">
          <span className="text-xs font-medium text-gray-500">Avg Completion Time</span>
          <div className="mt-2 text-2xl font-bold text-gray-900">
            {Math.floor(metrics.avgCompletionTimeSeconds / 60)}m {metrics.avgCompletionTimeSeconds % 60}s
          </div>
          <p className="text-[11px] text-gray-400 mt-1">Across conversational & form modes</p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-2xs">
          <span className="text-xs font-medium text-gray-500">Completed Submissions</span>
          <div className="mt-2 text-2xl font-bold text-gray-900">{metrics.completedSubmissions}</div>
          <p className="text-[11px] text-gray-400 mt-1">{metrics.incompleteSessions} sessions in progress</p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-2xs">
          <span className="text-xs font-medium text-gray-500">Estimated AI Cost</span>
          <div className="mt-2 text-2xl font-bold text-gray-900">
            ${metrics.estimatedAiCostUsd.toFixed(4)}
          </div>
          <p className="text-[11px] text-purple-600 font-medium mt-1">
            {metrics.aiTokensUsed} tokens consumed
          </p>
        </div>
      </div>

      {/* Specialized Section for Restaurant or CSC */}
      {restaurantStats && (
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-2xs space-y-4">
          <div className="flex items-center space-x-2 text-sm font-bold text-gray-900">
            <ShoppingBag className="w-4 h-4 text-indigo-600" />
            <span>Restaurant Financial & Order Analytics</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 text-xs">
              <span className="text-gray-500 block">Total Recorded Revenue</span>
              <span className="text-xl font-bold text-gray-900 block mt-1">
                ₹{restaurantStats.totalRevenue.toLocaleString()}
              </span>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 text-xs">
              <span className="text-gray-500 block">Average Order Value (AOV)</span>
              <span className="text-xl font-bold text-gray-900 block mt-1">
                ₹{restaurantStats.averageOrderValue}
              </span>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 text-xs">
              <span className="text-gray-500 block">Total Orders Processed</span>
              <span className="text-xl font-bold text-gray-900 block mt-1">
                {restaurantStats.ordersCount}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Category Breakdown & Data Quality */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Breakdown by Service / Order Type */}
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-2xs">
          <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider mb-3">
            Intake Volume by Category / Service
          </h3>
          <div className="space-y-3">
            {Object.entries(breakdown).map(([category, count]) => {
              const total = metrics.completedSubmissions || 1;
              const pct = Math.round(((count as number) / total) * 100);
              return (
                <div key={category} className="space-y-1">
                  <div className="flex items-center justify-between text-xs font-medium">
                    <span className="text-gray-800">{category}</span>
                    <span className="text-gray-500">
                      {count as number} ({pct}%)
                    </span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                    <div className="bg-indigo-600 h-2 rounded-full" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Data Quality & Error Prevention */}
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-2xs">
          <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider mb-3">
            Deterministic Validation Safeguards
          </h3>
          <div className="space-y-3 text-xs text-gray-600">
            <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-200 text-emerald-900 flex items-start space-x-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <strong>Zero Unvalidated Writes:</strong> Every field is validated against schema types, min/max bounds, and options before writing to submission database.
              </div>
            </div>
            <div className="p-3 bg-blue-50 rounded-lg border border-blue-200 text-blue-900 flex items-start space-x-2">
              <FileCheck className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
              <div>
                <strong>Deterministic Calculations:</strong> Mathematical formulas (Age from DOB, Taxes, and Discounts) execute strictly in application code, never delegated to LLM hallucination.
              </div>
            </div>
            <div className="p-3 bg-purple-50 rounded-lg border border-purple-200 text-purple-900 flex items-start space-x-2">
              <Sparkles className="w-4 h-4 text-purple-600 shrink-0 mt-0.5" />
              <div>
                <strong>Dynamic Condition Pruning:</strong> Irrelevant fields (e.g. table number for delivery orders) are marked not-applicable and stripped from completion criteria.
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* AI Observations vs Deterministic Metrics */}
      <div className="bg-slate-900 rounded-xl p-5 text-white shadow-sm border border-slate-800">
        <div className="flex items-center space-x-2 text-indigo-400 text-xs font-bold uppercase tracking-wider mb-2">
          <Bot className="w-4 h-4" />
          <span>AI Qualitative Observations</span>
        </div>
        <p className="text-[11px] text-slate-400 mb-3">
          Synthesized by Gemini analyzing cross-session response patterns for this tenant:
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {aiObservations?.map((obs: string, idx: number) => (
            <div
              key={idx}
              className="bg-slate-800/70 p-3.5 rounded-lg border border-slate-700/60 text-xs leading-relaxed text-slate-300"
            >
              <span className="text-indigo-400 font-semibold mr-1.5">Observation {idx + 1}:</span>
              {obs}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
