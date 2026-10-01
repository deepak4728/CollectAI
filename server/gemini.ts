import { GoogleGenAI } from '@google/genai';
import { WorkflowSchema, WorkflowField } from '../src/types';
import { GeminiExtractionOutputSchema, GeminiExtractionOutput } from './extractionSchema';

// Initialize Gemini SDK with telemetry header
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

export interface ExtractionResult {
  extractedValues: Array<{
    fieldKey: string;
    value: any;
    confidence: number;
    source: 'user_message' | 'operator_input';
    evidence: string;
  }>;
  possibleCorrections: Array<{
    fieldKey: string;
    oldValue?: any;
    newValue: any;
    reason?: string;
  }>;
  ambiguities: string[];
  offTopic: boolean;
  conversationalReply?: string;
}

/**
 * Extracts structured data from user message against the active workflow schema.
 */
export async function extractDataFromMessage(
  schema: WorkflowSchema,
  visibleFields: WorkflowField[],
  currentValues: Record<string, any>,
  userMessage: string,
  conversationHistory: Array<{ role: string; content: string }>
): Promise<ExtractionResult> {
  const fieldsOverview = visibleFields.map(f => ({
    key: f.key,
    label: f.label,
    type: f.type,
    description: f.description,
    options: f.options,
    required: f.required,
    currentValue: currentValues[f.key] ?? null,
  }));

  const systemPrompt = `You are the CollectAI Extraction Engine.
Your job is to accurately extract field values from the user's natural language message according to the workflow schema.
The current workflow is "${schema.name}".

Active Fields available for extraction:
${JSON.stringify(fieldsOverview, null, 2)}

Already collected values:
${JSON.stringify(currentValues, null, 2)}

Extraction Rules:
1. Extract all relevant field values present in the user message.
2. For single_select / dropdown fields, match abbreviations, initials, acronyms, or colloquial keywords to the exact allowed option (e.g., "IC" or "Income" -> "Income Certificate", "OAP" or "Pension" -> "Old Age Pension", "CC" -> "Caste Certificate", "DC" -> "Domicile Certificate").
3. If the user answers multiple fields in one single sentence, extract ALL of them (e.g. order type + items + address + phone, or applicant name + dob + district + id).
4. If the user is correcting a previously collected value (e.g. "change phone to...", "my new address is..."), put it in possibleCorrections and also update extractedValues with the new value.
5. If food items are mentioned, extract an array of items with { name, quantity, price } if known, or a clear list string.
6. If phone numbers, emails, dates, or numbers are given, format them cleanly (e.g. dates as YYYY-MM-DD if possible).
7. Set confidence score between 0.0 and 1.0 (0.95+ for direct clear mentions).
8. If the user message is completely unrelated chit-chat, mark offTopic: true.
9. Formulate a polite, natural 1-sentence conversational acknowledgement or reply.

You MUST respond strictly with valid JSON conforming to this structure:
{
  "extractedValues": [
    {
      "fieldKey": "string",
      "value": "any (string, number, array, boolean)",
      "confidence": 0.95,
      "source": "user_message",
      "evidence": "exact words from message"
    }
  ],
  "possibleCorrections": [
    {
      "fieldKey": "string",
      "oldValue": "any",
      "newValue": "any",
      "reason": "user requested update"
    }
  ],
  "ambiguities": [],
  "offTopic": false,
  "conversationalReply": "string"
}`;

  // 1. Primary Classification: Query Jev System One for fast typed categorization
  let jevExtracted: ExtractionResult | null = null;
  const jevUrl = process.env.JEV_API_URL || 'https://api.typesafe.ai/v1/systemone';
  const jevKey = process.env.JEV_API_KEY || 'apikey_214708419009d9a14611a7b376e2c0c523d6_5946cbd78bf8023138b01184edb0bb534f876861523c01825feda7bbdee54850';

  if (jevUrl && jevKey) {
    try {
      jevExtracted = await callJevClassifier(
        jevUrl,
        jevKey,
        schema,
        visibleFields,
        currentValues,
        userMessage
      );
    } catch (err) {
      console.warn('JEV classifier call failed or timed out:', err);
    }
  }

  // 2. Comprehensive Multi-Field Fallback Extractor (runs instantly on message)
  const heuristicResult = fallbackHeuristicExtraction(visibleFields, currentValues, userMessage);

  // 3. Nuanced Language Context: Query Gemini 3.8 Flash if API key is present
  let geminiResult: ExtractionResult | null = null;
  if (process.env.GEMINI_API_KEY) {
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: [
          {
            role: 'user',
            parts: [
              {
                text: `${systemPrompt}\n\nRecent Conversation:\n${JSON.stringify(
                  conversationHistory.slice(-4)
                )}\n\nLatest User Message: "${userMessage}"`,
              },
            ],
          },
        ],
        config: {
          responseMimeType: 'application/json',
          temperature: 0.1,
        },
      });

      const text = response.text?.trim() || '{}';
      const parsedJson = JSON.parse(text);
      const validation = GeminiExtractionOutputSchema.safeParse(parsedJson);

      if (validation.success) {
        geminiResult = validation.data as ExtractionResult;
      } else {
        console.warn('Gemini extraction output failed runtime schema validation:', validation.error);
      }
    } catch (err) {
      console.warn('Gemini extraction error:', err);
    }
  }

  // 4. Multi-Slot Fusion: Combine extracted fields across all tiers (Gemini, JEV, Heuristics)
  // Ensures ALL fields (name, date of birth, location, phone, service type) provided simultaneously are captured
  const mergedMap = new Map<string, ExtractionResult['extractedValues'][0]>();

  // Add Gemini extractions
  if (geminiResult && geminiResult.extractedValues) {
    for (const item of geminiResult.extractedValues) {
      mergedMap.set(item.fieldKey, item);
    }
  }

  // Add JEV extractions (higher confidence on typed choice/noul)
  if (jevExtracted && jevExtracted.extractedValues) {
    for (const item of jevExtracted.extractedValues) {
      if (!mergedMap.has(item.fieldKey) || item.confidence >= (mergedMap.get(item.fieldKey)?.confidence ?? 0)) {
        mergedMap.set(item.fieldKey, item);
      }
    }
  }

  // Add Heuristic extractions (guarantees regex matches for dob, name, district, phone, etc.)
  if (heuristicResult && heuristicResult.extractedValues) {
    for (const item of heuristicResult.extractedValues) {
      if (!mergedMap.has(item.fieldKey)) {
        mergedMap.set(item.fieldKey, item);
      }
    }
  }

  const finalExtractedValues = Array.from(mergedMap.values());
  const finalCorrections = [
    ...(geminiResult?.possibleCorrections || []),
    ...(heuristicResult?.possibleCorrections || []),
    ...(jevExtracted?.possibleCorrections || []),
  ];

  const ambiguities = [
    ...(geminiResult?.ambiguities || []),
    ...(heuristicResult?.ambiguities || []),
  ];

  const isOffTopic = (geminiResult?.offTopic || false) || (jevExtracted?.offTopic || false);

  const reply =
    geminiResult?.conversationalReply ||
    (finalExtractedValues.length > 0
      ? `Got it! Captured your ${finalExtractedValues.map(v => v.fieldKey).join(', ')}.`
      : undefined);

  return {
    extractedValues: finalExtractedValues,
    possibleCorrections: finalCorrections,
    ambiguities,
    offTopic: isOffTopic,
    conversationalReply: reply,
  };
}

/**
 * Resolves user input (acronyms like 'IC', 'OAP', partial names, typos) to the most probable schema option.
 */
function resolveBestOptionMatch(userInput: string, options: any[]): { option: string; confidence: number } | null {
  const clean = userInput.trim().toLowerCase();
  if (!clean) return null;

  // 1. Direct equality or inclusion
  for (const opt of options) {
    const val = typeof opt === 'string' ? opt : opt.value;
    if (val.toLowerCase() === clean || clean.includes(val.toLowerCase())) {
      return { option: val, confidence: 1.0 };
    }
  }

  // 2. Acronym check (e.g. "IC" -> "Income Certificate", "OAP" -> "Old Age Pension", "CC" -> "Caste Certificate")
  const wordsInInput = clean.split(/[\s,.-]+/).filter(Boolean);
  const potentialAcronyms = [clean.replace(/[^a-z0-9]/g, ''), ...wordsInInput];

  for (const opt of options) {
    const val = typeof opt === 'string' ? opt : opt.value;
    const optWords = val.split(/[\s_-]+/).filter(Boolean);
    const acronym = optWords.map((w: string) => w[0].toLowerCase()).join('');
    if (potentialAcronyms.some(a => a === acronym && a.length >= 2)) {
      return { option: val, confidence: 0.98 };
    }
  }

  // 3. Substring or token match (e.g. "income", "pension", "caste")
  const inputWords = clean.split(/[\s,.-]+/).filter(w => w.length > 2);
  for (const opt of options) {
    const val = typeof opt === 'string' ? opt : opt.value;
    const optLower = val.toLowerCase();
    if (clean.length > 2 && optLower.includes(clean)) {
      return { option: val, confidence: 0.95 };
    }
    for (const iw of inputWords) {
      if (optLower.includes(iw)) {
        return { option: val, confidence: 0.92 };
      }
    }
  }

  return null;
}

/**
 * Heuristic fallback extraction for offline/demo robustness.
 */
function fallbackHeuristicExtraction(
  fields: WorkflowField[],
  currentValues: Record<string, any>,
  message: string
): ExtractionResult {
  const extractedValues: ExtractionResult['extractedValues'] = [];
  const lowerMsg = message.toLowerCase();

  for (const field of fields) {
    // 1. Phone number check
    if (field.type === 'phone' || field.key.toLowerCase().includes('phone')) {
      const phoneMatch = message.match(/\b\d{10,12}\b/);
      if (phoneMatch) {
        extractedValues.push({
          fieldKey: field.key,
          value: phoneMatch[0],
          confidence: 0.98,
          source: 'user_message',
          evidence: phoneMatch[0],
        });
      }
    }

    // 2. Email check
    if (field.type === 'email') {
      const emailMatch = message.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
      if (emailMatch) {
        extractedValues.push({
          fieldKey: field.key,
          value: emailMatch[0],
          confidence: 0.99,
          source: 'user_message',
          evidence: emailMatch[0],
        });
      }
    }

    // 3. Single select options match (supports acronyms like IC, OAP, and partial names)
    if (field.type === 'single_select' && field.options) {
      const match = resolveBestOptionMatch(message, field.options);
      if (match) {
        extractedValues.push({
          fieldKey: field.key,
          value: match.option,
          confidence: match.confidence,
          source: 'user_message',
          evidence: message,
        });
      }
    }

    // 4. Date of birth / Date check (YYYY-MM-DD or DD/MM/YYYY)
    if (field.type === 'date' || field.key.toLowerCase().includes('dob') || field.label.toLowerCase().includes('birth')) {
      const dateMatch =
        message.match(/\b(\d{4}-\d{2}-\d{2})\b/) ||
        message.match(/\b(\d{2}[-/]\d{2}[-/]\d{4})\b/) ||
        message.match(/(?:dob|date of birth|birth(?:day)?|born on)\s*(?:is|:)?\s*([0-9]{4}[-/][0-9]{2}[-/][0-9]{2}|[0-9]{2}[-/][0-9]{2}[-/][0-9]{4})/i);
      if (dateMatch) {
        const val = dateMatch[1];
        extractedValues.push({
          fieldKey: field.key,
          value: val,
          confidence: 0.96,
          source: 'user_message',
          evidence: dateMatch[0],
        });
      }
    }

    // 5. Restaurant order specific heuristics (Order type, table number, delivery address)
    if (field.key === 'orderType') {
      if (lowerMsg.includes('dine-in') || lowerMsg.includes('dine in')) {
        extractedValues.push({ fieldKey: field.key, value: 'Dine-in', confidence: 0.98, source: 'user_message', evidence: 'dine in' });
      } else if (lowerMsg.includes('takeaway') || lowerMsg.includes('take away') || lowerMsg.includes('pickup')) {
        extractedValues.push({ fieldKey: field.key, value: 'Takeaway', confidence: 0.98, source: 'user_message', evidence: 'takeaway' });
      } else if (lowerMsg.includes('delivery') || lowerMsg.includes('deliver')) {
        extractedValues.push({ fieldKey: field.key, value: 'Delivery', confidence: 0.98, source: 'user_message', evidence: 'delivery' });
      }
    }

    if (field.key === 'tableNumber') {
      const tableMatch = message.match(/table\s*(?:no\.?|number)?\s*(\d+)/i);
      if (tableMatch) {
        extractedValues.push({ fieldKey: field.key, value: Number(tableMatch[1]), confidence: 0.95, source: 'user_message', evidence: tableMatch[0] });
      }
    }

    if (field.key === 'deliveryAddress' && (lowerMsg.includes('deliver to') || lowerMsg.includes('address'))) {
      const addrMatch = message.match(/(?:deliver to|address(?: is)?)\s*[:]?\s*([^.]+)/i);
      if (addrMatch) {
        extractedValues.push({ fieldKey: field.key, value: addrMatch[1].trim(), confidence: 0.9, source: 'user_message', evidence: addrMatch[0] });
      }
    }

    if (field.key === 'orderedItems') {
      const items: Array<{ name: string; quantity: number; price: number }> = [];
      if (lowerMsg.includes('paneer tikka pizza')) {
        const qtyMatch = lowerMsg.match(/(two|2|\d+)\s+paneer tikka pizza/);
        const qty = qtyMatch ? (qtyMatch[1] === 'two' ? 2 : parseInt(qtyMatch[1]) || 1) : 1;
        items.push({ name: 'Paneer Tikka Pizza (10")', quantity: qty, price: 299 });
      }
      if (lowerMsg.includes('cold coffee')) {
        const qtyMatch = lowerMsg.match(/(one|1|\d+)\s+cold coffee/);
        const qty = qtyMatch ? (qtyMatch[1] === 'one' ? 1 : parseInt(qtyMatch[1]) || 1) : 1;
        items.push({ name: 'Cold Coffee with Ice Cream', quantity: qty, price: 120 });
      }
      if (lowerMsg.includes('peri peri') || lowerMsg.includes('fries')) {
        items.push({ name: 'Peri Peri French Fries', quantity: 1, price: 140 });
      }
      if (items.length > 0) {
        extractedValues.push({ fieldKey: field.key, value: items, confidence: 0.95, source: 'user_message', evidence: 'extracted items' });
      }
    }

    // 6. CSC specific heuristics
    if (field.key === 'applicantName' || field.key === 'customerName') {
      const nameMatch =
        message.match(/(?:my name is|customer is|applicant is|name is|i am|myself)\s+([A-Za-z\s]{2,35})/i) ||
        message.match(/\bname\s*[:]\s*([A-Za-z\s]{2,35})/i);
      if (nameMatch) {
        const candidate = nameMatch[1]
          .replace(/(?:dob|date of birth|birth|location|district|city|from|applying|age|with|phone|mobile|aadhaar|pan|and|,).*/i, '')
          .trim();
        if (candidate.length >= 2) {
          extractedValues.push({
            fieldKey: field.key,
            value: candidate,
            confidence: 0.95,
            source: 'user_message',
            evidence: nameMatch[0],
          });
        }
      }
    }

    if (field.key === 'district') {
      const districts = ['Jaipur', 'Jodhpur', 'Kota', 'Udaipur', 'Ajmer'];
      for (const d of districts) {
        if (lowerMsg.includes(d.toLowerCase())) {
          extractedValues.push({ fieldKey: field.key, value: d, confidence: 0.95, source: 'user_message', evidence: d });
          break;
        }
      }
    }

    if (field.key === 'idNumber') {
      // Aadhaar 12 digits or PAN 10 alphanumeric
      const panMatch = message.match(/[A-Z]{5}[0-9]{4}[A-Z]{1}/);
      const aadhaarMatch = message.match(/\b\d{4}\s?\d{4}\s?\d{4}\b/);
      if (panMatch) {
        extractedValues.push({ fieldKey: field.key, value: panMatch[0], confidence: 0.98, source: 'user_message', evidence: panMatch[0] });
      } else if (aadhaarMatch) {
        extractedValues.push({ fieldKey: field.key, value: aadhaarMatch[0].replace(/\s/g, ''), confidence: 0.98, source: 'user_message', evidence: aadhaarMatch[0] });
      }
    }
  }

  // 7. Check for explicit correction phrases (e.g. "change phone to 9829112233", "my new email is ...")
  const possibleCorrections: ExtractionResult['possibleCorrections'] = [];
  const correctionMatches = [
    { regex: /(?:change|update|correct)\s+(?:my\s+)?phone\s+(?:to|is)\s+([0-9]{10,12})/i, key: 'phone' },
    { regex: /(?:change|update|correct)\s+(?:my\s+)?email\s+(?:to|is)\s+([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/i, key: 'email' },
    { regex: /(?:change|update|correct)\s+(?:my\s+)?address\s+(?:to|is)\s+([^.]+)/i, key: 'deliveryAddress' },
    { regex: /(?:change|update|correct)\s+(?:my\s+)?name\s+(?:to|is)\s+([A-Za-z\s]{3,30})/i, key: 'applicantName' },
  ];

  for (const cm of correctionMatches) {
    const match = message.match(cm.regex);
    if (match && currentValues[cm.key] !== undefined) {
      const newVal = match[1].trim();
      possibleCorrections.push({
        fieldKey: cm.key,
        oldValue: currentValues[cm.key],
        newValue: newVal,
        reason: 'User requested correction via natural language',
      });
      // Also ensure extractedValues has this update
      extractedValues.push({
        fieldKey: cm.key,
        value: newVal,
        confidence: 0.99,
        source: 'user_message',
        evidence: match[0],
      });
    }
  }

  return {
    extractedValues,
    possibleCorrections,
    ambiguities: [],
    offTopic: false,
    conversationalReply: extractedValues.length > 0 ? `I've noted ${extractedValues.map(v => v.fieldKey).join(', ')}.` : undefined,
  };
}

/**
 * Generates an AI-assisted workflow schema from a natural language requirement.
 */
export async function generateWorkflowWithAi(
  requirement: string,
  organizationName: string,
  industry: string
): Promise<Partial<WorkflowSchema>> {
  const prompt = `You are a Principal Workflow Architect for CollectAI.
Generate a comprehensive, production-grade data collection schema from the user requirement:
"${requirement}"

Target Organization: ${organizationName} (${industry})

Schema Requirements:
- Create 8 to 18 clear, logically ordered fields.
- Include proper field types from: ['short_text', 'long_text', 'number', 'currency', 'email', 'phone', 'date', 'single_select', 'multi_select', 'boolean', 'rating', 'quantity', 'address', 'table', 'calculated']
- Mark truly essential fields as required: true.
- Include conditional visibility rules ('visibleWhen') where logical (e.g. conditional follow-ups).
- Group fields into logical sections (e.g. Personal Details, Verification, Payment, Service Details).
- If appropriate, include derived formulas (e.g. age_from_dob or restaurant_totals).

You MUST return valid JSON adhering strictly to:
{
  "name": "string",
  "description": "string",
  "publicSlug": "string (lowercase-hyphenated)",
  "collectionModes": ["conversation", "form", "operator"],
  "fields": [
    {
      "id": "string",
      "key": "camelCaseKey",
      "label": "string",
      "type": "string",
      "required": true,
      "description": "string",
      "placeholder": "string",
      "options": ["string"],
      "section": "string",
      "order": 1,
      "visibleWhen": {
        "field": "targetFieldKey",
        "operator": "equals",
        "value": "string"
      }
    }
  ]
}`;

  if (process.env.GEMINI_API_KEY) {
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          temperature: 0.2,
        },
      });

      const text = response.text?.trim() || '{}';
      const parsed = JSON.parse(text);

      if (parsed.name && Array.isArray(parsed.fields)) {
        return parsed;
      }
    } catch (err) {
      console.warn('Gemini workflow generation error, using fallback template:', err);
    }
  }

  // Fallback high quality schema if Gemini is not reachable
  return {
    name: 'Customer Service & Intake Workflow',
    description: 'Dynamic intake workflow generated from requirement: ' + requirement.slice(0, 100),
    publicSlug: 'intake-' + Math.random().toString(36).substring(2, 8),
    collectionModes: ['conversation', 'form', 'operator'],
    fields: [
      { id: 'f1', key: 'fullName', label: 'Full Name', type: 'short_text', required: true, section: 'Basic Info', order: 1 },
      { id: 'f2', key: 'phone', label: 'Phone Number', type: 'phone', required: true, section: 'Basic Info', order: 2 },
      { id: 'f3', key: 'email', label: 'Email Address', type: 'email', required: false, section: 'Basic Info', order: 3 },
      { id: 'f4', key: 'serviceCategory', label: 'Service Category', type: 'single_select', required: true, options: ['General Enquiry', 'Urgent Request', 'Billing', 'Other'], section: 'Request Details', order: 4 },
      { id: 'f5', key: 'details', label: 'Detailed Description', type: 'long_text', required: true, section: 'Request Details', order: 5 },
      { id: 'f6', key: 'consent', label: 'I accept terms and confirm accuracy', type: 'boolean', required: true, section: 'Consent', order: 6 },
    ],
  };
}

/**
 * Official TypeSafe AI System One (Jev) API Integration.
 * Implements the Agent Skill System One decision protocol:
 * - Directs state (context + user message) to the fast Jev decision model (`jev-latest` / `jev-1.13.0`)
 * - Constructs typed questions:
 *   - "choice": mapped from workflow single_select / dropdown options with criteria
 *   - "noul": calibrated boolean probability for flags, eligibility, and binary checks
 * - Sub-100ms structured classification without generative hallucination
 */
async function callJevClassifier(
  endpointUrl: string,
  apiKey: string | undefined,
  schema: WorkflowSchema,
  visibleFields: WorkflowField[],
  currentValues: Record<string, any>,
  userMessage: string
): Promise<ExtractionResult | null> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 4000); // 4s timeout for remote cloud API

  try {
    const questions: Record<string, any> = {};

    // 1. Map single_select / boolean fields to TypeSafe typed questions
    for (const field of visibleFields) {
      if (currentValues[field.key] !== undefined && currentValues[field.key] !== null && currentValues[field.key] !== '') {
        // Skip already filled fields unless a correction might be happening
        continue;
      }

      if (field.type === 'single_select' && field.options && field.options.length > 0) {
        const criteria: Record<string, string> = {};
        for (const opt of field.options) {
          const optVal = typeof opt === 'string' ? opt : opt.value;
          const optLabel = typeof opt === 'string' ? opt : opt.label;
          // Generate acronym/initials (e.g. "Income Certificate" -> "IC", "Old Age Pension" -> "OAP")
          const words = optLabel.split(/[\s_-]+/).filter(Boolean);
          const acronym = words.map(w => w[0].toUpperCase()).join('');
          const aliasStr = words.length > 1 ? ` (also matches acronym "${acronym}" or keywords like "${words.join('", "')}")` : '';
          criteria[optVal] = `${optLabel}${aliasStr} for ${field.label}`;
        }
        criteria['none'] = `None of the options apply or not mentioned in the message`;

        questions[field.key] = {
          type: 'choice',
          instructions: `Which ${field.label} is selected or referenced? User may use acronyms/initials (e.g. IC for Income Certificate, OAP for Old Age Pension), typos, or keywords. Choose the most probable match or 'none'.`,
          criteria,
        };
      } else if (field.type === 'boolean') {
        questions[field.key] = {
          type: 'noul',
          instructions: `Does the user agree or answer yes to: ${field.label}?`,
          criteria: {
            true: `User explicitly confirms, accepts, or agrees to ${field.label}`,
            false: `User declines, does not agree, or has not mentioned ${field.label}`,
          },
        };
      }
    }

    // Always check for off-topic intent
    questions['is_off_topic'] = {
      type: 'noul',
      instructions: `Is the user speaking about something completely unrelated to ${schema.name}?`,
      criteria: {
        true: 'Completely off topic, spam, or nonsense',
        false: 'Relevant intake information or query',
      },
    };

    // If no choice/boolean fields to classify, let next tier or regex handle freeform text/regex
    if (Object.keys(questions).length <= 1) {
      clearTimeout(timeoutId);
      return null;
    }

    const stateText = `Workflow: ${schema.name}\nCurrent Form State: ${JSON.stringify(
      currentValues
    )}\nUser Message: "${userMessage}"`;

    const payload = {
      model: 'jev-latest',
      state: stateText,
      questions,
    };

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (apiKey) {
      headers['Authorization'] = `Bearer ${apiKey}`;
    }

    const res = await fetch(endpointUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      console.warn(`[TypeSafe JEV] Error ${res.status}:`, errText);
      return null;
    }

    const data = await res.json();
    const answers = data.answers || {};

    const extractedValues: ExtractionResult['extractedValues'] = [];
    const isOffTopic = answers['is_off_topic']?.noul ? answers['is_off_topic'].noul > 0.85 : false;

    for (const [key, ans] of Object.entries(answers as Record<string, any>)) {
      if (key === 'is_off_topic') continue;

      if (ans.type === 'choice') {
        const choiceVal = ans.choice;
        // Ignore 'none' pseudo option
        if (choiceVal && choiceVal !== 'none' && (ans.confidence === undefined || ans.confidence >= 0.5)) {
          extractedValues.push({
            fieldKey: key,
            value: choiceVal,
            confidence: ans.confidence ?? 0.95,
            source: 'user_message',
            evidence: `TypeSafe Jev System One probability: ${JSON.stringify(ans.probabilities || {})}`,
          });
        }
      } else if (ans.type === 'noul') {
        // Only extract boolean if user clearly and actively expresses agreement / yes
        // Low probability simply means unmentioned, so do not set false automatically
        if (ans.noul >= 0.80) {
          extractedValues.push({
            fieldKey: key,
            value: true,
            confidence: ans.noul,
            source: 'user_message',
            evidence: `TypeSafe Jev System One noul probability: ${ans.noul}`,
          });
        }
      }
    }

    // 2. Combine with deterministic phone/email/address/option extraction if present in the message
    for (const field of visibleFields) {
      if (currentValues[field.key]) continue;

      // Check if single_select wasn't caught by remote Jev or if Jev missed an acronym
      if (field.type === 'single_select' && field.options) {
        const alreadyExtracted = extractedValues.some(v => v.fieldKey === field.key);
        if (!alreadyExtracted) {
          const optMatch = resolveBestOptionMatch(userMessage, field.options);
          if (optMatch) {
            extractedValues.push({
              fieldKey: field.key,
              value: optMatch.option,
              confidence: optMatch.confidence,
              source: 'user_message',
              evidence: `Resolved acronym/option match for "${userMessage.trim()}"`,
            });
          }
        }
      } else if (field.type === 'phone' || field.key.toLowerCase().includes('phone')) {
        const phoneMatch = userMessage.match(/\b\d{10,12}\b/);
        if (phoneMatch) {
          extractedValues.push({
            fieldKey: field.key,
            value: phoneMatch[0],
            confidence: 0.99,
            source: 'user_message',
            evidence: phoneMatch[0],
          });
        }
      } else if (field.type === 'email' || field.key.toLowerCase().includes('email')) {
        const emailMatch = userMessage.match(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/);
        if (emailMatch) {
          extractedValues.push({
            fieldKey: field.key,
            value: emailMatch[0],
            confidence: 0.99,
            source: 'user_message',
            evidence: emailMatch[0],
          });
        }
      }
    }

    if (extractedValues.length === 0 && !isOffTopic) {
      return null;
    }

    return {
      extractedValues,
      possibleCorrections: [],
      ambiguities: [],
      offTopic: isOffTopic,
      conversationalReply:
        extractedValues.length > 0
          ? `Splendid! Got your ${extractedValues.map(v => v.fieldKey).join(' and ')} locked in smoothly.`
          : undefined,
    };
  } catch (e) {
    clearTimeout(timeoutId);
    console.warn('[TypeSafe Jev Classifier] Fetch exception:', e);
    return null;
  }
}

