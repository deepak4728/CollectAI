import React from 'react';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard,
  Headphones,
  FileCode2,
  FileSpreadsheet,
  BarChart3,
  Sliders,
  Plus,
  X,
} from 'lucide-react';

interface SidebarProps {
  currentTab: string;
  onSelectTab: (tab: string) => void;
  onNewWorkflow: () => void;
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  onNewWorkflow,
  isMobileOpen = false,
  onCloseMobile,
}) => {
  const { role } = useAuth();

  const coreNavItems = [
    { id: 'dashboard', label: 'Overview', icon: LayoutDashboard },
    { id: 'operator-mode', label: 'Start Intake', icon: Headphones },
    { id: 'workflows', label: 'Workflows', icon: FileCode2 },
    { id: 'submissions', label: 'Submissions', icon: FileSpreadsheet },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
  ];

  const handleItemClick = (id: string) => {
    onSelectTab(id);
    if (onCloseMobile) onCloseMobile();
  };

  const sidebarContent = (
    <div className="h-full flex flex-col justify-between p-3 bg-white text-zinc-900 border-r border-zinc-200">
      <div className="space-y-4">
        {/* Mobile Header */}
        <div className="md:hidden flex items-center justify-between pb-2 border-b border-zinc-100">
          <span className="text-xs font-semibold text-zinc-900">Navigation</span>
          <button
            onClick={onCloseMobile}
            className="p-1 rounded text-zinc-400 hover:text-zinc-700"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Primary Action Button */}
        <button
          onClick={() => {
            onNewWorkflow();
            if (onCloseMobile) onCloseMobile();
          }}
          title="Create New Workflow (Ctrl+N)"
          className="w-full flex items-center justify-between space-x-1.5 bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-medium py-2 px-3 rounded-md transition-colors shadow-2xs"
        >
          <div className="flex items-center space-x-1.5">
            <Plus className="w-3.5 h-3.5" />
            <span>New Workflow</span>
          </div>
          <kbd className="text-[10px] font-mono text-zinc-400 bg-zinc-800 border border-zinc-700 px-1 py-0.2 rounded">Ctrl+N</kbd>
        </button>

        {/* Core Nav */}
        <nav className="space-y-0.5">
          {coreNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleItemClick(item.id)}
                className={`w-full flex items-center space-x-2.5 px-2.5 py-1.5 rounded-md text-xs transition-colors ${
                  isActive
                    ? 'bg-zinc-100 text-zinc-900 font-medium'
                    : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-50'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-zinc-900' : 'text-zinc-400'}`} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Footer Utility Section */}
      {(role === 'org_admin' || role === 'super_admin') && (
        <div className="pt-3 border-t border-zinc-100">
          <button
            onClick={() => handleItemClick('settings')}
            className={`w-full flex items-center space-x-2.5 px-2.5 py-1.5 rounded-md text-xs transition-colors ${
              currentTab === 'settings'
                ? 'bg-zinc-100 text-zinc-900 font-medium'
                : 'text-zinc-500 hover:text-zinc-900 hover:bg-zinc-50'
            }`}
          >
            <Sliders className="w-4 h-4 text-zinc-400" />
            <span>Settings</span>
          </button>
        </div>
      )}
    </div>
  );

  return (
    <>
      <aside className="hidden md:block w-52 shrink-0 min-h-[calc(100vh-3.5rem)]">
        {sidebarContent}
      </aside>

      {isMobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-2xs transition-opacity"
            onClick={onCloseMobile}
          />
          <div className="relative w-60 max-w-[80vw] h-full shadow-xl z-10 animate-in slide-in-from-left duration-200">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
};
