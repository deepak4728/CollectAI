import {
  WorkflowSchema,
  WorkflowField,
  FieldState,
  FieldCondition,
  DerivedFormula,
  CollectionSession,
} from '../types';

/**
 * Checks whether a given field should be visible based on its `visibleWhen` condition
 * and the current field values in the session.
 */
export function isFieldVisible(
  field: WorkflowField,
  fieldValues: Record<string, any>
): boolean {
  if (!field.visibleWhen) {
    return true;
  }

  const { field: targetKey, operator, value: expectedValue } = field.visibleWhen;
  const targetActualValue = fieldValues[targetKey];

  if (targetActualValue === undefined || targetActualValue === null || targetActualValue === '') {
    return false;
  }

  switch (operator) {
    case 'equals':
      return String(targetActualValue).trim().toLowerCase() === String(expectedValue).trim().toLowerCase();
    case 'not_equals':
      return String(targetActualValue).trim().toLowerCase() !== String(expectedValue).trim().toLowerCase();
    case 'greater_than':
      return Number(targetActualValue) > Number(expectedValue);
    case 'less_than':
      return Number(targetActualValue) < Number(expectedValue);
    case 'contains':
      if (Array.isArray(targetActualValue)) {
        return targetActualValue.includes(expectedValue);
      }
      return String(targetActualValue).toLowerCase().includes(String(expectedValue).toLowerCase());
    case 'in':
      if (Array.isArray(expectedValue)) {
        return expectedValue.map(v => String(v).toLowerCase()).includes(String(targetActualValue).toLowerCase());
      }
      return false;
    default:
      return true;
  }
}

/**
 * Deterministically calculates derived fields (e.g. Age from DOB, Restaurant Order Totals).
 */
export function calculateDerivedValues(
  fields: WorkflowField[],
  currentValues: Record<string, any>
): Record<string, any> {
  const calculated: Record<string, any> = {};

  for (const field of fields) {
    if (!field.derivedFormula) continue;

    const formula = field.derivedFormula;

    if (formula.type === 'age_from_dob') {
      const dobKey = formula.params?.dobFieldKey || 'dob';
      const dobVal = currentValues[dobKey];
      if (dobVal) {
        const birthDate = new Date(dobVal);
        if (!isNaN(birthDate.getTime())) {
          // Current reference date (or current execution date)
          const today = new Date();
          let age = today.getFullYear() - birthDate.getFullYear();
          const m = today.getMonth() - birthDate.getMonth();
          if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
            age--;
          }
          calculated[field.key] = Math.max(0, age);
        }
      }
    } else if (formula.type === 'restaurant_totals') {
      const itemsKey = formula.params?.itemsKey || 'orderedItems';
      const discountCodeKey = formula.params?.discountCodeKey || 'couponCode';
      const taxRate = formula.params?.taxRate ?? 0.05; // 5% default tax

      const rawItems = currentValues[itemsKey];
      let subtotal = 0;

      if (Array.isArray(rawItems)) {
        for (const item of rawItems) {
          const price = Number(item.price || item.unitPrice || 0);
          const qty = Number(item.quantity || 1);
          subtotal += price * qty;
        }
      } else if (typeof rawItems === 'string') {
        // Fallback parser if items is free text with prices or standard items
        // e.g. "two paneer tikka pizzas"
        const lower = rawItems.toLowerCase();
        if (lower.includes('pizza')) subtotal += 250;
        if (lower.includes('two') || lower.includes('2')) subtotal += 250;
        if (lower.includes('coffee') || lower.includes('cold coffee')) subtotal += 90;
        if (subtotal === 0) subtotal = 150; // default minimum demo fallback
      }

      // Check coupon
      let discount = 0;
      const coupon = String(currentValues[discountCodeKey] || '').toUpperCase();
      if (coupon === 'WELCOME20' || coupon === 'SAVE20') {
        discount = Math.round(subtotal * 0.2);
      } else if (coupon === 'FLAT50') {
        discount = Math.min(subtotal, 50);
      }

      const taxableAmount = Math.max(0, subtotal - discount);
      const tax = Math.round(taxableAmount * taxRate * 100) / 100;
      const grandTotal = Math.round((taxableAmount + tax) * 100) / 100;

      if (field.key === 'subtotal') calculated[field.key] = subtotal;
      if (field.key === 'tax') calculated[field.key] = tax;
      if (field.key === 'discount') calculated[field.key] = discount;
      if (field.key === 'grandTotal' || field.key === 'totalAmount') calculated[field.key] = grandTotal;
    }
  }

  return calculated;
}

/**
 * Validates a single field value deterministically based on field definition.
 */
export function validateFieldValue(
  field: WorkflowField,
  value: any,
  allValues: Record<string, any>
): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Check visibility first
  const isVisible = isFieldVisible(field, allValues);
  if (!isVisible) {
    return { isValid: true, errors: [] };
  }

  const isEmpty =
    value === undefined ||
    value === null ||
    value === '' ||
    (Array.isArray(value) && value.length === 0);

  // Required check
  if (field.required && isEmpty) {
    errors.push(`${field.label} is required.`);
    return { isValid: false, errors };
  }

  // If optional and empty, it's valid
  if (isEmpty) {
    return { isValid: true, errors: [] };
  }

  // Type-specific validations
  switch (field.type) {
    case 'number':
    case 'quantity':
    case 'currency': {
      const num = Number(value);
      if (isNaN(num)) {
        errors.push(`${field.label} must be a valid number.`);
      } else {
        if (field.min !== undefined && num < field.min) {
          errors.push(`${field.label} must be at least ${field.min}.`);
        }
        if (field.max !== undefined && num > field.max) {
          errors.push(`${field.label} must not exceed ${field.max}.`);
        }
      }
      break;
    }

    case 'email': {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(String(value).trim())) {
        errors.push(`Please enter a valid email address.`);
      }
      break;
    }

    case 'phone': {
      const digitsOnly = String(value).replace(/\D/g, '');
      if (digitsOnly.length < 10 || digitsOnly.length > 15) {
        errors.push(`Please enter a valid phone number (at least 10 digits).`);
      }
      break;
    }

    case 'short_text':
    case 'long_text':
    case 'address': {
      const strVal = String(value).trim();
      if (field.minLength !== undefined && strVal.length < field.minLength) {
        errors.push(`${field.label} must be at least ${field.minLength} characters.`);
      }
      if (field.maxLength !== undefined && strVal.length > field.maxLength) {
        errors.push(`${field.label} must not exceed ${field.maxLength} characters.`);
      }
      if (field.pattern) {
        try {
          const reg = new RegExp(field.pattern);
          if (!reg.test(strVal)) {
            errors.push(`${field.label} format is invalid.`);
          }
        } catch {
          // ignore bad pattern definition
        }
      }
      break;
    }

    case 'single_select': {
      if (field.options && field.options.length > 0) {
        const optionValues = field.options.map(opt =>
          typeof opt === 'string' ? opt.toLowerCase() : opt.value.toLowerCase()
        );
        if (!optionValues.includes(String(value).trim().toLowerCase())) {
          errors.push(`Selected option is not in the allowed list.`);
        }
      }
      break;
    }

    case 'multi_select': {
      if (Array.isArray(value) && field.options && field.options.length > 0) {
        const optionValues = field.options.map(opt =>
          typeof opt === 'string' ? opt.toLowerCase() : opt.value.toLowerCase()
        );
        const invalidSelections = value.filter(
          item => !optionValues.includes(String(item).trim().toLowerCase())
        );
        if (invalidSelections.length > 0) {
          errors.push(`Some selected options are not allowed: ${invalidSelections.join(', ')}`);
        }
      }
      break;
    }

    case 'date': {
      const d = new Date(value);
      if (isNaN(d.getTime())) {
        errors.push(`Please enter a valid date.`);
      }
      break;
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Evaluates the entire session field state:
 * - Recalculates derived fields
 * - Evaluates visibility
 * - Runs deterministic validations
 * - Returns updated field states, missing required fields, and completion flag.
 */
export function evaluateSessionState(
  schema: WorkflowSchema,
  currentFieldState: Record<string, FieldState>
): {
  updatedFieldState: Record<string, FieldState>;
  visibleFields: WorkflowField[];
  missingRequiredFields: WorkflowField[];
  invalidFields: WorkflowField[];
  completedFieldsCount: number;
  totalRequiredVisibleCount: number;
  isComplete: boolean;
  completionPercentage: number;
} {
  const updatedFieldState: Record<string, FieldState> = { ...currentFieldState };

  // 1. Build flat current raw values map
  const rawValues: Record<string, any> = {};
  for (const field of schema.fields) {
    rawValues[field.key] = currentFieldState[field.key]?.value;
  }

  // 2. Compute derived values
  const derivedValues = calculateDerivedValues(schema.fields, rawValues);
  for (const [key, val] of Object.entries(derivedValues)) {
    rawValues[key] = val;
    const existing = updatedFieldState[key];
    updatedFieldState[key] = {
      fieldKey: key,
      value: val,
      displayValue: String(val),
      status: 'valid',
      confidence: 1.0,
      source: 'calculated',
      validationErrors: [],
      lastUpdatedAt: new Date().toISOString(),
      confirmedByUser: true,
      updatedBy: 'system_calculation',
    };
  }

  const visibleFields: WorkflowField[] = [];
  const missingRequiredFields: WorkflowField[] = [];
  const invalidFields: WorkflowField[] = [];
  let completedFieldsCount = 0;
  let totalRequiredVisibleCount = 0;

  for (const field of schema.fields) {
    const isVisible = isFieldVisible(field, rawValues);
    const existingState = updatedFieldState[field.key] || {
      fieldKey: field.key,
      value: field.defaultValue ?? '',
      displayValue: field.defaultValue !== undefined ? String(field.defaultValue) : '',
      status: 'empty',
      confidence: 0,
      source: field.defaultValue !== undefined ? 'admin_default' : 'user_message',
      validationErrors: [],
      lastUpdatedAt: new Date().toISOString(),
      confirmedByUser: false,
    };

    if (!isVisible) {
      // If not visible, set status to not_applicable
      updatedFieldState[field.key] = {
        ...existingState,
        status: 'not_applicable',
        validationErrors: [],
      };
      continue;
    }

    visibleFields.push(field);
    if (field.required) {
      totalRequiredVisibleCount++;
    }

    const { isValid, errors } = validateFieldValue(field, existingState.value, rawValues);

    const isEmpty =
      existingState.value === undefined ||
      existingState.value === null ||
      existingState.value === '' ||
      (Array.isArray(existingState.value) && existingState.value.length === 0);

    let status: FieldState['status'] = existingState.status;

    if (isEmpty) {
      status = 'empty';
      if (field.required) {
        missingRequiredFields.push(field);
      }
    } else if (!isValid) {
      status = 'invalid';
      invalidFields.push(field);
    } else {
      status = existingState.status === 'needs_confirmation' ? 'needs_confirmation' : 'valid';
      if (status === 'valid') {
        completedFieldsCount++;
      }
    }

    updatedFieldState[field.key] = {
      ...existingState,
      status,
      validationErrors: errors,
    };
  }

  const isComplete = missingRequiredFields.length === 0 && invalidFields.length === 0;
  const completionPercentage =
    totalRequiredVisibleCount > 0
      ? Math.min(100, Math.round((completedFieldsCount / totalRequiredVisibleCount) * 100))
      : 100;

  return {
    updatedFieldState,
    visibleFields,
    missingRequiredFields,
    invalidFields,
    completedFieldsCount,
    totalRequiredVisibleCount,
    isComplete,
    completionPercentage,
  };
}

/**
 * Determines the next best field or question to ask the user.
 */
export function getNextQuestionTarget(
  visibleFields: WorkflowField[],
  fieldState: Record<string, FieldState>,
  missingRequiredFields: WorkflowField[],
  invalidFields: WorkflowField[]
): {
  targetField?: WorkflowField;
  action: 'ask_question' | 'explain_validation_error' | 'request_confirmation' | 'mark_complete';
  prompt: string;
} {
  // 1. If any field is invalid, explain and ask for correction first
  if (invalidFields.length > 0) {
    const invalidField = invalidFields[0];
    const errors = fieldState[invalidField.key]?.validationErrors || [];
    return {
      targetField: invalidField,
      action: 'explain_validation_error',
      prompt: `Quick quality-check on **${invalidField.label}**: ${errors.join(' ')}. Could you give that one more quick polish?`,
    };
  }

  // 2. If any field needs confirmation
  const unconfirmed = visibleFields.find(f => fieldState[f.key]?.status === 'needs_confirmation');
  if (unconfirmed) {
    const state = fieldState[unconfirmed.key];
    return {
      targetField: unconfirmed,
      action: 'request_confirmation',
      prompt: `Spot-check: I have **${unconfirmed.label}** recorded as *"${state.displayValue}"*. Does that look sharp and accurate?`,
    };
  }

  // 3. Ask for next missing required field
  if (missingRequiredFields.length > 0) {
    const nextField = missingRequiredFields[0];
    let prompt = `Could you share your **${nextField.label.toLowerCase()}**?`;
    if (nextField.type === 'single_select' && nextField.options) {
      const opts = nextField.options.map(o => (typeof o === 'string' ? o : o.label)).join(', ');
      prompt = `Which **${nextField.label.toLowerCase()}** shall we put down? Pick your favorite: (${opts})`;
    } else if (nextField.placeholder) {
      prompt = `May we have your **${nextField.label.toLowerCase()}**? (e.g., *${nextField.placeholder}*)`;
    }
    return {
      targetField: nextField,
      action: 'ask_question',
      prompt,
    };
  }

  // 4. Everything is complete
  return {
    action: 'mark_complete',
    prompt: `🎯 Stellar job! Every required detail is locked in and verified. Give it a quick final review and tap submit!`,
  };
}
