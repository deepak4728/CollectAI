import fs from 'fs';
import path from 'path';
import {
  User,
  Organization,
  Membership,
  WorkflowSchema,
  CollectionSession,
  Submission,
  AuditLog,
  AiUsageRecord,
} from '../src/types';
import { CSC_TEMPLATE, RESTAURANT_TEMPLATE } from '../src/lib/templates';

const DATA_FILE = path.resolve(process.cwd(), 'data-store.json');

export interface DatabaseState {
  users: User[];
  organizations: Organization[];
  memberships: Membership[];
  workflows: WorkflowSchema[];
  workflowVersions: Array<{
    id: string;
    workflowId: string;
    organizationId: string;
    version: number;
    schema: WorkflowSchema;
    createdAt: string;
  }>;
  collectionSessions: CollectionSession[];
  submissions: Submission[];
  auditLogs: AuditLog[];
  aiUsage: AiUsageRecord[];
}

// Initial Seed Data
function getInitialSeedData(): DatabaseState {
  const users: User[] = [
    {
      id: 'user_super_admin',
      email: 'dy19363@gmail.com',
      displayName: 'System Super Admin',
      platformRole: 'super_admin',
      createdAt: '2026-09-01T10:00:00Z',
    },
    {
      id: 'user_csc_admin',
      email: 'admin@csc-rajasthan.gov.demo',
      displayName: 'Rajesh Meena (CSC Admin)',
      platformRole: 'user',
      createdAt: '2026-09-05T11:00:00Z',
    },
    {
      id: 'user_csc_operator',
      email: 'operator@csc-jaipur.demo',
      displayName: 'Pooja Verma (CSC Operator)',
      platformRole: 'user',
      createdAt: '2026-09-06T12:00:00Z',
    },
    {
      id: 'user_restaurant_admin',
      email: 'owner@jaipurbistro.demo',
      displayName: 'Vikram Singh (Restaurant Manager)',
      platformRole: 'user',
      createdAt: '2026-09-08T09:00:00Z',
    },
    {
      id: 'user_restaurant_waiter',
      email: 'waiter@jaipurbistro.demo',
      displayName: 'Karan Sharma (Staff & Waiter)',
      platformRole: 'user',
      createdAt: '2026-09-09T14:00:00Z',
    },
    {
      id: 'user_manager',
      email: 'manager@csc-rajasthan.gov.demo',
      displayName: 'Amit Saxena (Operations Manager)',
      platformRole: 'user',
      createdAt: '2026-09-10T10:00:00Z',
    },
    {
      id: 'user_contributor',
      email: 'contributor@csc-rajasthan.gov.demo',
      displayName: 'Neha Gupta (Schema Contributor)',
      platformRole: 'user',
      createdAt: '2026-09-11T11:00:00Z',
    },
    {
      id: 'user_viewer',
      email: 'auditor@rajasthan.gov.demo',
      displayName: 'Sanjay Dutt (Compliance Viewer)',
      platformRole: 'user',
      createdAt: '2026-09-12T12:00:00Z',
    },
  ];

  const organizations: Organization[] = [
    {
      id: 'org_csc_demo',
      name: 'Demo CSC Centre (Jaipur Central)',
      slug: 'csc-jaipur',
      industry: 'government_csc',
      plan: 'enterprise',
      status: 'active',
      createdAt: '2026-09-05T10:00:00Z',
      settings: {
        allowPublicSubmissions: true,
        requireRespondentAuth: false,
        dataRetentionDays: 365,
      },
    },
    {
      id: 'org_restaurant_demo',
      name: 'Jaipur Bistro & Gourmet Kitchen',
      slug: 'jaipur-bistro',
      industry: 'food_hospitality',
      plan: 'professional',
      status: 'active',
      createdAt: '2026-09-08T09:00:00Z',
      settings: {
        allowPublicSubmissions: true,
        requireRespondentAuth: false,
        dataRetentionDays: 90,
      },
    },
  ];

  const memberships: Membership[] = [
    {
      id: 'mem_1',
      organizationId: 'org_csc_demo',
      userId: 'user_super_admin',
      role: 'org_admin',
      status: 'active',
      createdAt: '2026-09-05T10:00:00Z',
      userEmail: 'dy19363@gmail.com',
      userName: 'System Super Admin',
    },
    {
      id: 'mem_2',
      organizationId: 'org_csc_demo',
      userId: 'user_csc_admin',
      role: 'org_admin',
      status: 'active',
      createdAt: '2026-09-05T11:00:00Z',
      userEmail: 'admin@csc-rajasthan.gov.demo',
      userName: 'Rajesh Meena (CSC Admin)',
    },
    {
      id: 'mem_3',
      organizationId: 'org_csc_demo',
      userId: 'user_csc_operator',
      role: 'operator',
      status: 'active',
      createdAt: '2026-09-06T12:00:00Z',
      userEmail: 'operator@csc-jaipur.demo',
      userName: 'Pooja Verma (CSC Operator)',
    },
    {
      id: 'mem_4',
      organizationId: 'org_restaurant_demo',
      userId: 'user_restaurant_admin',
      role: 'org_admin',
      status: 'active',
      createdAt: '2026-09-08T09:00:00Z',
      userEmail: 'owner@jaipurbistro.demo',
      userName: 'Vikram Singh (Restaurant Manager)',
    },
    {
      id: 'mem_5',
      organizationId: 'org_restaurant_demo',
      userId: 'user_restaurant_waiter',
      role: 'operator',
      status: 'active',
      createdAt: '2026-09-09T14:00:00Z',
      userEmail: 'waiter@jaipurbistro.demo',
      userName: 'Karan Sharma (Staff & Waiter)',
    },
    {
      id: 'mem_6',
      organizationId: 'org_csc_demo',
      userId: 'user_manager',
      role: 'manager',
      status: 'active',
      createdAt: '2026-09-10T10:00:00Z',
      userEmail: 'manager@csc-rajasthan.gov.demo',
      userName: 'Amit Saxena (Operations Manager)',
    },
    {
      id: 'mem_7',
      organizationId: 'org_csc_demo',
      userId: 'user_contributor',
      role: 'contributor',
      status: 'active',
      createdAt: '2026-09-11T11:00:00Z',
      userEmail: 'contributor@csc-rajasthan.gov.demo',
      userName: 'Neha Gupta (Schema Contributor)',
    },
    {
      id: 'mem_8',
      organizationId: 'org_csc_demo',
      userId: 'user_viewer',
      role: 'viewer',
      status: 'active',
      createdAt: '2026-09-12T12:00:00Z',
      userEmail: 'auditor@rajasthan.gov.demo',
      userName: 'Sanjay Dutt (Compliance Viewer)',
    },
  ];

  const workflows: WorkflowSchema[] = [CSC_TEMPLATE, RESTAURANT_TEMPLATE];

  const submissions: Submission[] = [
    {
      id: 'sub_csc_01',
      organizationId: 'org_csc_demo',
      workflowId: 'wf_csc_service_app',
      workflowName: 'CSC Citizen Service Application',
      workflowVersion: 1,
      sessionId: 'sess_csc_demo_01',
      structuredData: {
        serviceType: 'Old Age Pension',
        applicantName: 'Ramesh Kumar Sharma',
        dob: '1962-04-15',
        calculatedAge: 64,
        gender: 'Male',
        phone: '9829012345',
        email: 'ramesh.sharma62@example.com',
        address: 'Plot 42, Kisan Nagar, Tonk Road',
        district: 'Jaipur',
        state: 'Rajasthan',
        idType: 'Aadhaar Card',
        idNumber: '482910394819',
        bankHolderName: 'Ramesh Kumar Sharma',
        bankAccountNumber: '918273645012',
        bankIfsc: 'SBIN0001420',
        consent: true,
        operatorNotes: 'Original Aadhaar and Bank passbook physically verified at counter.',
      },
      validationStatus: 'valid',
      status: 'completed',
      submittedBy: 'Pooja Verma (CSC Operator)',
      respondentName: 'Ramesh Kumar Sharma',
      submittedAt: '2026-09-22T10:30:00Z',
    },
    {
      id: 'sub_csc_02',
      organizationId: 'org_csc_demo',
      workflowId: 'wf_csc_service_app',
      workflowName: 'CSC Citizen Service Application',
      workflowVersion: 1,
      sessionId: 'sess_csc_demo_02',
      structuredData: {
        serviceType: 'Income Certificate',
        applicantName: 'Sunita Devi',
        dob: '1988-11-20',
        calculatedAge: 37,
        gender: 'Female',
        phone: '9414098765',
        address: 'Village Bassi, Tehsil Bassi',
        district: 'Jaipur',
        state: 'Rajasthan',
        idType: 'Voter ID Card',
        idNumber: 'RJ/02/104/89123',
        bankHolderName: 'Sunita Devi',
        bankAccountNumber: '491029384756',
        bankIfsc: 'BARB0BASSIX',
        consent: true,
        operatorNotes: 'Income affidavit verified.',
      },
      validationStatus: 'valid',
      status: 'completed',
      submittedBy: 'Pooja Verma (CSC Operator)',
      respondentName: 'Sunita Devi',
      submittedAt: '2026-09-23T14:15:00Z',
    },
    {
      id: 'sub_rest_01',
      organizationId: 'org_restaurant_demo',
      workflowId: 'wf_restaurant_order',
      workflowName: 'Restaurant Food & Dining Order',
      workflowVersion: 1,
      sessionId: 'sess_rest_demo_01',
      structuredData: {
        orderType: 'Delivery',
        deliveryAddress: '21 Vaishali Nagar, Near National Handloom, Jaipur',
        customerName: 'Ananya Sharma',
        customerPhone: '9828112233',
        orderedItems: [
          { name: 'Paneer Tikka Pizza (10")', quantity: 2, price: 299 },
          { name: 'Cold Coffee with Ice Cream', quantity: 1, price: 120 },
        ],
        specialInstructions: 'Make pizza spicy with extra oregano packets',
        couponCode: 'WELCOME20',
        subtotal: 718,
        discount: 144,
        tax: 28.7,
        grandTotal: 602.7,
        paymentMethod: 'UPI / QR Code',
      },
      validationStatus: 'valid',
      status: 'completed',
      submittedBy: 'Online Customer',
      respondentName: 'Ananya Sharma',
      submittedAt: '2026-09-24T12:45:00Z',
    },
    {
      id: 'sub_rest_02',
      organizationId: 'org_restaurant_demo',
      workflowId: 'wf_restaurant_order',
      workflowName: 'Restaurant Food & Dining Order',
      workflowVersion: 1,
      sessionId: 'sess_rest_demo_02',
      structuredData: {
        orderType: 'Dine-in',
        tableNumber: 4,
        customerName: 'Rohit Malvia',
        customerPhone: '9928334455',
        orderedItems: [
          { name: 'Farmhouse Veg Pizza (10")', quantity: 1, price: 279 },
          { name: 'Peri Peri French Fries', quantity: 1, price: 140 },
          { name: 'Virgin Mojito', quantity: 2, price: 99 },
        ],
        specialInstructions: 'Serve beverages first',
        couponCode: '',
        subtotal: 617,
        discount: 0,
        tax: 30.85,
        grandTotal: 647.85,
        paymentMethod: 'Credit / Debit Card',
      },
      validationStatus: 'valid',
      status: 'completed',
      submittedBy: 'Karan Sharma (Staff & Waiter)',
      respondentName: 'Rohit Malvia',
      submittedAt: '2026-09-24T15:20:00Z',
    },
  ];

  const auditLogs: AuditLog[] = [
    {
      id: 'log_1',
      organizationId: 'org_csc_demo',
      actorId: 'user_csc_admin',
      actorName: 'Rajesh Meena',
      action: 'WORKFLOW_PUBLISHED',
      resourceType: 'workflow',
      resourceId: 'wf_csc_service_app',
      createdAt: '2026-09-05T12:00:00Z',
    },
    {
      id: 'log_2',
      organizationId: 'org_csc_demo',
      actorId: 'user_csc_operator',
      actorName: 'Pooja Verma',
      action: 'SUBMISSION_RECORD_CREATED',
      resourceType: 'submission',
      resourceId: 'sub_csc_01',
      createdAt: '2026-09-22T10:30:00Z',
    },
    {
      id: 'log_3',
      organizationId: 'org_restaurant_demo',
      actorId: 'user_restaurant_admin',
      actorName: 'Vikram Singh',
      action: 'WORKFLOW_PUBLISHED',
      resourceType: 'workflow',
      resourceId: 'wf_restaurant_order',
      createdAt: '2026-09-08T10:00:00Z',
    },
  ];

  const aiUsage: AiUsageRecord[] = [
    {
      id: 'ai_1',
      organizationId: 'org_csc_demo',
      timestamp: '2026-09-22T10:28:00Z',
      feature: 'conversational_extraction',
      tokensUsed: 620,
      estimatedCostUsd: 0.00031,
    },
    {
      id: 'ai_2',
      organizationId: 'org_restaurant_demo',
      timestamp: '2026-09-24T12:44:00Z',
      feature: 'conversational_extraction',
      tokensUsed: 780,
      estimatedCostUsd: 0.00039,
    },
  ];

  return {
    users,
    organizations,
    memberships,
    workflows,
    workflowVersions: [
      {
        id: 'ver_csc_1',
        workflowId: 'wf_csc_service_app',
        organizationId: 'org_csc_demo',
        version: 1,
        schema: CSC_TEMPLATE,
        createdAt: '2026-09-05T12:00:00Z',
      },
      {
        id: 'ver_rest_1',
        workflowId: 'wf_restaurant_order',
        organizationId: 'org_restaurant_demo',
        version: 1,
        schema: RESTAURANT_TEMPLATE,
        createdAt: '2026-09-08T10:00:00Z',
      },
    ],
    collectionSessions: [],
    submissions,
    auditLogs,
    aiUsage,
  };
}

class Store {
  private state: DatabaseState;

  constructor() {
    this.state = this.load();
  }

  private load(): DatabaseState {
    try {
      if (fs.existsSync(DATA_FILE)) {
        const raw = fs.readFileSync(DATA_FILE, 'utf-8');
        return JSON.parse(raw);
      }
    } catch (e) {
      console.warn('Could not read existing data store file, using seeds', e);
    }
    const initial = getInitialSeedData();
    this.save(initial);
    return initial;
  }

  private save(state: DatabaseState) {
    try {
      fs.writeFileSync(DATA_FILE, JSON.stringify(state, null, 2), 'utf-8');
    } catch (e) {
      console.error('Failed to save data store to disk', e);
    }
  }

  public getState(): DatabaseState {
    return this.state;
  }

  // Organizations
  public getOrganizations(): Organization[] {
    return this.state.organizations;
  }

  public getOrganizationById(id: string): Organization | undefined {
    return this.state.organizations.find(o => o.id === id);
  }

  public getOrganizationBySlug(slug: string): Organization | undefined {
    return this.state.organizations.find(o => o.slug === slug);
  }

  public createOrganization(org: Organization, adminUser: User): Organization {
    this.state.organizations.push(org);
    const membership: Membership = {
      id: 'mem_' + Date.now(),
      organizationId: org.id,
      userId: adminUser.id,
      role: 'org_admin',
      status: 'active',
      createdAt: new Date().toISOString(),
      userEmail: adminUser.email,
      userName: adminUser.displayName,
    };
    this.state.memberships.push(membership);
    this.save(this.state);
    return org;
  }

  public updateOrganizationStatus(orgId: string, status: 'active' | 'suspended'): Organization | undefined {
    const org = this.getOrganizationById(orgId);
    if (org) {
      org.status = status;
      this.save(this.state);
    }
    return org;
  }

  // Users & Memberships
  public getUsers(): User[] {
    return this.state.users;
  }

  public getUserById(id: string): User | undefined {
    return this.state.users.find(u => u.id === id);
  }

  public getUserByEmail(email: string): User | undefined {
    return this.state.users.find(u => u.email.toLowerCase() === email.toLowerCase());
  }

  public getMembershipsForOrg(orgId: string): Membership[] {
    return this.state.memberships.filter(m => m.organizationId === orgId);
  }

  public addMembership(membership: Membership) {
    this.state.memberships.push(membership);
    this.save(this.state);
  }

  public updateMembershipRole(
    membershipId: string,
    role: 'org_admin' | 'manager' | 'contributor' | 'viewer' | 'operator'
  ): Membership | undefined {
    const mem = this.state.memberships.find(m => m.id === membershipId);
    if (mem) {
      mem.role = role;
      this.save(this.state);
    }
    return mem;
  }

  public removeMembership(membershipId: string, orgId: string): boolean {
    const idx = this.state.memberships.findIndex(m => m.id === membershipId && m.organizationId === orgId);
    if (idx !== -1) {
      this.state.memberships.splice(idx, 1);
      this.save(this.state);
      return true;
    }
    return false;
  }

  // Workflows
  public getWorkflows(orgId?: string): WorkflowSchema[] {
    if (orgId) {
      return this.state.workflows.filter(w => w.organizationId === orgId);
    }
    return this.state.workflows;
  }

  public getWorkflowById(id: string): WorkflowSchema | undefined {
    return this.state.workflows.find(w => w.workflowId === id);
  }

  public getWorkflowBySlug(slug: string): WorkflowSchema | undefined {
    return this.state.workflows.find(w => w.publicSlug === slug && w.status === 'published');
  }

  public saveWorkflow(workflow: WorkflowSchema): WorkflowSchema {
    const idx = this.state.workflows.findIndex(w => w.workflowId === workflow.workflowId);
    if (idx >= 0) {
      this.state.workflows[idx] = workflow;
    } else {
      this.state.workflows.push(workflow);
    }
    // Also save version snapshot
    this.state.workflowVersions.push({
      id: 'ver_' + Date.now(),
      workflowId: workflow.workflowId,
      organizationId: workflow.organizationId,
      version: workflow.version,
      schema: JSON.parse(JSON.stringify(workflow)),
      createdAt: new Date().toISOString(),
    });
    this.save(this.state);
    return workflow;
  }

  // Sessions
  public getSessionById(id: string): CollectionSession | undefined {
    return this.state.collectionSessions.find(s => s.id === id);
  }

  public saveSession(session: CollectionSession): CollectionSession {
    const idx = this.state.collectionSessions.findIndex(s => s.id === session.id);
    if (idx >= 0) {
      this.state.collectionSessions[idx] = session;
    } else {
      this.state.collectionSessions.push(session);
    }
    this.save(this.state);
    return session;
  }

  public getSessionsForOrg(orgId: string): CollectionSession[] {
    return this.state.collectionSessions.filter(s => s.organizationId === orgId);
  }

  // Submissions
  public getSubmissions(orgId?: string): Submission[] {
    if (orgId) {
      return this.state.submissions.filter(s => s.organizationId === orgId);
    }
    return this.state.submissions;
  }

  public getSubmissionById(id: string): Submission | undefined {
    return this.state.submissions.find(s => s.id === id);
  }

  public saveSubmission(submission: Submission): Submission {
    this.state.submissions.unshift(submission);
    this.save(this.state);
    return submission;
  }

  public deleteSubmission(id: string, orgId: string): boolean {
    const idx = this.state.submissions.findIndex(s => s.id === id && s.organizationId === orgId);
    if (idx >= 0) {
      this.state.submissions.splice(idx, 1);
      this.save(this.state);
      return true;
    }
    return false;
  }

  // Audit Logs
  public logAudit(log: Omit<AuditLog, 'id' | 'createdAt'>): AuditLog {
    const entry: AuditLog = {
      id: 'log_' + Date.now(),
      ...log,
      createdAt: new Date().toISOString(),
    };
    this.state.auditLogs.unshift(entry);
    this.save(this.state);
    return entry;
  }

  public getAuditLogs(orgId?: string): AuditLog[] {
    if (orgId) {
      return this.state.auditLogs.filter(l => l.organizationId === orgId);
    }
    return this.state.auditLogs;
  }

  // AI Usage
  public recordAiUsage(usage: Omit<AiUsageRecord, 'id' | 'timestamp'>) {
    this.state.aiUsage.push({
      id: 'ai_' + Date.now(),
      ...usage,
      timestamp: new Date().toISOString(),
    });
    this.save(this.state);
  }

  public getAiUsage(orgId?: string): AiUsageRecord[] {
    if (orgId) {
      return this.state.aiUsage.filter(u => u.organizationId === orgId);
    }
    return this.state.aiUsage;
  }
}

export const store = new Store();
