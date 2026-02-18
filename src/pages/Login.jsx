import { useState, useCallback } from 'react';
import { Users, LogIn, UserPlus, AlertCircle } from 'lucide-react';
import { useAuth } from '../data/AuthContext';

export default function Login() {
  const { login, register, error, clearError, authEnabled } = useAuth();
  const [mode, setMode] = useState('login'); // 'login' or 'register'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [localError, setLocalError] = useState('');

  const switchMode = useCallback((newMode) => {
    setMode(newMode);
    setLocalError('');
    clearError();
  }, [clearError]);

  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();
    setLocalError('');
    clearError();

    if (!email.trim() || !password.trim()) {
      setLocalError('Email and password are required.');
      return;
    }

    if (mode === 'register' && password !== confirmPassword) {
      setLocalError('Passwords do not match.');
      return;
    }

    if (mode === 'register' && password.length < 6) {
      setLocalError('Password must be at least 6 characters.');
      return;
    }

    setSubmitting(true);
    try {
      if (mode === 'login') {
        await login(email, password);
      } else {
        await register(email, password);
      }
    } catch {
      // Error is set in AuthContext
    } finally {
      setSubmitting(false);
    }
  }, [email, password, confirmPassword, mode, login, register, clearError]);

  const displayError = localError || error;

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-card__header">
          <Users size={32} className="login-card__logo" />
          <h1>No Poor Africa</h1>
          <p className="login-card__subtitle">Financial Leadership Dashboard</p>
        </div>

        <div className="login-card__tabs">
          <button
            className={`login-card__tab ${mode === 'login' ? 'login-card__tab--active' : ''}`}
            onClick={() => switchMode('login')}
          >
            <LogIn size={14} />
            Sign In
          </button>
          <button
            className={`login-card__tab ${mode === 'register' ? 'login-card__tab--active' : ''}`}
            onClick={() => switchMode('register')}
          >
            <UserPlus size={14} />
            Create Account
          </button>
        </div>

        {displayError && (
          <div className="login-card__error">
            <AlertCircle size={14} />
            <span>{displayError}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="login-card__form">
          <div className="login-card__field">
            <label htmlFor="login-email">Email</label>
            <input
              id="login-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
              autoFocus
            />
          </div>

          <div className="login-card__field">
            <label htmlFor="login-password">Password</label>
            <input
              id="login-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            />
          </div>

          {mode === 'register' && (
            <div className="login-card__field">
              <label htmlFor="login-confirm">Confirm Password</label>
              <input
                id="login-confirm"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter your password"
                autoComplete="new-password"
              />
            </div>
          )}

          <button
            type="submit"
            className="login-card__submit"
            disabled={submitting}
          >
            {submitting
              ? 'Please wait...'
              : mode === 'login'
              ? 'Sign In'
              : 'Create Account'}
          </button>
        </form>

        {mode === 'register' && (
          <p className="login-card__hint">
            The first account created automatically becomes the admin.
            Subsequent accounts are viewers by default.
          </p>
        )}
      </div>
    </div>
  );
}
