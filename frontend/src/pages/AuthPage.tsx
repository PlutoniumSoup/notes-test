import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

export const AuthPage: React.FC = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const { login, register } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isLogin) {
        await login(username, password);
      } else {
        if (!email) {
          setError('Email is required');
          setLoading(false);
          return;
        }
        await register(email, username, password);
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '2rem',
      background: 'linear-gradient(135deg, var(--color-primary) 0%, var(--color-accent) 100%)'
    }} className="fade-in">
      <div className="card scale-in"  style={{
        maxWidth: '420px',
        width: '100%',
        boxShadow: 'var(--shadow-xl)'
      }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <h1 style={{
            fontSize: 'var(--font-size-3xl)',
            fontWeight: 'var(--font-weight-bold)',
            color: 'var(--color-primary)',
            marginBottom: 'var(--space-sm)'
          }}>
            {isLogin ? 'Welcome Back' : 'Create Account'}
          </h1>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-sm)' }}>
            {isLogin ? 'Log in to your KnowYourPath account' : 'Join KnowYourPath today'}
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          {!isLogin && (
            <div style={{ marginBottom: 'var(--space-lg)' }}>
              <label>Email</label>
              <input
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
              />
            </div>
          )}

          <div style={{ marginBottom: 'var(--space-lg)' }}>
            <label>Username</label>
            <input
              type="text"
              placeholder="Enter your username"
              value={username}
              onChange={e => setUsername(e.target.value)}
              required
            />
          </div>

          <div style={{ marginBottom: 'var(--space-lg)' }}>
            <label>Password</label>
            <input
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              minLength={6}
            />
          </div>

          {error && (
            <div style={{
              padding: 'var(--space-md)',
              marginBottom: 'var(--space-lg)',
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid var(--color-error)',
              borderRadius: 'var(--radius-md)',
              color: 'var(--color-error)',
              fontSize: 'var(--font-size-sm)'
            }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="btn-primary"
            style={{ width: '100%', marginBottom: 'var(--space-lg)' }}
          >
            {loading ? (
              <>
                <div className="spinner" />
                {isLogin ? 'Logging in...' : 'Creating account...'}
              </>
            ) : (
              isLogin ? 'Log In' : 'Sign Up'
            )}
          </button>

          <div style={{ textAlign: 'center' }}>
            <span style={{
 color: 'var(--color-text-secondary)',
              fontSize: 'var(--font-size-sm)'
            }}>
              {isLogin ? "Don't have an account?" : 'Already have an account?'}
            </span>
            {' '}
            <button
              type="button"
              onClick={() => setIsLogin(!isLogin)}
              className="btn-ghost"
              style={{
                padding: '0',
                border: 'none',
                color: 'var(--color-primary)',
                fontWeight: 'var(--font-weight-medium)',
                background: 'transparent'
              }}
            >
              {isLogin ? 'Sign Up' : 'Log In'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
