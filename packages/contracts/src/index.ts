import { z } from 'zod';

export const uuidSchema = z.uuid();
export const isoDateSchema = z.iso.date();

export const createOrganizationUnitSchema = z
  .object({
    id: uuidSchema,
    tenantId: uuidSchema,
    code: z
      .string()
      .trim()
      .min(1)
      .max(32)
      .regex(/^[A-Z0-9_-]+$/),
    name: z.string().trim().min(1).max(200),
    effectiveFrom: isoDateSchema,
    effectiveTo: isoDateSchema.optional(),
    parentId: uuidSchema.optional(),
  })
  .strict();

export type CreateOrganizationUnitInput = z.infer<typeof createOrganizationUnitSchema>;

export const requestContextSchema = z
  .object({
    requestId: uuidSchema,
    tenantId: uuidSchema,
    actorId: uuidSchema,
    roles: z.array(z.string().min(1).max(64)).max(32),
  })
  .strict();

export type RequestContext = z.infer<typeof requestContextSchema>;
