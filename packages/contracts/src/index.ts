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
    timeZone: z.literal('Asia/Tokyo'),
    breaks: z
      .array(
        z
          .object({
            id: uuidSchema,
            startedAt: z.iso.datetime({ offset: true }),
            endedAt: z.iso.datetime({ offset: true }),
          })
          .strict(),
      )
      .max(10),
    source: z.enum(['manual', 'import', 'clock']),
    correctedEntryId: uuidSchema.optional(),
  })
  .strict();
export type RecordAttendanceInput = z.infer<typeof recordAttendanceSchema>;

export const listAttendanceQuerySchema = z
  .object({
    employmentId: uuidSchema,
    limit: z.coerce.number().int().min(1).max(100).default(25),
  })
  .strict();
export type ListAttendanceQuery = z.infer<typeof listAttendanceQuerySchema>;

export const decideAttendanceSchema = z
  .object({
    id: uuidSchema,
    tenantId: uuidSchema,
    employmentId: uuidSchema,
    attendanceEntryId: uuidSchema,
    decision: z.enum(['approved', 'rejected']),
    reason: z.string().trim().min(1).max(500),
  })
  .strict();
export type DecideAttendanceInput = z.infer<typeof decideAttendanceSchema>;

export const transitionAttendancePeriodSchema = z
  .object({
    id: uuidSchema,
    tenantId: uuidSchema,
    employmentId: uuidSchema,
    periodMonth: isoDateSchema.refine((value) => value.endsWith('-01'), {
      message: 'Period month must be the first day of a calendar month',
    }),
    action: z.enum(['close', 'reopen']),
    reason: z.string().trim().min(1).max(500),
  })
  .strict();
export type TransitionAttendancePeriodInput = z.infer<typeof transitionAttendancePeriodSchema>;

export const listAttendancePeriodsQuerySchema = z
  .object({
    employmentId: uuidSchema,
    limit: z.coerce.number().int().min(1).max(100).default(25),
  })
  .strict();
export type ListAttendancePeriodsQuery = z.infer<typeof listAttendancePeriodsQuerySchema>;

export const requestLeaveSchema = z
  .object({
    id: uuidSchema,
    tenantId: uuidSchema,
    employmentId: uuidSchema,
    leaveType: z.string().trim().min(1).max(32),
    startsOn: isoDateSchema,
    endsOn: isoDateSchema,
    requestedMinutes: z.number().int().positive().max(525_600),
  })
  .strict()
  .refine((leave) => leave.endsOn >= leave.startsOn, {
    message: 'Leave end date must not precede its start date',
  });
export type RequestLeaveInput = z.infer<typeof requestLeaveSchema>;

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

export const applyReceiptSchema = z
  .object({
    id: uuidSchema,
    tenantId: uuidSchema,
    receivableId: uuidSchema,
    customerPartyId: uuidSchema,
    receivedOn: isoDateSchema,
    currency: z.string().regex(/^[A-Z]{3}$/),
    amount: decimalAmountSchema.positive(),
    externalReference: z.string().trim().min(1).max(200),
  })
  .strict();
export type ApplyReceiptInput = z.infer<typeof applyReceiptSchema>;

export const allocateCostSchema = z
  .object({
    id: uuidSchema,
    tenantId: uuidSchema,
    journalId: uuidSchema,
    sourceCostCenterId: uuidSchema,
    targetCostCenterId: uuidSchema,
    amount: decimalAmountSchema.positive(),
    currency: z.string().regex(/^[A-Z]{3}$/),
    ruleId: z.string().trim().min(1).max(80),
    ruleVersion: z.number().int().positive(),
  })
  .strict()
  .refine((allocation) => allocation.sourceCostCenterId !== allocation.targetCostCenterId, {
    message: 'Source and target cost centers must differ',
  });
export type AllocateCostInput = z.infer<typeof allocateCostSchema>;

export const requestContextSchema = z
  .object({
    requestId: uuidSchema,
    tenantId: uuidSchema,
    actorId: uuidSchema,
    roles: z.array(z.string().min(1).max(64)).max(32),
  })
  .strict();

export type RequestContext = z.infer<typeof requestContextSchema>;
