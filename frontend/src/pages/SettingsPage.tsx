import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { ArrowLeft, User, Paintbucket, Cpu, Sun1, Moon } from 'iconsax-react';

interface SettingsPageProps {
  onBack: () => void;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({ onBack }) => {
  const { user, updateProfile } = useAuth();
  const { theme, setTheme, colorScheme, setColorScheme } = useTheme();
  const [llmModel, setLlmModel] = useState(user?.llm_model || 'google');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  const handleSave = async () => {
    setSaving(true);
    setMessage('');

    try {
      await updateProfile(theme as 'light' | 'dark' | undefined, llmModel);
      setMessage('Settings saved successfully!');
      setTimeout(() => setMessage(''), 3000);
    } catch (error: any) {
      setMessage(error.response?.data?.detail || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleThemeChange = (newTheme: 'light' | 'dark' | 'dark-black') => {
    setTheme(newTheme);
  };

  return (
    <div style={{
      minHeight: '100vh',
      padding: 'var(--space-3xl)',
      paddingTop: 'calc(var(--space-3xl) + 64px)',
      maxWidth: '800px',
      margin: '0 auto'
    }} className="fade-in">
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-lg)', marginBottom: 'var(--space-2xl)' }}>
        <button
          onClick={onBack}
          className="btn-ghost"
          style={{ padding: 'var(--space-sm)', minWidth: 'auto' }}
          title="Назад"
        >
          <ArrowLeft size={24} />
        </button>
        <h1 style={{ margin: 0 }}>Настройки</h1>
      </div>

      <div className="glass-card" style={{ marginBottom: 'var(--space-2xl)', padding: 'var(--space-2xl)' }}>
        <h3 style={{ marginBottom: 'var(--space-lg)', display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
          <User size={24} variant="Bold" color="var(--color-primary)" />
          Профиль
        </h3>

        <div style={{ marginBottom: 'var(--space-lg)' }}>
          <label>Email</label>
          <input type="text" value={user?.email || ''} disabled className="glass-input" />
        </div>

        <div style={{ marginBottom: 'var(--space-lg)' }}>
          <label>Username</label>
          <input type="text" value={user?.username || ''} disabled className="glass-input" />
        </div>
      </div>

      <div className="glass-card" style={{ marginBottom: 'var(--space-2xl)', padding: 'var(--space-2xl)' }}>
        <h3 style={{ marginBottom: 'var(--space-lg)', display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
          <Paintbucket size={24} variant="Bold" color="var(--color-primary)" />
          Оформление
        </h3>

        <div style={{ marginBottom: 'var(--space-lg)' }}>
          <label>Тема</label>
          <div style={{ display: 'flex', gap: 'var(--space-md)', marginTop: 'var(--space-sm)' }}>
            <button
              onClick={() => handleThemeChange('light')}
              className={theme === 'light' ? 'btn-primary' : 'btn-ghost'}
              style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 'var(--space-sm)' }}
            >
              <Sun1 size={20} variant={theme === 'light' ? 'Bold' : 'Outline'} />
              Светлая
            </button>
            <button
              onClick={() => handleThemeChange('dark')}
              className={theme === 'dark' ? 'btn-primary' : 'btn-ghost'}
              style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 'var(--space-sm)' }}
            >
              <Moon size={20} variant={theme === 'dark' ? 'Bold' : 'Outline'} />
              Темная (синяя)
            </button>
            <button
              onClick={() => handleThemeChange('dark-black')}
              className={theme === 'dark-black' ? 'btn-primary' : 'btn-ghost'}
              style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 'var(--space-sm)' }}
            >
              <Moon size={20} variant={theme === 'dark-black' ? 'Bold' : 'Outline'} />
              Темная (черная)
            </button>
          </div>
        </div>

        <div style={{ marginBottom: 'var(--space-lg)' }}>
          <label>Цветовая гамма</label>
          <p style={{
            marginTop: 'var(--space-xs)',
            fontSize: 'var(--font-size-xs)',
            color: 'var(--color-text-tertiary)',
            marginBottom: 'var(--space-sm)'
          }}>
            Выберите цветовую схему интерфейса
          </p>
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(3, 1fr)', 
            gap: 'var(--space-sm)',
            marginTop: 'var(--space-sm)'
          }}>
            {(['blue', 'green', 'purple', 'red', 'orange', 'pink'] as const).map((color) => (
              <button
                key={color}
                onClick={() => setColorScheme(color)}
                className={colorScheme === color ? 'btn-primary' : 'btn-ghost'}
                style={{
                  padding: 'var(--space-md)',
                  borderRadius: 'var(--radius-md)',
                  border: colorScheme === color ? '2px solid var(--color-primary)' : '2px solid var(--color-border)',
                  background: colorScheme === color ? 'var(--color-primary)' : 'var(--color-surface)',
                  cursor: 'pointer',
                  transition: 'all var(--transition-fast)',
                  opacity: colorScheme === color ? 1 : 0.8
                }}
                onMouseEnter={(e) => {
                  if (colorScheme !== color) {
                    e.currentTarget.style.borderColor = 'var(--color-primary)'
                    e.currentTarget.style.transform = 'scale(1.05)'
                  }
                }}
                onMouseLeave={(e) => {
                  if (colorScheme !== color) {
                    e.currentTarget.style.borderColor = 'var(--color-border)'
                    e.currentTarget.style.transform = 'scale(1)'
                  }
                }}
                title={`Цветовая схема: ${color}`}
              >
                <div style={{
                  width: '100%',
                  height: '40px',
                  borderRadius: 'var(--radius-sm)',
                  background: color === 'blue' ? 'linear-gradient(135deg, #3b82f6, #6366f1)' :
                              color === 'green' ? 'linear-gradient(135deg, #10b981, #059669)' :
                              color === 'purple' ? 'linear-gradient(135deg, #8b5cf6, #7c3aed)' :
                              color === 'red' ? 'linear-gradient(135deg, #ef4444, #dc2626)' :
                              color === 'orange' ? 'linear-gradient(135deg, #f59e0b, #d97706)' :
                              'linear-gradient(135deg, #ec4899, #db2777)',
                  marginBottom: 'var(--space-xs)',
                  boxShadow: colorScheme === color ? 'var(--shadow-md)' : 'none'
                }} />
                <span style={{ 
                  fontSize: 'var(--font-size-xs)', 
                  textTransform: 'capitalize',
                  color: colorScheme === color ? 'var(--color-text-inverse)' : 'var(--color-text-primary)'
                }}>
                  {color === 'blue' ? 'Синяя' : 
                   color === 'green' ? 'Зеленая' :
                   color === 'purple' ? 'Фиолетовая' :
                   color === 'red' ? 'Красная' :
                   color === 'orange' ? 'Оранжевая' : 'Розовая'}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="glass-card" style={{ marginBottom: 'var(--space-2xl)', padding: 'var(--space-2xl)' }}>
        <h3 style={{ marginBottom: 'var(--space-lg)', display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
          <Cpu size={24} variant="Bold" color="var(--color-primary)" />
          AI Модель
        </h3>

        <div style={{ marginBottom: 'var(--space-lg)' }}>
          <label>LLM Модель</label>
          <select
            value={llmModel}
            onChange={e => setLlmModel(e.target.value)}
            className="glass-input"
          >
            <option value="timeweb">Timeweb Grok</option>
            <option value="google">Google Gemini</option>
            <option value="custom">Custom</option>
          </select>
          <p style={{
            marginTop: 'var(--space-sm)',
            fontSize: 'var(--font-size-xs)',
            color: 'var(--color-text-tertiary)'
          }}>
            Выберите AI модель для анализа заметок
          </p>
        </div>
      </div>

      {message && (
        <div className="glass-card slide-in" style={{
          padding: 'var(--space-md)',
          marginBottom: 'var(--space-lg)',
          background: message.includes('success') ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
          border: `1px solid ${message.includes('success') ? 'var(--color-secondary)' : 'var(--color-error)'}`,
          color: message.includes('success') ? 'var(--color-secondary)' : 'var(--color-error)',
          fontSize: 'var(--font-size-sm)'
        }}>
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
            Сохранение...
          </>
        ) : (
          'Сохранить настройки'
        )}
      </button>
    </div>
  );
};
