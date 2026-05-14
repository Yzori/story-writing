import { z } from "zod";

export const CAMPAIGN_TURN_TYPES = [
  "narration",
  "consequence",
  "action",
  "dialogue",
  "reaction",
  "description",
  "roll",
  "roll-request",
  "ooc",
  "illustration",
  "scene-break",
] as const;

export type CampaignTurnType = (typeof CAMPAIGN_TURN_TYPES)[number];

export const CAMPAIGN_TURN_TYPES_ALLOW_EMPTY = ["scene-break", "roll-request"] as const;

export const LOG_TURN_TYPES = ["ooc", "roll", "roll-request"] as const satisfies readonly CampaignTurnType[];
export const STORY_TURN_TYPES = [
  "narration",
  "consequence",
  "action",
  "dialogue",
  "reaction",
  "description",
  "scene-break",
  "illustration",
] as const satisfies readonly CampaignTurnType[];
export const PLAYER_STORY_TURN_TYPES = ["action", "dialogue", "reaction", "description"] as const satisfies readonly CampaignTurnType[];
export const GM_ONLY_TURN_TYPES = ["narration", "consequence", "roll-request", "illustration", "scene-break"] as const satisfies readonly CampaignTurnType[];

export function isCampaignTurnType(value: string): value is CampaignTurnType {
  return (CAMPAIGN_TURN_TYPES as readonly string[]).includes(value);
}

export function isLogTurnType(type: string): type is (typeof LOG_TURN_TYPES)[number] {
  return (LOG_TURN_TYPES as readonly string[]).includes(type);
}

export function isStoryTurnType(type: string): type is (typeof STORY_TURN_TYPES)[number] {
  return (STORY_TURN_TYPES as readonly string[]).includes(type);
}

export function isPlayerStoryTurnType(type: string): type is (typeof PLAYER_STORY_TURN_TYPES)[number] {
  return (PLAYER_STORY_TURN_TYPES as readonly string[]).includes(type);
}

export function isGmOnlyTurnType(type: string): type is (typeof GM_ONLY_TURN_TYPES)[number] {
  return (GM_ONLY_TURN_TYPES as readonly string[]).includes(type);
}

const rollTierSchema = z.enum(["success", "partial", "failure"]);

export const rollRequestMetadataSchema = z.object({
  targetUserId: z.string(),
  attribute: z.string(),
  reason: z.string(),
  onSuccess: z.string().optional(),
  onFailure: z.string().optional(),
  fatal: z.boolean().optional(),
});

export const rollMetadataSchema = z.object({
  total: z.number().optional(),
  result: z.number().optional(),
  modifier: z.number().optional(),
  attribute: z.string().optional(),
  tier: rollTierSchema.optional(),
  die: z.string().optional(),
  fatal: z.boolean().optional(),
});

export const sceneBreakMetadataSchema = z.object({
  title: z.string().optional(),
  mood: z.string().optional(),
  aspects: z.array(z.string()).optional(),
  cinematic: z.boolean().optional(),
});

export const illustrationMetadataSchema = z.object({
  imageUrl: z.string().optional(),
  caption: z.string().optional(),
});

export type RollRequestMetadata = z.infer<typeof rollRequestMetadataSchema>;
export type RollMetadata = z.infer<typeof rollMetadataSchema>;
export type SceneBreakMetadata = z.infer<typeof sceneBreakMetadataSchema>;
export type IllustrationMetadata = z.infer<typeof illustrationMetadataSchema>;

function parseMetadata<T>(metadata: string | null | undefined, schema: z.ZodType<T>): T | null {
  if (!metadata) return null;
  try {
    const parsed = JSON.parse(metadata);
    const result = schema.safeParse(parsed);
    return result.success ? result.data : null;
  } catch {
    return null;
  }
}

export function parseRollRequestMetadata(metadata: string | null | undefined) {
  return parseMetadata(metadata, rollRequestMetadataSchema);
}

export function parseRollMetadata(metadata: string | null | undefined) {
  return parseMetadata(metadata, rollMetadataSchema);
}

export function parseSceneBreakMetadata(metadata: string | null | undefined) {
  return parseMetadata(metadata, sceneBreakMetadataSchema);
}

export function parseIllustrationMetadata(metadata: string | null | undefined) {
  return parseMetadata(metadata, illustrationMetadataSchema);
}
