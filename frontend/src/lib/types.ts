export type Role = "ADMIN" | "MEMBER";

export type DetailedStatus =
  | "NOT_STARTED"
  | "TC_WRITING_IN_PROGRESS"
  | "TC_REVIEW_PENDING"
  | "READY_FOR_EXECUTION"
  | "EXECUTION_IN_PROGRESS"
  | "BLOCKED"
  | "FAILED"
  | "PASSED"
  | "READY_FOR_RETEST"
  | "RETEST_IN_PROGRESS"
  | "RETEST_FAILED"
  | "RETEST_PASSED"
  | "DONE"
  | "NA";

export type Phase =
  | "PREPARATION"
  | "EXECUTION"
  | "OUTCOME"
  | "RETEST"
  | "CLOSURE"
  | "NA";

export interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
  isActive?: boolean;
  mustResetPassword?: boolean;
  createdAt?: string;
  projectMemberships?: Array<{
    project: { id: string; name: string; code: string };
  }>;
}

export interface Project {
  id: string;
  name: string;
  code: string;
  memberRole?: Role;
  _count?: { modules: number; members: number };
}

export interface Module {
  id: string;
  name: string;
  beDetailedStatus: DetailedStatus;
  bePhase: Phase;
  feDetailedStatus: DetailedStatus;
  fePhase: Phase;
  overallPhase: Phase;
  ownerId: string | null;
  owner: { id: string; name: string; email: string } | null;
  remarks: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ActivityLog {
  id: string;
  moduleId: string;
  userId: string;
  fieldChanged: string;
  oldValue: string | null;
  newValue: string | null;
  createdAt: string;
  user: { id: string; name: string };
}

export interface ModuleDetail extends Module {
  activityLogs: ActivityLog[];
}

export interface DashboardSummary {
  total: number;
  byOverallPhase: Record<Phase, number>;
  byBePhase: Record<Phase, number>;
  byFePhase: Record<Phase, number>;
  byBeStatus: Record<DetailedStatus, number>;
  byFeStatus: Record<DetailedStatus, number>;
  blockedCount: number;
  failedCount: number;
  blockedModules: Array<{
    id: string;
    name: string;
    owner: string | null;
    remarks: string | null;
    side: string;
  }>;
  failedModules: Array<{
    id: string;
    name: string;
    owner: string | null;
    remarks: string | null;
    side: string;
  }>;
  readyForSignoff: Array<{
    id: string;
    name: string;
    owner: string | null;
  }>;
  ownerPending: Record<string, number>;
  ownerBreakdown: Record<string, Record<Phase, number>>;
  agingModules: Array<{
    id: string;
    name: string;
    updatedAt: string;
    owner: string | null;
  }>;
  releaseReadiness: number;
  beReadiness: number;
  feReadiness: number;
}

export interface AuditLogEntry {
  id: string;
  projectId: string | null;
  userId: string;
  action: string;
  entity: string;
  entityId: string | null;
  details: Record<string, unknown> | null;
  ipAddress: string | null;
  createdAt: string;
  user: { id: string; name: string; email: string };
  project: { id: string; name: string; code: string } | null;
}
