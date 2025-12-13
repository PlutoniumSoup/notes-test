import React, { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { AuthPage } from './AuthPage'
import { SettingsPage } from './SettingsPage'
import { ThemeSwitcher } from '../ui/ThemeSwitcher'
import { Editor } from '../ui/Editor'
import { GraphView } from '../ui/GraphView'
import { NodeDetails } from '../ui/NodeDetails'
import { NotesHistory } from '../ui/NotesHistory'
import { analyzeNote, createNote, getNotes, deleteNote, Note, getAllGraph, GraphData, deleteNodes } from '../shared/api'
import { Flash, Setting2, LogoutCurve, DocumentCopy, TickSquare, Trash } from 'iconsax-react'

type Page = 'main' | 'settings'

export const App: React.FC = () => {
  const { user, loading, logout } = useAuth()
  const [currentPage, setCurrentPage] = useState<Page>('main')

  const [content, setContent] = useState('')
  const [title, setTitle] = useState('')
  const [notes, setNotes] = useState<Note[]>([])
  const [graph, setGraph] = useState<{ nodes: any[]; links: any[] }>({ nodes: [], links: [] })
  const [selectedNode, setSelectedNode] = useState<any | null>(null)
  const [analyzing, setAnalyzing] = useState(false)
  const [analysisResult, setAnalysisResult] = useState<any>(null)
  const [highlightedTag, setHighlightedTag] = useState<string | null>(null)
  const [selectedNodes, setSelectedNodes] = useState<Set<string>>(new Set())
  const [multiSelectMode, setMultiSelectMode] = useState(false)
  const [leftPanelWidth, setLeftPanelWidth] = useState(420)
  const [isResizing, setIsResizing] = useState(false)

  // Load graph and notes on mount
  useEffect(() => {
    if (!user) return

    const loadData = async () => {
      try {
        // Load graph from database
        const graphData = await getAllGraph()
        console.log('✅ Загружен граф:', graphData.nodes.length, 'узлов,', graphData.links.length, 'связей')
        setGraph({
          nodes: graphData.nodes.map(n => ({
            id: n.id,
            name: n.label,
            label: n.label,
            summary: n.summary,
            has_gap: n.has_gap,
            level: n.level,
            tags: n.tags || [],
            knowledge_gaps: n.knowledge_gaps || [],
            recommendations: n.recommendations || [],
            ...n
          })),
          links: graphData.links
        })

        // Load notes
        const fetchedNotes = await getNotes()
        console.log('✅ Загружено заметок:', fetchedNotes.length)
        setNotes(fetchedNotes)
      } catch (error) {
        console.error('❌ Ошибка загрузки данных:', error)
      }
    }
    loadData()
  }, [user])

  // Listen for Ctrl+Enter from Editor
  useEffect(() => {
    const handleEditorSubmit = () => {
      if (content.trim()) {
        onAnalyze()
      }
    }
    window.addEventListener('editor-submit', handleEditorSubmit)
    return () => window.removeEventListener('editor-submit', handleEditorSubmit)
  }, [content])

  // Show loading while checking authentication
  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <div className="spinner" style={{ width: '40px', height: '40px' }} />
      </div>
    )
  }

  // Show auth page if not logged in
  if (!user) {
    return <AuthPage />
  }

  // Show settings page if selected
  if (currentPage === 'settings') {
    return (
      <div>
        <Header
          user={user}
          onNavigate={setCurrentPage}
          onLogout={logout}
          currentPage={currentPage}
        />
        <SettingsPage onBack={() => {
          setCurrentPage('main')
        }} />
      </div>
    )
  }

  const onAnalyze = async () => {
    if (!content.trim()) {
      alert('Введите текст заметки для анализа')
      return
    }
    setAnalyzing(true)
    try {
      const result = await analyzeNote(content)
      setAnalysisResult(result)

      // Объединяем новые узлы с существующими
      const newNodes = result.nodes.map((n: any) => ({
        id: n.id,
        name: n.label,
        label: n.label,
        summary: n.summary,
        has_gap: n.has_gap,
        level: n.level,
        tags: n.tags || [],
        knowledge_gaps: n.knowledge_gaps || [],
        recommendations: n.recommendations || [],
        ...n
      }))
      const newLinks = result.links.map((l: any) => ({
        source: l.source,
        target: l.target,
        relation: l.relation,
        ...l
      }))

      // Объединяем узлы: если узел с таким ID уже есть, обновляем его, иначе добавляем
      const existingNodeMap = new Map(graph.nodes.map(n => [n.id, n]))
      const mergedNodes = [...graph.nodes]
      
      newNodes.forEach(newNode => {
        const existing = existingNodeMap.get(newNode.id)
        if (existing) {
          // Обновляем существующий узел, сохраняя позицию
          const index = mergedNodes.findIndex(n => n.id === newNode.id)
          if (index !== -1) {
            mergedNodes[index] = {
              ...existing,
              ...newNode,
              fx: existing.fx,
              fy: existing.fy,
              x: existing.x,
              y: existing.y
            }
          }
        } else {
          // Добавляем новый узел
          mergedNodes.push(newNode)
        }
      })

      // Объединяем связи: избегаем дубликатов
      const existingLinkSet = new Set(
        graph.links.map(l => `${l.source}-${l.target}-${l.relation}`)
      )
      const mergedLinks = [...graph.links]
      
      newLinks.forEach(newLink => {
        const linkKey = `${newLink.source}-${newLink.target}-${newLink.relation}`
        if (!existingLinkSet.has(linkKey)) {
          mergedLinks.push(newLink)
          existingLinkSet.add(linkKey)
        }
      })

      setGraph({ nodes: mergedNodes, links: mergedLinks })
      console.log('✅ Граф обновлен:', mergedNodes.length, 'узлов,', mergedLinks.length, 'связей')

      // Auto-save after analysis
      const tags = result?.tags || []
      const noteTitle = title.trim() || `Заметка ${new Date().toLocaleString('ru-RU')}`
      try {
        await createNote({ title: noteTitle, content, tags })
        console.log('✅ Заметка автоматически сохранена')
        // Reload notes
        const updatedNotes = await getNotes()
        setNotes(updatedNotes)
        // Clear editor
        setContent('')
        setTitle('')
      } catch (error) {
        console.error('Ошибка автосохранения:', error)
      }
    } catch (error: any) {
      console.error('Analysis error:', error)
      alert(`Ошибка при анализе: ${error.response?.data?.detail || error.message}`)
    } finally {
      setAnalyzing(false)
    }
  }

  const onSelectNote = (note: Note) => {
    setTitle(note.title)
    setContent(note.content)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const onDeleteNote = async (noteId: string) => {
    try {
      await deleteNote(noteId)
      const updatedNotes = await getNotes()
      setNotes(updatedNotes)
    } catch (error) {
      console.error('Error deleting note:', error)
      alert('Не удалось удалить заметку')
    }
  }

  return (
    <div className="fade-in">
      <Header
        user={user}
        onNavigate={setCurrentPage}
        onLogout={logout}
        currentPage={currentPage}
      />
      <div style={{
        position: 'relative',
        height: 'calc(100vh - 64px)',
        marginTop: '64px',
        overflow: 'hidden'
      }}>
        {/* Graph - Full width behind panels */}
        <div style={{ 
          width: '100%',
          height: '100%',
          background: 'var(--color-background)', 
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0
        }}>
          {/* Multi-select toolbar */}
          {multiSelectMode && (
            <div style={{
              position: 'absolute',
              top: 'var(--space-md)',
              left: `calc(${leftPanelWidth}px + var(--space-md))`,
              zIndex: 100,
              background: 'var(--glass-bg)',
              backdropFilter: 'blur(10px) saturate(180%)',
              WebkitBackdropFilter: 'blur(10px) saturate(180%)',
              border: '1px solid var(--glass-border)',
              borderRadius: 'var(--radius-lg)',
              padding: 'var(--space-md)',
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--space-md)',
              boxShadow: 'var(--shadow-lg)'
            }}>
              <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-primary)' }}>
                Выбрано: {selectedNodes.size}
              </span>
              <button
                onClick={async () => {
                  if (selectedNodes.size === 0) {
                    alert('Выберите узлы для удаления')
                    return
                  }
                  if (!confirm(`Удалить ${selectedNodes.size} узл(ов)? Это действие нельзя отменить.`)) {
                    return
                  }
                  try {
                    await deleteNodes(Array.from(selectedNodes))
                    setSelectedNodes(new Set())
                    setMultiSelectMode(false)
                    // Перезагружаем граф
                    const graphData = await getAllGraph()
                    setGraph({
                      nodes: graphData.nodes.map(n => ({
                        id: n.id,
                        name: n.label,
                        label: n.label,
                        summary: n.summary,
                        has_gap: n.has_gap,
                        level: n.level,
                        tags: n.tags || [],
                        knowledge_gaps: n.knowledge_gaps || [],
                        recommendations: n.recommendations || [],
                        ...n
                      })),
                      links: graphData.links
                    })
                    setSelectedNode(null)
                  } catch (error: any) {
                    alert(`Ошибка при удалении: ${error.response?.data?.detail || error.message}`)
                  }
                }}
                className="btn-primary"
                style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}
                disabled={selectedNodes.size === 0}
              >
                <Trash size={18} />
                Удалить выбранные
              </button>
              <button
                onClick={() => {
                  setMultiSelectMode(false)
                  setSelectedNodes(new Set())
                }}
                className="btn-ghost"
              >
                Отмена
              </button>
            </div>
          )}
          <GraphView 
            data={graph} 
            onSelectNode={(node) => {
              if (multiSelectMode) {
                const newSet = new Set(selectedNodes)
                if (newSet.has(node.id)) {
                  newSet.delete(node.id)
                } else {
                  newSet.add(node.id)
                }
                setSelectedNodes(newSet)
              } else {
                setSelectedNode(node)
              }
            }}
            highlightedTag={highlightedTag}
            onBackgroundClick={() => {
              if (!multiSelectMode) {
                setSelectedNode(null)
                setHighlightedTag(null)
              }
            }}
            focusedNode={selectedNode}
            selectedNodes={multiSelectMode ? selectedNodes : new Set()}
          />
        </div>

        {/* Left Panel - Overlay with Acrylic */}
        <div className="glass-panel" style={{
          width: `${leftPanelWidth}px`,
          minWidth: '300px',
          maxWidth: '800px',
          padding: 'var(--space-2xl)',
          borderRight: '1px solid var(--glass-border)',
          overflowY: 'auto',
          overflowX: 'hidden',
          background: 'var(--glass-bg)',
          backdropFilter: 'blur(10px) saturate(180%)',
          WebkitBackdropFilter: 'blur(10px) saturate(180%)',
          position: 'absolute',
          left: 0,
          top: 0,
          bottom: 0,
          zIndex: 50,
          transition: isResizing ? 'none' : 'width var(--transition-normal)',
          boxShadow: '4px 0 20px rgba(0, 0, 0, 0.1)'
        }}>
          {/* Resize handle */}
          <div
            onMouseDown={(e) => {
              e.preventDefault()
              e.stopPropagation()
              setIsResizing(true)
              const startX = e.clientX
              const startWidth = leftPanelWidth
              
              const handleMouseMove = (e: MouseEvent) => {
                const diff = e.clientX - startX
                const newWidth = Math.max(300, Math.min(800, startWidth + diff))
                setLeftPanelWidth(newWidth)
              }
              
              const handleMouseUp = () => {
                setIsResizing(false)
                document.removeEventListener('mousemove', handleMouseMove)
                document.removeEventListener('mouseup', handleMouseUp)
                document.body.style.cursor = ''
                document.body.style.userSelect = ''
              }
              
              document.body.style.cursor = 'col-resize'
              document.body.style.userSelect = 'none'
              document.addEventListener('mousemove', handleMouseMove)
              document.addEventListener('mouseup', handleMouseUp)
            }}
            style={{
              position: 'absolute',
              right: '-2px',
              top: 0,
              bottom: 0,
              width: '4px',
              cursor: 'col-resize',
              backgroundColor: 'transparent',
              zIndex: 10,
              pointerEvents: 'auto'
            }}
            onMouseEnter={(e) => {
              if (!isResizing) {
                e.currentTarget.style.backgroundColor = 'var(--color-primary)'
              }
            }}
            onMouseLeave={(e) => {
              if (!isResizing) {
                e.currentTarget.style.backgroundColor = 'transparent'
              }
            }}
          />
          <h2 style={{ margin: '0 0 var(--space-xl) 0', fontSize: 'var(--font-size-2xl)', display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
            <DocumentCopy size={24} variant="Bold" />
            Заметка
          </h2>
          <input
            placeholder="Заголовок (опционально)"
            value={title}
            onChange={e => setTitle(e.target.value)}
            className="glass-input"
            style={{ marginBottom: 'var(--space-md)', width: '100%' }}
          />
          <Editor value={content} onChange={setContent} />
          <div style={{ display: 'flex', gap: 'var(--space-sm)', marginTop: 'var(--space-md)' }}>
            <button
              onClick={onAnalyze}
              disabled={analyzing}
              className="btn-primary"
              style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 'var(--space-sm)' }}
            >
              {analyzing ? (
                <>
                  <div className="spinner" />
                  Модель думает...
                </>
              ) : (
                <>
                  <Flash size={20} variant="Bold" />
                  Анализировать
                </>
              )}
            </button>
          </div>
          {analysisResult && (
            <AnalysisResults 
              result={analysisResult} 
              onTagClick={setHighlightedTag}
            />
          )}
          <NotesHistory
            notes={notes}
            onSelectNote={onSelectNote}
            onDeleteNote={onDeleteNote}
          />
        </div>

        {/* Right Panel - Overlay, only when node selected */}
        {selectedNode && (
          <div className="glass-panel" style={{
            width: '360px',
            padding: 0,
            borderLeft: '1px solid var(--glass-border)',
            overflowY: 'auto',
            overflowX: 'hidden',
            animation: 'slideInRight 0.3s ease-out',
            display: 'flex',
            flexDirection: 'column',
            height: '100%',
            background: 'var(--glass-bg)',
            backdropFilter: 'blur(10px) saturate(180%)',
            WebkitBackdropFilter: 'blur(10px) saturate(180%)',
            boxShadow: '-4px 0 20px rgba(0, 0, 0, 0.1)',
            position: 'absolute',
            right: 0,
            top: 0,
            bottom: 0,
            zIndex: 50
          }}>
            <NodeDetails 
              node={selectedNode} 
              onClose={() => {
                setSelectedNode(null)
                setHighlightedTag(null)
              }}
              onMultiSelect={() => {
                setMultiSelectMode(true)
                setSelectedNodes(new Set([selectedNode.id]))
              }}
              multiSelectMode={multiSelectMode}
              onUpdate={async () => {
                // Перезагружаем граф после обновления
                const graphData = await getAllGraph()
                const updatedNodes = graphData.nodes.map(n => ({
                  id: n.id,
                  name: n.label,
                  label: n.label,
                  summary: n.summary,
                  has_gap: n.has_gap,
                  level: n.level,
                  tags: n.tags || [],
                  knowledge_gaps: n.knowledge_gaps || [],
                  recommendations: n.recommendations || [],
                  ...n
                }))
                setGraph({
                  nodes: updatedNodes,
                  links: graphData.links
                })
                // Обновляем выбранный узел
                const updatedNode = updatedNodes.find(n => n.id === selectedNode.id)
                if (updatedNode) {
                  setSelectedNode(updatedNode)
                }
              }}
              onDelete={async () => {
                // Перезагружаем граф после удаления
                setSelectedNode(null)
                setHighlightedTag(null)
                const graphData = await getAllGraph()
                setGraph({
                  nodes: graphData.nodes.map(n => ({
                    id: n.id,
                    name: n.label,
                    label: n.label,
                    summary: n.summary,
                    has_gap: n.has_gap,
                    level: n.level,
                    tags: n.tags || [],
                    knowledge_gaps: n.knowledge_gaps || [],
                    recommendations: n.recommendations || [],
                    ...n
                  })),
                  links: graphData.links
                })
              }}
              onTagClick={(tag) => {
                // Если кликнули на уже подсвеченный тег, снимаем подсветку
                if (highlightedTag === tag) {
                  setHighlightedTag(null)
                } else {
                  setHighlightedTag(tag)
                }
              }}
            />
          </div>
        )}
      </div>
    </div>
  )
}

// Header component
interface HeaderProps {
  user: any
  onNavigate: (page: Page) => void
  onLogout: () => void
  currentPage: Page
}

const Header: React.FC<HeaderProps> = ({ user, onNavigate, onLogout, currentPage }) => (
  <div className="glass-panel" style={{
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    height: '64px',
    padding: '0 var(--space-2xl)',
    borderBottom: '1px solid var(--glass-border)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 1000,
    background: 'var(--glass-bg)',
    backdropFilter: 'blur(10px) saturate(180%)',
    WebkitBackdropFilter: 'blur(10px) saturate(180%)'
  }}>
    <h1 style={{
      fontSize: 'var(--font-size-xl)',
      fontWeight: 'var(--font-weight-bold)',
      color: 'var(--color-primary)',
      margin: 0
    }}>
      KnowYourPath
    </h1>
    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-lg)' }}>
      <span style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-sm)' }}>
        {user.username}
      </span>
      <button
        onClick={() => onNavigate(currentPage === 'main' ? 'settings' : 'main')}
        className="btn-ghost"
        style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)', padding: 'var(--space-sm)' }}
        title="Настройки"
      >
        <Setting2 size={24} variant="Bold" />
      </button>
      <ThemeSwitcher />
      <button
        onClick={onLogout}
        className="btn-ghost"
        style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}
        title="Выйти"
      >
        <LogoutCurve size={20} />
        Выйти
      </button>
    </div>
  </div>
)

// Analysis Results component
const AnalysisResults: React.FC<{ result: any; onTagClick: (tag: string | null) => void }> = ({ result, onTagClick }) => (
  <div className="glass-card slide-in" style={{
    marginTop: 'var(--space-xl)',
    padding: 'var(--space-xl)',
    fontSize: 'var(--font-size-sm)'
  }}>
    <div style={{ fontSize: 'var(--font-size-base)', fontWeight: 600, marginBottom: 'var(--space-md)' }}>
      Результаты анализа
    </div>

    {result.model_used && (
      <div style={{ marginBottom: 'var(--space-md)' }}>
        <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)', marginBottom: 'var(--space-xs)' }}>
          Модель:
        </div>
        <div style={{ fontWeight: 500 }}>{result.model_used}</div>
      </div>
    )}

    {result.main_topic && (
      <div style={{ marginBottom: 'var(--space-md)' }}>
        <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)', marginBottom: 'var(--space-xs)' }}>
          Главная тема:
        </div>
        <div style={{ fontWeight: 600 }}>{result.main_topic}</div>
      </div>
    )}

    {result.tags && result.tags.length > 0 && (
      <div style={{ marginBottom: 'var(--space-md)' }}>
        <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)', marginBottom: 'var(--space-xs)' }}>
          Теги:
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-xs)' }}>
          {result.tags.map((tag: string, idx: number) => (
            <span
              key={idx}
              onClick={() => onTagClick(tag)}
              style={{
                padding: '4px 10px',
                background: 'var(--color-primary)',
                color: 'var(--color-text-inverse)',
                borderRadius: 'var(--radius-full)',
                fontSize: 'var(--font-size-xs)',
                fontWeight: 500,
                cursor: 'pointer',
                transition: 'all var(--transition-fast)',
                display: 'inline-block'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'scale(1.1)'
                e.currentTarget.style.boxShadow = 'var(--shadow-md)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'scale(1)'
                e.currentTarget.style.boxShadow = 'none'
              }}
            >
              {tag}
            </span>
          ))}
        </div>
      </div>
    )}

    <div style={{
      marginTop: 'var(--space-md)',
      paddingTop: 'var(--space-md)',
      borderTop: '1px solid var(--glass-border)',
      fontSize: 'var(--font-size-xs)',
      color: 'var(--color-text-tertiary)'
    }}>
      Узлов: {result.nodes?.length || 0} • Связей: {result.links?.length || 0}
    </div>

    <div style={{
      marginTop: 'var(--space-sm)',
      padding: 'var(--space-sm)',
      background: 'var(--glass-bg)',
      borderRadius: 'var(--radius-sm)',
      fontSize: 'var(--font-size-xs)',
      color: 'var(--color-secondary)',
      textAlign: 'center'
    }}>
      ✅ Заметка автоматически сохранена
    </div>
  </div>
)
