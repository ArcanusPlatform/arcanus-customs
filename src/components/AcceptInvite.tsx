import React, { useState, useEffect } from 'react';
import { Mail, Lock, User, CheckCircle } from 'lucide-react';

export default function AcceptInvite() {
  const [token, setToken] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3005';

  useEffect(() => {
    // Get token from URL
    const params = new URLSearchParams(window.location.search);
    const inviteToken = params.get('token');

    if (inviteToken) {
      setToken(inviteToken);
      // Optionally verify token and get email
      verifyToken(inviteToken);
    } else {
      setError('Invalid invitation link');
    }
  }, []);

  const verifyToken = async (inviteToken: string) => {
    // Optional: Add endpoint to verify token and get invitation details
    // For now, we'll just show the form
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validation
    if (!firstName || !lastName || !password) {
      setError('All fields are required');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`${API_URL}/auth/accept-invite`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          first_name: firstName,
          last_name: lastName,
          password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to accept invitation');
      }

      // Store token
      localStorage.setItem('auth_token', data.token);

      setSuccess(true);

      // Redirect to dashboard after 2 seconds
      setTimeout(() => {
        window.location.href = '/';
      }, 2000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0a0e27] via-[#1a1f3a] to-[#0a0e27] flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          <div className="bg-[#0f1629]/80 backdrop-blur-xl border border-[#a78bfa]/20 rounded-2xl p-8 text-center">
            <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-green-400" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">Welcome to the Team!</h2>
            <p className="text-gray-400 mb-4">Your account has been created successfully.</p>
            <p className="text-sm text-gray-500">Redirecting to dashboard...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a0e27] via-[#1a1f3a] to-[#0a0e27] flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-[#a78bfa]/20 rounded-full mb-4">
            <Mail className="w-8 h-8 text-[#a78bfa]" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Accept Invitation</h1>
          <p className="text-gray-400">Create your account to join the team</p>
        </div>

        {/* Form */}
        <div className="bg-[#0f1629]/80 backdrop-blur-xl border border-[#a78bfa]/20 rounded-2xl p-8 shadow-2xl">
          {error && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* First Name */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">First Name</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-[#1a2235] border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-[#a78bfa] transition-colors"
                  placeholder="John"
                  required
                />
              </div>
            </div>

            {/* Last Name */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Last Name</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-[#1a2235] border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-[#a78bfa] transition-colors"
                  placeholder="Doe"
                  required
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-[#1a2235] border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-[#a78bfa] transition-colors"
                  placeholder="••••••••"
                  required
                  minLength={8}
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">Minimum 8 characters</p>
            </div>

            {/* Confirm Password */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Confirm Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-[#1a2235] border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-[#a78bfa] transition-colors"
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-[#a78bfa] text-[#0a0e27] rounded-lg font-semibold hover:bg-[#c4b5fd] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Creating Account...' : 'Create Account'}
            </button>
          </form>

          {/* Footer */}
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-400">
              Already have an account?{' '}
              <a href="/login" className="text-[#a78bfa] hover:underline">
                Sign in
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
