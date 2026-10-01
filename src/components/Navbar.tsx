import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  Menu,
  X,
  ChevronDown,
  LogIn,
  LogOut,
  ExternalLink,
  Keyboard,
} from 'lucide-react';

interface NavbarProps {
  currentTab: string;
  onSelectTab: (tab: string) => void;
  onToggleMobileMenu?: () => void;
  isMobileMenuOpen?: boolean;
  onOpenShortcuts?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  onSelectTab,
  onToggleMobileMenu,
  isMobileMenuOpen,
  onOpenShortcuts,
}) => {
  const {
    user,
    firebaseUser,
    organization,
    role,
    allUsers,
    allOrgs,
    switchDemoUser,
    switchOrganization,
    signInWithGoogle,
    signOut,
  } = useAuth();

  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showOrgMenu, setShowOrgMenu] = useState(false);

  return (
    <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-zinc-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
        {/* Left: Mobile hamburger + Brand + Workspace */}
        <div className="flex items-center space-x-3 sm:space-x-4">
          {/* Mobile menu toggle */}
          {onToggleMobileMenu && (
            <button
              type="button"
              onClick={onToggleMobileMenu}
              aria-label="Toggle navigation"
              className="md:hidden p-1.5 rounded-md text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 transition-colors"
            >
              {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          )}

          {/* Clean Brand Wordmark */}
          <button
            type="button"
            onClick={() => onSelectTab('dashboard')}
            className="flex items-center space-x-2 text-left group"
          >
            <span className="w-6 h-6 rounded bg-zinc-900 text-white flex items-center justify-center font-bold text-xs">
              C
            </span>
            <span className="font-semibold text-sm tracking-tight text-zinc-900">
              CollectAI
            </span>
          </button>

          <span className="hidden sm:inline text-zinc-300">/</span>

          {/* Tenant / Organization Selector */}
          {organization && role !== 'customer' && (
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setShowOrgMenu(!showOrgMenu);
                  setShowUserMenu(false);
                }}
                className="flex items-center space-x-1.5 px-2 py-1 rounded text-xs font-medium text-zinc-700 hover:text-zinc-900 hover:bg-zinc-100 transition-colors"
              >
                <span className="max-w-[140px] sm:max-w-[200px] truncate">{organization.name}</span>
                <ChevronDown className="w-3.5 h-3.5 text-zinc-400" />
              </button>

              {showOrgMenu && (
                <div className="absolute left-0 mt-1.5 w-64 bg-white rounded-lg shadow-lg border border-zinc-200 py-1 z-50 animate-in fade-in duration-100">
                  <div className="px-3 py-1.5 text-[11px] font-medium text-zinc-400">
                    Organizations
                  </div>
                  {allOrgs.map((org) => (
                    <button
                      key={org.id}
                      onClick={() => {
                        switchOrganization(org.id);
                        setShowOrgMenu(false);
                      }}
                      className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between hover:bg-zinc-50 ${
                        org.id === organization.id
                          ? 'font-medium text-zinc-900 bg-zinc-50'
                          : 'text-zinc-600'
                      }`}
                    >
                      <span className="truncate">{org.name}</span>
                      <span className="text-[11px] text-zinc-400 capitalize">
                        {org.industry.replace('_', ' ')}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right: Actions */}
        <div className="flex items-center space-x-2 sm:space-x-3">
          {/* Shortcuts button */}
          {onOpenShortcuts && (
            <button
              onClick={onOpenShortcuts}
              title="Keyboard Shortcuts (? or Ctrl+K)"
              className="hidden sm:inline-flex items-center space-x-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 transition-colors"
            >
              <Keyboard className="w-3.5 h-3.5 text-zinc-500" />
              <span className="hidden md:inline">Shortcuts</span>
              <kbd className="text-[10px] font-mono text-zinc-400 bg-zinc-100 border border-zinc-200 px-1 rounded">?</kbd>
            </button>
          )}

          {/* Public Links */}
          <button
            onClick={() => onSelectTab('public-links')}
            className="inline-flex items-center space-x-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 transition-colors"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Public Links</span>
          </button>

          {/* Firebase Google Auth */}
          {firebaseUser ? (
            <div className="flex items-center space-x-2">
              {firebaseUser.photoURL ? (
                <img
                  src={firebaseUser.photoURL}
                  alt={firebaseUser.displayName || 'Google User'}
                  referrerPolicy="no-referrer"
                  className="w-6 h-6 rounded-full border border-zinc-200 object-cover"
                />
              ) : (
                <div className="w-6 h-6 rounded-full bg-zinc-100 text-zinc-700 flex items-center justify-center text-xs font-medium">
                  {firebaseUser.displayName?.charAt(0) || 'G'}
                </div>
              )}
              <button
                onClick={signOut}
                title="Sign out of Firebase"
                className="p-1 text-zinc-400 hover:text-zinc-700 rounded transition-colors"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <button
              onClick={signInWithGoogle}
              className="inline-flex items-center space-x-1.5 px-2.5 py-1.5 rounded-md border border-zinc-200 bg-white hover:bg-zinc-50 text-xs font-medium text-zinc-700 transition-colors"
            >
              <LogIn className="w-3.5 h-3.5 text-zinc-500" />
              <span className="hidden sm:inline">Sign in</span>
            </button>
          )}

          {/* User / Persona Switcher */}
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setShowUserMenu(!showUserMenu);
                setShowOrgMenu(false);
              }}
              className="flex items-center space-x-1.5 px-2 py-1 rounded text-xs font-medium text-zinc-700 hover:text-zinc-900 hover:bg-zinc-100 transition-colors"
            >
              <span className="w-5 h-5 rounded-full bg-zinc-100 text-zinc-700 flex items-center justify-center text-[10px] font-semibold">
                {user?.displayName.charAt(0) || 'U'}
              </span>
              <span className="hidden lg:inline max-w-[100px] truncate text-zinc-800">
                {user?.displayName}
              </span>
              <ChevronDown className="w-3 h-3 text-zinc-400" />
            </button>

            {showUserMenu && (
              <div className="absolute right-0 mt-1.5 w-64 bg-white rounded-lg shadow-lg border border-zinc-200 py-1.5 z-50 animate-in fade-in duration-100">
                <div className="px-3 py-2 border-b border-zinc-100">
                  <p className="text-xs font-semibold text-zinc-900">{user?.displayName}</p>
                  <p className="text-[11px] text-zinc-500 truncate">{user?.email}</p>
                  <p className="text-[11px] text-zinc-400 capitalize mt-0.5">
                    Role: {role.replace('_', ' ')}
                  </p>
                </div>

                <div className="px-3 pt-2 pb-1 text-[11px] font-medium text-zinc-400">
                  Switch Test Account
                </div>

                <div className="space-y-0.5 px-1">
                  {allUsers.map((u) => (
                    <button
                      key={u.id}
                      onClick={() => {
                        switchDemoUser(u.id);
                        setShowUserMenu(false);
                      }}
                      className={`w-full text-left px-2.5 py-1.5 rounded text-xs flex items-center justify-between hover:bg-zinc-50 ${
                        u.id === user?.id ? 'bg-zinc-50 font-medium text-zinc-900' : 'text-zinc-600'
                      }`}
                    >
                      <span className="truncate">{u.displayName}</span>
                      <span className="text-[10px] text-zinc-400 capitalize">
                        {u.platformRole === 'super_admin' ? 'Super Admin' : 'User'}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
