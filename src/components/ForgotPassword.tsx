import { useState } from 'react';
import { Link } from 'react-router-dom';
import BrandingHeader from '@/components/auth/BrandingHeader';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      // TODO: Replace with actual API call
      await new Promise((resolve) => setTimeout(resolve, 1000));
      setIsSubmitted(true);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to send reset email. Please try again.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  if (isSubmitted) {
    return (
      <div className="authPage">
        <div className="authCard">
          <BrandingHeader />

          <h1 className="authTitle">Email Sent!</h1>
          <p className="authSubtitle">Check your inbox for the reset link</p>
          <p className="authPowered">Powered by Arcanus Assist</p>

          <div
            style={{
              background: 'rgba(34, 197, 94, 0.10)',
              border: '1px solid #22c55e',
              borderRadius: 8,
              padding: '12px 14px',
              margin: '16px 0 8px',
              color: '#22c55e',
              fontSize: 13,
              textAlign: 'center',
            }}
          >
            We sent a password reset link to:
            <div style={{ color: '#a78bfa', fontWeight: 600, marginTop: 6 }}>{email}</div>
          </div>

          <p className="authFooter">
            The link will expire in 24 hours. If you don't see it, check your spam folder.
          </p>

          <Link to="/login">
            <button className="authButton" style={{ marginTop: 12 }}>
              Back to Login
            </button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="authPage">
      <div className="authCard">
        <BrandingHeader />

        <h1 className="authTitle">Reset Password</h1>
        <p className="authSubtitle">Enter your email to receive a reset link</p>
        <p className="authPowered">Powered by Arcanus Assist</p>

        {error && (
          <div
            style={{
              background: 'rgba(239, 68, 68, 0.10)',
              border: '1px solid #ef4444',
              borderRadius: 8,
              padding: '10px 12px',
              margin: '10px 0 12px',
              color: '#ef4444',
              fontSize: 13,
              textAlign: 'center',
            }}
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <input
            type="email"
            className="authInput"
            placeholder="Email Address *"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
          />

          <button type="submit" className="authButton" disabled={isLoading}>
            {isLoading ? 'Sending Reset Link…' : 'Send Reset Link'}
          </button>
        </form>

        <p style={{ fontSize: '0.9rem', marginTop: '0.75rem', textAlign: 'center' }}>
          <Link to="/login" style={{ color: '#a78bfa' }}>
            ← Back to Login
          </Link>
        </p>
        <p style={{ fontSize: '0.9rem', marginTop: '0.5rem', textAlign: 'center' }}>
          Don't have an account?{' '}
          <Link to="/register" style={{ color: '#ffffff' }}>
            Sign up
          </Link>
        </p>

        <p className="authFooter">Secure password reset • Link expires in 24 hours</p>
      </div>
    </div>
  );
}
