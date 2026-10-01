import { z } from 'zod';

export const ExtractedFieldSchema = z.object({
  fieldKey: z.string().min(1),
  value: z.any(),
  confidence: z.number().min(0).max(1).default(0.9),
  source: z.enum(['user_message', 'operator_input']).default('user_message'),
  evidence: z.string().optional().default(''),
});

export const PossibleCorrectionSchema = z.object({
  fieldKey: z.string().min(1),
  oldValue: z.any().optional(),
  newValue: z.any(),
  reason: z.string().optional(),
});

export const GeminiExtractionOutputSchema = z.object({
  extractedValues: z.array(ExtractedFieldSchema).default([]),
  possibleCorrections: z.array(PossibleCorrectionSchema).default([]),
  ambiguities: z.array(z.string()).default([]),
  offTopic: z.boolean().default(false),
  conversationalReply: z.string().optional().default(''),
});

export type GeminiExtractionOutput = z.infer<typeof GeminiExtractionOutputSchema>;
