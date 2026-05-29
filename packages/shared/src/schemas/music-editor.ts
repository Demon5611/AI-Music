import { z } from "zod";

const editorTrackIdSchema = z.enum(["vocal", "instrumental"]);

export const SetVolumeOperationSchema = z.object({
  type: z.literal("SET_VOLUME"),
  trackId: editorTrackIdSchema,
  regionId: z.string().min(1),
  gainDb: z.number().min(-24).max(12),
});

export const MuteTrackOperationSchema = z.object({
  type: z.literal("MUTE_TRACK"),
  trackId: editorTrackIdSchema,
  regionId: z.string().min(1),
  muted: z.boolean(),
});

export const CutRegionOperationSchema = z.object({
  type: z.literal("CUT_REGION"),
  regionId: z.string().min(1),
});

export const SplitRegionOperationSchema = z.object({
  type: z.literal("SPLIT_REGION"),
  regionId: z.string().min(1),
  splitAtMs: z.number().int().min(0),
});

export const MoveRegionOperationSchema = z.object({
  type: z.literal("MOVE_REGION"),
  regionId: z.string().min(1),
  targetIndex: z.number().int().min(0),
});

export const DuplicateRegionOperationSchema = z.object({
  type: z.literal("DUPLICATE_REGION"),
  regionId: z.string().min(1),
});

export const ResizeRegionOperationSchema = z.object({
  type: z.literal("RESIZE_REGION"),
  regionId: z.string().min(1),
  startMs: z.number().int().min(0),
  endMs: z.number().int().min(1),
});

export const FadeOperationSchema = z.object({
  type: z.literal("FADE"),
  trackId: editorTrackIdSchema,
  regionId: z.string().min(1),
  fadeType: z.enum(["in", "out"]),
  durationMs: z.number().int().min(100).max(10_000),
});

export const ReplaceVocalOperationSchema = z.object({
  type: z.literal("REPLACE_VOCAL"),
  regionId: z.string().min(1),
  voiceModelId: z.number().int().positive(),
});

export const RegenerateRegionOperationSchema = z.object({
  type: z.literal("REGENERATE_REGION"),
  regionId: z.string().min(1),
  prompt: z.string().min(1).max(500),
});

export const EditOperationSchema = z.discriminatedUnion("type", [
  SetVolumeOperationSchema,
  MuteTrackOperationSchema,
  CutRegionOperationSchema,
  SplitRegionOperationSchema,
  MoveRegionOperationSchema,
  DuplicateRegionOperationSchema,
  ResizeRegionOperationSchema,
  FadeOperationSchema,
  ReplaceVocalOperationSchema,
  RegenerateRegionOperationSchema,
]);

export const AiEditCommandSchema = z.object({
  operation: EditOperationSchema,
  confidence: z.number().min(0).max(1),
  explanation: z.string().min(1),
});

export const ApplyOperationBodySchema = z.object({
  operation: EditOperationSchema,
  selectedRegionId: z.string().nullable().optional(),
  selectedTrackId: editorTrackIdSchema.nullable().optional(),
});

export const VoiceTransferBodySchema = z.object({
  regionId: z.string().min(1),
  voiceModelId: z.number().int().positive(),
});

export const AiCommandBodySchema = z.object({
  prompt: z.string().min(1).max(500),
  selectedRegionId: z.string().nullable().optional(),
  selectedTrackId: editorTrackIdSchema.nullable().optional(),
  apply: z.boolean().optional(),
});

export const ExtendSongBodySchema = z.object({
  regionId: z.string().min(1),
  prompt: z.string().max(500).optional(),
});

export const RegenerateRegionBodySchema = z.object({
  regionId: z.string().min(1),
  prompt: z.string().min(1).max(500),
});

export type ParsedEditOperation = z.infer<typeof EditOperationSchema>;
export type ParsedApplyOperationBody = z.infer<typeof ApplyOperationBodySchema>;
