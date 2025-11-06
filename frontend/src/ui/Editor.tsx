import React from 'react'

export const Editor: React.FC<{ value: string; onChange: (v: string) => void }> = ({ value, onChange }) => {
  return (
    <textarea
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder="Введите текст заметки..."
      style={{ 
        width: '100%', 
        height: '60vh', 
        padding: '12px',
        border: '1px solid #dee2e6',
        borderRadius: 6,
        fontSize: 14,
        fontFamily: 'inherit',
        resize: 'vertical',
        lineHeight: 1.6,
        outline: 'none'
      }}
      onFocus={(e) => {
        e.target.style.borderColor = '#4dabf7'
      }}
      onBlur={(e) => {
        e.target.style.borderColor = '#dee2e6'
      }}
    />
  )
}


