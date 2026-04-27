import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../lib/api";
import type { ModuleDetail as ModuleDetailType, User, DetailedStatus } from "../lib/types";
import { STATUS_LABELS, FIELD_LABELS } from "../lib/constants";
import PhaseBadge from "../components/PhaseBadge";
import StatusDropdown from "../components/StatusDropdown";
import { useAuth } from "../hooks/useAuth";
import { useProject } from "../hooks/useProject";
import { ArrowLeft, Trash2 } from "lucide-react";

export default function ModuleDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const { currentProject } = useProject();
  const [module, setModule] = useState<ModuleDetailType | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [remarks, setRemarks] = useState("");
  const [editingRemarks, setEditingRemarks] = useState(false);
  const [saving, setSaving] = useState(false);

  const basePath = currentProject ? `/projects/${currentProject.id}/modules` : "/modules";

  const fetchModule = async () => {
    const { data } = await api.get(`${basePath}/${id}`);
    setModule(data);
    setRemarks(data.remarks || "");
  };

  useEffect(() => {
    Promise.all([
      fetchModule(),
      api.get("/users").then((r) => setUsers(r.data)).catch(() => {}),
    ]).finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, currentProject]);

  const handleStatusChange = async (field: "beDetailedStatus" | "feDetailedStatus", value: DetailedStatus) => {
    setSaving(true);
    await api.patch(`${basePath}/${id}`, { [field]: value });
    await fetchModule();
    setSaving(false);
  };

  const handleOwnerChange = async (ownerId: string) => {
    setSaving(true);
    await api.patch(`${basePath}/${id}`, { ownerId: ownerId || null });
    await fetchModule();
    setSaving(false);
  };

  const handleRemarksSave = async () => {
    setSaving(true);
    await api.patch(`${basePath}/${id}`, { remarks });
    await fetchModule();
    setEditingRemarks(false);
    setSaving(false);
  };

  const handleDelete = async () => {
    if (!confirm("Delete this module? This cannot be undone.")) return;
    await api.delete(`${basePath}/${id}`);
    navigate("/");
  };

  const formatActivityValue = (field: string, value: string | null): string => {
    if (!value) return "—";
    if (field === "be_detailed_status" || field === "fe_detailed_status") {
      return STATUS_LABELS[value as DetailedStatus] || value;
    }
    return value;
  };

  const formatTimestamp = (d: string) => {
    return new Date(d).toLocaleString("en-IN", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (loading || !module) {
    return <div className="flex items-center justify-center h-64 text-gray-500">Loading...</div>;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate("/")} className="text-gray-400 hover:text-gray-600">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-lg font-semibold text-gray-900">{module.name}</h1>
          <PhaseBadge phase={module.overallPhase} />
        </div>
        {isAdmin && (
          <button
            onClick={handleDelete}
            className="text-red-400 hover:text-red-600 transition-colors"
            title="Delete module"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>

      {saving && (
        <div className="mb-3 text-xs text-indigo-600">Saving...</div>
      )}

      {/* Status Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        {/* BE Section */}
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">Backend QA</h2>
          <div className="space-y-3">
            <div>
              <label className="text-xs text-gray-500 block mb-1">Phase</label>
              <PhaseBadge phase={module.bePhase} />
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-1">Detailed Status</label>
              <StatusDropdown
                value={module.beDetailedStatus}
                onChange={(v) => handleStatusChange("beDetailedStatus", v)}
              />
            </div>
          </div>
        </div>

        {/* FE Section */}
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">Frontend QA</h2>
          <div className="space-y-3">
            <div>
              <label className="text-xs text-gray-500 block mb-1">Phase</label>
              <PhaseBadge phase={module.fePhase} />
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-1">Detailed Status</label>
              <StatusDropdown
                value={module.feDetailedStatus}
                onChange={(v) => handleStatusChange("feDetailedStatus", v)}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Meta */}
      <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="text-xs text-gray-500 block mb-1">Owner</label>
            {isAdmin && users.length > 0 ? (
              <select
                value={module.ownerId || ""}
                onChange={(e) => handleOwnerChange(e.target.value)}
                className="w-full text-sm border border-gray-300 rounded-md px-2 py-1.5 bg-white focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">Unassigned</option>
                {users.filter(u => u.isActive !== false).map((u) => (
                  <option key={u.id} value={u.id}>{u.name}</option>
                ))}
              </select>
            ) : (
              <span className="text-sm text-gray-700">{module.owner?.name || "Unassigned"}</span>
            )}
          </div>
          <div>
            <label className="text-xs text-gray-500 block mb-1">Overall Phase</label>
            <PhaseBadge phase={module.overallPhase} />
          </div>
          <div>
            <label className="text-xs text-gray-500 block mb-1">Last Updated</label>
            <span className="text-sm text-gray-700">{formatTimestamp(module.updatedAt)}</span>
          </div>
        </div>

        <div className="mt-4">
          <label className="text-xs text-gray-500 block mb-1">Remarks</label>
          {editingRemarks ? (
            <div className="flex gap-2">
              <textarea
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                className="flex-1 text-sm border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-indigo-500"
                rows={2}
              />
              <div className="flex flex-col gap-1">
                <button
                  onClick={handleRemarksSave}
                  className="px-3 py-1 text-xs bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
                >
                  Save
                </button>
                <button
                  onClick={() => { setEditingRemarks(false); setRemarks(module.remarks || ""); }}
                  className="px-3 py-1 text-xs text-gray-600 border border-gray-300 rounded-md"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div
              onClick={() => setEditingRemarks(true)}
              className="text-sm text-gray-700 cursor-pointer hover:bg-gray-50 rounded px-2 py-1 -mx-2 min-h-[2rem] flex items-center"
            >
              {module.remarks || <span className="text-gray-400">Click to add remarks...</span>}
            </div>
          )}
        </div>
      </div>

      {/* Activity Log */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <h2 className="text-sm font-semibold text-gray-700 mb-3">Activity Log</h2>
        {module.activityLogs.length === 0 ? (
          <p className="text-sm text-gray-400">No activity yet</p>
        ) : (
          <div className="space-y-3">
            {module.activityLogs.map((log) => (
              <div key={log.id} className="flex items-start gap-3 text-sm border-b border-gray-50 pb-2">
                <div className="w-2 h-2 rounded-full bg-indigo-400 mt-1.5 shrink-0" />
                <div className="flex-1">
                  <span className="font-medium text-gray-700">{log.user.name}</span>
                  <span className="text-gray-500">
                    {" "}changed{" "}
                    <span className="font-medium">{FIELD_LABELS[log.fieldChanged] || log.fieldChanged}</span>
                    {log.fieldChanged !== "created" && (
                      <>
                        {" "}from{" "}
                        <span className="text-gray-600">{formatActivityValue(log.fieldChanged, log.oldValue)}</span>
                        {" "}to{" "}
                      </>
                    )}
                    {log.fieldChanged === "created" ? (
                      <>{" "}<span className="text-gray-600">{log.newValue}</span></>
                    ) : (
                      <span className="text-gray-600">{formatActivityValue(log.fieldChanged, log.newValue)}</span>
                    )}
                  </span>
                  <div className="text-xs text-gray-400 mt-0.5">{formatTimestamp(log.createdAt)}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
