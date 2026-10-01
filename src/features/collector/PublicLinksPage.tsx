import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../lib/api';
import { WorkflowSchema } from '../../types';
import { ExternalLink, Copy, Check, QrCode, Globe } from 'lucide-react';

interface PublicLinksPageProps {
  onOpenPublicLink: (slug: string) => void;
}

export const PublicLinksPage: React.FC<PublicLinksPageProps> = ({ onOpenPublicLink }) => {
  const { organization } = useAuth();
  const [workflows, setWorkflows] = React.useState<WorkflowSchema[]>([]);
  const [copiedSlug, setCopiedSlug] = useState<string | null>(null);

  React.useEffect(() => {
    async function load() {
      if (!organization) return;
      const res = await api.getWorkflows(organization.id);
      setWorkflows(res.workflows || []);
    }
    load();
  }, [organization]);

  const copyUrl = (slug: string) => {
    const url = `${window.location.origin}/?collect=${slug}`;
    navigator.clipboard.writeText(url);
    setCopiedSlug(slug);
    setTimeout(() => setCopiedSlug(null), 2500);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900 tracking-tight">Public Customer Intake Links</h1>
        <p className="text-xs text-gray-500 mt-0.5">
          Share these links directly with customers, respondents, or embed in portals. Respondents can choose AI chat or dynamic form mode.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {workflows.map((wf) => {
          const publicUrl = `${window.location.origin}/?collect=${wf.publicSlug}`;
          return (
            <div key={wf.workflowId} className="bg-white p-5 rounded-xl border border-gray-200 shadow-2xs space-y-4">
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200 uppercase">
                    Published
                  </span>
                  <h3 className="text-sm font-bold text-gray-900 mt-1">{wf.name}</h3>
                </div>
                <Globe className="w-5 h-5 text-gray-400" />
              </div>

              <div className="bg-gray-50 p-2.5 rounded-lg border border-gray-200 flex items-center justify-between text-xs font-mono text-gray-700">
                <span className="truncate mr-2">{publicUrl}</span>
                <button
                  onClick={() => copyUrl(wf.publicSlug)}
                  className="p-1 hover:text-indigo-600 rounded shrink-0"
                  title="Copy link"
                >
                  {copiedSlug === wf.publicSlug ? (
                    <Check className="w-4 h-4 text-emerald-600" />
                  ) : (
                    <Copy className="w-4 h-4 text-gray-400" />
                  )}
                </button>
              </div>

              <div className="flex items-center justify-between pt-1">
                <span className="text-[11px] text-gray-400 font-medium">
                  Modes: {wf.collectionModes?.join(', ')}
                </span>
                <button
                  onClick={() => onOpenPublicLink(wf.publicSlug)}
                  className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg shadow-xs transition"
                >
                  <span>Open Intake Interface</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
