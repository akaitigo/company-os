import { z } from 'zod';

export const uuidSchema = z.uuid();
export const isoDateSchema = z.iso.date();
const decimalAmountSchema = z
  .number()
  .nonnegative()
  .max(1_000_000_000)
  .refine((value) => Math.abs(value * 10_000 - Math.round(value * 10_000)) < 0.000_001, {
    message: 'Amount supports at most four decimal places',
  });
const scaledAmount = (value: number): number => Math.round(value * 10_000);

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

export const recordAttendanceSchema = z
  .object({
    id: uuidSchema,
    tenantId: uuidSchema,
    employmentId: uuidSchema,
    workDate: isoDateSchema,
    startedAt: z.iso.datetime({ offset: true }),
    endedAt: z.iso.datetime({ offset: true }),
    breakMinutes: z.number().int().min(0).max(1440),
    source: z.enum(['manual', 'import', 'clock']),
  })
  .strict();
export type RecordAttendanceInput = z.infer<typeof recordAttendanceSchema>;

export const createRequisitionSchema = z
  .object({
    id: uuidSchema,
    tenantId: uuidSchema,
    organizationUnitId: uuidSchema,
    currency: z.string().regex(/^[A-Z]{3}$/),
    purpose: z.string().trim().min(1).max(1000),
    lines: z
      .array(
        z
          .object({
            id: uuidSchema,
            description: z.string().trim().min(1).max(500),
            quantity: z.number().positive().max(1_000_000_000),
            estimatedUnitPrice: decimalAmountSchema,
          })
          .strict(),
      )
      .min(1)
      .max(100),
  })
  .strict();
export type CreateRequisitionInput = z.infer<typeof createRequisitionSchema>;

const journalLineSchema = z
  .object({
    accountId: uuidSchema,
    debit: decimalAmountSchema,
    credit: decimalAmountSchema,
  })
  .strict()
  .refine((line) => line.debit > 0 !== line.credit > 0, {
    message: 'Exactly one of debit and credit must be positive',
  });
export const postJournalSchema = z
  .object({
    id: uuidSchema,
    tenantId: uuidSchema,
    accountingDate: isoDateSchema,
    currency: z.string().regex(/^[A-Z]{3}$/),
    sourceType: z.string().trim().min(1).max(100),
    sourceId: uuidSchema,
    lines: z.array(journalLineSchema).min(2).max(500),
  })
  .strict()
  .refine(
    (journal) =>
      journal.lines.reduce((sum, line) => sum + scaledAmount(line.debit), 0) ===
      journal.lines.reduce((sum, line) => sum + scaledAmount(line.credit), 0),
    { message: 'Journal must balance' },
  );
export type PostJournalInput = z.infer<typeof postJournalSchema>;

export const requestContextSchema = z
  .object({
    requestId: uuidSchema,
    tenantId: uuidSchema,
    actorId: uuidSchema,
    roles: z.array(z.string().min(1).max(64)).max(32),
  })
  .strict();

export type RequestContext = z.infer<typeof requestContextSchema>;
