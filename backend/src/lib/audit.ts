import prisma from "./prisma";

interface AuditEntry {
  userId: string;
  projectId?: string | null;
  action: string;
  entity: string;
  entityId?: string | null;
  details?: unknown;
  ipAddress?: string | null;
}

export async function logAudit(entry: AuditEntry) {
  try {
    await prisma.auditLog.create({
      data: {
        userId: entry.userId,
        projectId: entry.projectId || null,
        action: entry.action,
        entity: entry.entity,
        entityId: entry.entityId || null,
        details: entry.details ? JSON.parse(JSON.stringify(entry.details)) : undefined,
        ipAddress: entry.ipAddress || null,
      },
    });
  } catch (err) {
    console.error("Audit log failed:", err);
  }
}
