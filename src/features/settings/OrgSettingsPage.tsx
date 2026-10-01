import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../lib/api';
import { Settings, Shield, Clock, Building2, Save, Loader2 } from 'lucide-react';

export const OrgSettingsPage: React.FC = () => {
  const { organization, role, switchOrganization } = useAuth();
  const [retentionDays, setRetentionDays] = useState(organization?.settings.dataRetentionDays || 180);
  const [allowPublic, setAllowPublic] = useState(organization?.settings.allowPublicSubmissions ?? true);
  const [requireAuth, setRequireAuth] = useState(organization?.settings.requireRespondentAuth ?? false);
  const [isSaving, setIsSaving] = useState(false);
  const [savedNotice, setSavedNotice] = useState(false);
  const [errorNotice, setErrorNotice] = useState<string | null>(null);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!organization) return;
    setIsSaving(true);
    setErrorNotice(null);
    try {
      await api.updateOrgSettings(
        organization.id,
        {
          settings: {
            allowPublicSubmissions: allowPublic,
            requireRespondentAuth: requireAuth,
            dataRetentionDays: retentionDays,
          },
        },
        role
      );
      setSavedNotice(true);
      setTimeout(() => setSavedNotice(false), 3000);
    } catch (err: any) {
      setErrorNotice(err.message || 'Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-xl font-bold text-gray-900 tracking-tight">Organization Settings</h1>
        <p className="text-xs text-gray-500 mt-0.5">
          Configure security, public access, and data compliance policies for {organization?.name}.
        </p>
      </div>

      <form onSubmit={handleSave} className="space-y-5">
        {/* Profile Card */}
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-2xs space-y-4">
          <div className="flex items-center space-x-2 text-xs font-bold text-gray-900 uppercase tracking-wider pb-2 border-b border-gray-100">
            <Building2 className="w-4 h-4 text-indigo-600" />
            <span>Tenant Profile & Industry</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block font-semibold text-gray-700 mb-1">Organization Name</label>
              <input
                type="text"
                disabled
                value={organization?.name || ''}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-gray-50 text-gray-600 cursor-not-allowed"
              />
            </div>
            <div>
              <label className="block font-semibold text-gray-700 mb-1">Tenant Slug ID</label>
              <input
                type="text"
                disabled
                value={organization?.slug || ''}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-gray-50 text-gray-600 font-mono cursor-not-allowed"
              />
            </div>
            <div>
              <label className="block font-semibold text-gray-700 mb-1">Industry Vertical</label>
              <input
                type="text"
                disabled
                value={organization?.industry.replace('_', ' ').toUpperCase() || 'GENERAL'}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-gray-50 text-gray-600 cursor-not-allowed"
              />
            </div>
            <div>
              <label className="block font-semibold text-gray-700 mb-1">Subscription Plan</label>
              <span className="inline-block mt-2 font-bold text-indigo-600 uppercase text-xs">
                {organization?.plan || 'Professional'} (Active)
              </span>
            </div>
          </div>
        </div>

        {/* Security & Access Policies */}
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-2xs space-y-4">
          <div className="flex items-center space-x-2 text-xs font-bold text-gray-900 uppercase tracking-wider pb-2 border-b border-gray-100">
            <Shield className="w-4 h-4 text-indigo-600" />
            <span>Access Control & Data Retention</span>
          </div>

          <div className="space-y-3 text-xs">
            <label className="flex items-center space-x-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={allowPublic}
                onChange={(e) => setAllowPublic(e.target.checked)}
                className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
              />
              <div>
                <span className="font-semibold text-gray-800">Allow Direct Public Link Submissions</span>
                <p className="text-[11px] text-gray-500">
                  When enabled, customers can fill workflows directly without an operator login.
                </p>
              </div>
            </label>

            <label className="flex items-center space-x-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={requireAuth}
                onChange={(e) => setRequireAuth(e.target.checked)}
                className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
              />
              <div>
                <span className="font-semibold text-gray-800">Require Respondent OTP Verification</span>
                <p className="text-[11px] text-gray-500">
                  Enforces phone OTP verification before accepting public submissions.
                </p>
              </div>
            </label>

            <div className="pt-2">
              <label className="block font-semibold text-gray-700 mb-1">
                Data Retention Period (Days)
              </label>
              <input
                type="number"
                min="30"
                max="3650"
                value={retentionDays}
                onChange={(e) => setRetentionDays(parseInt(e.target.value) || 180)}
                className="w-48 px-3 py-2 rounded-lg border border-gray-300 text-xs focus:outline-hidden"
              />
              <p className="text-[11px] text-gray-500 mt-1">
                Records older than this period are automatically scheduled for archival.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div>
            {savedNotice && (
              <span className="text-xs text-emerald-600 font-semibold">
                ✓ Settings updated successfully.
              </span>
            )}
            {errorNotice && (
              <span className="text-xs text-rose-600 font-semibold">
                ✕ {errorNotice}
              </span>
            )}
          </div>
          <button
            type="submit"
            disabled={isSaving}
            className="ml-auto inline-flex items-center space-x-1.5 px-4 py-2 bg-zinc-900 hover:bg-zinc-800 disabled:opacity-50 text-white text-xs font-semibold rounded-lg shadow-xs transition"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Saving...</span>
              </>
            ) : (
              <>
                <Save className="w-3.5 h-3.5" />
                <span>Save Settings</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
