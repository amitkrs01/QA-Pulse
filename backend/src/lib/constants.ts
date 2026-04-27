import { DetailedStatus, Phase } from "@prisma/client";

export const STATUS_TO_PHASE: Record<DetailedStatus, Phase> = {
  NOT_STARTED: Phase.PREPARATION,
  TC_WRITING_IN_PROGRESS: Phase.PREPARATION,
  TC_REVIEW_PENDING: Phase.PREPARATION,
  READY_FOR_EXECUTION: Phase.PREPARATION,
  EXECUTION_IN_PROGRESS: Phase.EXECUTION,
  BLOCKED: Phase.EXECUTION,
  FAILED: Phase.OUTCOME,
  READY_FOR_RETEST: Phase.RETEST,
  RETEST_IN_PROGRESS: Phase.RETEST,
  RETEST_FAILED: Phase.OUTCOME,
  PASSED: Phase.CLOSURE,
  RETEST_PASSED: Phase.CLOSURE,
  DONE: Phase.CLOSURE,
  NA: Phase.NA,
};

const PHASE_PRIORITY: Record<Phase, number> = {
  OUTCOME: 1,
  EXECUTION: 2,
  RETEST: 3,
  PREPARATION: 4,
  CLOSURE: 5,
  NA: 6,
};

export function computeOverallPhase(bePhase: Phase, fePhase: Phase): Phase {
  if (bePhase === Phase.NA && fePhase === Phase.NA) return Phase.NA;
  if (bePhase === Phase.NA) return fePhase;
  if (fePhase === Phase.NA) return bePhase;

  const bePriority = PHASE_PRIORITY[bePhase];
  const fePriority = PHASE_PRIORITY[fePhase];

  if (bePriority === PHASE_PRIORITY[Phase.CLOSURE] && fePriority === PHASE_PRIORITY[Phase.CLOSURE]) {
    return Phase.CLOSURE;
  }

  return bePriority <= fePriority ? bePhase : fePhase;
}

export const DETAILED_STATUS_LABELS: Record<DetailedStatus, string> = {
  NOT_STARTED: "Not Started",
  TC_WRITING_IN_PROGRESS: "TC Writing In Progress",
  TC_REVIEW_PENDING: "TC Review Pending",
  READY_FOR_EXECUTION: "Ready for Execution",
  EXECUTION_IN_PROGRESS: "Execution In Progress",
  BLOCKED: "Blocked",
  FAILED: "Failed",
  PASSED: "Passed",
  READY_FOR_RETEST: "Ready for Retest",
  RETEST_IN_PROGRESS: "Retest In Progress",
  RETEST_FAILED: "Retest Failed",
  RETEST_PASSED: "Retest Passed",
  DONE: "Done",
  NA: "NA",
};

export const PHASE_LABELS: Record<Phase, string> = {
  PREPARATION: "Preparation Phase",
  EXECUTION: "Execution Phase",
  OUTCOME: "Outcome Phase",
  RETEST: "Retest Phase",
  CLOSURE: "Closure Phase",
  NA: "NA",
};
