import { Router, Request, Response } from "express";
import prisma from "../lib/prisma";
import { requireAdmin } from "../middleware/auth";
import { createModule, updateModuleWithPhaseDerivation } from "../services/moduleService";
import { DetailedStatus, Phase } from "@prisma/client";
import { logAudit } from "../lib/audit";
import { sanitize, sanitizeOrNull } from "../lib/sanitize";

const router = Router({ mergeParams: true });

router.get("/", async (req: Request, res: Response): Promise<void> => {
  const projectId = req.params.projectId as string;
  const owner = req.query.owner as string | undefined;
  const overall_phase = req.query.overall_phase as string | undefined;
  const be_phase = req.query.be_phase as string | undefined;
  const fe_phase = req.query.fe_phase as string | undefined;
  const search = req.query.search as string | undefined;

  const where: Record<string, unknown> = { projectId };

  if (owner) where.ownerId = owner;
  if (overall_phase) where.overallPhase = overall_phase as Phase;
  if (be_phase) where.bePhase = be_phase as Phase;
  if (fe_phase) where.fePhase = fe_phase as Phase;
  if (search) where.name = { contains: search, mode: "insensitive" };

  const modules = await prisma.module.findMany({
    where,
    include: {
      owner: { select: { id: true, name: true, email: true } },
    },
    orderBy: { name: "asc" },
  });

  res.json(modules);
});

router.post("/", requireAdmin, async (req: Request, res: Response): Promise<void> => {
  const projectId = req.params.projectId as string;
  const { ownerId } = req.body;
  const name = req.body.name ? sanitize(req.body.name) : "";

  if (!name) {
    res.status(400).json({ error: "Module name is required" });
    return;
  }

  const existing = await prisma.module.findUnique({
    where: { projectId_name: { projectId, name } },
  });
  if (existing) {
    res.status(409).json({ error: "Module name already exists in this project" });
    return;
  }

  const mod = await createModule(name, projectId, ownerId || null, req.user!.id);

  await logAudit({
    userId: req.user!.id,
    projectId,
    action: "module.create",
    entity: "module",
    entityId: mod.id,
    details: { name, ownerId },
    ipAddress: req.clientIp,
  });

  res.status(201).json(mod);
});

router.get("/:id", async (req: Request, res: Response): Promise<void> => {
  const id = req.params.id as string;

  const mod = await prisma.module.findUnique({
    where: { id },
    include: {
      owner: { select: { id: true, name: true, email: true } },
      activityLogs: {
        include: { user: { select: { id: true, name: true } } },
        orderBy: { createdAt: "desc" },
        take: 50,
      },
    },
  });

  if (!mod) {
    res.status(404).json({ error: "Module not found" });
    return;
  }

  res.json(mod);
});

router.patch("/:id", async (req: Request, res: Response): Promise<void> => {
  const id = req.params.id as string;
  const projectId = req.params.projectId as string;
  const { beDetailedStatus, feDetailedStatus, ownerId, remarks, name } = req.body;

  const updateData: Record<string, unknown> = {};

  if (beDetailedStatus !== undefined) {
    if (!Object.values(DetailedStatus).includes(beDetailedStatus)) {
      res.status(400).json({ error: "Invalid BE detailed status" });
      return;
    }
    updateData.beDetailedStatus = beDetailedStatus as DetailedStatus;
  }

  if (feDetailedStatus !== undefined) {
    if (!Object.values(DetailedStatus).includes(feDetailedStatus)) {
      res.status(400).json({ error: "Invalid FE detailed status" });
      return;
    }
    updateData.feDetailedStatus = feDetailedStatus as DetailedStatus;
  }

  if (ownerId !== undefined) {
    if (req.user!.role !== "ADMIN") {
      res.status(403).json({ error: "Only admins can change owner" });
      return;
    }
    updateData.ownerId = ownerId;
  }

  if (name !== undefined) {
    if (req.user!.role !== "ADMIN") {
      res.status(403).json({ error: "Only admins can rename modules" });
      return;
    }
    updateData.name = sanitize(name);
  }

  if (remarks !== undefined) updateData.remarks = sanitizeOrNull(remarks);

  if (Object.keys(updateData).length === 0) {
    res.status(400).json({ error: "Nothing to update" });
    return;
  }

  try {
    const updated = await updateModuleWithPhaseDerivation(id, updateData as Record<string, unknown>, req.user!.id);

    await logAudit({
      userId: req.user!.id,
      projectId,
      action: "module.update",
      entity: "module",
      entityId: id,
      details: updateData,
      ipAddress: req.clientIp,
    });

    res.json(updated);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Update failed";
    res.status(404).json({ error: message });
  }
});

router.delete("/:id", requireAdmin, async (req: Request, res: Response): Promise<void> => {
  const id = req.params.id as string;
  const projectId = req.params.projectId as string;

  try {
    const mod = await prisma.module.findUnique({ where: { id } });
    await prisma.module.delete({ where: { id } });

    await logAudit({
      userId: req.user!.id,
      projectId,
      action: "module.delete",
      entity: "module",
      entityId: id,
      details: { name: mod?.name },
      ipAddress: req.clientIp,
    });

    res.json({ message: "Module deleted" });
  } catch {
    res.status(404).json({ error: "Module not found" });
  }
});

export default router;
