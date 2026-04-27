import { Router, Request, Response } from "express";
import prisma from "../lib/prisma";
import { authenticate, requireAdmin } from "../middleware/auth";

const router = Router();

router.use(authenticate);
router.use(requireAdmin);

router.get("/", async (req: Request, res: Response): Promise<void> => {
  const projectId = req.query.project as string | undefined;
  const entity = req.query.entity as string | undefined;
  const action = req.query.action as string | undefined;
  const userId = req.query.user as string | undefined;
  const limit = Math.min(parseInt(req.query.limit as string) || 50, 200);
  const offset = parseInt(req.query.offset as string) || 0;

  const where: Record<string, unknown> = {};
  if (projectId) where.projectId = projectId;
  if (entity) where.entity = entity;
  if (action) where.action = { contains: action };
  if (userId) where.userId = userId;

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      include: {
        user: { select: { id: true, name: true, email: true } },
        project: { select: { id: true, name: true, code: true } },
      },
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: offset,
    }),
    prisma.auditLog.count({ where }),
  ]);

  res.json({ logs, total, limit, offset });
});

export default router;
