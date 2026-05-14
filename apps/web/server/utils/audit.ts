import type { Prisma } from '@nexus/db';

interface BuildAuditLogInputOptions {
  userId: string;
  action: string;
  entity: string;
  entityId: string;
  details?: Prisma.InputJsonValue;
}

const SENSITIVE_KEY_PATTERN =
  /(password|passwordHash|secret|token|apiKey|api_key|hash|salt)/i;
const MONETARY_KEY_PATTERN = /(salary|releaseClause|transferFee|budget)/i;
const REDACTED = '[REDACTED]';

function redactValue(value: unknown, key: string): unknown {
  if (value == null) return value;

  if (SENSITIVE_KEY_PATTERN.test(key)) {
    return REDACTED;
  }

  if (MONETARY_KEY_PATTERN.test(key) && typeof value === 'number') {
    return { masked: true, magnitude: value > 0 ? Math.floor(Math.log10(value) + 1) : 0 };
  }

  if (Array.isArray(value)) {
    return value.map((item, index) => redactValue(item, `${key}[${index}]`));
  }

  if (typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>);
    return Object.fromEntries(entries.map(([k, v]) => [k, redactValue(v, k)]));
  }

  return value;
}

export function redactAuditDetails(details: Prisma.InputJsonValue): Prisma.InputJsonValue {
  return redactValue(details, '') as Prisma.InputJsonValue;
}

export function buildAuditLogInput({
  userId,
  action,
  entity,
  entityId,
  details,
}: BuildAuditLogInputOptions): Prisma.AuditLogUncheckedCreateInput {
  return {
    userId,
    action,
    entity,
    entityId,
    ...(details ? { details: redactAuditDetails(details) } : {}),
  };
}
