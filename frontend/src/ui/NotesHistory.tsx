import React from 'react'
import { Note } from '../shared/api'
import { DocumentText, Trash, Clock } from 'iconsax-react'

interface NotesHistoryProps {
    notes: Note[]
    onSelectNote: (note: Note) => void
    onDeleteNote: (noteId: string) => void
}

export const NotesHistory: React.FC<NotesHistoryProps> = ({ notes, onSelectNote, onDeleteNote }) => {
    if (notes.length === 0) {
        return (
            <div style={{
                marginTop: 'var(--space-xl)',
                padding: 'var(--space-xl)',
                textAlign: 'center',
                background: 'var(--glass-bg)',
                borderRadius: 'var(--radius-lg)',
                border: '1px solid var(--glass-border)'
            }}>
                <DocumentText size={32} variant="Outline" color="var(--color-text-tertiary)" style={{ marginBottom: 'var(--space-sm)' }} />
                <p style={{ color: 'var(--color-text-tertiary)', fontSize: 'var(--font-size-sm)', margin: 0 }}>
                    История заметок пуста
                </p>
            </div>
        )
    }

    return (
        <div style={{
            marginTop: 'var(--space-xl)',
            background: 'var(--glass-bg)',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--glass-border)',
            overflow: 'hidden'
        }}>
            <div style={{
                padding: 'var(--space-md) var(--space-lg)',
                borderBottom: '1px solid var(--glass-border)',
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--space-sm)',
                background: 'rgba(0, 0, 0, 0.05)'
            }}>
                <DocumentText size={18} variant="Bold" color="var(--color-primary)" />
                <h3 style={{
                    fontSize: 'var(--font-size-base)',
                    fontWeight: 'var(--font-weight-semibold)',
                    margin: 0,
                    color: 'var(--color-text-primary)'
                }}>
                    История заметок ({notes.length})
                </h3>
            </div>
            <div style={{ 
                maxHeight: '400px',
                overflowY: 'auto',
                padding: 'var(--space-sm)'
            }}>
                {notes.map((note) => (
                    <div
                        key={note.id}
                        onClick={() => onSelectNote(note)}
                        style={{
                            padding: 'var(--space-md)',
                            marginBottom: 'var(--space-xs)',
                            cursor: 'pointer',
                            borderRadius: 'var(--radius-md)',
                            background: 'transparent',
                            border: '1px solid transparent',
                            transition: 'all var(--transition-fast)',
                            position: 'relative'
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.background = 'var(--glass-bg)'
                            e.currentTarget.style.borderColor = 'var(--color-primary)'
                            e.currentTarget.style.transform = 'translateX(4px)'
                            e.currentTarget.style.boxShadow = 'var(--shadow-sm)'
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.background = 'transparent'
                            e.currentTarget.style.borderColor = 'transparent'
                            e.currentTarget.style.transform = 'translateX(0)'
                            e.currentTarget.style.boxShadow = 'none'
                        }}
                    >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 'var(--space-sm)' }}>
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 'var(--space-xs)',
                                    marginBottom: 'var(--space-xs)'
                                }}>
                                    <DocumentText size={14} variant="Bold" color="var(--color-primary)" />
                                    <span style={{
                                        fontWeight: 'var(--font-weight-semibold)',
                                        fontSize: 'var(--font-size-sm)',
                                        color: 'var(--color-text-primary)',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                        whiteSpace: 'nowrap'
                                    }}>
                                        {note.title || 'Без заголовка'}
                                    </span>
                                </div>
                                <p style={{
                                    fontSize: 'var(--font-size-xs)',
                                    color: 'var(--color-text-secondary)',
                                    margin: '0 0 var(--space-xs) 0',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    display: '-webkit-box',
                                    WebkitLineClamp: 2,
                                    WebkitBoxOrient: 'vertical',
                                    lineHeight: 1.4
                                }}>
                                    {note.content || 'Нет содержимого'}
                                </p>
                                <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 'var(--space-xs)',
                                    fontSize: 'var(--font-size-xs)',
                                    color: 'var(--color-text-tertiary)'
                                }}>
                                    <Clock size={12} variant="Outline" />
                                    <span>{new Date(note.created_at).toLocaleDateString('ru-RU', { 
                                        day: '2-digit', 
                                        month: '2-digit', 
                                        year: 'numeric',
                                        hour: '2-digit',
                                        minute: '2-digit'
                                    })}</span>
                                </div>
                                {note.tags && note.tags.length > 0 && (
                                    <div style={{
                                        display: 'flex',
                                        flexWrap: 'wrap',
                                        gap: 'var(--space-xs)',
                                        marginTop: 'var(--space-xs)'
                                    }}>
                                        {note.tags.slice(0, 3).map((tag, idx) => (
                                            <span
                                                key={idx}
                                                style={{
                                                    padding: '2px 8px',
                                                    background: 'var(--color-primary)',
                                                    color: 'var(--color-text-inverse)',
                                                    borderRadius: 'var(--radius-full)',
                                                    fontSize: '10px',
                                                    fontWeight: 500
                                                }}
                                            >
                                                {tag}
                                            </span>
                                        ))}
                                    </div>
                                )}
                            </div>
                            <button
                                onClick={(e) => {
                                    e.stopPropagation()
                                    if (confirm('Удалить заметку?')) {
                                        onDeleteNote(note.id)
                                    }
                                }}
                                className="btn-ghost"
                                style={{
                                    padding: 'var(--space-xs)',
                                    minWidth: 'auto',
                                    flexShrink: 0
                                }}
                                title="Удалить заметку"
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.background = 'var(--color-error)'
                                    e.currentTarget.style.color = 'var(--color-text-inverse)'
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.background = 'transparent'
                                    e.currentTarget.style.color = 'var(--color-error)'
                                }}
                            >
                                <Trash size={16} variant="Outline" color="var(--color-error)" />
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}
