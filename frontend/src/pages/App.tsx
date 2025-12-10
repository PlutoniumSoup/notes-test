import React, { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { AuthPage } from './AuthPage'
import { SettingsPage } from './SettingsPage'
import { ThemeSwitcher } from '../ui/ThemeSwitcher'
import { Editor } from '../ui/Editor'
import { GraphView } from '../ui/GraphView'
import { NodeDetails } from '../ui/NodeDetails'
import { analyzeNote, createNote } from '../shared/api'

type Page = 'main' | 'settings'

export const App: React.FC = () => {
  const { user, loading, logout } = useAuth()
  const [currentPage, setCurrentPage] = useState<Page>('main')
  
  const [content, setContent] = useState('')
  const [title, setTitle] = useState('')
  const [graph, setGraph] = useState<{ nodes: any[]; links: any[] }>({ nodes: [], links: [] })
  const [selectedNode, setSelectedNode] = useState<any | null>(null)
  const [analyzing, setAnalyzing] = useState(false)
  const [analysisResult, setAnalysisResult] = useState<any>(null)

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
        <SettingsPage />
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
      
      const nodes = result.nodes.map((n: any) => ({ 
        id: n.id, 
        name: n.label,
        label: n.label,
        summary: n.summary,
        has_gap: n.has_gap,
        level: n.level,
        tags: n.tags,
        ...n 
      }))
      const links = result.links.map((l: any) => ({
        source: l.source,
        target: l.target,
        relation: l.relation,
        ...l
      }))
      setGraph({ nodes, links })
    } catch (error: any) {
      console.error('Analysis error:', error)
      alert(`Ошибка при анализе: ${error.response?.data?.detail || error.message}`)
    } finally {
      setAnalyzing(false)
    }
  }

  const onSave = async () => {
    if (!title.trim() || !content.trim()) {
      alert('Введите заголовок и содержимое заметки')
      return
    }
    try {
      const tags = analysisResult?.tags || []
      await createNote({ title, content, tags })
      alert('Заметка сохранена!')
    } catch (error: any) {
      console.error('Save error:', error)
      alert(`Ошибка при сохранении: ${error.response?.data?.detail || error.message}`)
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
      <div style={{ display: 'grid', gridTemplateColumns: '420px 1fr 360px', height: 'calc(100vh - 64px)' }}>
        <div style={{
          padding: 'var(--space-2xl)',
          borderRight: '1px solid var(--color-border)',
          background: 'var(--color-surface)',
          overflowY: 'auto'
        }}>
          <h2 style={{ margin: '0 0 var(--space-xl) 0', fontSize: 'var(--font-size-2xl)' }}>Заметка</h2>
          <input
            placeholder="Заголовок"
            value={title}
            onChange={e => setTitle(e. target.value)}
            style={{ marginBottom: 'var(--space-md)' }}
          />
          <Editor value={content} onChange={setContent} />
          <div style={{ display: 'flex', gap: 'var(--space-sm)', marginTop: 'var(--space-md)' }}>
            <button 
              onClick={onAnalyze} 
              disabled={analyzing}
              className="btn-primary"
              style={{ flex: 1 }}
            >
              {analyzing ? (
                <>
                  <div className="spinner" />
                  Анализ...
                </>
              ) : (
                'Анализ (LLM)'
              )}
            </button>
            <button 
              onClick={onSave}
              className="btn-secondary"
              style={{ flex: 1 }}
            >
              Сохранить
            </button>
          </div>
          {analysisResult && (
            <AnalysisResults result={analysisResult} />
          )}
        </div>
        <div style={{ background: 'var(--color-background)' }}>
          <GraphView data={graph} onSelectNode={setSelectedNode} />
        </div>
        <div style={{
          padding: 0,
          borderLeft: '1px solid var(--color-border)',
          background: 'var(--color-surface)',
          overflowY: 'auto'
        }}>
          <NodeDetails node={selectedNode} />
        </div>
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
  <div style={{
    height: '64px',
    padding: '0 var(--space-2xl)',
    background: 'var(--color-surface)',
    borderBottom: '1px solid var(--color-border)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between'
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
      >
        {currentPage === 'main' ? 'Settings' : 'Notes'}
      </button>
      <ThemeSwitcher />
      <button onClick={onLogout} className="btn-ghost">
        Logout
      </button>
    </div>
  </div>
)

// Analysis Results component
const AnalysisResults: React.FC<{ result: any }> = ({ result }) => (
  <div style={{
    marginTop: 'var(--space-xl)',
    padding: 'var(--space-xl)',
    background: 'var(--color-background)',
    borderRadius: 'var(--radius-lg)',
    fontSize: 'var(--font-size-sm)'
  }} className="slide-in">
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
              style={{
                padding: '4px 10px',
                background: 'var(--color-primary)',
                color: 'var(--color-text-inverse)',
                borderRadius: 'var(--radius-full)',
                fontSize: 'var(--font-size-xs)',
                fontWeight: 500
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
      borderTop: '1px solid var(--color-border)',
      fontSize: 'var(--font-size-xs)',
      color: 'var(--color-text-tertiary)'
    }}>
      Узлов: {result.nodes?.length || 0} • Связей: {result.links?.length || 0}
    </div>
  </div>
)
