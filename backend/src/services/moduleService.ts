import { DetailedStatus, Phase } from "@prisma/client";
import prisma from "../lib/prisma";
import { STATUS_TO_PHASE, computeOverallPhase } from "../lib/constants";

interface ModuleUpdateData {
  name?: string;
  beDetailedStatus?: DetailedStatus;
  feDetailedStatus?: DetailedStatus;
  ownerId?: string | null;
  remarks?: string | null;
}

export async function updateModuleWithPhaseDerivation(
  moduleId: string,
  data: ModuleUpdateData,
  userId: string
) {
  const existing = await prisma.module.findUnique({ where: { id: moduleId } });
  if (!existing) throw new Error("Module not found");

  const beStatus = data.beDetailedStatus ?? existing.beDetailedStatus;
  const feStatus = data.feDetailedStatus ?? existing.feDetailedStatus;
  const bePhase = STATUS_TO_PHASE[beStatus];
  const fePhase = STATUS_TO_PHASE[feStatus];
  const overallPhase = computeOverallPhase(bePhase, fePhase);

  const activityEntries: Array<{
    moduleId: string;
    userId: string;
    fieldChanged: string;
    oldValue: string | null;
    newValue: string | null;
  }> = [];

  if (data.beDetailedStatus && data.beDetailedStatus !== existing.beDetailedStatus) {
    activityEntries.push({
      moduleId,
      userId,
      fieldChanged: "be_detailed_status",
      oldValue: existing.beDetailedStatus,
      newValue: data.beDetailedStatus,
    });
  }
  if (data.feDetailedStatus && data.feDetailedStatus !== existing.feDetailedStatus) {
    activityEntries.push({
      moduleId,
      userId,
      fieldChanged: "fe_detailed_status",
      oldValue: existing.feDetailedStatus,
      newValue: data.feDetailedStatus,
    });
  }
  if (data.ownerId !== undefined && data.ownerId !== existing.ownerId) {
    activityEntries.push({
      moduleId,
      userId,
      fieldChanged: "owner",
      oldValue: existing.ownerId,
      newValue: data.ownerId,
    });
  }
  if (data.remarks !== undefined && data.remarks !== existing.remarks) {
    activityEntries.push({
      moduleId,
      userId,
      fieldChanged: "remarks",
      oldValue: existing.remarks,
      newValue: data.remarks,
    });
  }
  if (data.name && data.name !== existing.name) {
    activityEntries.push({
      moduleId,
      userId,
      fieldChanged: "name",
      oldValue: existing.name,
      newValue: data.name,
    });
  }

  const [updated] = await prisma.$transaction([
    prisma.module.update({
      where: { id: moduleId },
      data: {
        ...data,
        bePhase,
        fePhase,
        overallPhase,
      },
      include: {
        owner: { select: { id: true, name: true, email: true } },
      },
    }),
    ...activityEntries.map((entry) => prisma.activityLog.create({ data: entry })),
  ]);

  return updated;
}

export async function createModule(
  name: string,
  projectId: string,
  ownerId: string | null,
  userId: string
) {
  const module = await prisma.module.create({
    data: {
      name,
      projectId,
      ownerId,
      beDetailedStatus: "NOT_STARTED",
      bePhase: "PREPARATION",
      feDetailedStatus: "NOT_STARTED",
      fePhase: "PREPARATION",
      overallPhase: "PREPARATION",
    },
    include: {
      owner: { select: { id: true, name: true, email: true } },
    },
  });

  await prisma.activityLog.create({
    data: {
      moduleId: module.id,
      userId,
      fieldChanged: "created",
      oldValue: null,
      newValue: name,
    },
  });

  return module;
}
