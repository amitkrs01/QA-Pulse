import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import api from "../lib/api";
import type { Module, User, Phase, DetailedStatus } from "../lib/types";
import { PHASE_OPTIONS, STATUS_LABELS } from "../lib/constants";
import PhaseBadge from "../components/PhaseBadge";
import StatusDropdown from "../components/StatusDropdown";
import { useAuth } from "../hooks/useAuth";
import { Plus, Search, X } from "lucide-react";
import Modal from "../components/Modal";
import { useProject } from "../hooks/useProject";

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
      // non-admin users can't list users; that's fine
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

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-lg font-semibold text-gray-900">Module Tracker</h1>
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

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search modules..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          />
        </div>
        <select
          value={filterPhase}
          onChange={(e) => setFilterPhase(e.target.value as Phase | "")}
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
            onChange={(e) => setFilterOwner(e.target.value)}
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
            onClick={() => { setSearch(""); setFilterPhase(""); setFilterOwner(""); }}
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
                <th className="text-left px-3 py-2.5 font-medium text-gray-600">Module</th>
                <th className="text-left px-3 py-2.5 font-medium text-gray-600">BE Phase</th>
                <th className="text-left px-3 py-2.5 font-medium text-gray-600 min-w-[180px]">BE Status</th>
                <th className="text-left px-3 py-2.5 font-medium text-gray-600">FE Phase</th>
                <th className="text-left px-3 py-2.5 font-medium text-gray-600 min-w-[180px]">FE Status</th>
                <th className="text-left px-3 py-2.5 font-medium text-gray-600">Owner</th>
                <th className="text-left px-3 py-2.5 font-medium text-gray-600">Overall</th>
                <th className="text-left px-3 py-2.5 font-medium text-gray-600">Remarks</th>
                <th className="text-left px-3 py-2.5 font-medium text-gray-600">Updated</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {modules.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-3 py-8 text-center text-gray-500">
                    {search || filterPhase || filterOwner ? "No modules match your filters" : "No modules yet. Add one to get started."}
                  </td>
                </tr>
              ) : (
                modules.map((m, idx) => (
                  <tr key={m.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-3 py-2.5 text-gray-400">{idx + 1}</td>
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
                    <td className="px-3 py-2.5 text-gray-700">{m.owner?.name || <span className="text-gray-400">—</span>}</td>
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

      <div className="mt-2 text-xs text-gray-400">
        {modules.length} module{modules.length !== 1 ? "s" : ""}
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
