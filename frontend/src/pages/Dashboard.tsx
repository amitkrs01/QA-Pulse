import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import api from "../lib/api";
import type { DashboardSummary, Phase, DetailedStatus } from "../lib/types";
import { PHASE_LABELS, PHASE_COLORS, STATUS_LABELS } from "../lib/constants";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
  PieChart, Pie, Legend,
} from "recharts";
import { CheckCircle2, AlertTriangle, Clock, ShieldAlert, TrendingUp } from "lucide-react";
import { useProject } from "../hooks/useProject";

const CHART_COLORS: Record<Phase, string> = {
  PREPARATION: "#3b82f6",
  EXECUTION: "#f59e0b",
  OUTCOME: "#ef4444",
  RETEST: "#a855f7",
  CLOSURE: "#10b981",
  NA: "#9ca3af",
};

function ProgressRing({ value, label, color }: { value: number; label: string; color: string }) {
  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (value / 100) * circumference;

  return (
    <div className="flex flex-col items-center">
      <svg width="100" height="100" className="-rotate-90">
        <circle cx="50" cy="50" r={radius} fill="none" stroke="#e5e7eb" strokeWidth="8" />
        <circle
          cx="50" cy="50" r={radius} fill="none"
          stroke={color} strokeWidth="8"
          strokeDasharray={circumference} strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-700"
        />
      </svg>
      <div className="absolute mt-7 text-center">
        <div className="text-xl font-bold text-gray-900">{value}%</div>
      </div>
      <div className="text-xs text-gray-500 mt-1 font-medium">{label}</div>
    </div>
  );
}

export default function Dashboard() {
  const { currentProject } = useProject();
  const [data, setData] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentProject) return;
    setLoading(true);
    api.get(`/projects/${currentProject.id}/dashboard/summary`).then((res) => {
      setData(res.data);
      setLoading(false);
    });
  }, [currentProject]);

  if (loading || !data) {
    return <div className="flex items-center justify-center h-64 text-gray-500">Loading...</div>;
  }

  const phaseData = (Object.keys(data.byOverallPhase) as Phase[])
    .filter((p) => p !== "NA")
    .map((phase) => ({
      name: PHASE_LABELS[phase],
      value: data.byOverallPhase[phase],
      phase,
    }));

  const pieData = phaseData.filter((d) => d.value > 0).map((d) => ({
    name: d.name,
    value: d.value,
    fill: CHART_COLORS[d.phase],
  }));

  const beFe = (Object.keys(data.byBePhase) as Phase[])
    .filter((p) => p !== "NA")
    .map((phase) => ({
      name: PHASE_LABELS[phase],
      BE: data.byBePhase[phase],
      FE: data.byFePhase[phase],
    }));

  const activeStatuses: DetailedStatus[] = [
    "NOT_STARTED", "TC_WRITING_IN_PROGRESS", "TC_REVIEW_PENDING", "READY_FOR_EXECUTION",
    "EXECUTION_IN_PROGRESS", "BLOCKED", "FAILED", "PASSED",
    "READY_FOR_RETEST", "RETEST_IN_PROGRESS", "RETEST_FAILED", "RETEST_PASSED", "DONE",
  ];
  const statusBreakdown = activeStatuses
    .filter((s) => (data.byBeStatus[s] || 0) + (data.byFeStatus[s] || 0) > 0)
    .map((s) => ({
      name: STATUS_LABELS[s],
      BE: data.byBeStatus[s] || 0,
      FE: data.byFeStatus[s] || 0,
    }));

  const ownerData = Object.entries(data.ownerBreakdown).map(([owner, phases]) => ({
    name: owner,
    ...phases,
  }));

  const summaryCards = [
    { label: "Total Modules", value: data.total, icon: TrendingUp, color: "text-gray-600", bg: "bg-gray-50" },
    { label: "Preparation", value: data.byOverallPhase.PREPARATION, icon: Clock, color: "text-blue-600", bg: "bg-blue-50" },
    { label: "Execution", value: data.byOverallPhase.EXECUTION, icon: TrendingUp, color: "text-amber-600", bg: "bg-amber-50" },
    { label: "Outcome", value: data.byOverallPhase.OUTCOME, icon: AlertTriangle, color: "text-red-600", bg: "bg-red-50" },
    { label: "Retest", value: data.byOverallPhase.RETEST, icon: ShieldAlert, color: "text-purple-600", bg: "bg-purple-50" },
    { label: "Closure", value: data.byOverallPhase.CLOSURE, icon: CheckCircle2, color: "text-emerald-600", bg: "bg-emerald-50" },
    { label: "Blocked", value: data.blockedCount, icon: AlertTriangle, color: "text-red-600", bg: "bg-red-50" },
    { label: "Failed", value: data.failedCount, icon: ShieldAlert, color: "text-red-700", bg: "bg-red-50" },
  ];

  return (
    <div>
      <h1 className="text-lg font-semibold text-gray-900 mb-4">QA Dashboard</h1>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3 mb-6">
        {summaryCards.map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.label} className={`rounded-lg border border-gray-200 p-3 ${card.bg}`}>
              <div className="flex items-center justify-between mb-1">
                <Icon className={`w-4 h-4 ${card.color}`} />
              </div>
              <div className="text-2xl font-bold text-gray-900">{card.value}</div>
              <div className="text-xs text-gray-500 mt-0.5">{card.label}</div>
            </div>
          );
        })}
      </div>

      {/* Release Readiness Rings */}
      <div className="bg-white rounded-lg border border-gray-200 p-5 mb-6">
        <h2 className="text-sm font-semibold text-gray-700 mb-4">Release Readiness</h2>
        <div className="flex items-center justify-around">
          <div className="relative">
            <ProgressRing value={data.releaseReadiness} label="Overall" color="#10b981" />
          </div>
          <div className="relative">
            <ProgressRing value={data.beReadiness} label="Backend" color="#6366f1" />
          </div>
          <div className="relative">
            <ProgressRing value={data.feReadiness} label="Frontend" color="#a78bfa" />
          </div>
          <div className="border-l border-gray-200 pl-6 ml-2 space-y-2">
            <div className="text-sm">
              <span className="text-gray-500">Closed:</span>
              <span className="font-semibold text-gray-900 ml-1">{data.byOverallPhase.CLOSURE}</span>
              <span className="text-gray-400 ml-0.5">/ {data.total - (data.byOverallPhase.NA || 0)}</span>
            </div>
            <div className="text-sm">
              <span className="text-gray-500">In Progress:</span>
              <span className="font-semibold text-gray-900 ml-1">
                {data.byOverallPhase.EXECUTION + data.byOverallPhase.RETEST}
              </span>
            </div>
            <div className="text-sm">
              <span className="text-gray-500">Needs Attention:</span>
              <span className="font-semibold text-red-600 ml-1">
                {data.byOverallPhase.OUTCOME + data.blockedCount}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Phase Distribution + Pie */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">Modules by Overall Phase</h2>
          <ResponsiveContainer width="100%" height={230}>
            <BarChart data={phaseData}>
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                {phaseData.map((entry) => (
                  <Cell key={entry.phase} fill={CHART_COLORS[entry.phase]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">Phase Distribution</h2>
          {pieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={230}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={3}
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                  {pieData.map((entry, idx) => (
                    <Cell key={idx} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[230px] text-sm text-gray-400">No data</div>
          )}
        </div>
      </div>

      {/* BE vs FE Comparison */}
      <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
        <h2 className="text-sm font-semibold text-gray-700 mb-3">BE vs FE Phase Comparison</h2>
        <ResponsiveContainer width="100%" height={230}>
          <BarChart data={beFe}>
            <XAxis dataKey="name" tick={{ fontSize: 11 }} />
            <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
            <Tooltip />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Bar dataKey="BE" fill="#6366f1" radius={[4, 4, 0, 0]} />
            <Bar dataKey="FE" fill="#a78bfa" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Detailed Status Breakdown */}
      {statusBreakdown.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">Detailed Status Breakdown (BE vs FE)</h2>
          <ResponsiveContainer width="100%" height={Math.max(200, statusBreakdown.length * 32)}>
            <BarChart data={statusBreakdown} layout="vertical">
              <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
              <YAxis dataKey="name" type="category" tick={{ fontSize: 10 }} width={140} />
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="BE" fill="#6366f1" radius={[0, 4, 4, 0]} barSize={14} />
              <Bar dataKey="FE" fill="#a78bfa" radius={[0, 4, 4, 0]} barSize={14} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Owner-wise Phase Breakdown */}
      {ownerData.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">Owner-wise Phase Distribution</h2>
          <ResponsiveContainer width="100%" height={Math.max(180, ownerData.length * 45)}>
            <BarChart data={ownerData} layout="vertical">
              <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
              <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} width={100} />
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="PREPARATION" stackId="a" fill={CHART_COLORS.PREPARATION} />
              <Bar dataKey="EXECUTION" stackId="a" fill={CHART_COLORS.EXECUTION} />
              <Bar dataKey="OUTCOME" stackId="a" fill={CHART_COLORS.OUTCOME} />
              <Bar dataKey="RETEST" stackId="a" fill={CHART_COLORS.RETEST} />
              <Bar dataKey="CLOSURE" stackId="a" fill={CHART_COLORS.CLOSURE} radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Blocked Modules */}
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">
            Blocked Modules
            {data.blockedCount > 0 && (
              <span className="ml-2 text-xs px-1.5 py-0.5 bg-red-100 text-red-600 rounded-full">{data.blockedCount}</span>
            )}
          </h2>
          {data.blockedModules.length === 0 ? (
            <p className="text-sm text-gray-400">No blocked modules</p>
          ) : (
            <div className="space-y-2">
              {data.blockedModules.map((m) => (
                <div key={m.id} className="text-sm border-b border-gray-100 pb-2">
                  <div className="flex items-center justify-between">
                    <Link to={`/modules/${m.id}`} className="text-indigo-600 hover:text-indigo-800 font-medium">{m.name}</Link>
                    <span className="text-xs text-gray-400">{m.owner || "Unassigned"}</span>
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs px-1.5 py-0.5 bg-red-50 text-red-600 rounded font-medium">{m.side}</span>
                    {m.remarks && <span className="text-xs text-gray-500 truncate">{m.remarks}</span>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Failed Modules */}
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">
            Failed Modules
            {data.failedCount > 0 && (
              <span className="ml-2 text-xs px-1.5 py-0.5 bg-red-100 text-red-600 rounded-full">{data.failedCount}</span>
            )}
          </h2>
          {data.failedModules.length === 0 ? (
            <p className="text-sm text-gray-400">No failed modules</p>
          ) : (
            <div className="space-y-2">
              {data.failedModules.map((m) => (
                <div key={m.id} className="text-sm border-b border-gray-100 pb-2">
                  <div className="flex items-center justify-between">
                    <Link to={`/modules/${m.id}`} className="text-indigo-600 hover:text-indigo-800 font-medium">{m.name}</Link>
                    <span className="text-xs text-gray-400">{m.owner || "Unassigned"}</span>
                  </div>
                  <span className="text-xs px-1.5 py-0.5 bg-red-50 text-red-600 rounded font-medium">{m.side}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Ready for Sign-off */}
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">
            Ready for Sign-off
            {data.readyForSignoff.length > 0 && (
              <span className="ml-2 text-xs px-1.5 py-0.5 bg-emerald-100 text-emerald-600 rounded-full">{data.readyForSignoff.length}</span>
            )}
          </h2>
          {data.readyForSignoff.length === 0 ? (
            <p className="text-sm text-gray-400">No modules ready yet</p>
          ) : (
            <div className="space-y-2">
              {data.readyForSignoff.map((m) => (
                <div key={m.id} className="flex items-center justify-between text-sm border-b border-gray-100 pb-2">
                  <Link to={`/modules/${m.id}`} className="text-indigo-600 hover:text-indigo-800 font-medium">{m.name}</Link>
                  <span className="text-xs text-gray-400">{m.owner || "Unassigned"}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Owner-wise Pending */}
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">Owner-wise Pending Work</h2>
          {Object.keys(data.ownerPending).length === 0 ? (
            <p className="text-sm text-gray-400">All clear</p>
          ) : (
            <div className="space-y-2">
              {Object.entries(data.ownerPending)
                .sort(([, a], [, b]) => b - a)
                .map(([owner, count]) => (
                  <div key={owner} className="flex items-center justify-between text-sm">
                    <span className="text-gray-700">{owner}</span>
                    <div className="flex items-center gap-2">
                      <div className="w-24 h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-indigo-500 rounded-full transition-all"
                          style={{ width: `${Math.min(100, (count / data.total) * 100)}%` }}
                        />
                      </div>
                      <span className="text-xs px-2 py-0.5 bg-gray-100 rounded-full text-gray-600 font-medium w-8 text-center">
                        {count}
                      </span>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>

        {/* Stale Modules */}
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">
            Stale Modules
            <span className="ml-1 text-xs text-gray-400 font-normal">(unchanged 2+ days)</span>
            {data.agingModules.length > 0 && (
              <span className="ml-2 text-xs px-1.5 py-0.5 bg-amber-100 text-amber-600 rounded-full">{data.agingModules.length}</span>
            )}
          </h2>
          {data.agingModules.length === 0 ? (
            <p className="text-sm text-gray-400">All modules are active</p>
          ) : (
            <div className="space-y-2">
              {data.agingModules.map((m) => (
                <div key={m.id} className="flex items-center justify-between text-sm">
                  <Link to={`/modules/${m.id}`} className="text-indigo-600 hover:text-indigo-800 font-medium">{m.name}</Link>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-gray-400">{m.owner || "Unassigned"}</span>
                    <span className="text-xs px-1.5 py-0.5 bg-red-50 text-red-500 rounded font-medium">
                      {Math.floor((Date.now() - new Date(m.updatedAt).getTime()) / (1000 * 60 * 60 * 24))}d
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
