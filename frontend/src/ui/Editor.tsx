import React from 'react'

export const Editor: React.FC<{ value: string; onChange: (v: string) => void }> = ({ value, onChange }) => {
  const MAX_LENGTH = 2000
  const remaining = MAX_LENGTH - value.length
  const isNearLimit = remaining < 100
  
  return (
    <div style={{ position: 'relative', width: '100%' }}>
      <textarea
        value={value}
        onChange={e => {
          if (e.target.value.length <= MAX_LENGTH) {
            onChange(e.target.value)
          }
        }}
        placeholder="Начните вводить заметку... Нажмите Ctrl+Enter для анализа"
        className="glass-editor"
        style={{
          width: '100%',
          height: '60vh',
          minHeight: '300px'
        }}
        onKeyDown={(e) => {
          // Support Ctrl+Enter / Cmd+Enter for triggering analysis
          if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
            // Dispatch custom event that parent can listen to
            const event = new CustomEvent('editor-submit');
            window.dispatchEvent(event);
          }
        }}
      />
      <div style={{
        position: 'absolute',
        bottom: '8px',
        right: '8px',
        fontSize: 'var(--font-size-xs)',
        color: isNearLimit ? 'var(--color-error)' : 'var(--color-text-tertiary)',
        background: 'var(--glass-bg)',
        padding: '4px 8px',
        borderRadius: 'var(--radius-sm)',
        backdropFilter: 'blur(5px)',
        pointerEvents: 'none'
      }}>
        {remaining} / {MAX_LENGTH}
      </div>
    </div>
  )
}

