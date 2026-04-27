import type { DetailedStatus, Phase } from "./types";

export const DETAILED_STATUS_OPTIONS: { value: DetailedStatus; label: string }[] = [
  { value: "NOT_STARTED", label: "Not Started" },
  { value: "TC_WRITING_IN_PROGRESS", label: "TC Writing In Progress" },
  { value: "TC_REVIEW_PENDING", label: "TC Review Pending" },
  { value: "READY_FOR_EXECUTION", label: "Ready for Execution" },
  { value: "EXECUTION_IN_PROGRESS", label: "Execution In Progress" },
  { value: "BLOCKED", label: "Blocked" },
  { value: "FAILED", label: "Failed" },
  { value: "PASSED", label: "Passed" },
  { value: "READY_FOR_RETEST", label: "Ready for Retest" },
  { value: "RETEST_IN_PROGRESS", label: "Retest In Progress" },
  { value: "RETEST_FAILED", label: "Retest Failed" },
  { value: "RETEST_PASSED", label: "Retest Passed" },
  { value: "DONE", label: "Done" },
  { value: "NA", label: "NA" },
];

export const PHASE_OPTIONS: { value: Phase; label: string }[] = [
  { value: "PREPARATION", label: "Preparation Phase" },
  { value: "EXECUTION", label: "Execution Phase" },
  { value: "OUTCOME", label: "Outcome Phase" },
  { value: "RETEST", label: "Retest Phase" },
  { value: "CLOSURE", label: "Closure Phase" },
  { value: "NA", label: "NA" },
];

export const PHASE_LABELS: Record<Phase, string> = {
  PREPARATION: "Preparation",
  EXECUTION: "Execution",
  OUTCOME: "Outcome",
  RETEST: "Retest",
  CLOSURE: "Closure",
  NA: "NA",
};

export const STATUS_LABELS: Record<DetailedStatus, string> = {
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

export const PHASE_COLORS: Record<Phase, { bg: string; text: string; border: string }> = {
  PREPARATION: { bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-200" },
  EXECUTION: { bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200" },
  OUTCOME: { bg: "bg-red-50", text: "text-red-700", border: "border-red-200" },
  RETEST: { bg: "bg-purple-50", text: "text-purple-700", border: "border-purple-200" },
  CLOSURE: { bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200" },
  NA: { bg: "bg-gray-50", text: "text-gray-500", border: "border-gray-200" },
};

export const FIELD_LABELS: Record<string, string> = {
  be_detailed_status: "BE Status",
  fe_detailed_status: "FE Status",
  owner: "Owner",
  remarks: "Remarks",
  name: "Module Name",
  created: "Created",
};
