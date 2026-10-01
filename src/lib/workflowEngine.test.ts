/**
 * Unit & Integration Test Suite for CollectAI Workflow & Conversation Engine:
 * - Multi-field extraction merging
 * - Corrections to previously collected values
 * - Deterministic validation & rejection of invalid values
 * - Conditional field recalculation on answer changes
 * - Completion rules (cannot mark complete if applicable required fields are missing)
 */

import {
  isFieldVisible,
  validateFieldValue,
  evaluateSessionState,
  getNextQuestionTarget,
  calculateDerivedValues,
} from './workflowEngine';
import { WorkflowSchema, WorkflowField, FieldState } from '../types';

export function runEngineTests(): { passed: number; failed: number; results: Array<{ test: string; status: 'PASS' | 'FAIL'; error?: string }> } {
  const results: Array<{ test: string; status: 'PASS' | 'FAIL'; error?: string }> = [];

  function assert(condition: boolean, testName: string, failureDetail?: string) {
    if (condition) {
      results.push({ test: testName, status: 'PASS' });
    } else {
      results.push({ test: testName, status: 'FAIL', error: failureDetail || 'Assertion failed' });
    }
  }

  // Sample Workflow Schema for Testing
  const testSchema: WorkflowSchema = {
    workflowId: 'test_workflow',
    organizationId: 'org_test',
    name: 'Test Intake Workflow',
    description: 'Schema for deterministic testing',
    publicSlug: 'test-intake',
    version: 1,
    status: 'published',
    createdBy: 'admin_test',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    collectionModes: ['conversation', 'form', 'operator'],
    fields: [
      {
        id: 'f1',
        key: 'applicantName',
        label: 'Applicant Name',
        type: 'short_text',
        required: true,
        minLength: 3,
        section: 'Personal',
        order: 1,
      },
      {
        id: 'f2',
        key: 'phone',
        label: 'Phone Number',
        type: 'phone',
        required: true,
        section: 'Personal',
        order: 2,
      },
      {
        id: 'f3',
        key: 'hasPension',
        label: 'Receives Existing Pension',
        type: 'single_select',
        required: true,
        options: ['Yes', 'No'],
        section: 'Eligibility',
        order: 3,
      },
      {
        id: 'f4',
        key: 'pensionDetails',
        label: 'Existing Pension Details',
        type: 'short_text',
        required: true,
        section: 'Eligibility',
        order: 4,
        visibleWhen: {
          field: 'hasPension',
          operator: 'equals',
          value: 'Yes',
        },
      },
      {
        id: 'f5',
        key: 'dob',
        label: 'Date of Birth',
        type: 'date',
        required: false,
        section: 'Personal',
        order: 5,
      },
      {
        id: 'f6',
        key: 'age',
        label: 'Age',
        type: 'calculated',
        required: false,
        section: 'Personal',
        order: 6,
        derivedFormula: {
          type: 'age_from_dob',
          params: { dobFieldKey: 'dob' },
        },
      },
    ],
  };

  // Test 1: Deterministic validation of valid and invalid values
  const phoneField = testSchema.fields.find(f => f.key === 'phone')!;
  const validPhoneRes = validateFieldValue(phoneField, '9829012345', {});
  assert(validPhoneRes.isValid === true, 'Validation: Accept valid 10-digit phone number');

  const invalidPhoneRes = validateFieldValue(phoneField, '123', {});
  assert(invalidPhoneRes.isValid === false, 'Validation: Reject short invalid phone number');

  const nameField = testSchema.fields.find(f => f.key === 'applicantName')!;
  const shortNameRes = validateFieldValue(nameField, 'A', {});
  assert(shortNameRes.isValid === false, 'Validation: Reject name shorter than minLength');

  // Test 2: Multi-field extraction merging into FieldState
  const initialFieldState: Record<string, FieldState> = {};
  const extractedItems = [
    { fieldKey: 'applicantName', value: 'Ramesh Kumar', confidence: 0.95 },
    { fieldKey: 'phone', value: '9829012345', confidence: 0.98 },
  ];

  for (const item of extractedItems) {
    const f = testSchema.fields.find(field => field.key === item.fieldKey)!;
    const valRes = validateFieldValue(f, item.value, {});
    initialFieldState[item.fieldKey] = {
      fieldKey: item.fieldKey,
      value: item.value,
      displayValue: String(item.value),
      status: valRes.isValid ? 'valid' : 'invalid',
      confidence: item.confidence,
      source: 'user_message',
      validationErrors: valRes.errors,
      lastUpdatedAt: new Date().toISOString(),
      confirmedByUser: true,
    };
  }

  assert(
    initialFieldState['applicantName']?.status === 'valid' &&
    initialFieldState['phone']?.status === 'valid',
    'Extraction Merging: Multiple fields simultaneously extracted and validated'
  );

  // Test 3: Session completion guards (cannot be complete if required visible fields are missing)
  const evalIncomplete = evaluateSessionState(testSchema, initialFieldState);
  assert(
    evalIncomplete.isComplete === false,
    'Completion Guard: Session is NOT complete when required fields (hasPension) are missing'
  );
  assert(
    evalIncomplete.missingRequiredFields.some(f => f.key === 'hasPension'),
    'Completion Guard: hasPension accurately flagged as missing required field'
  );

  // Test 4: Conditional Visibility Logic
  // When hasPension = 'No', pensionDetails should NOT be visible and not required
  initialFieldState['hasPension'] = {
    fieldKey: 'hasPension',
    value: 'No',
    displayValue: 'No',
    status: 'valid',
    confidence: 1.0,
    source: 'user_message',
    validationErrors: [],
    lastUpdatedAt: new Date().toISOString(),
    confirmedByUser: true,
  };

  const evalWithNoPension = evaluateSessionState(testSchema, initialFieldState);
  assert(
    evalWithNoPension.isComplete === true,
    'Conditional Visibility: When hasPension=No, conditional field is not_applicable and session is complete'
  );
  assert(
    evalWithNoPension.updatedFieldState['pensionDetails']?.status === 'not_applicable',
    'Conditional Visibility: pensionDetails marked not_applicable when condition is unmet'
  );

  // Test 5: Conditional Recalculation on Answer Change
  // When hasPension changes from 'No' to 'Yes', pensionDetails must become visible & required
  initialFieldState['hasPension'].value = 'Yes';
  initialFieldState['hasPension'].displayValue = 'Yes';

  const evalWithYesPension = evaluateSessionState(testSchema, initialFieldState);
  assert(
    evalWithYesPension.isComplete === false,
    'Recalculation on Change: Changing hasPension to Yes immediately requires pensionDetails'
  );
  assert(
    evalWithYesPension.missingRequiredFields.some(f => f.key === 'pensionDetails'),
    'Recalculation on Change: pensionDetails is now in missingRequiredFields'
  );

  // Test 6: Value Correction Handling
  const oldPhone = initialFieldState['phone'].value;
  const newPhone = '9828999999';
  const correctionValidation = validateFieldValue(phoneField, newPhone, {});
  initialFieldState['phone'] = {
    ...initialFieldState['phone'],
    value: newPhone,
    displayValue: newPhone,
    status: correctionValidation.isValid ? 'valid' : 'invalid',
    updatedBy: 'user_correction',
  };

  assert(
    initialFieldState['phone'].value === '9828999999' && initialFieldState['phone'].status === 'valid',
    'Value Corrections: Prior value cleanly overridden by new valid correction'
  );

  // Test 7: Derived Field Calculation (DOB -> Age)
  initialFieldState['dob'] = {
    fieldKey: 'dob',
    value: '1990-01-01',
    displayValue: '1990-01-01',
    status: 'valid',
    confidence: 1.0,
    source: 'user_message',
    validationErrors: [],
    lastUpdatedAt: new Date().toISOString(),
    confirmedByUser: true,
  };

  const evalWithDob = evaluateSessionState(testSchema, initialFieldState);
  const calculatedAge = evalWithDob.updatedFieldState['age']?.value;
  assert(
    typeof calculatedAge === 'number' && calculatedAge >= 30,
    'Derived Formula: Age correctly derived from DOB deterministically'
  );

  // Test 8: Never ask for a valid value already collected
  const nextTarget = getNextQuestionTarget(
    evalWithYesPension.visibleFields,
    evalWithYesPension.updatedFieldState,
    evalWithYesPension.missingRequiredFields,
    evalWithYesPension.invalidFields
  );
  assert(
    nextTarget.targetField?.key === 'pensionDetails',
    'Question Target: Never ask for applicantName or phone since they are already valid'
  );

  const passed = results.filter(r => r.status === 'PASS').length;
  const failed = results.filter(r => r.status === 'FAIL').length;

  return { passed, failed, results };
}
