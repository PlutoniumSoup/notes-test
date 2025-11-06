import React from 'react'

export const NodeDetails: React.FC<{ node: any | null }> = ({ node }) => {
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
  
  return (
    <div style={{ padding: 16 }}>
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 12, color: '#666', marginBottom: 4 }}>{getNodeType()}</div>
        <h2 style={{ margin: 0, fontSize: 20, color: '#212529' }}>{node.label || node.name}</h2>
        {getLevelLabel() && (
          <div style={{ fontSize: 11, color: '#868e96', marginTop: 4 }}>{getLevelLabel()}</div>
        )}
      </div>
      
      {node.summary && (
        <div style={{ marginBottom: 16, padding: 12, background: '#f8f9fa', borderRadius: 6 }}>
          <div style={{ fontSize: 12, color: '#666', marginBottom: 6, fontWeight: 600 }}>Описание:</div>
          <p style={{ margin: 0, fontSize: 14, lineHeight: 1.6, color: '#212529' }}>{node.summary}</p>
        </div>
      )}
      
      {node.tags && node.tags.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 12, color: '#666', marginBottom: 6, fontWeight: 600 }}>Теги:</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {node.tags.map((tag: string, idx: number) => (
              <span
                key={idx}
                style={{
                  padding: '4px 10px',
                  background: '#e7f5ff',
                  color: '#1971c2',
                  borderRadius: 12,
                  fontSize: 12,
                  fontWeight: 500
                }}
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
      )}
      
      {node.has_gap && (
        <div style={{ padding: 10, background: '#fff3cd', borderRadius: 6, marginBottom: 16 }}>
          <div style={{ fontSize: 12, color: '#856404', fontWeight: 600 }}>
            ⚠️ Здесь есть что изучить
          </div>
        </div>
      )}
      
      <div style={{ fontSize: 11, color: '#868e96', marginTop: 16, paddingTop: 16, borderTop: '1px solid #dee2e6' }}>
        ID: {node.id}
      </div>
    </div>
  )
}


