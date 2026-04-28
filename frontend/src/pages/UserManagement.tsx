import { useState, useEffect } from "react";
import api from "../lib/api";
import type { User, Role, Project } from "../lib/types";
import { Plus, UserPlus, Mail, Search } from "lucide-react";
import Modal from "../components/Modal";

export default function UserManagement() {
  const [users, setUsers] = useState<User[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddSingle, setShowAddSingle] = useState(false);
  const [showAddBulk, setShowAddBulk] = useState(false);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("Welcome@123");
  const [role, setRole] = useState<Role>("MEMBER");
  const [selectedProjects, setSelectedProjects] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const [bulkText, setBulkText] = useState("");
  const [bulkProjectIds, setBulkProjectIds] = useState<string[]>([]);
  const [bulkResults, setBulkResults] = useState<Array<{ email: string; status: string; emailSent?: boolean; error?: string }>>([]);
  const [userSearch, setUserSearch] = useState("");

  const fetchData = async () => {
    const [usersRes, projectsRes] = await Promise.all([
      api.get("/users"),
      api.get("/projects"),
    ]);
    setUsers(usersRes.data);
    setProjects(projectsRes.data);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const toggleProject = (id: string, list: string[], setter: (v: string[]) => void) => {
    setter(list.includes(id) ? list.filter((p) => p !== id) : [...list, id]);
  };

  const handleAddSingle = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(""); setSuccessMsg("");
    try {
      const { data } = await api.post("/users", { name, email, password, role, projectIds: selectedProjects });
      setShowAddSingle(false);
      setName(""); setEmail(""); setPassword("Welcome@123"); setRole("MEMBER"); setSelectedProjects([]);
      setSuccessMsg(data.emailSent ? `User created. Welcome email sent to ${email}.` : `User created. Email delivery failed — share credentials manually.`);
      await fetchData();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error || "Failed";
      setError(msg);
    }
  };

  const handleBulkAdd = async () => {
    setError(""); setBulkResults([]);
    try {
      const lines = bulkText.trim().split("\n").filter(Boolean);
      const usersToAdd = lines.map((line) => {
        const parts = line.split(",").map((s) => s.trim());
        return {
          name: parts[0],
          email: parts[1],
          password: parts[2] || "Welcome@123",
          role: (parts[3] || "MEMBER").toUpperCase(),
        };
      });
      const { data } = await api.post("/users/bulk", { users: usersToAdd, projectIds: bulkProjectIds });
      setBulkResults(data.results);
      await fetchData();
    } catch {
      setError("Failed to process bulk add");
    }
  };

  const handleToggleActive = async (user: User) => {
    if (user.isActive) {
      await api.delete(`/users/${user.id}`);
    } else {
      await api.patch(`/users/${user.id}`, { role: user.role });
    }
    await fetchData();
  };

  const handleRoleChange = async (userId: string, newRole: Role) => {
    await api.patch(`/users/${userId}`, { role: newRole });
    await fetchData();
  };

  if (loading) return <div className="flex items-center justify-center h-64 text-gray-500">Loading...</div>;

  const ProjectCheckboxes = ({ selected, toggle }: { selected: string[]; toggle: (id: string) => void }) => (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">Assign to Projects</label>
      <div className="flex flex-wrap gap-2">
        {projects.map((p) => (
          <label key={p.id} className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-xs cursor-pointer transition-colors ${
            selected.includes(p.id) ? "bg-indigo-50 border-indigo-300 text-indigo-700" : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"
          }`}>
            <input
              type="checkbox"
              checked={selected.includes(p.id)}
              onChange={() => toggle(p.id)}
              className="sr-only"
            />
            <span className="font-mono font-semibold">{p.code}</span>
            <span>{p.name}</span>
          </label>
        ))}
        {projects.length === 0 && <span className="text-xs text-gray-400">No projects created yet</span>}
      </div>
    </div>
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-lg font-semibold text-gray-900">User Management</h1>
        <div className="flex gap-2">
          <button
            onClick={() => { setShowAddSingle(true); setShowAddBulk(false); setError(""); setSuccessMsg(""); }}
            className="flex items-center gap-1.5 bg-indigo-600 text-white px-3 py-1.5 rounded-md text-sm font-medium hover:bg-indigo-700"
          >
            <Plus className="w-4 h-4" /> Add User
          </button>
          <button
            onClick={() => { setShowAddBulk(true); setShowAddSingle(false); setError(""); setSuccessMsg(""); }}
            className="flex items-center gap-1.5 border border-indigo-600 text-indigo-600 px-3 py-1.5 rounded-md text-sm font-medium hover:bg-indigo-50"
          >
            <UserPlus className="w-4 h-4" /> Bulk Add
          </button>
        </div>
      </div>

      {successMsg && (
        <div className="flex items-center gap-2 text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-md px-3 py-2 mb-4">
          <Mail className="w-4 h-4" /> {successMsg}
        </div>
      )}

      {/* Search */}
      <div className="relative max-w-xs mb-4">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          placeholder="Search by name or email..."
          value={userSearch}
          onChange={(e) => setUserSearch(e.target.value)}
          className="w-full pl-8 pr-3 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
        />
      </div>

      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden mb-6">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="text-left px-3 py-2.5 font-medium text-gray-600">Name</th>
              <th className="text-left px-3 py-2.5 font-medium text-gray-600">Email</th>
              <th className="text-left px-3 py-2.5 font-medium text-gray-600">Role</th>
              <th className="text-left px-3 py-2.5 font-medium text-gray-600">Projects</th>
              <th className="text-left px-3 py-2.5 font-medium text-gray-600">Status</th>
              <th className="text-left px-3 py-2.5 font-medium text-gray-600">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {users.filter((u) => {
              if (!userSearch) return true;
              const q = userSearch.toLowerCase();
              return u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q);
            }).map((u) => (
              <tr key={u.id} className="hover:bg-gray-50">
                <td className="px-3 py-2.5 font-medium text-gray-900">{u.name}</td>
                <td className="px-3 py-2.5 text-gray-600">{u.email}</td>
                <td className="px-3 py-2.5">
                  <select
                    value={u.role}
                    onChange={(e) => handleRoleChange(u.id, e.target.value as Role)}
                    className="text-xs border border-gray-300 rounded px-1.5 py-0.5 bg-white"
                  >
                    <option value="ADMIN">ADMIN</option>
                    <option value="MEMBER">MEMBER</option>
                  </select>
                </td>
                <td className="px-3 py-2.5">
                  <div className="flex flex-wrap gap-1">
                    {u.projectMemberships?.map((pm) => (
                      <span key={pm.project.id} className="text-xs px-1.5 py-0.5 bg-indigo-50 text-indigo-600 rounded font-mono">
                        {pm.project.code}
                      </span>
                    ))}
                    {(!u.projectMemberships || u.projectMemberships.length === 0) && (
                      <span className="text-xs text-gray-400">None</span>
                    )}
                  </div>
                </td>
                <td className="px-3 py-2.5">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    u.isActive !== false ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-500"
                  }`}>
                    {u.isActive !== false ? "Active" : "Inactive"}
                  </span>
                </td>
                <td className="px-3 py-2.5">
                  <button
                    onClick={() => handleToggleActive(u)}
                    className={`text-xs ${u.isActive !== false ? "text-red-500 hover:text-red-700" : "text-green-600 hover:text-green-800"}`}
                  >
                    {u.isActive !== false ? "Deactivate" : "Reactivate"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal open={showAddSingle} onClose={() => setShowAddSingle(false)} title="Add User">
        <form onSubmit={handleAddSingle} className="space-y-3">
          {error && <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">{error}</div>}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500" required />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500" required />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input type="text" value={password} onChange={(e) => setPassword(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500" required />
            <p className="text-xs text-gray-400 mt-1">User will receive this password via email</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
            <select value={role} onChange={(e) => setRole(e.target.value as Role)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-indigo-500">
              <option value="MEMBER">Member</option>
              <option value="ADMIN">Admin</option>
            </select>
          </div>
          <ProjectCheckboxes selected={selectedProjects} toggle={(id) => toggleProject(id, selectedProjects, setSelectedProjects)} />
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setShowAddSingle(false)}
              className="px-3 py-1.5 text-sm text-gray-600 border border-gray-300 rounded-md">Cancel</button>
            <button type="submit"
              className="px-3 py-1.5 text-sm bg-indigo-600 text-white rounded-md hover:bg-indigo-700 font-medium">Add User</button>
          </div>
        </form>
      </Modal>

      <Modal open={showAddBulk} onClose={() => { setShowAddBulk(false); setBulkResults([]); }} title="Bulk Add Users" maxWidth="max-w-lg">
        <p className="text-xs text-gray-500 mb-3">
          One user per line: <code className="bg-gray-100 px-1 rounded">Name, Email, Password, Role</code>
          <br />Password defaults to <code className="bg-gray-100 px-1 rounded">Welcome@123</code>, Role defaults to <code className="bg-gray-100 px-1 rounded">MEMBER</code>
        </p>
        {error && <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2 mb-3">{error}</div>}
        <textarea
          value={bulkText}
          onChange={(e) => setBulkText(e.target.value)}
          className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm font-mono focus:ring-2 focus:ring-indigo-500"
          rows={6}
          placeholder={"John Doe, john@company.com, pass123, MEMBER\nJane Smith, jane@company.com, pass456, ADMIN"}
        />
        <div className="mt-3">
          <ProjectCheckboxes selected={bulkProjectIds} toggle={(id) => toggleProject(id, bulkProjectIds, setBulkProjectIds)} />
        </div>
        {bulkResults.length > 0 && (
          <div className="mt-3 space-y-1 max-h-40 overflow-y-auto">
            {bulkResults.map((r, i) => (
              <div key={i} className={`text-xs px-2 py-1 rounded flex items-center justify-between ${r.status === "created" ? "bg-green-50 text-green-700" : "bg-red-50 text-red-600"}`}>
                <span>{r.email}: {r.status}{r.error ? ` — ${r.error}` : ""}</span>
                {r.emailSent !== undefined && (
                  <span className={`ml-2 ${r.emailSent ? "text-green-600" : "text-amber-600"}`}>
                    {r.emailSent ? "email sent" : "email failed"}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
        <div className="flex justify-end gap-2 mt-4">
          <button onClick={() => { setShowAddBulk(false); setBulkResults([]); }}
            className="px-3 py-1.5 text-sm text-gray-600 border border-gray-300 rounded-md">Close</button>
          <button onClick={handleBulkAdd}
            className="px-3 py-1.5 text-sm bg-indigo-600 text-white rounded-md hover:bg-indigo-700 font-medium">
            Add Users
          </button>
        </div>
      </Modal>
    </div>
  );
}
