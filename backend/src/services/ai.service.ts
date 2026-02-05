import OpenAI from 'openai';
import { config } from '../config';
import { Mission, ValidationResult, PhotoMetadata } from '../types';
import { isLikelyScreenshot, isPhotoRecent } from './exif.service';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: config.openai.apiKey,
});

/**
 * Build the validation prompt for GPT-4V
 */
function buildValidationPrompt(mission: Mission): string {
  return `You are a strict photo validator for a scavenger hunt game. Your job is to determine if a photo genuinely shows the target object.

TARGET: "${mission.description}"
KEYWORDS TO LOOK FOR: ${mission.keywords.join(', ')}

VALIDATION RULES:
1. The photo must show a REAL physical object, not a screen, monitor, TV, or printed image
2. The target object must be clearly visible and identifiable
3. The photo should appear to be taken in a real-world environment
4. Look for signs of screenshots: UI elements, status bars, bezels, screen glare
5. Look for signs of photos of screens: moire patterns, pixel grids, screen edges

RESPOND IN THIS EXACT JSON FORMAT:
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
 * Validate a photo submission using GPT-4V
 */
export async function validatePhoto(
  imageBuffer: Buffer,
  mimeType: string,
  mission: Mission,
  metadata: PhotoMetadata
): Promise<ValidationResult> {
  // Pre-checks before AI validation
  const preCheckResult = performPreChecks(metadata);
  if (!preCheckResult.passed) {
    return preCheckResult.result;
  }

  try {
    // Convert image to base64
    const base64Image = imageBuffer.toString('base64');
    const dataUrl = `data:${mimeType};base64,${base64Image}`;

    // Call GPT-4V for validation
    const response = await openai.chat.completions.create({
      model: 'gpt-4o', // GPT-4 with vision
      messages: [
        {
          role: 'system',
          content: buildValidationPrompt(mission),
        },
        {
          role: 'user',
          content: [
            {
              type: 'image_url',
              image_url: {
                url: dataUrl,
                detail: 'high',
              },
            },
            {
              type: 'text',
              text: `Validate this photo for the target: "${mission.description}"`,
            },
          ],
        },
      ],
      max_tokens: 500,
      temperature: 0.1, // Low temperature for consistent validation
    });

    // Parse the response
    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('Empty response from AI');
    }

    // Extract JSON from response (handle markdown code blocks)
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in response');
    }

    const result = JSON.parse(jsonMatch[0]) as ValidationResult;

    // Apply confidence threshold
    if (result.confidence < config.validation.minConfidenceScore) {
      result.isValid = false;
      result.reasoning += ` (Confidence ${result.confidence} below threshold ${config.validation.minConfidenceScore})`;
    }

    // Double-check screenshot detection
    if (result.isScreenshot) {
      result.isValid = false;
    }

    return result;
  } catch (error) {
    console.error('AI validation error:', error);

    // Return failed validation on error
    return {
      isValid: false,
      confidence: 0,
      reasoning: `Validation error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      detectedObjects: [],
      isScreenshot: false,
      matchesTarget: false,
    };
  }
}

/**
 * Pre-validation checks before sending to AI
 */
function performPreChecks(metadata: PhotoMetadata): {
  passed: boolean;
  result: ValidationResult;
} {
  // Check for screenshot indicators in EXIF
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

  // Check photo timestamp
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

  // All pre-checks passed
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
 * Estimate image quality/size for validation
 */
export function checkImageSize(buffer: Buffer): {
  valid: boolean;
  reason?: string;
} {
  const minSize = 10 * 1024; // 10KB minimum
  const maxSize = 20 * 1024 * 1024; // 20MB maximum

  if (buffer.length < minSize) {
    return { valid: false, reason: 'Image too small (minimum 10KB)' };
  }

  if (buffer.length > maxSize) {
    return { valid: false, reason: 'Image too large (maximum 20MB)' };
  }

  return { valid: true };
}
