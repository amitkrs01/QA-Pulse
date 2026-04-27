import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./hooks/useAuth";
import { ProjectProvider } from "./hooks/useProject";
import Layout from "./components/Layout";
import Login from "./pages/Login";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import ForceResetPassword from "./pages/ForceResetPassword";
import Tracker from "./pages/Tracker";
import Dashboard from "./pages/Dashboard";
import ModuleDetail from "./pages/ModuleDetail";
import UserManagement from "./pages/UserManagement";
import ProjectManagement from "./pages/ProjectManagement";
import AuditLog from "./pages/AuditLog";

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading, mustResetPassword } = useAuth();
  if (loading) return <div className="flex items-center justify-center h-screen text-gray-500">Loading...</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (mustResetPassword) return <Navigate to="/change-password" replace />;
  return <>{children}</>;
}

function AdminRoute({ children }: { children: React.ReactNode }) {
  const { isAdmin, loading } = useAuth();
  if (loading) return null;
  if (!isAdmin) return <Navigate to="/" replace />;
  return <>{children}</>;
}

function LoginRoute() {
  const { user, loading, mustResetPassword } = useAuth();
  if (loading) return null;
  if (user && mustResetPassword) return <Navigate to="/change-password" replace />;
  if (user) return <Navigate to="/" replace />;
  return <Login />;
}

function ChangePasswordRoute() {
  const { user, loading, mustResetPassword } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  if (!mustResetPassword) return <Navigate to="/" replace />;
  return <ForceResetPassword />;
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ProjectProvider>
          <Routes>
            <Route path="/login" element={<LoginRoute />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/change-password" element={<ChangePasswordRoute />} />
            <Route
              element={
                <ProtectedRoute>
                  <Layout />
                </ProtectedRoute>
              }
            >
              <Route path="/" element={<Tracker />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/modules/:id" element={<ModuleDetail />} />
              <Route
                path="/users"
                element={<AdminRoute><UserManagement /></AdminRoute>}
              />
              <Route
                path="/projects"
                element={<AdminRoute><ProjectManagement /></AdminRoute>}
              />
              <Route
                path="/audit"
                element={<AdminRoute><AuditLog /></AdminRoute>}
              />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </ProjectProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
