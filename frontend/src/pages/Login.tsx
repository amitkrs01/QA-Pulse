import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { Activity } from "lucide-react";

export default function Login() {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(email, password);
    } catch {
      setError("Invalid email or password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-8">
          <div className="flex items-center gap-2 mb-2">
            <Activity className="w-8 h-8 text-indigo-600" />
            <h1 className="text-2xl font-bold text-gray-900">QA Pulse</h1>
          </div>
          <p className="text-sm text-gray-500">BE/FE Lifecycle Tracking Tool</p>
        </div>
        <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 space-y-4">
          {error && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
              {error}
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="admin@qapulse.com"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="Enter password"
              required
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-indigo-600 text-white py-2 rounded-md text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors"
          >
            {loading ? "Signing in..." : "Sign in"}
          </button>
          <div className="text-center">
            <Link to="/forgot-password" className="text-xs text-gray-500 hover:text-indigo-600">Forgot password?</Link>
          </div>
        </form>
        <div className="mt-4 bg-white rounded-lg border border-dashed border-gray-300 p-4">
          <p className="text-xs font-medium text-gray-500 mb-2">Demo Credentials</p>
          <div className="space-y-1.5">
            {[
              { label: "Admin", email: "admin@qapulse.com", password: "admin123" },
              { label: "Member", email: "alice@qapulse.com", password: "pass123" },
            ].map((cred) => (
              <button
                key={cred.email}
                type="button"
                onClick={() => { setEmail(cred.email); setPassword(cred.password); }}
                className="w-full flex items-center justify-between text-left px-3 py-2 rounded-md bg-gray-50 hover:bg-indigo-50 hover:border-indigo-200 border border-gray-200 transition-colors group"
              >
                <div>
                  <span className="text-xs font-medium text-gray-700 group-hover:text-indigo-700">{cred.label}</span>
                  <span className="text-xs text-gray-400 ml-2">{cred.email}</span>
                </div>
                <span className="text-xs text-gray-400 group-hover:text-indigo-500">Use</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
