import { z } from "zod";
import {
  MAX_VOICE_SAMPLE_DURATION_SEC,
  MIN_VOICE_SAMPLE_DURATION_SEC,
  VOICE_CONSENT_PHRASE,
} from "../constants/index.js";

export const musicStyleSchema = z.enum([
  "pop",
  "rock",
  "hip-hop",
  "electronic",
  "r-and-b",
  "acoustic",
]);

export const createGenerationSchema = z.object({
  prompt: z.string().min(3).max(500),
  style: musicStyleSchema,
  voiceSampleId: z.string().min(1),
  duration: z.number().int().min(30).max(180).default(60),
});

export const voiceConsentSchema = z.object({
  confirmed: z.literal(true),
  consentPhrase: z.literal(VOICE_CONSENT_PHRASE),
});

export const uploadVoiceSampleFieldsSchema = voiceConsentSchema.extend({
  durationSec: z.coerce
    .number()
    .int()
    .min(MIN_VOICE_SAMPLE_DURATION_SEC)
    .max(MAX_VOICE_SAMPLE_DURATION_SEC),
});

export const createCheckoutSessionSchema = z.object({
  planId: z.enum(["pro", "studio"]),
});

export const createPortalSessionSchema = z.object({});

export type CreateGenerationInput = z.infer<typeof createGenerationSchema>;
export type VoiceConsentInput = z.infer<typeof voiceConsentSchema>;
export type UploadVoiceSampleFields = z.infer<typeof uploadVoiceSampleFieldsSchema>;
export type CreateCheckoutSessionInput = z.infer<typeof createCheckoutSessionSchema>;

export {
  ApplyOperationBodySchema,
  ReplaceSectionRequestSchema,
  DeleteRegionOperationSchema,
  DuplicateRegionOperationSchema,
  EditOperationSchema,
  FadeOperationSchema,
  MoveRegionOperationSchema,
  MuteTrackOperationSchema,
  SoloTrackOperationSchema,
  normalizeLegacyEditOperation,
  SetVolumeOperationSchema,
  SplitRegionOperationSchema,
} from "./music-editor.js";
export type { ParsedApplyOperationBody, ParsedEditOperation } from "./music-editor.js";
export { sunoMusicCallbackSchema, type SunoMusicCallbackPayload } from "./suno-callback.js";
