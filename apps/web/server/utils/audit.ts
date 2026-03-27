import type { Prisma } from '@nexus/db';

interface BuildAuditLogInputOptions {
  userId: string;
  action: string;
  entity: string;
  entityId: string;
  details?: Prisma.InputJsonValue;
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
    ...(details ? { details } : {}),
  };
}
