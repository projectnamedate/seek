import { z } from 'zod';

export const PERMISSION_PREFLIGHT_ERROR =
  'Camera and location permissions must be granted before starting a paid bounty';

export const permissionPreflightSchema = z.literal(true, {
  invalid_type_error: PERMISSION_PREFLIGHT_ERROR,
  required_error: PERMISSION_PREFLIGHT_ERROR,
});
