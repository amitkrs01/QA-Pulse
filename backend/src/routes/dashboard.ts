import { Router, Request, Response } from "express";
import prisma from "../lib/prisma";
import { Phase, DetailedStatus } from "@prisma/client";

const router = Router({ mergeParams: true });

router.get("/summary", async (req: Request, res: Response): Promise<void> => {
  const projectId = req.params.projectId as string;

  const modules = await prisma.module.findMany({
    where: { projectId },
    include: {
      owner: { select: { id: true, name: true } },
    },
  });

  const total = modules.length;

  const byOverallPhase: Record<string, number> = {
    PREPARATION: 0, EXECUTION: 0, OUTCOME: 0, RETEST: 0, CLOSURE: 0, NA: 0,
  };
  const byBePhase: Record<string, number> = { ...byOverallPhase };
  const byFePhase: Record<string, number> = { ...byOverallPhase };

  const byBeStatus: Record<string, number> = {};
  const byFeStatus: Record<string, number> = {};
  for (const s of Object.values(DetailedStatus)) {
    byBeStatus[s] = 0;
    byFeStatus[s] = 0;
  }

  let blockedCount = 0;
  let failedCount = 0;
  const blockedModules: Array<{ id: string; name: string; owner: string | null; remarks: string | null; side: string }> = [];
  const failedModules: Array<{ id: string; name: string; owner: string | null; remarks: string | null; side: string }> = [];
  const readyForSignoff: Array<{ id: string; name: string; owner: string | null }> = [];
  const ownerPending: Record<string, number> = {};
  const ownerBreakdown: Record<string, Record<string, number>> = {};

  const now = new Date();
  const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);
  const agingModules: Array<{ id: string; name: string; updatedAt: Date; owner: string | null }> = [];

  for (const m of modules) {
    byOverallPhase[m.overallPhase]++;
    byBePhase[m.bePhase]++;
    byFePhase[m.fePhase]++;
    byBeStatus[m.beDetailedStatus]++;
    byFeStatus[m.feDetailedStatus]++;

    if (m.beDetailedStatus === DetailedStatus.BLOCKED || m.feDetailedStatus === DetailedStatus.BLOCKED) {
      blockedCount++;
      const side = m.beDetailedStatus === DetailedStatus.BLOCKED && m.feDetailedStatus === DetailedStatus.BLOCKED
        ? "BE & FE"
        : m.beDetailedStatus === DetailedStatus.BLOCKED ? "BE" : "FE";
      blockedModules.push({ id: m.id, name: m.name, owner: m.owner?.name || null, remarks: m.remarks, side });
    }

    if (
      m.beDetailedStatus === DetailedStatus.FAILED || m.feDetailedStatus === DetailedStatus.FAILED ||
      m.beDetailedStatus === DetailedStatus.RETEST_FAILED || m.feDetailedStatus === DetailedStatus.RETEST_FAILED
    ) {
      failedCount++;
      const sides: string[] = [];
      if (m.beDetailedStatus === DetailedStatus.FAILED || m.beDetailedStatus === DetailedStatus.RETEST_FAILED) sides.push("BE");
      if (m.feDetailedStatus === DetailedStatus.FAILED || m.feDetailedStatus === DetailedStatus.RETEST_FAILED) sides.push("FE");
      failedModules.push({ id: m.id, name: m.name, owner: m.owner?.name || null, remarks: m.remarks, side: sides.join(" & ") });
    }

    const closureStatuses: DetailedStatus[] = [DetailedStatus.PASSED, DetailedStatus.RETEST_PASSED, DetailedStatus.DONE];
    const beReady = closureStatuses.includes(m.beDetailedStatus) || m.beDetailedStatus === DetailedStatus.NA;
    const feReady = closureStatuses.includes(m.feDetailedStatus) || m.feDetailedStatus === DetailedStatus.NA;
    if (beReady && feReady) {
      readyForSignoff.push({ id: m.id, name: m.name, owner: m.owner?.name || null });
    }

    const ownerName = m.owner?.name || "Unassigned";

    if (m.overallPhase !== Phase.CLOSURE && m.overallPhase !== Phase.NA) {
      ownerPending[ownerName] = (ownerPending[ownerName] || 0) + 1;
    }

    if (!ownerBreakdown[ownerName]) {
      ownerBreakdown[ownerName] = { PREPARATION: 0, EXECUTION: 0, OUTCOME: 0, RETEST: 0, CLOSURE: 0, NA: 0 };
    }
    ownerBreakdown[ownerName][m.overallPhase]++;

    if (m.updatedAt < twoDaysAgo && m.overallPhase !== Phase.CLOSURE && m.overallPhase !== Phase.NA) {
      agingModules.push({ id: m.id, name: m.name, updatedAt: m.updatedAt, owner: m.owner?.name || null });
    }
  }

  const applicableModules = modules.filter(
    (m) => m.overallPhase !== Phase.NA
  );
  const closedModules = applicableModules.filter(
    (m) => m.overallPhase === Phase.CLOSURE
  );
  const releaseReadiness = applicableModules.length > 0
    ? Math.round((closedModules.length / applicableModules.length) * 100)
    : 0;

  const beApplicable = modules.filter((m) => m.bePhase !== Phase.NA);
  const beClosed = beApplicable.filter((m) => m.bePhase === Phase.CLOSURE);
  const beReadiness = beApplicable.length > 0
    ? Math.round((beClosed.length / beApplicable.length) * 100)
    : 0;

  const feApplicable = modules.filter((m) => m.fePhase !== Phase.NA);
  const feClosed = feApplicable.filter((m) => m.fePhase === Phase.CLOSURE);
  const feReadiness = feApplicable.length > 0
    ? Math.round((feClosed.length / feApplicable.length) * 100)
    : 0;

  res.json({
    total,
    byOverallPhase,
    byBePhase,
    byFePhase,
    byBeStatus,
    byFeStatus,
    blockedCount,
    failedCount,
    blockedModules,
    failedModules,
    readyForSignoff,
    ownerPending,
    ownerBreakdown,
    agingModules,
    releaseReadiness,
    beReadiness,
    feReadiness,
  });
});

export default router;
