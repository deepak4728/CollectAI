import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../lib/api';
import { AiUsageRecord } from '../../types';
import { Cpu, Sparkles, ShieldCheck, DollarSign, Database } from 'lucide-react';

export const AiUsagePage: React.FC = () => {
  const { organization } = useAuth();
  const [records, setRecords] = useState<AiUsageRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function load() {
      if (!organization) return;
      setIsLoading(true);
      try {
        const res = await api.getAiUsage(organization.id);
        setRecords(res.records || []);
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, [organization]);

  const totalTokens = records.reduce((acc, r) => acc + r.tokensUsed, 0);
  const totalCost = records.reduce((acc, r) => acc + r.estimatedCostUsd, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-gray-900 tracking-tight">AI Usage & Token Telemetry</h1>
        <p className="text-xs text-gray-500 mt-0.5">
          Real-time tracking of Gemini 3.8 Flash server calls for {organization?.name}.
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-2xs">
          <div className="flex items-center justify-between text-xs text-gray-500 font-medium">
            <span>Total Tokens Consumed</span>
            <Cpu className="w-4 h-4 text-purple-600" />
          </div>
          <div className="mt-2 text-2xl font-bold text-gray-900">
            {totalTokens.toLocaleString()}
          </div>
          <p className="text-[11px] text-gray-400 mt-1">Prompt + Extraction parts</p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-2xs">
          <div className="flex items-center justify-between text-xs text-gray-500 font-medium">
            <span>Estimated Operational Cost</span>
            <DollarSign className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="mt-2 text-2xl font-bold text-gray-900">
            ${totalCost.toFixed(5)}
          </div>
          <p className="text-[11px] text-emerald-600 mt-1 font-medium">
            High efficiency Flash rate
          </p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-2xs">
          <div className="flex items-center justify-between text-xs text-gray-500 font-medium">
            <span>Server Proxy Security</span>
            <ShieldCheck className="w-4 h-4 text-blue-600" />
          </div>
          <div className="mt-2 text-base font-bold text-gray-900">
            100% Server Isolated
          </div>
          <p className="text-[11px] text-gray-400 mt-1">Zero API keys in client bundles</p>
        </div>
      </div>

      {/* Usage Logs Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-2xs overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider">
            AI Invocations History
          </h3>
          <span className="text-[11px] text-gray-500">{records.length} Recorded calls</span>
        </div>

        {records.length === 0 ? (
          <div className="py-12 text-center text-xs text-gray-400">
            No AI requests logged yet for this billing cycle.
          </div>
        ) : (
          <table className="w-full text-left text-xs">
            <thead className="bg-gray-50 border-b border-gray-200 text-gray-500 uppercase text-[10px] font-semibold">
              <tr>
                <th className="py-3 px-4">Invocation ID</th>
                <th className="py-3 px-4">Feature Pipeline</th>
                <th className="py-3 px-4">Tokens</th>
                <th className="py-3 px-4">Est. Cost (USD)</th>
                <th className="py-3 px-4">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 font-mono text-[11px]">
              {records.map((r) => (
                <tr key={r.id} className="hover:bg-gray-50 transition">
                  <td className="py-2.5 px-4 text-gray-500">{r.id}</td>
                  <td className="py-2.5 px-4 font-sans font-medium text-gray-800">
                    <span className="bg-purple-50 text-purple-700 px-2 py-0.5 rounded text-[10px]">
                      {r.feature.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="py-2.5 px-4 text-gray-700">{r.tokensUsed}</td>
                  <td className="py-2.5 px-4 text-emerald-700">${r.estimatedCostUsd.toFixed(5)}</td>
                  <td className="py-2.5 px-4 text-gray-400 font-sans">
                    {new Date(r.timestamp).toLocaleString([], {
                      dateStyle: 'short',
                      timeStyle: 'medium',
                    })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};
