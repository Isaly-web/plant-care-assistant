import { z } from "npm:zod@3";

// Provider-neutral: mirrors the responseSchema the model is asked for (see
// providers/gemini.ts) — keep them in sync. Validated independently of any
// provider-specific structured-output mechanism, since a model can in
// principle return something that doesn't match its own declared schema.
//
// `confidence` is the model's own qualitative self-assessment normalized to
// 0-1 — it is NOT a calibrated statistical probability. See
// src/lib/plantIdentification.ts on the client for how it's bucketed into
// user-facing confidence tiers.
export const PlantCandidateSchema = z.object({
  scientific_name: z.string().min(1).max(200),
  common_name: z.string().min(1).max(200),
  confidence: z.number().min(0).max(1),
});

export const PlantIdentificationSchema = z.object({
  identification: PlantCandidateSchema,
  alternatives: z.array(PlantCandidateSchema).max(5),
  observations: z.array(z.string().min(1).max(300)).max(8),
});

export type PlantCandidate = z.infer<typeof PlantCandidateSchema>;
export type PlantIdentification = z.infer<typeof PlantIdentificationSchema>;
