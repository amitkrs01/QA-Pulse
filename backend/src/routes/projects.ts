import { Router, Request, Response } from "express";
import prisma from "../lib/prisma";
import { authenticate, requireAdmin } from "../middleware/auth";
import { Role } from "@prisma/client";
import { logAudit } from "../lib/audit";
import { sanitize } from "../lib/sanitize";

const router = Router();

router.use(authenticate);

router.get("/", async (req: Request, res: Response): Promise<void> => {
  if (req.user!.role === "ADMIN") {
    const projects = await prisma.project.findMany({
      include: {
        _count: { select: { modules: true, members: true } },
      },
      orderBy: { name: "asc" },
    });
    res.json(projects);
    return;
  }

  const memberships = await prisma.projectMember.findMany({
    where: { userId: req.user!.id },
    include: {
      project: {
        include: { _count: { select: { modules: true, members: true } } },
      },
    },
  });
  res.json(memberships.map((m) => m.project));
});

router.post("/", requireAdmin, async (req: Request, res: Response): Promise<void> => {
  const name = req.body.name ? sanitize(req.body.name) : "";
  const code = req.body.code ? sanitize(req.body.code) : "";

  if (!name || !code) {
    res.status(400).json({ error: "Name and code are required" });
    return;
  }

  const existing = await prisma.project.findFirst({
    where: { OR: [{ name }, { code: code.toUpperCase() }] },
  });
  if (existing) {
    res.status(409).json({ error: "Project name or code already exists" });
    return;
  }

  const project = await prisma.project.create({
    data: { name, code: code.toUpperCase() },
  });

  await prisma.projectMember.create({
    data: { projectId: project.id, userId: req.user!.id, role: "ADMIN" },
  });

  await logAudit({
    userId: req.user!.id,
    projectId: project.id,
    action: "project.create",
    entity: "project",
    entityId: project.id,
    details: { name, code: code.toUpperCase() },
    ipAddress: req.clientIp,
  });

  res.status(201).json(project);
});

router.get("/:id/members", async (req: Request, res: Response): Promise<void> => {
  const projectId = req.params.id as string;

  const members = await prisma.projectMember.findMany({
    where: { projectId },
    include: {
      user: { select: { id: true, name: true, email: true, role: true, isActive: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  res.json(members.map((m) => ({ ...m.user, projectRole: m.role, membershipId: m.id })));
});

router.post("/:id/members", requireAdmin, async (req: Request, res: Response): Promise<void> => {
  const projectId = req.params.id as string;
  const { userId, role } = req.body;

  if (!userId) {
    res.status(400).json({ error: "userId is required" });
    return;
  }

  const existing = await prisma.projectMember.findUnique({
    where: { projectId_userId: { projectId, userId } },
  });
  if (existing) {
    res.status(409).json({ error: "User is already a member of this project" });
    return;
  }

  await prisma.projectMember.create({
    data: {
      projectId, userId,
      role: role === "ADMIN" ? Role.ADMIN : Role.MEMBER,
    },
  });

  await logAudit({
    userId: req.user!.id,
    projectId,
    action: "project.member_add",
    entity: "project",
    entityId: projectId,
    details: { addedUserId: userId, role: role || "MEMBER" },
    ipAddress: req.clientIp,
  });

  res.status(201).json({ message: "Member added" });
});

router.delete("/:id/members/:userId", requireAdmin, async (req: Request, res: Response): Promise<void> => {
  const projectId = req.params.id as string;
  const userId = req.params.userId as string;

  await prisma.projectMember.deleteMany({
    where: { projectId, userId },
  });

  await logAudit({
    userId: req.user!.id,
    projectId,
    action: "project.member_remove",
    entity: "project",
    entityId: projectId,
    details: { removedUserId: userId },
    ipAddress: req.clientIp,
  });

  res.json({ message: "Member removed" });
});

export default router;
