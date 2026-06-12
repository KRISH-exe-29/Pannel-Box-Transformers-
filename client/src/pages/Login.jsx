import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ClipboardList, Mail, Lock, Loader2, Shield } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../components/ToastContext';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { signIn } = useAuth();
  const { addToast } = useToast();

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await signIn(email, password);
      addToast('success', 'Signed in successfully');
      navigate('/dashboard');
    } catch (err) {
      const msg = err.message || 'Failed to sign in';
      setError(msg);
      addToast('error', msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#0F172A] flex items-center justify-center p-4 relative">
      <Link
        to="/admin/login"
        className="absolute top-6 right-6 flex items-center gap-2 text-[#94A3B8] hover:text-[#F59E0B] transition-colors text-sm font-medium"
      >
        <Shield className="w-4 h-4" />
        Admin
      </Link>

      <div className="w-full max-w-md">
        <div className="bg-[#1E293B] border border-[#334155] rounded-xl p-8 shadow-2xl">
          <div className="flex flex-col items-center mb-8">
            <div className="p-3 bg-[#F59E0B]/10 rounded-xl mb-4">
              <ClipboardList className="w-12 h-12 text-[#F59E0B]" />
            </div>
            <h1 className="text-2xl font-bold text-[#F8FAFC]">RTCC Tracking System</h1>
            <p className="text-[#94A3B8] text-sm mt-1">
              Indo Tech Transformers Industries
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-[#94A3B8] mb-2">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#94A3B8]" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  required
                  className="input-field pl-11"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-[#94A3B8] mb-2">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#94A3B8]" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                  className="input-field pl-11"
                />
              </div>
            </div>

            {error && (
              <p className="text-red-400 text-sm text-center">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Signing In...
                </>
              ) : (
                'Sign In'
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
