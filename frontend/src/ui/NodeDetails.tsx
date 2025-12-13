import React, { useState, useEffect } from 'react'
import { updateNode, deleteNode, createLink, getAllGraph, GraphNode } from '../shared/api'
import { CloseCircle, Edit2, Trash, Add, TickCircle, TickSquare } from 'iconsax-react'

interface NodeDetailsProps {
  node: any | null
  onClose: () => void
  onUpdate: () => void
  onDelete: () => void
  onTagClick?: (tag: string | null) => void
  onMultiSelect?: () => void
  multiSelectMode?: boolean
}

export const NodeDetails: React.FC<NodeDetailsProps> = ({ 
  node, 
  onClose, 
  onUpdate, 
  onDelete,
  onTagClick,
  onMultiSelect,
  multiSelectMode = false
}) => {
  const [isEditing, setIsEditing] = useState(false)
  const [editedLabel, setEditedLabel] = useState(node?.label || '')
  const [editedSummary, setEditedSummary] = useState(node?.summary || '')
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [showAddLink, setShowAddLink] = useState(false)
  const [linkTarget, setLinkTarget] = useState('')
  const [linkRelation, setLinkRelation] = useState('related_to')
  const [allNodes, setAllNodes] = useState<any[]>([])

  useEffect(() => {
    // Синхронизируем состояние редактирования с текущим узлом
    if (!isEditing) {
      setEditedLabel(node?.label || '')
      setEditedSummary(node?.summary || '')
    }
  }, [node, isEditing])

  useEffect(() => {
    if (showAddLink) {
      // Загружаем все узлы для выбора цели связи
      getAllGraph().then(data => {
        setAllNodes(data.nodes.filter(n => n.id !== node?.id))
      })
    }
  }, [showAddLink, node])

  if (!node) {
    return (
      <div style={{ padding: 16, color: '#666', textAlign: 'center' }}>
        <p>Выберите узел на графе для просмотра деталей</p>
      </div>
    )
  }

  const getNodeType = () => {
    if (node.id?.startsWith('topic_')) return 'Главная тема'
    if (node.id?.startsWith('concept_')) return 'Основная концепция'
    if (node.id?.startsWith('related_')) return 'Связанная концепция'
    if (node.id?.startsWith('wiki_')) return 'Статья Wikipedia'
    return 'Узел'
  }

  const getLevelLabel = () => {
    if (node.level === 0) return 'Центральный узел'
    if (node.level === 1) return 'Первый уровень'
    if (node.level === 2) return 'Второй уровень'
    return ''
  }

  const handleSave = async () => {
    setIsSaving(true)
    try {
      await updateNode(node.id, {
        id: node.id,
        label: editedLabel,
        summary: editedSummary,
        tags: node.tags || [],
        has_gap: node.has_gap || false,
        level: node.level
      })
      setIsEditing(false)
      onUpdate()
    } catch (error: any) {
      alert(`Ошибка при сохранении: ${error.response?.data?.detail || error.message}`)
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm(`Удалить узел "${node.label}"? Это действие нельзя отменить.`)) {
      return
    }
    setIsDeleting(true)
    try {
      await deleteNode(node.id)
      onDelete()
    } catch (error: any) {
      alert(`Ошибка при удалении: ${error.response?.data?.detail || error.message}`)
      setIsDeleting(false)
    }
  }

  const handleAddLink = async () => {
    if (!linkTarget) {
      alert('Выберите целевой узел')
      return
    }
    try {
      await createLink({
        source: node.id,
        target: linkTarget,
        relation: linkRelation
      })
      setShowAddLink(false)
      setLinkTarget('')
      setLinkRelation('related_to')
      onUpdate()
    } catch (error: any) {
      alert(`Ошибка при создании связи: ${error.response?.data?.detail || error.message}`)
    }
  }

  return (
    <div style={{ padding: 'var(--space-xl)' }}>
      {/* Header with close button */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'flex-start',
        marginBottom: 'var(--space-lg)'
      }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)', marginBottom: 4 }}>
            {getNodeType()}
          </div>
          {isEditing ? (
            <input
              value={editedLabel}
              onChange={e => setEditedLabel(e.target.value)}
              className="glass-input"
              style={{ marginBottom: 'var(--space-sm)', width: '100%' }}
              placeholder="Название узла"
            />
          ) : (
            <h2 style={{ margin: 0, fontSize: 'var(--font-size-xl)', color: 'var(--color-text-primary)' }}>
              {node.label || node.name}
            </h2>
          )}
          {getLevelLabel() && (
            <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)', marginTop: 4 }}>
              {getLevelLabel()}
            </div>
          )}
        </div>
        <button
          onClick={onClose}
          className="btn-ghost"
          style={{ padding: 'var(--space-xs)', minWidth: 'auto' }}
          title="Закрыть"
        >
          <CloseCircle size={20} />
        </button>
      </div>

      {/* Description */}
      <div style={{ marginBottom: 'var(--space-lg)' }}>
        <div style={{ 
          fontSize: 'var(--font-size-xs)', 
          color: 'var(--color-text-tertiary)', 
          marginBottom: 'var(--space-sm)', 
          fontWeight: 600 
        }}>
          Описание:
        </div>
        {isEditing ? (
          <textarea
            value={editedSummary}
            onChange={e => setEditedSummary(e.target.value)}
            className="glass-input"
            style={{ 
              width: '100%', 
              minHeight: '100px',
              resize: 'vertical'
            }}
            placeholder="Описание узла"
          />
        ) : (
          <div style={{ 
            padding: 'var(--space-md)', 
            background: 'var(--glass-bg)', 
            borderRadius: 'var(--radius-md)',
            fontSize: 'var(--font-size-sm)',
            lineHeight: 1.6, 
            color: 'var(--color-text-primary)',
            border: '1px solid var(--glass-border)'
          }}>
            {node.summary || 'Нет описания'}
          </div>
        )}
      </div>

      {/* Tags */}
      {node.tags && node.tags.length > 0 && (
        <div style={{ marginBottom: 'var(--space-lg)' }}>
          <div style={{ 
            fontSize: 'var(--font-size-xs)', 
            color: 'var(--color-text-tertiary)', 
            marginBottom: 'var(--space-sm)', 
            fontWeight: 600 
          }}>
            Теги:
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-xs)' }}>
            {node.tags.map((tag: string, idx: number) => (
              <span
                key={idx}
                onClick={() => onTagClick?.(tag)}
                style={{
                  padding: '4px 10px',
                  background: 'var(--color-primary)',
                  color: 'var(--color-text-inverse)',
                  borderRadius: 'var(--radius-full)',
                  fontSize: 'var(--font-size-xs)',
                  fontWeight: 500,
                  cursor: onTagClick ? 'pointer' : 'default',
                  transition: 'all var(--transition-fast)'
                }}
                onMouseEnter={(e) => {
                  if (onTagClick) {
                    e.currentTarget.style.transform = 'scale(1.1)'
                    e.currentTarget.style.boxShadow = 'var(--shadow-md)'
                  }
                }}
                onMouseLeave={(e) => {
                  if (onTagClick) {
                    e.currentTarget.style.transform = 'scale(1)'
                    e.currentTarget.style.boxShadow = 'none'
                  }
                }}
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Knowledge Gaps */}
      {node.knowledge_gaps && node.knowledge_gaps.length > 0 && (
        <div style={{ 
          padding: 'var(--space-md)', 
          background: 'rgba(251, 191, 36, 0.2)', 
          borderRadius: 'var(--radius-md)', 
          marginBottom: 'var(--space-lg)',
          border: '1px solid rgba(251, 191, 36, 0.4)'
        }}>
          <div style={{ 
            fontSize: 'var(--font-size-xs)', 
            color: 'var(--color-warning)', 
            fontWeight: 600,
            marginBottom: 'var(--space-sm)'
          }}>
            ⚠️ Пробелы знаний:
          </div>
          <ul style={{ 
            margin: 0, 
            paddingLeft: 'var(--space-lg)',
            fontSize: 'var(--font-size-xs)',
            color: 'var(--color-text-primary)'
          }}>
            {node.knowledge_gaps.map((gap: string, idx: number) => (
              <li key={idx} style={{ marginBottom: 'var(--space-xs)' }}>{gap}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Recommendations */}
      {node.recommendations && node.recommendations.length > 0 && (
        <div style={{ 
          padding: 'var(--space-md)', 
          background: 'rgba(251, 191, 36, 0.15)', 
          borderRadius: 'var(--radius-md)', 
          marginBottom: 'var(--space-lg)',
          border: '1px solid rgba(251, 191, 36, 0.3)'
        }}>
          <div style={{ 
            fontSize: 'var(--font-size-xs)', 
            color: 'var(--color-warning)', 
            fontWeight: 600,
            marginBottom: 'var(--space-sm)'
          }}>
            💡 Рекомендации к изучению:
          </div>
          <ul style={{ 
            margin: 0, 
            paddingLeft: 'var(--space-lg)',
            fontSize: 'var(--font-size-xs)',
            color: 'var(--color-text-primary)'
          }}>
            {node.recommendations.map((rec: string, idx: number) => (
              <li key={idx} style={{ marginBottom: 'var(--space-xs)' }}>{rec}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Actions */}
      <div style={{ 
        marginTop: 'var(--space-xl)', 
        paddingTop: 'var(--space-lg)', 
        borderTop: '1px solid var(--glass-border)',
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--space-sm)'
      }}>
        {isEditing ? (
          <>
            <button
              onClick={handleSave}
              disabled={isSaving || !editedLabel.trim()}
              className="btn-primary"
              style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 'var(--space-sm)' }}
            >
              {isSaving ? (
                <>
                  <div className="spinner" />
                  Сохранение...
                </>
              ) : (
                <>
                  <TickCircle size={18} />
                  Сохранить
                </>
              )}
            </button>
            <button
              onClick={() => {
                setIsEditing(false)
                setEditedLabel(node.label || '')
                setEditedSummary(node.summary || '')
              }}
              className="btn-ghost"
              style={{ width: '100%' }}
            >
              Отмена
            </button>
          </>
        ) : (
          <>
            <button
              onClick={() => {
                setIsEditing(true)
                setEditedLabel(node.label || '')
                setEditedSummary(node.summary || '')
              }}
              className="btn-ghost"
              style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 'var(--space-sm)' }}
            >
              <Edit2 size={18} />
              Редактировать
            </button>
            <button
              onClick={handleDelete}
              disabled={isDeleting}
              className="btn-ghost"
              style={{ 
                width: '100%', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                gap: 'var(--space-sm)',
                color: 'var(--color-error)',
                borderColor: 'var(--color-error)'
              }}
            >
              {isDeleting ? (
                <>
                  <div className="spinner" />
                  Удаление...
                </>
              ) : (
                <>
                  <Trash size={18} />
                  Удалить узел
                </>
              )}
            </button>
            <button
              onClick={() => setShowAddLink(!showAddLink)}
              className="btn-ghost"
              style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 'var(--space-sm)' }}
            >
              <Add size={18} />
              {showAddLink ? 'Отмена' : 'Добавить связь'}
            </button>
            {onMultiSelect && (
              <button
                onClick={onMultiSelect}
                className="btn-ghost"
                style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 'var(--space-sm)' }}
              >
                <TickSquare size={18} />
                Выбрать группу узлов
              </button>
            )}
          </>
        )}

        {/* Add Link Form */}
        {showAddLink && !isEditing && (
          <div style={{
            marginTop: 'var(--space-md)',
            padding: 'var(--space-md)',
            background: 'var(--glass-bg)',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--glass-border)'
          }}>
            <label style={{ 
              display: 'block', 
              marginBottom: 'var(--space-sm)', 
              fontSize: 'var(--font-size-xs)',
              fontWeight: 600,
              color: 'var(--color-text-secondary)'
            }}>
              Целевой узел:
            </label>
            <select
              value={linkTarget}
              onChange={e => setLinkTarget(e.target.value)}
              className="glass-input"
              style={{ marginBottom: 'var(--space-sm)', width: '100%' }}
            >
              <option value="">Выберите узел</option>
              {allNodes.map(n => (
                <option key={n.id} value={n.id}>{n.label}</option>
              ))}
            </select>
            <label style={{ 
              display: 'block', 
              marginBottom: 'var(--space-sm)', 
              fontSize: 'var(--font-size-xs)',
              fontWeight: 600,
              color: 'var(--color-text-secondary)'
            }}>
              Тип связи:
            </label>
            <select
              value={linkRelation}
              onChange={e => setLinkRelation(e.target.value)}
              className="glass-input"
              style={{ marginBottom: 'var(--space-sm)', width: '100%' }}
            >
              <option value="related_to">Связано с</option>
              <option value="contains">Содержит</option>
              <option value="part_of">Часть</option>
              <option value="similar_to">Похоже на</option>
              <option value="depends_on">Зависит от</option>
            </select>
            <button
              onClick={handleAddLink}
              disabled={!linkTarget}
              className="btn-primary"
              style={{ width: '100%', marginTop: 'var(--space-sm)' }}
            >
              Создать связь
            </button>
          </div>
        )}
      </div>

      {/* Node ID */}
      <div style={{ 
        fontSize: 'var(--font-size-xs)', 
        color: 'var(--color-text-tertiary)', 
        marginTop: 'var(--space-lg)', 
        paddingTop: 'var(--space-lg)', 
        borderTop: '1px solid var(--glass-border)'
      }}>
        ID: {node.id}
      </div>
    </div>
  )
}


