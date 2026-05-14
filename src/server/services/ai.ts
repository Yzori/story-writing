import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { env } from "@/server/env";

// Initialize Anthropic client (lazy initialization)
let anthropicClient: Anthropic | null = null;

function getAnthropicClient(): Anthropic {
  if (!env.ANTHROPIC_API_KEY) {
    throw new Error("ANTHROPIC_API_KEY is not configured");
  }

  if (!anthropicClient) {
    anthropicClient = new Anthropic({
      apiKey: env.ANTHROPIC_API_KEY,
    });
  }

  return anthropicClient;
}

export type AIPromptType =
  | "continue"
  | "rephrase"
  | "expand"
  | "summarize"
  | "fix-grammar"
  | "improve-dialogue"
  | "enhance-description"
  | "plot-holes"
  | "continuity-check"
  | "pacing-analysis"
  | "character-arc";

export interface AIAssistRequest {
  promptType: AIPromptType;
  context: string;
  selectedText?: string;
  metadata?: {
    characterNames?: string[];
    storyBible?: Array<{ name: string; description: string }>;
    previousChapters?: string;
    storyTitle?: string;
    genre?: string;
  };
}

export interface AIAssistResponse {
  suggestion: string;
  tokensUsed: number;
}

/**
 * Generate AI writing assistance based on prompt type
 */
export async function generateAIAssistance(
  request: AIAssistRequest
): Promise<AIAssistResponse> {
  const client = getAnthropicClient();

  const systemPrompt = getSystemPrompt(request.promptType);
  const userPrompt = buildUserPrompt(request);

  try {
    const message = await client.messages.create({
      model: "claude-3-5-haiku-20241022", // Claude 3.5 Haiku (budget-friendly)
      max_tokens: getMaxTokens(request.promptType),
      temperature: 0.7,
      system: systemPrompt,
      messages: [
        {
          role: "user",
          content: userPrompt,
        },
      ],
    });

    const suggestion = message.content[0]?.type === "text" ? message.content[0].text : "";
    const tokensUsed = message.usage.input_tokens + message.usage.output_tokens;

    return {
      suggestion: suggestion.trim(),
      tokensUsed,
    };
  } catch (error) {
    console.error("Anthropic API error:", error);
    throw new Error("Failed to generate AI assistance");
  }
}

/**
 * Generate AI story intelligence analysis (Premium tier only)
 */
export async function generateStoryIntelligence(
  request: AIAssistRequest
): Promise<AIAssistResponse> {
  const client = getAnthropicClient();

  const systemPrompt = getSystemPrompt(request.promptType);
  const userPrompt = buildUserPrompt(request);

  try {
    const message = await client.messages.create({
      model: "claude-3-5-haiku-20241022", // Claude 3.5 Haiku for analysis
      max_tokens: 2000, // More tokens for detailed analysis
      temperature: 0.3, // Lower temperature for analytical tasks
      system: systemPrompt,
      messages: [
        {
          role: "user",
          content: userPrompt,
        },
      ],
    });

    const suggestion = message.content[0]?.type === "text" ? message.content[0].text : "";
    const tokensUsed = message.usage.input_tokens + message.usage.output_tokens;

    return {
      suggestion: suggestion.trim(),
      tokensUsed,
    };
  } catch (error) {
    console.error("Anthropic API error:", error);
    throw new Error("Failed to generate story intelligence");
  }
}

/**
 * Get system prompt based on prompt type
 */
function getSystemPrompt(promptType: AIPromptType): string {
  const prompts: Record<AIPromptType, string> = {
    continue: `You are a creative writing assistant. Your job is to continue the story naturally, matching the author's voice, style, and tone. Write the next paragraph or two that flows seamlessly from what came before. Maintain consistency with characters, plot, and setting.`,

    rephrase: `You are an expert editor. Rephrase the selected text to improve clarity, flow, and style while preserving the original meaning and tone. Keep the author's voice intact.`,

    expand: `You are a creative writing coach. Expand on the given text by adding more detail, description, and depth. Enrich the scene with sensory details, character emotions, or world-building elements.`,

    summarize: `You are a skilled editor. Create a concise summary of the given text that captures the key points, events, and character developments.`,

    "fix-grammar": `You are a professional copy editor. Fix grammar, spelling, punctuation, and syntax errors while preserving the author's voice and style. Only make necessary corrections.`,

    "improve-dialogue": `You are a dialogue specialist. Improve the given dialogue to make it more natural, engaging, and character-specific. Add subtext, vary speech patterns, and ensure each character has a distinct voice.`,

    "enhance-description": `You are a descriptive writing expert. Enhance the scene description with vivid sensory details, atmosphere, and imagery. Show don't tell. Make the reader feel present in the scene.`,

    "plot-holes": `You are a story analyst. Identify plot holes, logical inconsistencies, and narrative gaps in the given text. Provide specific examples and suggest how to fix them.`,

    "continuity-check": `You are a continuity expert. Check for inconsistencies in character names, traits, locations, timeline, and story details. Flag any contradictions or errors.`,

    "pacing-analysis": `You are a pacing specialist. Analyze the pacing of the given text. Identify sections that feel rushed or drag. Suggest where to speed up or slow down for better narrative flow.`,

    "character-arc": `You are a character development expert. Analyze character arcs and development. Identify whether characters are growing, changing, or remaining static. Suggest opportunities for deeper character evolution.`,
  };

  return prompts[promptType] || prompts.continue;
}

/**
 * Build user prompt with context
 */
function buildUserPrompt(request: AIAssistRequest): string {
  const { promptType, context, selectedText, metadata } = request;

  let prompt = "";

  // Add story metadata if available
  if (metadata?.storyTitle) {
    prompt += `Story: "${metadata.storyTitle}"\n`;
  }
  if (metadata?.genre) {
    prompt += `Genre: ${metadata.genre}\n`;
  }

  // Add Story Bible context if available
  if (metadata?.storyBible && metadata.storyBible.length > 0) {
    prompt += `\nStory Bible:\n`;
    metadata.storyBible.slice(0, 10).forEach((entry) => {
      prompt += `- ${entry.name}: ${entry.description.slice(0, 200)}\n`;
    });
    prompt += `\n`;
  }

  // Add character names if available
  if (metadata?.characterNames && metadata.characterNames.length > 0) {
    prompt += `Characters: ${metadata.characterNames.join(", ")}\n\n`;
  }

  // Build prompt based on type
  if (promptType === "continue") {
    prompt += `Continue this story naturally:\n\n${context}`;
  } else if (selectedText) {
    // For text transformation prompts
    if (["rephrase", "expand", "fix-grammar", "improve-dialogue", "enhance-description"].includes(promptType)) {
      prompt += `Context (for reference):\n${context.slice(-1000)}\n\n`;
      prompt += `Text to ${promptType.replace("-", " ")}:\n${selectedText}`;
    } else {
      // For analysis prompts
      prompt += `Analyze this text:\n\n${selectedText}`;
    }
  } else {
    // For full story analysis
    prompt += `Full text:\n\n${context}`;
  }

  return prompt;
}

/**
 * Get max tokens based on prompt type
 */
function getMaxTokens(promptType: AIPromptType): number {
  const tokens: Record<AIPromptType, number> = {
    continue: 500,
    rephrase: 300,
    expand: 600,
    summarize: 200,
    "fix-grammar": 300,
    "improve-dialogue": 400,
    "enhance-description": 500,
    "plot-holes": 1000,
    "continuity-check": 1000,
    "pacing-analysis": 1000,
    "character-arc": 1000,
  };

  return tokens[promptType] || 500;
}
