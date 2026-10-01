import {
  WorkflowSchema,
  CollectionSession,
  Submission,
  Organization,
  User,
  Membership,
  AuditLog,
  AiUsageRecord,
} from '../types';

function getHeaders(orgId?: string, role?: string): HeadersInit {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (orgId) headers['x-org-id'] = orgId;
  if (role) headers['x-user-role'] = role;
  return headers;
}

export const api = {
  // System Health
  async getHealth() {
    const res = await fetch('/api/health');
    return res.json();
  },

  // Auth & Users
  async getUsers(): Promise<{ users: User[] }> {
    const res = await fetch('/api/auth/users');
    return res.json();
  },

  async login(userId: string) {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId }),
    });
    return res.json();
  },

  // Organizations
  async getOrganizations(): Promise<{ organizations: Organization[] }> {
    const res = await fetch('/api/organizations');
    return res.json();
  },

  async getOrganization(id: string): Promise<{ organization: Organization }> {
    const res = await fetch(`/api/organizations/${id}`);
    return res.json();
  },

  async createOrganization(data: {
    name: string;
    industry: string;
    plan: string;
    adminEmail?: string;
    adminName?: string;
  }) {
    const res = await fetch('/api/organizations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return res.json();
  },

  async updateOrgStatus(orgId: string, status: 'active' | 'suspended') {
    const res = await fetch(`/api/organizations/${orgId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    return res.json();
  },

  async updateOrgSettings(
    orgId: string,
    data: { settings?: Partial<Organization['settings']>; name?: string; industry?: Organization['industry'] },
    role?: string
  ): Promise<{ organization: Organization }> {
    const res = await fetch(`/api/organizations/${orgId}/settings`, {
      method: 'PATCH',
      headers: getHeaders(orgId, role),
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Failed to update organization settings' }));
      throw new Error(err.error || 'Failed to update settings');
    }
    return res.json();
  },

  async getOrgMembers(orgId: string): Promise<{ members: Membership[] }> {
    const res = await fetch(`/api/organizations/${orgId}/members`);
    return res.json();
  },

  async inviteMember(orgId: string, data: { email: string; displayName: string; role: string }) {
    const res = await fetch(`/api/organizations/${orgId}/members`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return res.json();
  },

  // Workflows
  async getWorkflows(orgId?: string): Promise<{ workflows: WorkflowSchema[] }> {
    const url = orgId ? `/api/workflows?orgId=${encodeURIComponent(orgId)}` : '/api/workflows';
    const res = await fetch(url);
    return res.json();
  },

  async getWorkflow(id: string): Promise<{ workflow: WorkflowSchema }> {
    const res = await fetch(`/api/workflows/${id}`);
    return res.json();
  },

  async getPublicWorkflow(slug: string): Promise<{ workflow: WorkflowSchema; organizationName: string }> {
    const res = await fetch(`/api/workflows/public/${slug}`);
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Workflow link not found' }));
      throw new Error(err.error || 'Failed to load workflow');
    }
    return res.json();
  },

  async saveWorkflow(workflow: WorkflowSchema, orgId: string, role: string) {
    const isNew = !workflow.workflowId || workflow.workflowId.startsWith('new_');
    const url = isNew ? '/api/workflows' : `/api/workflows/${workflow.workflowId}`;
    const method = isNew ? 'POST' : 'PUT';

    const res = await fetch(url, {
      method,
      headers: getHeaders(orgId, role),
      body: JSON.stringify(workflow),
    });
    return res.json();
  },

  async generateWorkflowAi(requirement: string, orgId?: string) {
    const res = await fetch('/api/workflows/generate-ai', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ requirement, orgId }),
    });
    return res.json();
  },

  async getFieldSuggestions(
    workflowId: string,
    fieldKey?: string
  ): Promise<{ suggestions: Record<string, Array<{ value: string; count: number; source: 'history' | 'schema' }>> }> {
    const query = fieldKey ? `?fieldKey=${encodeURIComponent(fieldKey)}` : '';
    const res = await fetch(`/api/workflows/${encodeURIComponent(workflowId)}/field-suggestions${query}`);
    return res.json();
  },

  // Sessions
  async startSession(data: {
    workflowId: string;
    mode: 'conversation' | 'form' | 'operator';
    respondentName?: string;
    startedBy?: string;
  }): Promise<{ session: CollectionSession; progress: any }> {
    const res = await fetch('/api/sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return res.json();
  },

  async getSession(id: string): Promise<{ session: CollectionSession; workflow: WorkflowSchema; progress: any }> {
    const res = await fetch(`/api/sessions/${id}`);
    return res.json();
  },

  async sendSessionMessage(
    sessionId: string,
    content: string,
    role: 'user' | 'operator' = 'user'
  ) {
    const res = await fetch(`/api/sessions/${sessionId}/message`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content, role }),
    });
    return res.json();
  },

  async updateSessionField(
    sessionId: string,
    fieldKey: string,
    value: any,
    confirmedByUser = true
  ) {
    const res = await fetch(`/api/sessions/${sessionId}/update-field`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fieldKey, value, confirmedByUser }),
    });
    return res.json();
  },

  async submitSession(sessionId: string, userInfo?: { userId?: string; userEmail?: string }) {
    const res = await fetch(`/api/sessions/${sessionId}/submit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userInfo || {}),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Failed to submit workflow');
    }
    return data;
  },

  // Submissions
  async getSubmissions(params: {
    orgId?: string;
    workflowId?: string;
    status?: string;
    search?: string;
  }): Promise<{ submissions: Submission[] }> {
    const query = new URLSearchParams();
    if (params.orgId) query.set('orgId', params.orgId);
    if (params.workflowId) query.set('workflowId', params.workflowId);
    if (params.status) query.set('status', params.status);
    if (params.search) query.set('search', params.search);

    const res = await fetch(`/api/submissions?${query.toString()}`);
    return res.json();
  },

  async getSubmissionDetail(id: string) {
    const res = await fetch(`/api/submissions/${id}`);
    return res.json();
  },

  async deleteSubmission(id: string, orgId: string) {
    const res = await fetch(`/api/submissions/${id}?orgId=${encodeURIComponent(orgId)}`, {
      method: 'DELETE',
    });
    return res.json();
  },

  // Analytics
  async getAnalytics(orgId?: string) {
    const url = orgId ? `/api/analytics?orgId=${encodeURIComponent(orgId)}` : '/api/analytics';
    const res = await fetch(url);
    return res.json();
  },

  // Audit Logs
  async getAuditLogs(orgId?: string): Promise<{ logs: AuditLog[] }> {
    const url = orgId ? `/api/audit-logs?orgId=${encodeURIComponent(orgId)}` : '/api/audit-logs';
    const res = await fetch(url);
    return res.json();
  },

  // AI Usage
  async getAiUsage(orgId?: string): Promise<{ records: AiUsageRecord[] }> {
    const url = orgId ? `/api/ai-usage?orgId=${encodeURIComponent(orgId)}` : '/api/ai-usage';
    const res = await fetch(url);
    return res.json();
  },

  // Run Test Scenarios
  async runTestScenarios() {
    const res = await fetch('/api/test-scenarios/run', { method: 'POST' });
    return res.json();
  },
};
