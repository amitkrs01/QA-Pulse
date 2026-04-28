import { Router, Request, Response } from "express";
import bcrypt from "bcryptjs";
import prisma from "../lib/prisma";
import { authenticate, requireAdmin } from "../middleware/auth";
import { Role } from "@prisma/client";
import { logAudit } from "../lib/audit";
import { sendWelcomeEmail } from "../lib/email";
import { sanitize } from "../lib/sanitize";

const router = Router();

router.use(authenticate);
router.use(requireAdmin);

router.get("/", async (_req: Request, res: Response): Promise<void> => {
  const users = await prisma.user.findMany({
    select: {
      id: true, email: true, name: true, role: true, isActive: true, createdAt: true,
      projectMemberships: {
        include: { project: { select: { id: true, name: true, code: true } } },
      },
    },
    orderBy: { name: "asc" },
  });
  res.json(users);
});

router.post("/", async (req: Request, res: Response): Promise<void> => {
  const { password, role, projectIds } = req.body;
  const name = req.body.name ? sanitize(req.body.name) : "";
  const email = req.body.email ? req.body.email.trim().toLowerCase() : "";

  if (!name || !email || !password) {
    res.status(400).json({ error: "Name, email, and password are required" });
    return;
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    res.status(409).json({ error: "Email already exists" });
    return;
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: {
      name, email, passwordHash,
      role: role === "ADMIN" ? Role.ADMIN : Role.MEMBER,
      mustResetPassword: true,
    },
    select: { id: true, email: true, name: true, role: true, isActive: true, createdAt: true },
  });

  if (Array.isArray(projectIds)) {
    for (const pid of projectIds) {
      await prisma.projectMember.create({
        data: { projectId: pid, userId: user.id, role: role === "ADMIN" ? Role.ADMIN : Role.MEMBER },
      }).catch(() => {});
    }
  }

  await logAudit({
    userId: req.user!.id,
    action: "user.create",
    entity: "user",
    entityId: user.id,
    details: { name, email, role: user.role, projectIds },
    ipAddress: req.clientIp,
  });

  const emailResult = await sendWelcomeEmail(email, name, password);

  res.status(201).json({ ...user, emailSent: emailResult.success });
});

router.post("/bulk", async (req: Request, res: Response): Promise<void> => {
  const { users, projectIds } = req.body;

  if (!Array.isArray(users) || users.length === 0) {
    res.status(400).json({ error: "Provide an array of users" });
    return;
  }

  const results: Array<{ email: string; status: "created" | "error"; emailSent?: boolean; error?: string }> = [];

  for (const u of users) {
    try {
      if (!u.name || !u.email || !u.password) {
        results.push({ email: u.email || "unknown", status: "error", error: "Missing required fields" });
        continue;
      }

      const existing = await prisma.user.findUnique({ where: { email: u.email } });
      if (existing) {
        results.push({ email: u.email, status: "error", error: "Email already exists" });
        continue;
      }

      const passwordHash = await bcrypt.hash(u.password, 10);
      const created = await prisma.user.create({
        data: {
          name: u.name, email: u.email, passwordHash,
          role: u.role === "ADMIN" ? Role.ADMIN : Role.MEMBER,
          mustResetPassword: true,
        },
      });

      if (Array.isArray(projectIds)) {
        for (const pid of projectIds) {
          await prisma.projectMember.create({
            data: { projectId: pid, userId: created.id, role: u.role === "ADMIN" ? Role.ADMIN : Role.MEMBER },
          }).catch(() => {});
        }
      }

      await logAudit({
        userId: req.user!.id,
        action: "user.create",
        entity: "user",
        entityId: created.id,
        details: { name: u.name, email: u.email, role: created.role },
        ipAddress: req.clientIp,
      });

      const emailResult = await sendWelcomeEmail(u.email, u.name, u.password);
      results.push({ email: u.email, status: "created", emailSent: emailResult.success });
    } catch {
      results.push({ email: u.email || "unknown", status: "error", error: "Failed to create user" });
    }
  }

  res.status(201).json({ results });
});

router.patch("/:id", async (req: Request, res: Response): Promise<void> => {
  const id = req.params.id as string;
  const { role, password, name, projectIds, isActive } = req.body;

  const updateData: Record<string, unknown> = {};
  if (role) updateData.role = role === "ADMIN" ? Role.ADMIN : Role.MEMBER;
  if (password) {
    updateData.passwordHash = await bcrypt.hash(password, 10);
    updateData.mustResetPassword = true;
  }
  if (name) updateData.name = sanitize(name);
  if (typeof isActive === "boolean") updateData.isActive = isActive;

  const hasFieldUpdates = Object.keys(updateData).length > 0;
  const hasProjectUpdates = Array.isArray(projectIds);

  if (!hasFieldUpdates && !hasProjectUpdates) {
    res.status(400).json({ error: "Nothing to update" });
    return;
  }

  let user;
  if (hasFieldUpdates) {
    user = await prisma.user.update({
      where: { id },
      data: updateData,
      select: { id: true, email: true, name: true, role: true, isActive: true },
    });
  }

  if (hasProjectUpdates) {
    const currentMemberships = await prisma.projectMember.findMany({ where: { userId: id } });
    const currentProjectIds = new Set(currentMemberships.map((m) => m.projectId));
    const targetProjectIds = new Set(projectIds as string[]);

    const toAdd = (projectIds as string[]).filter((pid) => !currentProjectIds.has(pid));
    const toRemove = currentMemberships.filter((m) => !targetProjectIds.has(m.projectId));

    for (const pid of toAdd) {
      await prisma.projectMember.create({
        data: { projectId: pid, userId: id, role: role === "ADMIN" ? Role.ADMIN : Role.MEMBER },
      }).catch(() => {});
    }
    for (const m of toRemove) {
      await prisma.projectMember.delete({ where: { id: m.id } }).catch(() => {});
    }
  }

  const updatedUser = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true, email: true, name: true, role: true, isActive: true,
      projectMemberships: {
        include: { project: { select: { id: true, name: true, code: true } } },
      },
    },
  });

  await logAudit({
    userId: req.user!.id,
    action: "user.update",
    entity: "user",
    entityId: id,
    details: {
      updated: Object.keys(updateData).filter((k) => k !== "passwordHash"),
      ...(hasProjectUpdates ? { projectIds } : {}),
    },
    ipAddress: req.clientIp,
  });

  res.json(updatedUser || user);
});

router.delete("/:id", async (req: Request, res: Response): Promise<void> => {
  const id = req.params.id as string;

  await prisma.user.update({
    where: { id },
    data: { isActive: false },
  });

  await logAudit({
    userId: req.user!.id,
    action: "user.deactivate",
    entity: "user",
    entityId: id,
    ipAddress: req.clientIp,
  });

  res.json({ message: "User deactivated" });
});

export default router;
