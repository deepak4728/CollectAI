import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../lib/api';
import { WorkflowSchema, CollectionSession } from '../../types';
import { ConversationalCollector } from './ConversationalCollector';
import { DynamicFormFallback } from './DynamicFormFallback';
import { ReviewAndSubmitModal } from './ReviewAndSubmitModal';
import {
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';

interface PublicCollectionPageProps {
  slug: string;
  onExit?: () => void;
}

export const PublicCollectionPage: React.FC<PublicCollectionPageProps> = ({ slug, onExit }) => {
  const [workflow, setWorkflow] = useState<WorkflowSchema | null>(null);
  const [orgName, setOrgName] = useState<string>('');
  const [session, setSession] = useState<CollectionSession | null>(null);
  const [progress, setProgress] = useState<any>(null);
  const [activeMode, setActiveMode] = useState<'conversation' | 'form'>('conversation');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isReviewOpen, setIsReviewOpen] = useState(false);
  const [submissionId, setSubmissionId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const { user, firebaseUser } = useAuth();

  const [lastSavedTime, setLastSavedTime] = useState<string | null>(null);
  const [draftRestored, setDraftRestored] = useState(false);

  useEffect(() => {
    async function init() {
      setIsLoading(true);
      setErrorMessage(null);
      try {
        const wfRes = await api.getPublicWorkflow(slug);
        setWorkflow(wfRes.workflow);
        setOrgName(wfRes.organizationName || 'Organization');

        const sessRes = await api.startSession({
          workflowId: wfRes.workflow.workflowId,
          mode: activeMode,
          respondentName: 'Respondent',
          startedBy: 'Customer (Direct Link)',
        });
        
        let currentSess = sessRes.session;
        let currentProg = sessRes.progress;

        // Auto-restore draft from localStorage if available (fixes common Google/MS forms loss on reload)
        try {
          const savedDraft = localStorage.getItem(`collectai_draft_${slug}`);
          if (savedDraft) {
            const parsed = JSON.parse(savedDraft);
            if (parsed && parsed.fieldState && Object.keys(parsed.fieldState).length > 0) {
              // Apply saved fields to session
              for (const [k, state] of Object.entries(parsed.fieldState as Record<string, any>)) {
                if (state?.value !== undefined && state?.value !== null && state?.value !== '') {
                  const updateRes = await api.updateSessionField(currentSess.id, k, state.value, true);
                  currentSess = updateRes.session;
                  currentProg = updateRes.progress;
                }
              }
              setDraftRestored(true);
            }
          }
        } catch (e) {
          console.warn('Draft auto-restore skipped:', e);
        }

        setSession(currentSess);
        setProgress(currentProg);
      } catch (err: any) {
        setErrorMessage(err.message || 'Workflow link is invalid or expired.');
      } finally {
        setIsLoading(false);
      }
    }
    init();
  }, [slug]);

  // Persist draft to local storage on changes
  useEffect(() => {
    if (session && session.fieldState && Object.keys(session.fieldState).length > 0 && !submissionId) {
      try {
        localStorage.setItem(
          `collectai_draft_${slug}`,
          JSON.stringify({
            fieldState: session.fieldState,
            savedAt: new Date().toISOString(),
          })
        );
        setLastSavedTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
      } catch (e) {
        // quota ignore
      }
    }
  }, [session, slug, submissionId]);

  const handleSendMessage = async (text: string) => {
    if (!session) return;
    const res = await api.sendSessionMessage(session.id, text, 'user');
    setSession(res.session);
    setProgress(res.progress);
  };

  const handleUpdateField = async (fieldKey: string, value: any) => {
    if (!session) return;
    const res = await api.updateSessionField(session.id, fieldKey, value, true);
    setSession(res.session);
    setProgress(res.progress);
  };

  // Called when user clicks "Complete & Submit"
  const handleOpenReview = async () => {
    setIsReviewOpen(true);
  };

  // Final confirmed submit
  const handleConfirmSubmit = async () => {
    if (!session) return;
    setIsSubmitting(true);
    try {
      const res = await api.submitSession(session.id, {
        userId: firebaseUser?.uid || user?.id,
        userEmail: firebaseUser?.email || user?.email,
      });
      setSubmissionId(res.submission.id);
      setIsReviewOpen(false);
      try {
        localStorage.removeItem(`collectai_draft_${slug}`);
      } catch (e) {
        // ignore
      }
    } catch (err: any) {
      alert(err.message || 'Submission failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-zinc-50 flex items-center justify-center p-4">
        <div className="text-center text-xs text-zinc-400 font-mono">
          Loading intake workflow...
        </div>
      </div>
    );
  }

  if (errorMessage || !workflow || !session) {
    return (
      <div className="min-h-screen bg-zinc-50 flex items-center justify-center p-4">
        <div className="bg-white p-6 rounded-lg border border-zinc-200 max-w-sm w-full text-center space-y-3">
          <AlertCircle className="w-6 h-6 text-zinc-400 mx-auto" />
          <h2 className="text-sm font-semibold text-zinc-900">Link Unavailable</h2>
          <p className="text-xs text-zinc-500">{errorMessage || 'The requested intake form could not be found.'}</p>
          {onExit && (
            <button
              onClick={onExit}
              className="mt-2 px-3.5 py-1.5 bg-zinc-900 text-white text-xs font-medium rounded-md"
            >
              Return
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 flex flex-col justify-between py-6 px-4 sm:px-6">
      <div className="max-w-2xl w-full mx-auto space-y-4">
        {/* Header Bar */}
        <div className="bg-white rounded-lg p-4 border border-zinc-200 shadow-2xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <div className="text-[11px] text-zinc-400 flex items-center space-x-1.5 mb-0.5">
              <span>{orgName}</span>
              <span>·</span>
              <span>Intake</span>
            </div>
            <h1 className="text-base font-semibold text-zinc-900">{workflow.name}</h1>
            <p className="text-xs text-zinc-500 mt-0.5">{workflow.description}</p>
          </div>

          <div className="flex items-center space-x-1.5 self-start sm:self-auto">
            <div className="flex items-center p-0.5 bg-zinc-100 rounded-md">
              <button
                type="button"
                onClick={() => setActiveMode('conversation')}
                className={`px-2.5 py-1 text-xs font-medium rounded transition-colors ${
                  activeMode === 'conversation'
                    ? 'bg-white text-zinc-900 shadow-2xs'
                    : 'text-zinc-500 hover:text-zinc-900'
                }`}
              >
                Chat
              </button>

              <button
                type="button"
                onClick={() => setActiveMode('form')}
                className={`px-2.5 py-1 text-xs font-medium rounded transition-colors ${
                  activeMode === 'form'
                    ? 'bg-white text-zinc-900 shadow-2xs'
                    : 'text-zinc-500 hover:text-zinc-900'
                }`}
              >
                Form
              </button>
            </div>
          </div>
        </div>

        {/* Minimal Progress & Auto-Save Bar */}
        <div className="bg-white px-4 py-2 rounded-lg border border-zinc-200 shadow-2xs flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center space-x-3 flex-1 min-w-[200px] mr-2">
            <span className="text-[11px] text-zinc-500">Progress</span>
            <div className="flex-1 bg-zinc-100 rounded-full h-1.5 overflow-hidden">
              <div
                className="bg-zinc-900 h-1.5 rounded-full transition-all duration-300"
                style={{ width: `${progress?.completionPercentage || 0}%` }}
              />
            </div>
            <span className="text-[11px] font-mono tabular-nums text-zinc-700">
              {progress?.completionPercentage || 0}%
            </span>
          </div>

          <div className="flex items-center space-x-3 text-[11px]">
            {draftRestored && (
              <span className="text-zinc-500 bg-zinc-100 px-1.5 py-0.5 rounded text-[10px] font-mono">
                Draft Restored
              </span>
            )}
            {lastSavedTime && (
              <span className="text-zinc-400 font-mono text-[10px] hidden sm:inline">
                Auto-saved {lastSavedTime}
              </span>
            )}
            <div className="text-zinc-400 font-mono tabular-nums hidden md:block">
              {progress?.completedFields || 0} of {progress?.totalRequired || 0} fields
            </div>
          </div>
        </div>

        {/* Confirmation or Active Form */}
        {submissionId ? (
          <div className="bg-white p-8 rounded-lg border border-zinc-200 text-center shadow-2xs space-y-3">
            <CheckCircle2 className="w-8 h-8 text-zinc-900 mx-auto" />
            <h2 className="text-base font-semibold text-zinc-900">Submission Received</h2>
            <p className="text-xs text-zinc-500 max-w-sm mx-auto">
              Your response has been verified and recorded securely.
            </p>
            <p className="text-xs font-mono text-zinc-400">
              ID: {submissionId}
            </p>
            <div className="pt-2">
              <button
                onClick={() => window.location.reload()}
                className="px-4 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-medium rounded-md transition-colors"
              >
                Start New Response
              </button>
            </div>
          </div>
        ) : (
          <div>
            {activeMode === 'conversation' ? (
              <ConversationalCollector
                workflow={workflow}
                fieldState={session.fieldState}
                messages={session.messages}
                onSendMessage={handleSendMessage}
                onSubmit={handleOpenReview}
                isSubmitting={isSubmitting}
                completionPercentage={progress?.completionPercentage || 0}
                isComplete={Boolean(progress?.isComplete)}
              />
            ) : (
              <DynamicFormFallback
                workflow={workflow}
                fieldState={session.fieldState}
                onUpdateField={handleUpdateField}
                onSubmit={handleOpenReview}
                isSubmitting={isSubmitting}
              />
            )}
          </div>
        )}
      </div>

      {/* Editable Final Review Modal */}
      {session && workflow && (
        <ReviewAndSubmitModal
          isOpen={isReviewOpen}
          onClose={() => setIsReviewOpen(false)}
          workflow={workflow}
          fieldState={session.fieldState}
          onUpdateField={handleUpdateField}
          onConfirmSubmit={handleConfirmSubmit}
          isSubmitting={isSubmitting}
        />
      )}

      <footer className="mt-8 text-center text-[11px] text-zinc-400">
        CollectAI Universal Collection Engine
      </footer>
    </div>
  );
};
