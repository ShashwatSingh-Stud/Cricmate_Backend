import { Request, Response, NextFunction } from 'express';
import { ZodSchema } from 'zod';

/**
 * Generic Zod validation middleware.
 * Validates req.body, req.query, and/or req.params against provided schemas.
 */
export function validate(schema: {
  body?: ZodSchema;
  query?: ZodSchema;
  params?: ZodSchema;
}) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (schema.body) {
      req.body = schema.body.parse(req.body);
    }
    if (schema.query) {
      req.query = schema.query.parse(req.query) as any;
    }
    if (schema.params) {
      req.params = schema.params.parse(req.params) as any;
    }
    next();
  };
}

/**
 * Shorthand: validate only request body.
 */
export function validateBody(schema: ZodSchema) {
  return validate({ body: schema });
}

/**
 * Shorthand: validate only query parameters.
 */
export function validateQuery(schema: ZodSchema) {
  return validate({ query: schema });
}
