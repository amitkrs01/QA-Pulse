import { useState } from "react";
import api from "../lib/api";
import { useAuth } from "../hooks/useAuth";
import { Activity, ShieldAlert } from "lucide-react";

export default function ForceResetPassword() {
  const { user, clearMustReset, logout } = useAuth();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (newPassword.length < 6) {
      setError("New password must be at least 6 characters");
      return;
    }
    if (newPassword !== confirm) {
      setError("Passwords do not match");
      return;
    }
    if (currentPassword === newPassword) {
      setError("New password must be different from current password");
      return;
    }

    setLoading(true);
    try {
      const { data } = await api.post("/auth/change-password", { currentPassword, newPassword });
      clearMustReset(data.user);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error || "Failed to change password";
      setError(msg);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-6">
          <div className="flex items-center gap-2 mb-2">
            <Activity className="w-8 h-8 text-indigo-600" />
            <h1 className="text-2xl font-bold text-gray-900">QA Pulse</h1>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-4 text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
            <ShieldAlert className="w-5 h-5 flex-shrink-0" />
            <p className="text-sm">You must set a new password before continuing.</p>
          </div>

          <p className="text-xs text-gray-500 mb-4">
            Logged in as <strong>{user?.email}</strong>
          </p>

          <form onSubmit={handleSubmit} className="space-y-3">
            {error && (
              <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">{error}</div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Current Password</label>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500"
                placeholder="The password you received via email"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Confirm New Password</label>
              <input
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500"
                required
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-indigo-600 text-white py-2 rounded-md text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
            >
              {loading ? "Changing..." : "Set New Password"}
            </button>
          </form>

          <div className="mt-4 text-center">
            <button onClick={logout} className="text-xs text-gray-500 hover:text-gray-700">
              Sign out
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
