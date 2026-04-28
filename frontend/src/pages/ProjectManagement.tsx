import { useState, useEffect } from "react";
import api from "../lib/api";
import type { Project, User } from "../lib/types";
import Modal from "../components/Modal";
import { useProject } from "../hooks/useProject";
import { Plus, UserPlus, UserMinus, Search } from "lucide-react";

export default function ProjectManagement() {
  const { refreshProjects } = useProject();
  const [projects, setProjects] = useState<Project[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showMembersModal, setShowMembersModal] = useState<string | null>(null);
  const [members, setMembers] = useState<Array<{ id: string; name: string; email: string; projectRole: string; membershipId: string }>>([]);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [addUserId, setAddUserId] = useState("");
  const [projectSearch, setProjectSearch] = useState("");

  const fetchProjects = async () => {
    const { data } = await api.get("/projects");
    setProjects(data);
  };

  const fetchUsers = async () => {
    const { data } = await api.get("/users");
    setUsers(data);
  };

  useEffect(() => {
    Promise.all([fetchProjects(), fetchUsers()]).finally(() => setLoading(false));
  }, []);

  const handleAddProject = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      await api.post("/projects", { name, code });
      setShowAddModal(false);
      setName(""); setCode("");
      await fetchProjects();
      await refreshProjects();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error || "Failed";
      setError(msg);
    }
  };

  const openMembers = async (projectId: string) => {
    setShowMembersModal(projectId);
    const { data } = await api.get(`/projects/${projectId}/members`);
    setMembers(data);
  };

  const addMember = async () => {
    if (!addUserId || !showMembersModal) return;
    try {
      await api.post(`/projects/${showMembersModal}/members`, { userId: addUserId, role: "MEMBER" });
      setAddUserId("");
      const { data } = await api.get(`/projects/${showMembersModal}/members`);
      setMembers(data);
      await refreshProjects();
    } catch {
      // user may already be a member
    }
  };

  const removeMember = async (userId: string) => {
    if (!showMembersModal) return;
    await api.delete(`/projects/${showMembersModal}/members/${userId}`);
    const { data } = await api.get(`/projects/${showMembersModal}/members`);
    setMembers(data);
    await refreshProjects();
  };

  if (loading) return <div className="flex items-center justify-center h-64 text-gray-500">Loading...</div>;

  const currentProjectName = projects.find((p) => p.id === showMembersModal)?.name;
  const memberUserIds = new Set(members.map((m) => m.id));
  const nonMembers = users.filter((u) => !memberUserIds.has(u.id) && u.isActive !== false);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-lg font-semibold text-gray-900">Projects</h1>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-1.5 bg-indigo-600 text-white px-3 py-1.5 rounded-md text-sm font-medium hover:bg-indigo-700"
        >
          <Plus className="w-4 h-4" /> New Project
        </button>
      </div>

      {/* Search */}
      <div className="relative max-w-xs mb-4">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          placeholder="Search by name or code..."
          value={projectSearch}
          onChange={(e) => setProjectSearch(e.target.value)}
          className="w-full pl-8 pr-3 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
        />
      </div>

      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="text-left px-3 py-2.5 font-medium text-gray-600">Code</th>
              <th className="text-left px-3 py-2.5 font-medium text-gray-600">Name</th>
              <th className="text-left px-3 py-2.5 font-medium text-gray-600">Modules</th>
              <th className="text-left px-3 py-2.5 font-medium text-gray-600">Members</th>
              <th className="text-left px-3 py-2.5 font-medium text-gray-600">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {projects.filter((p) => {
              if (!projectSearch) return true;
              const q = projectSearch.toLowerCase();
              return p.name.toLowerCase().includes(q) || p.code.toLowerCase().includes(q);
            }).map((p) => (
              <tr key={p.id} className="hover:bg-gray-50">
                <td className="px-3 py-2.5 font-mono text-indigo-600 font-semibold">{p.code}</td>
                <td className="px-3 py-2.5 font-medium text-gray-900">{p.name}</td>
                <td className="px-3 py-2.5 text-gray-600">{p._count?.modules ?? 0}</td>
                <td className="px-3 py-2.5 text-gray-600">{p._count?.members ?? 0}</td>
                <td className="px-3 py-2.5">
                  <button
                    onClick={() => openMembers(p.id)}
                    className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
                  >
                    Manage Members
                  </button>
                </td>
              </tr>
            ))}
            {projects.length === 0 && (
              <tr>
                <td colSpan={5} className="px-3 py-8 text-center text-gray-500">
                  No projects yet. Create one to get started.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <Modal open={showAddModal} onClose={() => { setShowAddModal(false); setError(""); }} title="New Project">
        <form onSubmit={handleAddProject} className="space-y-3">
          {error && <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">{error}</div>}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Project Name</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500"
              placeholder="e.g., Trade Finance" required />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Code</label>
            <input type="text" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm font-mono focus:ring-2 focus:ring-indigo-500"
              placeholder="e.g., TF" maxLength={10} required />
            <p className="text-xs text-gray-400 mt-1">Short identifier shown in the project switcher</p>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setShowAddModal(false)}
              className="px-3 py-1.5 text-sm text-gray-600 border border-gray-300 rounded-md">Cancel</button>
            <button type="submit"
              className="px-3 py-1.5 text-sm bg-indigo-600 text-white rounded-md hover:bg-indigo-700 font-medium">Create</button>
          </div>
        </form>
      </Modal>

      <Modal
        open={!!showMembersModal}
        onClose={() => { setShowMembersModal(null); setMembers([]); setAddUserId(""); }}
        title={`Members — ${currentProjectName || ""}`}
        maxWidth="max-w-lg"
      >
        <div className="space-y-3">
          <div className="flex gap-2">
            <select
              value={addUserId}
              onChange={(e) => setAddUserId(e.target.value)}
              className="flex-1 text-sm border border-gray-300 rounded-md px-2 py-1.5 bg-white focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">Select user to add...</option>
              {nonMembers.map((u) => (
                <option key={u.id} value={u.id}>{u.name} ({u.email})</option>
              ))}
            </select>
            <button
              onClick={addMember}
              disabled={!addUserId}
              className="flex items-center gap-1 px-3 py-1.5 text-sm bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50"
            >
              <UserPlus className="w-3.5 h-3.5" /> Add
            </button>
          </div>
          <div className="divide-y divide-gray-100">
            {members.map((m) => (
              <div key={m.id} className="flex items-center justify-between py-2">
                <div>
                  <span className="text-sm font-medium text-gray-900">{m.name}</span>
                  <span className="text-xs text-gray-400 ml-2">{m.email}</span>
                  <span className="text-xs px-1.5 py-0.5 bg-gray-100 text-gray-500 rounded ml-2">{m.projectRole}</span>
                </div>
                <button
                  onClick={() => removeMember(m.id)}
                  className="text-red-400 hover:text-red-600"
                  title="Remove from project"
                >
                  <UserMinus className="w-4 h-4" />
                </button>
              </div>
            ))}
            {members.length === 0 && (
              <p className="text-sm text-gray-400 py-3">No members yet</p>
            )}
          </div>
        </div>
      </Modal>
    </div>
  );
}
