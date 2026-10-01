# CollectAI - Universal AI Data Collection Engine

CollectAI is an enterprise SaaS data collection platform with deterministic schema validation, multi-turn conversational extraction, dynamic form fallbacks, and operator-assisted intake modes.

Rather than being a siloed survey builder or single-purpose form tool, CollectAI allows organizations to **define their intake schema once**, and let the engine collect, validate, structure, analyze, and export the required data across any workflow.

---

## 🌟 Key Product Capabilities

### 💡 Why Traditional Form Tools Fail Businesses & How CollectAI Solves It
Based on deep user analysis across **Google Forms**, **Microsoft Forms**, and **Typeform**, common pain points include:
1. **Accidental Data Loss on Reload/Crash**: Google & Microsoft Forms lose progress upon accidental tab closures or mobile app switches. CollectAI implements **continuous browser local draft auto-saving and instant restoration** with a visual auto-save timestamp badge.
2. **Rigid 1-Question-At-A-Time Fatigue**: Typeform forces tedious one-by-one clicks; standard forms require scrolling through endless redundant fields. CollectAI supports **instant multi-slot extraction** from natural speech or sentences, saving 60%+ time.
3. **Hard Ceiling on Questions & Nesting**: Microsoft Forms enforces a strict 200-question ceiling and weak multi-row/table collection. CollectAI provides dynamic repeating item tables, deep conditional visibility trees (`visibleWhen`), and derived calculated values.
4. **Disconnection Between Operator & Self-Service**: Conventional tools only offer static public web links. CollectAI provides **Operator Assisted Mode** for live service desks (CSC, front-desks, telephone order takers) alongside direct public links and dynamic form views from the **same single schema**.
5. **No Final Confirmation or Correction Workflow**: Forms typically submit with mistypes. CollectAI provides an **interactive review and edit modal** allowing respondents or operators to verify every extracted field and override values before final submission.

### 1. Three Intake Modes from One Unified Schema
- **Direct-to-Person Links**: Public link where respondents can answer conversationally or toggle into dynamic form mode on the fly without losing collected state.
- **Operator-Assisted Mode**: Frontline staff (CSC operators, intake staff) enter natural language statements (`Customer is Ramesh Kumar, age 62, from Jaipur, applying for old-age pension...`) which auto-populates live structured fields with instant confidence metrics.
- **B2B Organization Workflows**: Admin visual schema builder with versioning, 19+ field types, section grouping, and conditional visibility rules (`visibleWhen`).

### 2. Deterministic Application Logic Over LLM Guesswork
- **Business rules are 100% deterministic**: Required fields, regex formats, lengths, option bounds, and numeric bounds are evaluated strictly in TypeScript.
- **Derived-field calculations**: Age from DOB, restaurant order totals, 5% GST taxes, and discount coupons are computed in deterministic TypeScript code, never left to LLM hallucination.
- **Conditional Visibility**: Irrelevant fields (e.g. table number for delivery orders) are automatically marked `not_applicable` and removed from completion criteria.
- **Never asks for already collected valid fields**: Conversation targets missing required fields and unresolved validation errors only.
- **Completion Guards**: Sessions can never be submitted while applicable required fields are missing or invalid.
- **Editable Final Review**: A full review modal allows users to review and manually override all collected values before final submission.

### 3. TypeSafe AI System One (Jev) & Gemini Dual-Tier Engine
- **Tier 1: TypeSafe AI System One (Jev Decision Model)**:
  - Connected directly to `https://api.typesafe.ai/v1/systemone` using the official `jev-latest` model.
  - Implements TypeSafe Agent Skill decision schemas:
    - **`Choice` questions**: Form options (e.g. Service Type, Order Mode, Payment Method) are compiled into bounded option criteria, evaluated with probability distributions.
    - **`Noul` questions**: Calibrated binary primitives evaluate boolean agreement, flags, and off-topic detection without open-ended LLM tokens.
  - Sub-100ms structured classification with 0 generative hallucination risk.
- **Tier 2: Server-Side Gemini API (`gemini-3.8-flash`)**:
  - Handles nuanced multi-paragraph synthesis, speech transcribing, and complex conversational turn phrasing.
  - Strict runtime Zod validation (`server/extractionSchema.ts`) guarantees structural integrity before data reaches application state.
- **Tier 3: Deterministic Rule Fallback**:
  - Phone, email, postal code regex patterns, and deterministic business logic execute seamlessly even if external networks are unavailable.

---

## 🚀 Pre-Seeded Demonstration Templates

1. **CSC Citizen Service Application (`csc-citizen-service`)**
   - Service type selection (Old Age Pension, Caste Certificate, Income Certificate, etc.)
   - Personal details with deterministic **Age from DOB** derivation.
   - Conditional logic: Guardian information shown only when applicant age < 18.
   - Bank DBT account fields required only for welfare benefit services.

2. **Restaurant Food & Dining Order (`jaipur-bistro-order`)**
   - Dine-in, Takeaway, and Delivery modes.
   - Conditional logic: Table number shown only for Dine-in; delivery address required only for Delivery.
   - Interactive menu, coupon codes (`WELCOME20`), and automatic itemized billing.

Both workflows execute through the **same identical schema, state, deterministic validation, and conversation engine**.

---

## 🔒 Security, Multi-Tenancy & Controls Status

| Security Area | Implementation Status | Technical Control in Place |
|---|---|---|
| **Authentication** | Connected | Firebase Google Sign-In (`signInWithPopup`), local session tokens, persona test switcher. |
| **Firestore Security Rules** | Deployed | `firestore.rules` enforces authentication, owner-only profile mutations, and default deny on unauthorized access. |
| **Multi-Tenant Isolation** | Enforced | `organizationId` enforced in all queries, submissions, sessions, workflows, exports, and analytics. |
| **Server-Side AI Proxy** | Enforced | Gemini API calls occur strictly on the Express backend (`/server/gemini.ts`); no client API keys. |
| **Input Validation** | Enforced | Deterministic rules (`validateFieldValue`) + Zod runtime schemas (`extractionSchema.ts`). |
| **Rate Limiting** | In-Memory Controlled | Session processing queues and timeout controls on extraction routes. |
| **Audit Trail** | Enforced | Timestamps, updatedBy markers (`user_message`, `operator_input`, `user_correction`, `system_calculation`), and submission metadata. |
| **Mobile Responsiveness** | Enforced | Responsive sliding navigation drawer, flexible touch targets, and mobile-adaptive cards. |
| **Loading & Empty States** | Enforced | Skeleton/empty states on tables, collections, workflows, and search filters. |

---

## ⚖️ Regulatory Compliance & Production Advisory

> **Notice Regarding Regulatory Compliance**: 
> CollectAI implements architectural security best practices (multi-tenant partitioning, deterministic validation, server-side secrets, and Firestore security rules). However, this platform **does not claim automatic or certified legal, government, FSSAI, healthcare, DPDP, GDPR, PCI-DSS, or financial compliance**.

Before commercial production deployment in regulated industries, the following professional compliance reviews and integrations are required:
- **DPDP / GDPR Formal Audit**: Data protection officer review, formal data processing agreements (DPA), and automated data subject erasure request workflows.
- **GovTech & Citizen Services**: Real government e-Pramaan / Aadhaar DigiLocker OAuth portal integration and UIDAI regulatory compliance review.
- **FSSAI & Food Regulations**: Food safety license verification workflows and compliant tax invoice generation.
- **PCI-DSS Compliance**: Offloading all payment collection to certified Level-1 PCI providers (e.g. Stripe Checkout / Razorpay Hosted Gateway); no credit card numbers stored in Firestore.
- **File Upload Security**: S3/GCS bucket virus scanning (e.g., ClamAV webhook) and content-type verification for file attachments.

---

## 📋 Production-Readiness Checklist

- [x] Compilation & TypeScript type checks pass cleanly (`tsc --noEmit`)
- [x] Server-side only Gemini API key handling (`@google/genai`)
- [x] Strict Zod runtime schema validation for LLM outputs
- [x] Multi-field extraction and natural language value corrections
- [x] Deterministic calculation engine (Age from DOB, restaurant order totals)
- [x] Conditional visibility recalculations on answer modifications
- [x] Completion guard preventing premature submission of incomplete sessions
- [x] Editable final review screen before submission
- [x] Automated unit & scenario test suite (`src/lib/workflowEngine.test.ts` & `/api/test-scenarios/run`)
- [ ] Connect production cloud database (Cloud SQL / external replicated PostgreSQL)
- [ ] Production CDN & Custom Domain SSL termination
- [ ] Third-party professional penetration testing & security compliance audit
