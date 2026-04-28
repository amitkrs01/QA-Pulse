import { useState, useEffect, useCallback, useMemo } from "react";
import { Link } from "react-router-dom";
import api from "../lib/api";
import type { Module, User, Phase, DetailedStatus } from "../lib/types";
import { PHASE_OPTIONS, PHASE_LABELS, STATUS_LABELS } from "../lib/constants";
import PhaseBadge from "../components/PhaseBadge";
import StatusDropdown from "../components/StatusDropdown";
import { useAuth } from "../hooks/useAuth";
import { Plus, Search, X, Download, ArrowUp, ArrowDown, ArrowUpDown } from "lucide-react";
import Modal from "../components/Modal";
import { useProject } from "../hooks/useProject";

type SortField = "name" | "bePhase" | "fePhase" | "owner" | "overallPhase" | "updatedAt";
type SortDir = "asc" | "desc";

const PHASE_ORDER: Record<Phase, number> = {
  PREPARATION: 0, EXECUTION: 1, OUTCOME: 2, RETEST: 3, CLOSURE: 4, NA: 5,
};

export default function Tracker() {
  const { isAdmin } = useAuth();
  const { currentProject } = useProject();
  const [modules, setModules] = useState<Module[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterPhase, setFilterPhase] = useState<Phase | "">("");
  const [filterOwner, setFilterOwner] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [newModuleName, setNewModuleName] = useState("");
  const [newModuleOwner, setNewModuleOwner] = useState("");
  const [addError, setAddError] = useState("");
  const [pageSize, setPageSize] = useState(25);
  const [currentPage, setCurrentPage] = useState(1);
  const [sortField, setSortField] = useState<SortField>("name");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  const fetchModules = useCallback(async () => {
    if (!currentProject) return;
    const params: Record<string, string> = {};
    if (search) params.search = search;
    if (filterPhase) params.overall_phase = filterPhase;
    if (filterOwner) params.owner = filterOwner;

    const { data } = await api.get(`/projects/${currentProject.id}/modules`, { params });
    setModules(data);
  }, [currentProject, search, filterPhase, filterOwner]);

  const fetchUsers = async () => {
    try {
      const { data } = await api.get("/users");
      setUsers(data);
    } catch {
      // non-admin users can't list users
    }
  };

  useEffect(() => {
    Promise.all([fetchModules(), fetchUsers()]).finally(() => setLoading(false));
  }, [fetchModules]);

  const handleStatusChange = async (
    moduleId: string,
    field: "beDetailedStatus" | "feDetailedStatus",
    value: DetailedStatus
  ) => {
    if (!currentProject) return;
    await api.patch(`/projects/${currentProject.id}/modules/${moduleId}`, { [field]: value });
    await fetchModules();
  };

  const handleOwnerChange = async (moduleId: string, ownerId: string) => {
    if (!currentProject) return;
    await api.patch(`/projects/${currentProject.id}/modules/${moduleId}`, { ownerId: ownerId || null });
    await fetchModules();
  };

  const handleAddModule = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddError("");
    try {
      await api.post(`/projects/${currentProject!.id}/modules`, {
        name: newModuleName,
        ownerId: newModuleOwner || null,
      });
      setShowAddModal(false);
      setNewModuleName("");
      setNewModuleOwner("");
      await fetchModules();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error || "Failed to add module";
      setAddError(msg);
    }
  };

  const sortedModules = useMemo(() => {
    const sorted = [...modules].sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case "name":
          cmp = a.name.localeCompare(b.name);
          break;
        case "bePhase":
          cmp = PHASE_ORDER[a.bePhase] - PHASE_ORDER[b.bePhase];
          break;
        case "fePhase":
          cmp = PHASE_ORDER[a.fePhase] - PHASE_ORDER[b.fePhase];
          break;
        case "overallPhase":
          cmp = PHASE_ORDER[a.overallPhase] - PHASE_ORDER[b.overallPhase];
          break;
        case "owner":
          cmp = (a.owner?.name || "zzz").localeCompare(b.owner?.name || "zzz");
          break;
        case "updatedAt":
          cmp = new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime();
          break;
      }
      return sortDir === "asc" ? cmp : -cmp;
    });
    return sorted;
  }, [modules, sortField, sortDir]);

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir("asc");
    }
    setCurrentPage(1);
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ArrowUpDown className="w-3 h-3 text-gray-300" />;
    return sortDir === "asc"
      ? <ArrowUp className="w-3 h-3 text-indigo-600" />
      : <ArrowDown className="w-3 h-3 text-indigo-600" />;
  };

  const exportCSV = () => {
    const headers = ["#", "Module", "BE Phase", "BE Status", "FE Phase", "FE Status", "Owner", "Overall Phase", "Remarks", "Updated"];
    const rows = sortedModules.map((m, i) => [
      i + 1,
      `"${m.name.replace(/"/g, '""')}"`,
      PHASE_LABELS[m.bePhase],
      STATUS_LABELS[m.beDetailedStatus],
      PHASE_LABELS[m.fePhase],
      STATUS_LABELS[m.feDetailedStatus],
      m.owner?.name || "Unassigned",
      PHASE_LABELS[m.overallPhase],
      `"${(m.remarks || "").replace(/"/g, '""')}"`,
      new Date(m.updatedAt).toLocaleDateString("en-IN"),
    ]);
    const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${currentProject?.code || "tracker"}-modules-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const formatDate = (d: string) => {
    const date = new Date(d);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
  };

  const isStale = (d: string) => {
    const diffMs = new Date().getTime() - new Date(d).getTime();
    return diffMs > 2 * 24 * 60 * 60 * 1000;
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64 text-gray-500">Loading...</div>;
  }

  const paged = sortedModules.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const totalPages = Math.ceil(sortedModules.length / pageSize);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-lg font-semibold text-gray-900">Module Tracker</h1>
        <div className="flex items-center gap-2">
          {modules.length > 0 && (
            <button
              onClick={exportCSV}
              className="flex items-center gap-1.5 border border-gray-300 text-gray-600 px-3 py-1.5 rounded-md text-sm font-medium hover:bg-gray-50 transition-colors"
            >
              <Download className="w-4 h-4" />
              Export CSV
            </button>
          )}
          {isAdmin && (
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-1.5 bg-indigo-600 text-white px-3 py-1.5 rounded-md text-sm font-medium hover:bg-indigo-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add Module
            </button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search modules..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
            className="w-full pl-8 pr-3 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          />
        </div>
        <select
          value={filterPhase}
          onChange={(e) => { setFilterPhase(e.target.value as Phase | ""); setCurrentPage(1); }}
          className="text-sm border border-gray-300 rounded-md px-2 py-1.5 bg-white focus:ring-2 focus:ring-indigo-500"
        >
          <option value="">All Phases</option>
          {PHASE_OPTIONS.map((p) => (
            <option key={p.value} value={p.value}>{p.label}</option>
          ))}
        </select>
        {users.length > 0 && (
          <select
            value={filterOwner}
            onChange={(e) => { setFilterOwner(e.target.value); setCurrentPage(1); }}
            className="text-sm border border-gray-300 rounded-md px-2 py-1.5 bg-white focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">All Owners</option>
            {users.filter(u => u.isActive !== false).map((u) => (
              <option key={u.id} value={u.id}>{u.name}</option>
            ))}
          </select>
        )}
        {(search || filterPhase || filterOwner) && (
          <button
            onClick={() => { setSearch(""); setFilterPhase(""); setFilterOwner(""); setCurrentPage(1); }}
            className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1"
          >
            <X className="w-3.5 h-3.5" /> Clear
          </button>
        )}
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-3 py-2.5 font-medium text-gray-600 w-8">#</th>
                <th className="text-left px-3 py-2.5 font-medium text-gray-600">
                  <button onClick={() => toggleSort("name")} className="flex items-center gap-1 hover:text-gray-900">
                    Module <SortIcon field="name" />
                  </button>
                </th>
                <th className="text-left px-3 py-2.5 font-medium text-gray-600">
                  <button onClick={() => toggleSort("bePhase")} className="flex items-center gap-1 hover:text-gray-900">
                    BE Phase <SortIcon field="bePhase" />
                  </button>
                </th>
                <th className="text-left px-3 py-2.5 font-medium text-gray-600 min-w-[180px]">BE Status</th>
                <th className="text-left px-3 py-2.5 font-medium text-gray-600">
                  <button onClick={() => toggleSort("fePhase")} className="flex items-center gap-1 hover:text-gray-900">
                    FE Phase <SortIcon field="fePhase" />
                  </button>
                </th>
                <th className="text-left px-3 py-2.5 font-medium text-gray-600 min-w-[180px]">FE Status</th>
                <th className="text-left px-3 py-2.5 font-medium text-gray-600">
                  <button onClick={() => toggleSort("owner")} className="flex items-center gap-1 hover:text-gray-900">
                    Owner <SortIcon field="owner" />
                  </button>
                </th>
                <th className="text-left px-3 py-2.5 font-medium text-gray-600">
                  <button onClick={() => toggleSort("overallPhase")} className="flex items-center gap-1 hover:text-gray-900">
                    Overall <SortIcon field="overallPhase" />
                  </button>
                </th>
                <th className="text-left px-3 py-2.5 font-medium text-gray-600">Remarks</th>
                <th className="text-left px-3 py-2.5 font-medium text-gray-600">
                  <button onClick={() => toggleSort("updatedAt")} className="flex items-center gap-1 hover:text-gray-900">
                    Updated <SortIcon field="updatedAt" />
                  </button>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {sortedModules.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-3 py-8 text-center text-gray-500">
                    {search || filterPhase || filterOwner ? "No modules match your filters" : "No modules yet. Add one to get started."}
                  </td>
                </tr>
              ) : (
                paged.map((m, idx) => (
                  <tr key={m.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-3 py-2.5 text-gray-400">{(currentPage - 1) * pageSize + idx + 1}</td>
                    <td className="px-3 py-2.5">
                      <Link to={`/modules/${m.id}`} className="text-indigo-600 hover:text-indigo-800 font-medium">
                        {m.name}
                      </Link>
                    </td>
                    <td className="px-3 py-2.5"><PhaseBadge phase={m.bePhase} /></td>
                    <td className="px-3 py-2.5">
                      <StatusDropdown
                        value={m.beDetailedStatus}
                        onChange={(v) => handleStatusChange(m.id, "beDetailedStatus", v)}
                      />
                    </td>
                    <td className="px-3 py-2.5"><PhaseBadge phase={m.fePhase} /></td>
                    <td className="px-3 py-2.5">
                      <StatusDropdown
                        value={m.feDetailedStatus}
                        onChange={(v) => handleStatusChange(m.id, "feDetailedStatus", v)}
                      />
                    </td>
                    <td className="px-3 py-2.5">
                      {users.length > 0 ? (
                        <select
                          value={m.owner?.id || ""}
                          onChange={(e) => handleOwnerChange(m.id, e.target.value)}
                          className="text-xs border border-gray-200 rounded px-1.5 py-1 bg-white hover:border-gray-300 focus:ring-2 focus:ring-indigo-500 max-w-[120px]"
                        >
                          <option value="">Unassigned</option>
                          {users.filter(u => u.isActive !== false).map((u) => (
                            <option key={u.id} value={u.id}>{u.name}</option>
                          ))}
                        </select>
                      ) : (
                        <span className="text-gray-700">{m.owner?.name || <span className="text-gray-400">—</span>}</span>
                      )}
                    </td>
                    <td className="px-3 py-2.5"><PhaseBadge phase={m.overallPhase} /></td>
                    <td className="px-3 py-2.5 text-gray-600 max-w-[200px] truncate" title={m.remarks || ""}>
                      {m.remarks || <span className="text-gray-300">—</span>}
                    </td>
                    <td className={`px-3 py-2.5 text-xs ${isStale(m.updatedAt) ? "text-red-500 font-medium" : "text-gray-500"}`}>
                      {formatDate(m.updatedAt)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between mt-3">
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <span>Show</span>
          <select
            value={pageSize}
            onChange={(e) => { setPageSize(Number(e.target.value)); setCurrentPage(1); }}
            className="border border-gray-300 rounded px-1.5 py-1 bg-white text-xs focus:ring-2 focus:ring-indigo-500"
          >
            {[10, 25, 50, 100].map((n) => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
          <span>per page</span>
          <span className="text-gray-400 ml-2">
            {sortedModules.length > 0
              ? `${(currentPage - 1) * pageSize + 1}–${Math.min(currentPage * pageSize, sortedModules.length)} of ${sortedModules.length}`
              : "0 modules"}
          </span>
        </div>
        {totalPages > 1 && (
          <div className="flex items-center gap-1">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-2.5 py-1 text-xs border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter((p) => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
              .reduce<(number | string)[]>((acc, p, i, arr) => {
                if (i > 0 && p - (arr[i - 1] as number) > 1) acc.push("...");
                acc.push(p);
                return acc;
              }, [])
              .map((p, i) =>
                typeof p === "string" ? (
                  <span key={`ellipsis-${i}`} className="px-1 text-xs text-gray-400">...</span>
                ) : (
                  <button
                    key={p}
                    onClick={() => setCurrentPage(p)}
                    className={`px-2.5 py-1 text-xs border rounded-md ${
                      currentPage === p
                        ? "bg-indigo-600 text-white border-indigo-600"
                        : "border-gray-300 hover:bg-gray-50"
                    }`}
                  >
                    {p}
                  </button>
                )
              )}
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage >= totalPages}
              className="px-2.5 py-1 text-xs border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        )}
      </div>

      <Modal open={showAddModal} onClose={() => { setShowAddModal(false); setAddError(""); }} title="Add Module">
        <form onSubmit={handleAddModule} className="space-y-3">
          {addError && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">{addError}</div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Module Name</label>
            <input
              type="text"
              value={newModuleName}
              onChange={(e) => setNewModuleName(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500"
              placeholder="e.g., User Authentication"
              required
            />
          </div>
          {users.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Owner (optional)</label>
              <select
                value={newModuleOwner}
                onChange={(e) => setNewModuleOwner(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">Unassigned</option>
                {users.filter(u => u.isActive !== false).map((u) => (
                  <option key={u.id} value={u.id}>{u.name}</option>
                ))}
              </select>
            </div>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => { setShowAddModal(false); setAddError(""); }}
              className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800 border border-gray-300 rounded-md"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-3 py-1.5 text-sm bg-indigo-600 text-white rounded-md hover:bg-indigo-700 font-medium"
            >
              Add Module
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
