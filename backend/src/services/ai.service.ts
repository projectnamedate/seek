import Anthropic from '@anthropic-ai/sdk';
import { z } from 'zod';
import { config } from '../config';
import { Mission, ValidationResult, PhotoMetadata, Tier, TIER_CONFIDENCE_THRESHOLDS } from '../types';
import { isLikelyScreenshot, isPhotoRecent } from './exif.service';

// Initialize Anthropic client
const anthropic = new Anthropic({
  apiKey: config.anthropic.apiKey,
});

// Zod schema to validate Claude's JSON response
const aiResponseSchema = z.object({
  isValid: z.boolean(),
  confidence: z.number().min(0).max(1),
  reasoning: z.string(),
  detectedObjects: z.array(z.string()),
  isScreenshot: z.boolean(),
  matchesTarget: z.boolean(),
});

/**
 * Build the validation prompt for Claude.
 * Mission data is from our hardcoded missions — not user input — but
 * we still sanitize to defend against future changes.
 */
function buildValidationPrompt(mission: Mission): string {
  // Sanitize mission fields to prevent prompt manipulation
  const safeDescription = mission.description.replace(/[\n\r]/g, ' ').slice(0, 200);
  const safeKeywords = mission.keywords.map(k => k.replace(/[\n\r]/g, '').slice(0, 50)).join(', ');

  return `You are a strict photo validator for a scavenger hunt game. Your job is to determine if a photo genuinely shows the target object.

TARGET: "${safeDescription}"
KEYWORDS TO LOOK FOR: ${safeKeywords}

VALIDATION RULES:
1. The photo must show a REAL physical object, not a screen, monitor, TV, or printed image
2. The target object must be clearly visible and identifiable
3. The photo should appear to be taken in a real-world environment
4. Look for signs of screenshots: UI elements, status bars, bezels, screen glare
5. Look for signs of photos of screens: moire patterns, pixel grids, screen edges

RESPOND IN THIS EXACT JSON FORMAT (no markdown, no code blocks, just raw JSON):
{
  "isValid": boolean,
  "confidence": number between 0 and 1,
  "reasoning": "Brief explanation of your decision",
  "detectedObjects": ["list", "of", "objects", "you", "see"],
  "isScreenshot": boolean,
  "matchesTarget": boolean
}

Be STRICT. When in doubt, reject. The game's integrity depends on honest validation.`;
}

/**
 * Convert MIME type to Claude's media type format
 */
function getMediaType(mimeType: string): 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp' {
  const type = mimeType.toLowerCase();
  if (type === 'image/jpg' || type === 'image/jpeg') return 'image/jpeg';
  if (type === 'image/png') return 'image/png';
  if (type === 'image/gif') return 'image/gif';
  if (type === 'image/webp') return 'image/webp';
  return 'image/jpeg';
}

/**
 * Parse and validate Claude's JSON response safely
 */
function parseAiResponse(responseText: string): ValidationResult {
  // Try to extract JSON from response, handling markdown code blocks
  let jsonStr: string | null = null;

  // 1. Try to extract from ```json ... ``` blocks
  const codeBlockMatch = responseText.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeBlockMatch) {
    jsonStr = codeBlockMatch[1].trim();
  }

  // 2. Fall back to finding the first complete JSON object
  if (!jsonStr) {
    // Find first { and its matching } by counting braces
    const start = responseText.indexOf('{');
    if (start !== -1) {
      let depth = 0;
      for (let i = start; i < responseText.length; i++) {
        if (responseText[i] === '{') depth++;
        if (responseText[i] === '}') depth--;
        if (depth === 0) {
          jsonStr = responseText.slice(start, i + 1);
          break;
        }
      }
    }
  }

  if (!jsonStr) {
    throw new Error('No JSON found in AI response');
  }

  // Parse JSON safely
  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonStr);
  } catch (e) {
    throw new Error(`Failed to parse AI response JSON: ${e instanceof Error ? e.message : 'unknown'}`);
  }

  // Validate against schema
  const validated = aiResponseSchema.safeParse(parsed);
  if (!validated.success) {
    throw new Error(`AI response schema mismatch: ${validated.error.issues.map(i => i.message).join(', ')}`);
  }

  return validated.data;
}

/**
 * Validate a photo submission using Claude Vision
 */
export async function validatePhoto(
  imageBuffer: Buffer,
  mimeType: string,
  mission: Mission,
  metadata: PhotoMetadata,
  tier?: Tier,
  bountyStartTime?: Date
): Promise<ValidationResult> {
  // Skip strict pre-checks in development mode (emulator photos lack GPS/device info)
  if (!config.server.isDev) {
    const preCheckResult = performPreChecks(metadata, bountyStartTime);
    if (!preCheckResult.passed) {
      return preCheckResult.result;
    }
  } else {
    console.log('[AI] Dev mode: skipping strict metadata pre-checks');
  }

  try {
    const base64Image = imageBuffer.toString('base64');
    const mediaType = getMediaType(mimeType);

    console.log(`[AI] Validating photo for target: "${mission.description}"`);

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 500,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: mediaType,
                data: base64Image,
              },
            },
            {
              type: 'text',
              text: buildValidationPrompt(mission),
            },
          ],
        },
      ],
    });

    const content = response.content[0];
    if (content.type !== 'text') {
      throw new Error('Unexpected response type from Claude');
    }

    const result = parseAiResponse(content.text);

    // Apply per-tier confidence threshold (falls back to global config)
    const threshold = tier
      ? TIER_CONFIDENCE_THRESHOLDS[tier]
      : config.validation.minConfidenceScore;
    if (result.confidence < threshold) {
      result.isValid = false;
      result.reasoning += ` (Confidence ${(result.confidence * 100).toFixed(0)}% below tier threshold ${(threshold * 100).toFixed(0)}%)`;
    }

    // Double-check screenshot detection
    if (result.isScreenshot) {
      result.isValid = false;
    }

    console.log(`[AI] Validation: ${result.isValid ? 'PASS' : 'FAIL'} (${Math.round(result.confidence * 100)}%)`);

    return result;
  } catch (error) {
    console.error('[AI] Validation error:', config.server.isDev ? error : (error instanceof Error ? error.message : 'unknown'));

    return {
      isValid: false,
      confidence: 0,
      reasoning: 'Validation system error — please try again',
      detectedObjects: [],
      isScreenshot: false,
      matchesTarget: false,
    };
  }
}

/**
 * Pre-validation checks before sending to AI
 */
function performPreChecks(metadata: PhotoMetadata, bountyStartTime?: Date): {
  passed: boolean;
  result: ValidationResult;
} {
  if (isLikelyScreenshot(metadata)) {
    return {
      passed: false,
      result: {
        isValid: false,
        confidence: 0.9,
        reasoning: 'Photo metadata indicates this is likely a screenshot (no GPS, no device info)',
        detectedObjects: [],
        isScreenshot: true,
        matchesTarget: false,
      },
    };
  }

  if (!isPhotoRecent(metadata, config.validation.maxPhotoAgeSeconds)) {
    return {
      passed: false,
      result: {
        isValid: false,
        confidence: 0.9,
        reasoning: `Photo timestamp is too old or in the future (max age: ${config.validation.maxPhotoAgeSeconds}s)`,
        detectedObjects: [],
        isScreenshot: false,
        matchesTarget: false,
      },
    };
  }

  // Cross-reference: photo must be taken AFTER the bounty started
  if (bountyStartTime && metadata.timestamp) {
    const photoTime = metadata.timestamp.getTime();
    const bountyStart = bountyStartTime.getTime();
    if (photoTime < bountyStart - 5000) {
      return {
        passed: false,
        result: {
          isValid: false,
          confidence: 0.95,
          reasoning: 'Photo was taken before the bounty started — possible pre-captured image',
          detectedObjects: [],
          isScreenshot: false,
          matchesTarget: false,
        },
      };
    }
  }

  return {
    passed: true,
    result: {
      isValid: true,
      confidence: 1,
      reasoning: '',
      detectedObjects: [],
      isScreenshot: false,
      matchesTarget: true,
    },
  };
}

/**
 * Quick check if image appears to be a valid photo format
 */
export function isValidImageFormat(mimeType: string): boolean {
  const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/heic'];
  return validTypes.includes(mimeType.toLowerCase());
}

/**
 * Validate image size (aligned with multer 10MB limit)
 */
export function checkImageSize(buffer: Buffer): {
  valid: boolean;
  reason?: string;
} {
  const minSize = 10 * 1024; // 10KB minimum
  const maxSize = 10 * 1024 * 1024; // 10MB maximum (matches multer limit)

  if (buffer.length < minSize) {
    return { valid: false, reason: 'Image too small (minimum 10KB)' };
  }

  if (buffer.length > maxSize) {
    return { valid: false, reason: 'Image too large (maximum 10MB)' };
  }

  return { valid: true };
}
