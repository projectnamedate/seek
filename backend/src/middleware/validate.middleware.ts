import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';

/**
 * Reusable Zod validation middleware.
 * Validates req.body against the provided schema.
 */
export function validate(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);

    if (!result.success) {
      const errors = formatZodErrors(result.error);
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors,
      });
    }

    // Replace body with parsed/coerced data
    req.body = result.data;
    next();
  };
}

function formatZodErrors(error: ZodError): string[] {
  return error.issues.map((issue) => {
    const path = issue.path.length > 0 ? `${issue.path.join('.')}: ` : '';
    return `${path}${issue.message}`;
  });
}
