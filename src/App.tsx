import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';
import { MainDashboard } from './features/dashboard/MainDashboard';
import { WorkflowsListPage } from './features/workflows/WorkflowsListPage';
import { WorkflowBuilderPage } from './features/workflows/WorkflowBuilderPage';
import { AiWorkflowGeneratorModal } from './features/workflows/AiWorkflowGeneratorModal';
import { OperatorAssistedMode } from './features/collector/OperatorAssistedMode';
import { PublicCollectionPage } from './features/collector/PublicCollectionPage';
import { PublicLinksPage } from './features/collector/PublicLinksPage';
import { SubmissionsTablePage } from './features/submissions/SubmissionsTablePage';
import { SubmissionDetailPage } from './features/submissions/SubmissionDetailPage';
import { AnalyticsDashboardPage } from './features/analytics/AnalyticsDashboardPage';
import { TeamManagementPage } from './features/team/TeamManagementPage';
import { OrgSettingsPage } from './features/settings/OrgSettingsPage';
import { AiUsagePage } from './features/settings/AiUsagePage';
import { SuperAdminPage } from './features/superadmin/SuperAdminPage';
import { ScenarioTestRunnerPage } from './features/testing/ScenarioTestRunnerPage';
import { LandingPage } from './features/landing/LandingPage';
import { WorkflowSchema } from './types';
import { KeyboardShortcutsModal } from './components/KeyboardShortcutsModal';
import { useGlobalShortcuts } from './hooks/useGlobalShortcuts';

const AppContent: React.FC = () => {
  const { user, organization, role, isLoading } = useAuth();
  const [currentTab, setCurrentTab] = useState<string>('dashboard');
  const [activeWorkflowId, setActiveWorkflowId] = useState<string | null>(null);
  const [activeSubmissionId, setActiveSubmissionId] = useState<string | null>(null);
  const [activePublicSlug, setActivePublicSlug] = useState<string | null>(null);
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [isShortcutsModalOpen, setIsShortcutsModalOpen] = useState(false);
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const [shortcutToast, setShortcutToast] = useState<string | null>(null);

  const showShortcutFeedback = (msg: string) => {
    setShortcutToast(msg);
    setTimeout(() => setShortcutToast(null), 2000);
  };

  // Wire Global Keyboard Shortcuts
  useGlobalShortcuts({
    onNewWorkflow: () => {
      setActiveWorkflowId(null);
      setCurrentTab('builder');
      showShortcutFeedback('⌨️ New Workflow Created (Ctrl+N)');
    },
    onSave: () => {
      showShortcutFeedback('⌨️ Saving Draft (Ctrl+S)...');
    },
    onPublish: () => {
      showShortcutFeedback('⌨️ Publishing Workflow (Ctrl+Shift+P)...');
    },
    onOpenAiGenerator: () => {
      setIsAiModalOpen(true);
      showShortcutFeedback('⌨️ AI Generator Opened');
    },
    onOpenShortcutsHelp: () => {
      setIsShortcutsModalOpen((prev) => !prev);
    },
    onCloseModal: () => {
      setIsShortcutsModalOpen(false);
      setIsAiModalOpen(false);
    },
    onNavigate: (tab: string) => {
      setCurrentTab(tab);
      showShortcutFeedback(`⌨️ Navigated to ${tab.charAt(0).toUpperCase() + tab.slice(1)}`);
    },
  });

  // Check URL query parameters for ?collect=slug
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const collectSlug = params.get('collect');
    if (collectSlug) {
      setActivePublicSlug(collectSlug);
    }
  }, []);

  // Handle direct public link mode
  if (activePublicSlug) {
    return (
      <PublicCollectionPage
        slug={activePublicSlug}
        onExit={() => {
          setActivePublicSlug(null);
          // clear query param from url
          window.history.replaceState({}, '', window.location.pathname);
        }}
      />
    );
  }

  // Handle landing page mode
  if (currentTab === 'landing') {
    return (
      <LandingPage
        onOpenPublicLink={(slug) => {
          setActivePublicSlug(slug);
        }}
        onEnterApp={() => setCurrentTab('dashboard')}
      />
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="text-center text-xs text-gray-500">
          <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
          Initializing CollectAI Workspace...
        </div>
      </div>
    );
  }

  const renderActiveScreen = () => {
    switch (currentTab) {
      case 'dashboard':
        return (
          <MainDashboard
            onSelectTab={setCurrentTab}
            onOpenWorkflow={(id) => {
              setActiveWorkflowId(id);
              setCurrentTab('builder');
            }}
            onStartOperatorSession={(id) => {
              setActiveWorkflowId(id);
              setCurrentTab('operator-mode');
            }}
            onViewSubmission={(id) => {
              setActiveSubmissionId(id);
              setCurrentTab('submission-detail');
            }}
          />
        );

      case 'workflows':
        return (
          <WorkflowsListPage
            onEditWorkflow={(id) => {
              setActiveWorkflowId(id);
              setCurrentTab('builder');
            }}
            onCreateWorkflow={() => {
              setActiveWorkflowId(null);
              setCurrentTab('builder');
            }}
            onOpenAiGenerator={() => setIsAiModalOpen(true)}
            onStartOperatorSession={(id) => {
              setActiveWorkflowId(id);
              setCurrentTab('operator-mode');
            }}
            onPreviewWorkflow={(id) => {
              setActiveWorkflowId(id);
              setCurrentTab('builder');
            }}
          />
        );

      case 'builder':
        return (
          <WorkflowBuilderPage
            workflowId={activeWorkflowId}
            onBack={() => setCurrentTab('workflows')}
            onPreview={(schema) => {
              setActivePublicSlug(schema.publicSlug);
            }}
          />
        );

      case 'operator-mode':
        return (
          <OperatorAssistedMode
            initialWorkflowId={activeWorkflowId || undefined}
            onViewSubmission={(id) => {
              setActiveSubmissionId(id);
              setCurrentTab('submission-detail');
            }}
          />
        );

      case 'submissions':
        return (
          <SubmissionsTablePage
            onViewDetail={(id) => {
              setActiveSubmissionId(id);
              setCurrentTab('submission-detail');
            }}
          />
        );

      case 'submission-detail':
        return activeSubmissionId ? (
          <SubmissionDetailPage
            submissionId={activeSubmissionId}
            onBack={() => setCurrentTab('submissions')}
          />
        ) : (
          <SubmissionsTablePage
            onViewDetail={(id) => {
              setActiveSubmissionId(id);
              setCurrentTab('submission-detail');
            }}
          />
        );

      case 'analytics':
        return <AnalyticsDashboardPage />;

      case 'team':
        return <TeamManagementPage />;

      case 'testing':
        return <ScenarioTestRunnerPage />;

      case 'ai-usage':
        return <AiUsagePage />;

      case 'settings':
        return <OrgSettingsPage />;

      case 'super-admin':
        return <SuperAdminPage />;

      case 'public-links':
        return (
          <PublicLinksPage
            onOpenPublicLink={(slug) => {
              setActivePublicSlug(slug);
            }}
          />
        );

      default:
        return (
          <MainDashboard
            onSelectTab={setCurrentTab}
            onOpenWorkflow={(id) => {
              setActiveWorkflowId(id);
              setCurrentTab('builder');
            }}
            onStartOperatorSession={(id) => {
              setActiveWorkflowId(id);
              setCurrentTab('operator-mode');
            }}
            onViewSubmission={(id) => {
              setActiveSubmissionId(id);
              setCurrentTab('submission-detail');
            }}
          />
        );
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900 flex flex-col">
      {/* Top Navbar */}
      <Navbar
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        isMobileMenuOpen={isMobileNavOpen}
        onToggleMobileMenu={() => setIsMobileNavOpen(!isMobileNavOpen)}
        onOpenShortcuts={() => setIsShortcutsModalOpen(true)}
      />

      {/* Main Workspace Layout */}
      <div className="flex-1 flex max-w-7xl w-full mx-auto">
        <Sidebar
          currentTab={currentTab}
          onSelectTab={setCurrentTab}
          isMobileOpen={isMobileNavOpen}
          onCloseMobile={() => setIsMobileNavOpen(false)}
          onNewWorkflow={() => {
            setActiveWorkflowId(null);
            setCurrentTab('builder');
          }}
        />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 min-w-0 overflow-y-auto">
          {renderActiveScreen()}
        </main>
      </div>

      {/* Keyboard Shortcuts Palette / Modal */}
      <KeyboardShortcutsModal
        isOpen={isShortcutsModalOpen}
        onClose={() => setIsShortcutsModalOpen(false)}
      />

      {/* Ephemeral Shortcut HUD Toast */}
      {shortcutToast && (
        <div className="fixed bottom-6 right-6 z-50 bg-zinc-900 text-white text-xs font-mono px-3.5 py-2 rounded-lg shadow-lg border border-zinc-800 animate-in fade-in slide-in-from-bottom-3 duration-150 flex items-center space-x-2">
          <span>{shortcutToast}</span>
        </div>
      )}

      {/* AI Workflow Generator Modal */}
      <AiWorkflowGeneratorModal
        isOpen={isAiModalOpen}
        onClose={() => setIsAiModalOpen(false)}
        onSelectGeneratedSchema={(generated) => {
          setActiveWorkflowId(null);
          setCurrentTab('builder');
        }}
      />
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
