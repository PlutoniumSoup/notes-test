import React from 'react'

export const Editor: React.FC<{ value: string; onChange: (v: string) => void }> = ({ value, onChange }) => {
  return (
    <textarea
      value={value}
      onChange={e => onChange(e.target.value)}
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
  )
}

