import { z } from "npm:zod@3";

// Provider-neutral: mirrors the responseSchema the model is asked for (see
// providers/gemini.ts) — keep them in sync. Validated independently of any
// provider-specific structured-output mechanism, since a model can in
// principle return something that doesn't match its own declared schema.
//
// `confidence` is the model's own qualitative self-assessment normalized to
// 0-1 — it is NOT a calibrated statistical probability. See
// src/lib/plantDiagnosis.ts on the client for how it's presented.
export const DiagnosisIssueTypeSchema = z.enum([
  "disease",
  "pest",
  "nutrient_deficiency",
  "environmental",
  "healthy",
  "unknown",
]);

export const DiagnosisSeveritySchema = z.enum(["low", "medium", "high"]);

export const DiagnosisCandidateSchema = z.object({
  issue_type: DiagnosisIssueTypeSchema,
  name: z.string().min(1).max(200),
  confidence: z.number().min(0).max(1),
  // null for "healthy" (nothing to grade) and often for "unknown" (too little
  // to go on) — required whenever issue_type implies an actual problem.
  severity: DiagnosisSeveritySchema.nullable(),
  description: z.string().min(1).max(500),
  recommended_actions: z.array(z.string().min(1).max(300)).max(5),
});

export const PlantDiagnosisSchema = z.object({
  diagnosis: DiagnosisCandidateSchema,
  alternatives: z.array(DiagnosisCandidateSchema).max(3),
  observations: z.array(z.string().min(1).max(300)).max(8),
});

export type DiagnosisIssueType = z.infer<typeof DiagnosisIssueTypeSchema>;
export type DiagnosisCandidate = z.infer<typeof DiagnosisCandidateSchema>;
export type PlantDiagnosis = z.infer<typeof PlantDiagnosisSchema>;
