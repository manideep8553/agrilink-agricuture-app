import { prisma } from '../index';

export async function logAudit(
  action: string,
  entity: string,
  entityId?: string,
  userId?: string,
  oldValue?: any,
  newValue?: any,
  ip?: string
): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        action,
        entity,
        entityId: entityId || null,
        userId: userId || null,
        oldValue: oldValue || undefined,
        newValue: newValue || undefined,
        ip: ip || null,
      },
    });
  } catch {
  }
}

export function auditMiddleware(action: string, entity: string) {
  return async (req: any, _res: any, next: any) => {
    const originalJson = _res.json.bind(_res);
    _res.json = function (body: any) {
      const entityId = req.params?.id || body?.listing?.id || body?.user?.id || body?.id;
      logAudit(
        action,
        entity,
        entityId,
        req.user?.id,
        undefined,
        body,
        req.ip
      ).catch(() => {});
      return originalJson(body);
    };
    next();
  };
}
