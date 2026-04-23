import exifr from 'exifr';
import { PhotoMetadata } from '../types';
import { childLogger } from './logger.service';

const log = childLogger('exif');

/**
 * Extract EXIF metadata from photo buffer
 * Used to verify photo authenticity (timestamp, GPS, device)
 */
export async function extractExifMetadata(imageBuffer: Buffer): Promise<PhotoMetadata> {
  try {
    // Parse EXIF data from buffer
    const exif = await exifr.parse(imageBuffer, {
      // Extract specific tags we care about
      pick: [
        'DateTimeOriginal',
        'CreateDate',
        'ModifyDate',
        'GPSLatitude',
        'GPSLongitude',
        'GPSLatitudeRef',
        'GPSLongitudeRef',
        'Make',
        'Model',
      ],
      // Also get GPS coordinates in decimal format
      gps: true,
    });

    if (!exif) {
      return {};
    }

    const metadata: PhotoMetadata = {};

    // Extract timestamp (prefer DateTimeOriginal)
    const timestamp = exif.DateTimeOriginal || exif.CreateDate || exif.ModifyDate;
    if (timestamp) {
      metadata.timestamp = new Date(timestamp);
    }

    // Extract GPS coordinates (already in decimal from exifr)
    if (typeof exif.latitude === 'number' && typeof exif.longitude === 'number') {
      metadata.latitude = exif.latitude;
      metadata.longitude = exif.longitude;
    }

    // Extract device info
    if (exif.Make) {
      metadata.deviceMake = exif.Make;
    }
    if (exif.Model) {
      metadata.deviceModel = exif.Model;
    }

    return metadata;
  } catch (error) {
    log.error({ err: error instanceof Error ? error.message : error }, 'EXIF extraction error');
    return {};
  }
}

/**
 * Check if photo timestamp is within acceptable range
 */
export function isPhotoRecent(metadata: PhotoMetadata, maxAgeSeconds: number): boolean {
  if (!metadata.timestamp) {
    // No timestamp - can't verify, allow but flag
    return true;
  }

  const photoTime = metadata.timestamp.getTime();
  const now = Date.now();
  const ageSeconds = (now - photoTime) / 1000;

  return ageSeconds <= maxAgeSeconds && ageSeconds >= -60; // Allow 1 min future for clock drift
}

/**
 * Check if photo appears to be a screenshot based on metadata
 */
export function isLikelyScreenshot(metadata: PhotoMetadata): boolean {
  // Screenshots typically lack GPS and device make/model
  // They also have suspicious timestamps (exactly on the second)

  const hasNoGps = !metadata.latitude && !metadata.longitude;
  const hasNoDevice = !metadata.deviceMake && !metadata.deviceModel;

  // Check for common screenshot app signatures
  const deviceModel = metadata.deviceModel?.toLowerCase() || '';
  const suspiciousModels = ['screenshot', 'screen', 'capture'];
  const hasSuspiciousModel = suspiciousModels.some(s => deviceModel.includes(s));

  // Strong indicator: no device AND no GPS
  if (hasNoDevice && hasNoGps) {
    return true;
  }

  // Definite indicator: screenshot in model name
  if (hasSuspiciousModel) {
    return true;
  }

  return false;
}

/**
 * Format metadata for logging
 */
export function formatMetadata(metadata: PhotoMetadata): string {
  const parts: string[] = [];

  if (metadata.timestamp) {
    parts.push(`Time: ${metadata.timestamp.toISOString()}`);
  }
  if (metadata.latitude && metadata.longitude) {
    parts.push(`GPS: ${metadata.latitude.toFixed(6)}, ${metadata.longitude.toFixed(6)}`);
  }
  if (metadata.deviceMake || metadata.deviceModel) {
    parts.push(`Device: ${metadata.deviceMake || ''} ${metadata.deviceModel || ''}`.trim());
  }

  return parts.length > 0 ? parts.join(' | ') : 'No metadata';
}
