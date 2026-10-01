import { UserRole } from '../types';

export interface RolePermissions {
  canViewSubmissions: boolean;
  canExportData: boolean;
  canDeleteSubmissions: boolean;
  canCreateWorkflows: boolean;
  canEditWorkflows: boolean;
  canPublishWorkflows: boolean;
  canDeleteWorkflows: boolean;
  canOperateIntake: boolean;
  canManageTeam: boolean;
  canManageSettings: boolean;
  canViewAnalytics: boolean;
}

export const ROLE_PERMISSIONS: Record<UserRole, RolePermissions> = {
  super_admin: {
    canViewSubmissions: true,
    canExportData: true,
    canDeleteSubmissions: true,
    canCreateWorkflows: true,
    canEditWorkflows: true,
    canPublishWorkflows: true,
    canDeleteWorkflows: true,
    canOperateIntake: true,
    canManageTeam: true,
    canManageSettings: true,
    canViewAnalytics: true,
  },
  org_admin: {
    canViewSubmissions: true,
    canExportData: true,
    canDeleteSubmissions: true,
    canCreateWorkflows: true,
    canEditWorkflows: true,
    canPublishWorkflows: true,
    canDeleteWorkflows: true,
    canOperateIntake: true,
    canManageTeam: true,
    canManageSettings: true,
    canViewAnalytics: true,
  },
  manager: {
    canViewSubmissions: true,
    canExportData: true,
    canDeleteSubmissions: false,
    canCreateWorkflows: true,
    canEditWorkflows: true,
    canPublishWorkflows: true,
    canDeleteWorkflows: false,
    canOperateIntake: true,
    canManageTeam: true,
    canManageSettings: false,
    canViewAnalytics: true,
  },
  contributor: {
    canViewSubmissions: true,
    canExportData: true,
    canDeleteSubmissions: false,
    canCreateWorkflows: true,
    canEditWorkflows: true,
    canPublishWorkflows: false, // Contributors can save drafts, but only Manager/Admin publishes
    canDeleteWorkflows: false,
    canOperateIntake: true,
    canManageTeam: false,
    canManageSettings: false,
    canViewAnalytics: true,
  },
  operator: {
    canViewSubmissions: true,
    canExportData: true,
    canDeleteSubmissions: false,
    canCreateWorkflows: false,
    canEditWorkflows: false,
    canPublishWorkflows: false,
    canDeleteWorkflows: false,
    canOperateIntake: true,
    canManageTeam: false,
    canManageSettings: false,
    canViewAnalytics: false,
  },
  viewer: {
    canViewSubmissions: true,
    canExportData: true,
    canDeleteSubmissions: false,
    canCreateWorkflows: false,
    canEditWorkflows: false,
    canPublishWorkflows: false,
    canDeleteWorkflows: false,
    canOperateIntake: false,
    canManageTeam: false,
    canManageSettings: false,
    canViewAnalytics: true,
  },
  customer: {
    canViewSubmissions: false,
    canExportData: false,
    canDeleteSubmissions: false,
    canCreateWorkflows: false,
    canEditWorkflows: false,
    canPublishWorkflows: false,
    canDeleteWorkflows: false,
    canOperateIntake: false,
    canManageTeam: false,
    canManageSettings: false,
    canViewAnalytics: false,
  },
};

export interface RoleDefinitionMeta {
  role: UserRole;
  title: string;
  badgeColor: string;
  badgeTextColor: string;
  description: string;
  accessScope: string;
}

export const ROLE_DEFINITIONS: RoleDefinitionMeta[] = [
  {
    role: 'org_admin',
    title: 'Admin',
    badgeColor: 'bg-indigo-50 border-indigo-200 text-indigo-700',
    badgeTextColor: 'text-indigo-700',
    description: 'Full organizational authority: configure workflows, publish versions, manage settings & team permissions, delete records.',
    accessScope: 'Full Control',
  },
  {
    role: 'manager',
    title: 'Manager',
    badgeColor: 'bg-purple-50 border-purple-200 text-purple-700',
    badgeTextColor: 'text-purple-700',
    description: 'Operational team lead: author & publish schemas, supervise collection intake, invite team members, view analytics.',
    accessScope: 'Schema & Team Operations',
  },
  {
    role: 'contributor',
    title: 'Contributor',
    badgeColor: 'bg-blue-50 border-blue-200 text-blue-700',
    badgeTextColor: 'text-blue-700',
    description: 'Data builder: create workflow drafts and schemas, operate assisted intake counters, review incoming records.',
    accessScope: 'Drafting & Intake',
  },
  {
    role: 'viewer',
    title: 'Viewer',
    badgeColor: 'bg-zinc-100 border-zinc-200 text-zinc-700',
    badgeTextColor: 'text-zinc-700',
    description: 'Read-only observer: view workflows, inspect incoming submissions, download exported data files, observe analytics.',
    accessScope: 'Read-Only Auditing',
  },
  {
    role: 'operator',
    title: 'Operator',
    badgeColor: 'bg-amber-50 border-amber-200 text-amber-800',
    badgeTextColor: 'text-amber-800',
    description: 'Front-counter staff: assist citizens and walk-in respondents with live speech-to-field intake.',
    accessScope: 'Assisted Intake Counter',
  },
];

export function hasPermission(role: UserRole, permission: keyof RolePermissions): boolean {
  const permSet = ROLE_PERMISSIONS[role];
  if (!permSet) return false;
  return Boolean(permSet[permission]);
}
