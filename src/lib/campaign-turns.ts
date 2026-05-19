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

// Strip ASCII control characters (except tab/newline/CR) from text the GM
// types into roll-request fields. These strings get spliced into auto-
// generated consequence prose, so we keep the storage to printable content.
// Written with hex escapes — embedding literal control bytes flips Git's
// binary detector and makes the file un-diffable.
const CONTROL_CHARS_RE = /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g;
const tidyText = (max: number) =>
  z.string().max(max).transform((s) => s.replace(CONTROL_CHARS_RE, "").trim());

// targetUserId: either the special "everyone" sentinel or a user UUID-ish id.
const targetUserIdSchema = z.string().max(64).refine(
  (v) => v === "everyone" || /^[A-Za-z0-9_-]{4,64}$/.test(v),
  { message: "Invalid target user id" },
);

export const rollRequestMetadataSchema = z.object({
  targetUserId: targetUserIdSchema,
  attribute: tidyText(32),
  reason: tidyText(500),
  onSuccess: tidyText(400).optional(),
  onFailure: tidyText(400).optional(),
  fatal: z.boolean().optional(),
  status: z.enum(["open", "closed", "cancelled"]).optional(),
  requiredUserIds: z.array(z.string().max(64)).max(32).optional(),
});

export const rollMetadataSchema = z.object({
  total: z.number().optional(),
  result: z.number().optional(),
  modifier: z.number().optional(),
  attribute: z.string().optional(),
  tier: rollTierSchema.optional(),
  die: z.string().optional(),
  dice: z.tuple([z.number(), z.number()]).optional(),
  fatal: z.boolean().optional(),
  rollRequestTurnId: z.string().optional(),
});

// What the client sends when initiating a roll. The server ignores any
// dice/total/tier the client supplies and recomputes them authoritatively.
export const rollIntentSchema = z.object({
  attribute: z.string().max(32).optional(),
  aspectInvoked: z.boolean().optional(),
  rollRequestTurnId: z.string().max(64).optional(),
});

export type RollIntent = z.infer<typeof rollIntentSchema>;

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

export function parseRollIntent(metadata: string | null | undefined): RollIntent {
  const parsed = parseMetadata(metadata, rollIntentSchema);
  return parsed ?? {};
}

export function parseSceneBreakMetadata(metadata: string | null | undefined) {
  return parseMetadata(metadata, sceneBreakMetadataSchema);
}

export function parseIllustrationMetadata(metadata: string | null | undefined) {
  return parseMetadata(metadata, illustrationMetadataSchema);
}
