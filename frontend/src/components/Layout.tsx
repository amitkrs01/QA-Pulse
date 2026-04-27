import { Link, useLocation, Outlet } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { useProject } from "../hooks/useProject";
import { LayoutDashboard, Table2, Users, LogOut, Activity, FolderKanban, ShieldCheck, ChevronDown } from "lucide-react";

export default function Layout() {
  const { user, logout, isAdmin } = useAuth();
  const { projects, currentProject, switchProject } = useProject();
  const location = useLocation();

  const navItems = [
    { to: "/", label: "Tracker", icon: Table2 },
    { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    ...(isAdmin ? [
      { to: "/users", label: "Users", icon: Users },
      { to: "/projects", label: "Projects", icon: FolderKanban },
      { to: "/audit", label: "Audit", icon: ShieldCheck },
    ] : []),
  ];

  const isActive = (path: string) => {
    if (path === "/") return location.pathname === "/";
    return location.pathname.startsWith(path);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-14">
            <div className="flex items-center gap-4">
              <Link to="/" className="flex items-center gap-2">
                <Activity className="w-5 h-5 text-indigo-600" />
                <span className="font-semibold text-gray-900">QA Pulse</span>
              </Link>

              {projects.length > 0 && (
                <div className="relative">
                  <div className="flex items-center gap-1 px-2.5 py-1 rounded-md border border-gray-200 bg-gray-50 text-sm">
                    <span className="text-xs font-mono text-indigo-600 font-semibold">
                      {currentProject?.code || "—"}
                    </span>
                    <select
                      value={currentProject?.id || ""}
                      onChange={(e) => switchProject(e.target.value)}
                      className="absolute inset-0 opacity-0 cursor-pointer"
                    >
                      {projects.map((p) => (
                        <option key={p.id} value={p.id}>{p.code} — {p.name}</option>
                      ))}
                    </select>
                    <span className="text-gray-600 max-w-[120px] truncate">{currentProject?.name}</span>
                    <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
                  </div>
                </div>
              )}

              <nav className="flex items-center gap-1">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.to}
                      to={item.to}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                        isActive(item.to)
                          ? "bg-indigo-50 text-indigo-700"
                          : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      {item.label}
                    </Link>
                  );
                })}
              </nav>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-600">{user?.name}</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 font-medium">
                {user?.role}
              </span>
              <button
                onClick={logout}
                className="text-gray-400 hover:text-gray-600 transition-colors"
                title="Logout"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </header>
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {!currentProject && projects.length === 0 && isAdmin ? (
          <div className="text-center py-12">
            <FolderKanban className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <h2 className="text-lg font-semibold text-gray-700 mb-1">No Projects Yet</h2>
            <p className="text-sm text-gray-500 mb-4">Create a project to start tracking QA modules.</p>
            <Link
              to="/projects"
              className="inline-flex items-center gap-1.5 bg-indigo-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-indigo-700"
            >
              <FolderKanban className="w-4 h-4" /> Go to Projects
            </Link>
          </div>
        ) : !currentProject ? (
          <div className="text-center py-12">
            <p className="text-sm text-gray-500">You are not assigned to any projects. Contact your admin.</p>
          </div>
        ) : (
          <Outlet />
        )}
      </main>
    </div>
  );
}
