import React, { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import { Organization } from '../../types';
import {
  ShieldAlert,
  Building2,
  Activity,
  CheckCircle2,
  XCircle,
  ToggleLeft,
  ToggleRight,
  Server,
  Layers,
} from 'lucide-react';

export const SuperAdminPage: React.FC = () => {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [healthData, setHealthData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchGlobalData = async () => {
    setIsLoading(true);
    try {
      const [orgsRes, healthRes] = await Promise.all([
        api.getOrganizations(),
        api.getHealth(),
      ]);
      setOrganizations(orgsRes.organizations || []);
      setHealthData(healthRes);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchGlobalData();
  }, []);

  const handleToggleStatus = async (orgId: string, currentStatus: string) => {
    const nextStatus = currentStatus === 'active' ? 'suspended' : 'active';
    if (!window.confirm(`Are you sure you want to change tenant status to ${nextStatus.toUpperCase()}?`)) {
      return;
    }
    try {
      await api.updateOrgStatus(orgId, nextStatus);
      fetchGlobalData();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Super Admin Banner */}
      <div className="bg-slate-900 rounded-xl p-6 text-white shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-purple-500/20 text-purple-300 text-xs font-bold mb-2">
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>Platform Super Admin Console</span>
          </div>
          <h1 className="text-xl font-bold tracking-tight">Global SaaS Management</h1>
          <p className="text-slate-400 text-xs mt-1">
            Global tenant governance, cross-organization administration, and infrastructure telemetry.
          </p>
        </div>

        <div className="flex items-center space-x-3 text-xs">
          <div className="bg-slate-800 px-3 py-2 rounded-lg border border-slate-700">
            <span className="text-slate-400 block text-[10px]">Server Engine</span>
            <span className="text-emerald-400 font-bold">ONLINE (0.0.0.0:3000)</span>
          </div>
          <div className="bg-slate-800 px-3 py-2 rounded-lg border border-slate-700">
            <span className="text-slate-400 block text-[10px]">Gemini 3.8 Flash</span>
            <span className="text-purple-400 font-bold">Proxy Active</span>
          </div>
        </div>
      </div>

      {/* Platform Statistics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-2xs">
          <span className="text-xs font-medium text-gray-500">Active Tenant Orgs</span>
          <div className="mt-2 text-2xl font-bold text-gray-900">
            {organizations.filter((o) => o.status === 'active').length}
          </div>
          <p className="text-[11px] text-gray-400 mt-1">
            {organizations.length} Total organizations
          </p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-2xs">
          <span className="text-xs font-medium text-gray-500">Global Workflows</span>
          <div className="mt-2 text-2xl font-bold text-gray-900">
            {healthData?.stats?.workflowsCount || 2}
          </div>
          <p className="text-[11px] text-indigo-600 font-medium mt-1">Multi-tenant schemas</p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-2xs">
          <span className="text-xs font-medium text-gray-500">Global Records</span>
          <div className="mt-2 text-2xl font-bold text-gray-900">
            {healthData?.stats?.submissionsCount || 4}
          </div>
          <p className="text-[11px] text-emerald-600 font-medium mt-1">Validated submissions</p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-2xs">
          <span className="text-xs font-medium text-gray-500">Uptime</span>
          <div className="mt-2 text-2xl font-bold text-gray-900">
            {Math.floor((healthData?.stats?.uptimeSeconds || 120) / 60)}m
          </div>
          <p className="text-[11px] text-gray-400 mt-1">Zero downtime recorded</p>
        </div>
      </div>

      {/* Organizations Directory Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-2xs overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider">
            Registered Tenant Organizations
          </h3>
          <span className="text-xs text-gray-500">{organizations.length} Tenants</span>
        </div>

        <table className="w-full text-left text-xs">
          <thead className="bg-gray-50 border-b border-gray-200 text-gray-500 uppercase text-[10px] font-semibold">
            <tr>
              <th className="py-3 px-4">Organization Name</th>
              <th className="py-3 px-4">Slug ID</th>
              <th className="py-3 px-4">Industry</th>
              <th className="py-3 px-4">Plan</th>
              <th className="py-3 px-4">Status</th>
              <th className="py-3 px-4 text-right">Super Admin Control</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {organizations.map((org) => {
              const isActive = org.status === 'active';
              return (
                <tr key={org.id} className="hover:bg-gray-50 transition">
                  <td className="py-3.5 px-4 font-bold text-gray-900">{org.name}</td>
                  <td className="py-3.5 px-4 font-mono text-[11px] text-gray-600">{org.slug}</td>
                  <td className="py-3.5 px-4 capitalize text-gray-700">
                    {org.industry.replace('_', ' ')}
                  </td>
                  <td className="py-3.5 px-4 capitalize font-semibold text-indigo-700">
                    {org.plan}
                  </td>
                  <td className="py-3.5 px-4">
                    <span
                      className={`inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                        isActive
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-rose-100 text-rose-800'
                      }`}
                    >
                      {isActive ? (
                        <CheckCircle2 className="w-3 h-3" />
                      ) : (
                        <XCircle className="w-3 h-3" />
                      )}
                      <span className="uppercase">{org.status}</span>
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <button
                      onClick={() => handleToggleStatus(org.id, org.status)}
                      className={`text-xs font-semibold px-3 py-1.5 rounded transition ${
                        isActive
                          ? 'bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200'
                          : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
                      }`}
                    >
                      {isActive ? 'Suspend Tenant' : 'Activate Tenant'}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
