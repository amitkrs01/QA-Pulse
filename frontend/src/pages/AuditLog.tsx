import { useState, useEffect } from "react";
import api from "../lib/api";
import type { AuditLogEntry, Project } from "../lib/types";

export default function AuditLog() {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterProject, setFilterProject] = useState("");
  const [filterEntity, setFilterEntity] = useState("");
  const [page, setPage] = useState(0);
  const limit = 30;

  const fetchLogs = async () => {
    setLoading(true);
    const params: Record<string, string | number> = { limit, offset: page * limit };
    if (filterProject) params.project = filterProject;
    if (filterEntity) params.entity = filterEntity;

    const { data } = await api.get("/audit-logs", { params });
    setLogs(data.logs);
    setTotal(data.total);
    setLoading(false);
  };

  const fetchProjects = async () => {
    const { data } = await api.get("/projects");
    setProjects(data);
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  useEffect(() => {
    fetchLogs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, filterProject, filterEntity]);

  const formatTime = (d: string) =>
    new Date(d).toLocaleString("en-IN", {
      day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
    });

  const actionLabel = (action: string) => {
    const parts = action.split(".");
    return parts.map((p) => p.charAt(0).toUpperCase() + p.slice(1)).join(" > ");
  };

  return (
    <div>
      <h1 className="text-lg font-semibold text-gray-900 mb-4">Audit Log</h1>

      <div className="flex flex-wrap items-center gap-3 mb-4">
        <select
          value={filterProject}
          onChange={(e) => { setFilterProject(e.target.value); setPage(0); }}
          className="text-sm border border-gray-300 rounded-md px-2 py-1.5 bg-white focus:ring-2 focus:ring-indigo-500"
        >
          <option value="">All Projects</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>{p.code} — {p.name}</option>
          ))}
        </select>
        <select
          value={filterEntity}
          onChange={(e) => { setFilterEntity(e.target.value); setPage(0); }}
          className="text-sm border border-gray-300 rounded-md px-2 py-1.5 bg-white focus:ring-2 focus:ring-indigo-500"
        >
          <option value="">All Entities</option>
          <option value="user">User</option>
          <option value="project">Project</option>
          <option value="module">Module</option>
        </select>
        <span className="text-xs text-gray-400">{total} entries</span>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-3 py-2.5 font-medium text-gray-600">Time</th>
                <th className="text-left px-3 py-2.5 font-medium text-gray-600">User</th>
                <th className="text-left px-3 py-2.5 font-medium text-gray-600">Action</th>
                <th className="text-left px-3 py-2.5 font-medium text-gray-600">Entity</th>
                <th className="text-left px-3 py-2.5 font-medium text-gray-600">Project</th>
                <th className="text-left px-3 py-2.5 font-medium text-gray-600">Details</th>
                <th className="text-left px-3 py-2.5 font-medium text-gray-600">IP</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr><td colSpan={7} className="px-3 py-8 text-center text-gray-500">Loading...</td></tr>
              ) : logs.length === 0 ? (
                <tr><td colSpan={7} className="px-3 py-8 text-center text-gray-500">No audit entries</td></tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50">
                    <td className="px-3 py-2 text-xs text-gray-500 whitespace-nowrap">{formatTime(log.createdAt)}</td>
                    <td className="px-3 py-2 text-gray-700">{log.user.name}</td>
                    <td className="px-3 py-2">
                      <span className="text-xs px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded-full font-medium">
                        {actionLabel(log.action)}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-gray-600 capitalize">{log.entity}</td>
                    <td className="px-3 py-2 text-xs font-mono text-gray-500">
                      {log.project?.code || "—"}
                    </td>
                    <td className="px-3 py-2 text-xs text-gray-500 max-w-[250px] truncate">
                      {log.details ? JSON.stringify(log.details) : "—"}
                    </td>
                    <td className="px-3 py-2 text-xs text-gray-400 font-mono">{log.ipAddress || "—"}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {total > limit && (
        <div className="flex items-center justify-between mt-3">
          <button
            onClick={() => setPage(Math.max(0, page - 1))}
            disabled={page === 0}
            className="text-sm text-gray-600 hover:text-gray-800 disabled:text-gray-300"
          >
            Previous
          </button>
          <span className="text-xs text-gray-400">
            Page {page + 1} of {Math.ceil(total / limit)}
          </span>
          <button
            onClick={() => setPage(page + 1)}
            disabled={(page + 1) * limit >= total}
            className="text-sm text-gray-600 hover:text-gray-800 disabled:text-gray-300"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
