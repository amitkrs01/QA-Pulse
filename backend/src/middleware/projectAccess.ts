import { Request, Response, NextFunction } from "express";
import prisma from "../lib/prisma";
import { Role } from "@prisma/client";

export async function requireProjectAccess(req: Request, res: Response, next: NextFunction): Promise<void> {
  const projectId = req.params.projectId as string | undefined;
  if (!projectId) {
    next();
    return;
  }

  if (req.user?.role === Role.ADMIN) {
    next();
    return;
  }

  const membership = await prisma.projectMember.findUnique({
    where: { projectId_userId: { projectId, userId: req.user!.id } },
  });

  if (!membership) {
    res.status(403).json({ error: "You are not a member of this project" });
    return;
  }

  next();
}
