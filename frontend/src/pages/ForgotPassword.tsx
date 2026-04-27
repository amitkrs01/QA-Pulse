import { useState } from "react";
import { Link } from "react-router-dom";
import api from "../lib/api";
import { Activity } from "lucide-react";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post("/auth/forgot-password", { email });
    } catch {
      // don't reveal errors
    }
    setSent(true);
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-8">
          <div className="flex items-center gap-2 mb-2">
            <Activity className="w-8 h-8 text-indigo-600" />
            <h1 className="text-2xl font-bold text-gray-900">QA Pulse</h1>
          </div>
          <p className="text-sm text-gray-500">Reset your password</p>
        </div>

        {sent ? (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 text-center">
            <p className="text-sm text-gray-700 mb-4">
              If an account exists for <strong>{email}</strong>, a password reset link has been sent.
            </p>
            <Link to="/login" className="text-sm text-indigo-600 hover:text-indigo-800 font-medium">
              Back to Login
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500"
                placeholder="Enter your email"
                required
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-indigo-600 text-white py-2 rounded-md text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
            >
              {loading ? "Sending..." : "Send Reset Link"}
            </button>
            <div className="text-center">
              <Link to="/login" className="text-sm text-gray-500 hover:text-gray-700">Back to Login</Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
