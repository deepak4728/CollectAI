export type UserRole =
  | 'super_admin'
  | 'org_admin'
  | 'manager'
  | 'contributor'
  | 'viewer'
  | 'operator'
  | 'customer';

export interface User {
  id: string;
  email: string;
  displayName: string;
  platformRole: 'super_admin' | 'user';
  createdAt: string;
}

export interface Organization {
  id: string;
  name: string;
  slug: string;
  industry: 'government_csc' | 'food_hospitality' | 'healthcare' | 'education' | 'real_estate' | 'general';
  plan: 'free_trial' | 'professional' | 'enterprise';
  status: 'active' | 'suspended';
  createdAt: string;
  settings: {
    allowPublicSubmissions: boolean;
    requireRespondentAuth: boolean;
    dataRetentionDays: number;
    customBranding?: {
      primaryColor?: string;
      logoUrl?: string;
    };
  };
}

export interface Membership {
  id: string;
  organizationId: string;
  userId: string;
  role: 'org_admin' | 'manager' | 'contributor' | 'viewer' | 'operator';
  status: 'active' | 'invited';
  createdAt: string;
  userEmail?: string;
  userName?: string;
}

export type FieldType =
  | 'short_text'
  | 'long_text'
  | 'number'
  | 'currency'
  | 'email'
  | 'phone'
  | 'date'
  | 'time'
  | 'datetime'
  | 'address'
  | 'single_select'
  | 'multi_select'
  | 'boolean'
  | 'rating'
  | 'quantity'
  | 'file_upload'
  | 'image_upload'
  | 'table'
  | 'calculated'
  | 'hidden';

export interface FieldCondition {
  field: string;
  operator: 'equals' | 'not_equals' | 'greater_than' | 'less_than' | 'contains' | 'in';
  value: any;
}

export interface DerivedFormula {
  type: 'age_from_dob' | 'restaurant_totals' | 'custom_math';
  params?: Record<string, any>;
}

export interface WorkflowField {
  id: string;
  key: string;
  label: string;
  type: FieldType;
  required: boolean;
  description?: string;
  placeholder?: string;
  defaultValue?: any;
  min?: number;
  max?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  options?: Array<{ label: string; value: string; price?: number } | string>;
  visibleWhen?: FieldCondition;
  sensitive?: boolean;
  requiresConfirmation?: boolean;
  derivedFormula?: DerivedFormula;
  section?: string;
  order: number;
}

export interface WorkflowSchema {
  workflowId: string;
  organizationId: string;
  name: string;
  description: string;
  version: number;
  status: 'draft' | 'published' | 'archived';
  collectionModes: Array<'conversation' | 'form' | 'operator'>;
  publicSlug: string;
  fields: WorkflowField[];
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export type FieldStatus =
  | 'empty'
  | 'extracted'
  | 'needs_confirmation'
  | 'valid'
  | 'invalid'
  | 'skipped'
  | 'not_applicable';

export type FieldSource =
  | 'user_message'
  | 'operator_input'
  | 'uploaded_document'
  | 'calculated'
  | 'imported'
  | 'admin_default';

export interface FieldState {
  fieldKey: string;
  value: any;
  displayValue: string;
  status: FieldStatus;
  confidence: number;
  source: FieldSource;
  validationErrors: string[];
  lastUpdatedAt: string;
  confirmedByUser: boolean;
  updatedBy?: string;
}

export interface DisambiguationOption {
  label: string;
  fieldKey?: string;
  value: any;
  actionText?: string;
}

export interface ChatMessage {
  id: string;
  sessionId: string;
  organizationId: string;
  role: 'assistant' | 'user' | 'system' | 'operator';
  content: string;
  structuredExtraction?: {
    extractedFields: Array<{
      fieldKey: string;
      value: any;
      confidence: number;
      evidence?: string;
    }>;
    corrections?: Array<{
      fieldKey: string;
      oldValue?: any;
      newValue: any;
      reason?: string;
    }>;
  };
  interactiveDisambiguation?: {
    type: 'yes_no' | 'field_selection' | 'choice_selection';
    title?: string;
    targetFieldKey?: string;
    targetValue?: any;
    options: DisambiguationOption[];
  };
  createdAt: string;
}

export interface CollectionSession {
  id: string;
  organizationId: string;
  workflowId: string;
  workflowVersion: number;
  mode: 'conversation' | 'form' | 'operator';
  status: 'in_progress' | 'needs_review' | 'completed' | 'abandoned';
  fieldState: Record<string, FieldState>;
  messages: ChatMessage[];
  startedBy?: string;
  respondentId?: string;
  respondentName?: string;
  startedAt: string;
  lastActivityAt: string;
  completedAt?: string;
}

export interface Submission {
  id: string;
  organizationId: string;
  workflowId: string;
  workflowName: string;
  workflowVersion: number;
  sessionId: string;
  structuredData: Record<string, any>;
  fieldSources?: Record<string, { source: FieldSource; confidence: number }>;
  validationStatus: 'valid' | 'flagged' | 'incomplete';
  status: 'completed' | 'needs_review' | 'archived';
  submittedBy?: string;
  userId?: string;
  respondentName?: string;
  submittedAt: string;
}

export interface AuditLog {
  id: string;
  organizationId: string;
  actorId: string;
  actorName: string;
  action: string;
  resourceType: 'workflow' | 'session' | 'submission' | 'organization' | 'membership';
  resourceId: string;
  metadata?: Record<string, any>;
  createdAt: string;
}

export interface AiUsageRecord {
  id: string;
  organizationId: string;
  timestamp: string;
  feature: 'workflow_generation' | 'conversational_extraction' | 'question_synthesis';
  tokensUsed: number;
  estimatedCostUsd: number;
}
