import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';

export const SettingsPage: React.FC = () => {
  const { user, updateProfile } = useAuth();
  const { theme, setTheme } = useTheme();
  const [llmModel, setLlmModel] = useState(user?.llm_model || 'google');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  const handleSave = async () => {
    setSaving(true);
    setMessage('');

    try {
      await updateProfile(theme, llmModel);
      setMessage('Settings saved successfully!');
      setTimeout(() => setMessage(''), 3000);
    } catch (error: any) {
      setMessage(error.response?.data?.detail || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleThemeChange = (newTheme: 'light' | 'dark') => {
    setTheme(newTheme);
  };

  return (
    <div style={{
      minHeight: '100vh',
      padding: 'var(--space-3xl)',
      maxWidth: '800px',
      margin: '0 auto'
    }} className="fade-in">
      <h1 style={{ marginBottom: 'var(--space-2xl)' }}>Settings</h1>

      <div className="card" style={{ marginBottom: 'var(--space-2xl)' }}>
        <h3 style={{ marginBottom: 'var(--space-lg)' }}>Profile Information</h3>
        
        <div style={{ marginBottom: 'var(--space-lg)' }}>
          <label>Email</label>
          <input type="text" value={user?.email || ''} disabled />
        </div>

        <div style={{ marginBottom: 'var(--space-lg)' }}>
          <label>Username</label>
          <input type="text" value={user?.username || ''} disabled />
        </div>
      </div>

      <div className="card" style={{ marginBottom: 'var(--space-2xl)' }}>
        <h3 style={{ marginBottom: 'var(--space-lg)' }}>Appearance</h3>
        
        <div style={{ marginBottom: 'var(--space-lg)' }}>
          <label>Theme</label>
          <div style={{ display: 'flex', gap: 'var(--space-md)', marginTop: 'var(--space-sm)' }}>
            <button
              onClick={() => handleThemeChange('light')}
              className={theme === 'light' ? 'btn-primary' : 'btn-ghost'}
              style={{ flex: 1 }}
            >
              ☀️ Light
            </button>
            <button
              onClick={() => handleThemeChange('dark')}
              className={theme === 'dark' ? 'btn-primary' : 'btn-ghost'}
              style={{ flex: 1 }}
            >
              🌙 Dark
            </button>
          </div>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 'var(--space-2xl)' }}>
        <h3 style={{ marginBottom: 'var(--space-lg)' }}>AI Model</h3>
        
        <div style={{ marginBottom: 'var(--space-lg)' }}>
          <label>LLM Model</label>
          <select
            value={llmModel}
            onChange={e => setLlmModel(e.target.value)}
          >
            <option value="google">Google Gemini</option>
            <option value="timeweb">Timeweb</option>
            <option value="custom">Custom</option>
          </select>
          <p style={{
            marginTop: 'var(--space-sm)',
            fontSize: 'var(--font-size-xs)',
            color: 'var(--color-text-tertiary)'
          }}>
            Choose the AI model for note analysis
          </p>
        </div>
      </div>

      {message && (
        <div style={{
          padding: 'var(--space-md)',
          marginBottom: 'var(--space-lg)',
          background: message.includes('success') ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
          border: `1px solid ${message.includes('success') ? 'var(--color-secondary)' : 'var(--color-error)'}`,
          borderRadius: 'var(--radius-md)',
          color: message.includes('success') ? 'var(--color-secondary)' : 'var(--color-error)',
          fontSize: 'var(--font-size-sm)'
        }} className="slide-in">
          {message}
        </div>
      )}

      <button
        onClick={handleSave}
        disabled={saving}
        className="btn-primary"
        style={{ width: '100%' }}
      >
        {saving ? (
          <>
            <div className="spinner" />
            Saving...
          </>
        ) : (
          'Save Settings'
        )}
      </button>
    </div>
  );
};
