import { Request } from 'express';
import prisma from '../config/database';

interface AuditParams {
  /** The authenticated request; used to derive actor identity and IP. */
  req?: Request;
  /** Explicit actor override (e.g. when no req is available). */
  actorId?: string | null;
  actorName?: string | null;
  actorRole?: string | null;
  /** Machine-readable action key, e.g. "request.status_changed". */
  action: string;
  /** The kind of entity acted upon, e.g. "HairRequest", "User". */
  targetType?: string | null;
  targetId?: string | number | null;
  /** Human-readable summary shown to admins. */
  description?: string | null;
  metadata?: Record<string, unknown> | null;
}

/**
 * Records an audit-log entry for a key action. Never throws — a failure to
 * write the audit trail must not break the primary request flow.
 */
export const logAudit = async (params: AuditParams): Promise<void> => {
  try {
    const user = params.req?.user;

    // Only record activity performed by admin or staff accounts. Actions taken
    // by donors, recipients, or wigmakers are intentionally not audited.
    const actorRole = params.actorRole ?? user?.role ?? null;
    if (actorRole !== 'admin' && actorRole !== 'staff') return;

    const ip =
      (params.req?.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
      params.req?.socket?.remoteAddress ||
      null;

    await prisma.auditLog.create({
      data: {
        actorId: params.actorId ?? user?.id ?? null,
        actorName: params.actorName ?? user?.name ?? null,
        actorRole,
        action: params.action,
        targetType: params.targetType ?? null,
        targetId: params.targetId != null ? String(params.targetId) : null,
        description: params.description ?? null,
        metadata: (params.metadata ?? undefined) as any,
        ipAddress: ip,
      },
    });
  } catch (err) {
    console.error('[Audit] Failed to write audit log:', err);
  }
};
