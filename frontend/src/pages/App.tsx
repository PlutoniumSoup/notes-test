import React, { useState } from 'react'
import { Editor } from '../ui/Editor'
import { GraphView } from '../ui/GraphView'
import { NodeDetails } from '../ui/NodeDetails'
import { analyzeNote, createNote } from '../shared/api'

export const App: React.FC = () => {
  const [content, setContent] = useState('')
  const [title, setTitle] = useState('')
  const [graph, setGraph] = useState<{ nodes: any[]; links: any[] }>({ nodes: [], links: [] })
  const [selectedNode, setSelectedNode] = useState<any | null>(null)
  const [analyzing, setAnalyzing] = useState(false)
  const [analysisResult, setAnalysisResult] = useState<any>(null)

  const onAnalyze = async () => {
    if (!content.trim()) {
      alert('Введите текст заметки для анализа')
      return
    }
    setAnalyzing(true)
    try {
      const result = await analyzeNote(content)
      setAnalysisResult(result)
      
      // Преобразуем результат в формат для графа
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
     <div style={{ display: 'grid', gridTemplateColumns: '420px 1fr 360px', height: '100vh', background: '#f8f9fa' }}>
       <div style={{ padding: 20, borderRight: '1px solid #dee2e6', background: 'white', overflowY: 'auto' }}>
         <h2 style={{ margin: '0 0 16px 0', fontSize: 24, color: '#212529' }}>Заметка</h2>
         <input
           placeholder="Заголовок"
           value={title}
           onChange={e => setTitle(e.target.value)}
           style={{ 
             width: '100%', 
             marginBottom: 12, 
             padding: '10px 12px',
             border: '1px solid #dee2e6',
             borderRadius: 6,
             fontSize: 14
           }}
         />
         <Editor value={content} onChange={setContent} />
         <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
           <button 
             onClick={onAnalyze} 
             disabled={analyzing}
             style={{
               flex: 1,
               padding: '10px 16px',
               background: analyzing ? '#868e96' : '#4dabf7',
               color: 'white',
               border: 'none',
               borderRadius: 6,
               fontSize: 14,
               fontWeight: 500,
               cursor: analyzing ? 'not-allowed' : 'pointer'
             }}
           >
             {analyzing ? 'Анализ...' : 'Анализ (LLM)'}
           </button>
           <button 
             onClick={onSave}
             style={{
               flex: 1,
               padding: '10px 16px',
               background: '#51cf66',
               color: 'white',
               border: 'none',
               borderRadius: 6,
               fontSize: 14,
               fontWeight: 500,
               cursor: 'pointer'
             }}
           >
             Сохранить
           </button>
         </div>
         {analysisResult && (
           <div style={{ marginTop: 16, padding: 16, background: '#f8f9fa', borderRadius: 8, fontSize: 13 }}>
             <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 12, color: '#212529' }}>Результаты анализа</div>
             
             <div style={{ marginBottom: 12 }}>
               <div style={{ fontSize: 11, color: '#666', marginBottom: 4 }}>Модель:</div>
               <div style={{ fontSize: 12, color: '#212529', fontWeight: 500 }}>
                 {analysisResult.model_used || 'неизвестно'}
               </div>
             </div>
             
             {analysisResult.reasoning && (
               <div style={{ marginBottom: 12, padding: 10, background: 'white', borderRadius: 6 }}>
                 <div style={{ fontSize: 11, color: '#666', marginBottom: 4 }}>Рассуждения:</div>
                 <div style={{ fontSize: 12, fontStyle: 'italic', color: '#495057' }}>
                   {analysisResult.reasoning}
                 </div>
               </div>
             )}
             
             {analysisResult.main_topic && (
               <div style={{ marginBottom: 12 }}>
                 <div style={{ fontSize: 11, color: '#666', marginBottom: 4 }}>Главная тема:</div>
                 <div style={{ fontSize: 13, fontWeight: 600, color: '#212529' }}>
                   {analysisResult.main_topic}
                 </div>
               </div>
             )}
             
             {analysisResult.main_concepts && analysisResult.main_concepts.length > 0 && (
               <div style={{ marginBottom: 12 }}>
                 <div style={{ fontSize: 11, color: '#666', marginBottom: 6 }}>Основные концепции:</div>
                 <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                   {analysisResult.main_concepts.map((concept: string, idx: number) => (
                     <span
                       key={idx}
                       style={{
                         padding: '4px 10px',
                         background: '#e7f5ff',
                         color: '#1971c2',
                         borderRadius: 12,
                         fontSize: 11,
                         fontWeight: 500
                       }}
                     >
                       {concept}
                     </span>
                   ))}
                 </div>
               </div>
             )}
             
             {analysisResult.tags && analysisResult.tags.length > 0 && (
               <div style={{ marginBottom: 12 }}>
                 <div style={{ fontSize: 11, color: '#666', marginBottom: 6 }}>Теги:</div>
                 <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                   {analysisResult.tags.map((tag: string, idx: number) => (
                     <span
                       key={idx}
                       style={{
                         padding: '4px 10px',
                         background: '#d0ebff',
                         color: '#1971c2',
                         borderRadius: 12,
                         fontSize: 11,
                         fontWeight: 500
                       }}
                     >
                       {tag}
                     </span>
                   ))}
                 </div>
               </div>
             )}
             
             {analysisResult.summary && (
               <div style={{ marginBottom: 12 }}>
                 <div style={{ fontSize: 11, color: '#666', marginBottom: 4 }}>Резюме:</div>
                 <div style={{ fontSize: 12, color: '#495057', lineHeight: 1.5 }}>
                   {analysisResult.summary}
                 </div>
               </div>
             )}
             
             {analysisResult.knowledge_gaps && analysisResult.knowledge_gaps.length > 0 && (
               <div style={{ marginBottom: 12, padding: 10, background: '#fff3cd', borderRadius: 6 }}>
                 <div style={{ fontSize: 11, color: '#856404', marginBottom: 4, fontWeight: 600 }}>Пробелы в знаниях:</div>
                 <div style={{ fontSize: 12, color: '#856404' }}>
                   {analysisResult.knowledge_gaps.join(', ')}
                 </div>
               </div>
             )}
             
             <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid #dee2e6', fontSize: 11, color: '#868e96' }}>
               Узлов: {analysisResult.nodes?.length || 0} • Связей: {analysisResult.links?.length || 0}
             </div>
           </div>
         )}
       </div>
       <div style={{ background: '#f8f9fa' }}>
         <GraphView data={graph} onSelectNode={setSelectedNode} />
       </div>
       <div style={{ padding: 0, borderLeft: '1px solid #dee2e6', background: 'white', overflowY: 'auto' }}>
         <NodeDetails node={selectedNode} />
       </div>
     </div>
   )
 }


