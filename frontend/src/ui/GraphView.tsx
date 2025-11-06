import React, { useRef, useEffect, useState, useCallback } from 'react'
import ForceGraph2D from 'react-force-graph-2d'

export const GraphView: React.FC<{ data: any; onSelectNode: (n: any) => void }> = ({ data, onSelectNode }) => {
  const fgRef = useRef<any>()
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 })
  const [hoveredNode, setHoveredNode] = useState<any>(null)
  const [graphData, setGraphData] = useState(data)

  // Обновляем данные графа при изменении пропсов, сохраняя позиции узлов
  useEffect(() => {
    if (data && data.nodes && data.nodes.length > 0) {
      // Сохраняем позиции существующих узлов
      const nodePositions = new Map()
      if (graphData && graphData.nodes) {
        graphData.nodes.forEach((node: any) => {
          if (node.fx !== undefined && node.fy !== undefined) {
            nodePositions.set(node.id, { fx: node.fx, fy: node.fy })
          }
        })
      }
      
      // Применяем сохраненные позиции к новым данным
      const updatedNodes = data.nodes.map((node: any) => {
        const pos = nodePositions.get(node.id)
        if (pos) {
          return { ...node, fx: pos.fx, fy: pos.fy }
        }
        return node
      })
      
      setGraphData({ ...data, nodes: updatedNodes })
    } else if (!data || !data.nodes || data.nodes.length === 0) {
      setGraphData({ nodes: [], links: [] })
    }
  }, [data])

  useEffect(() => {
    const updateDimensions = () => {
      setDimensions({ width: window.innerWidth - 780, height: window.innerHeight })
    }
    updateDimensions()
    window.addEventListener('resize', updateDimensions)
    return () => window.removeEventListener('resize', updateDimensions)
  }, [])

  // Сохраняем позиции узлов при перетаскивании
  const handleNodeDrag = useCallback((node: any) => {
    // Фиксируем позицию узла при перетаскивании
    if (node) {
      node.fx = node.x
      node.fy = node.y
    }
  }, [])

  const handleNodeDragEnd = useCallback((node: any) => {
    // Сохраняем финальную позицию
    if (node) {
      node.fx = node.x
      node.fy = node.y
    }
  }, [])

  if (!graphData || !graphData.nodes || graphData.nodes.length === 0) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', background: '#f8f9fa' }}>
        <p style={{ color: '#666', fontSize: 16 }}>Граф пуст. Введите заметку и нажмите "Анализ"</p>
      </div>
    )
  }

  return (
    <div style={{ width: '100%', height: '100%', background: '#f8f9fa' }}>
      <ForceGraph2D
        ref={fgRef}
        graphData={graphData}
        width={dimensions.width}
        height={dimensions.height}
        nodeLabel={(n: any) => {
          const label = n.name || n.label || n.id
          const type = n.id?.startsWith('topic_') ? 'Главная тема' :
                       n.id?.startsWith('note_') ? 'Заметка' : 
                       n.id?.startsWith('concept_') ? 'Концепция' :
                       n.id?.startsWith('related_') ? 'Связанная концепция' :
                       n.id?.startsWith('wiki_') ? 'Wikipedia' : 'Узел'
          return `${type}: ${label}`
        }}
        onNodeClick={(n: any) => onSelectNode(n)}
        onNodeHover={(n: any) => setHoveredNode(n)}
        onNodeDrag={handleNodeDrag}
        onNodeDragEnd={handleNodeDragEnd}
        nodeColor={(n: any) => {
          if (n.has_gap) return '#ff6b6b'
          if (n.id?.startsWith('topic_')) return '#51cf66'  // Центральный узел - зеленый
          if (n.id?.startsWith('note_')) return '#51cf66'
          if (n.id?.startsWith('wiki_')) return '#ffd43b'
          if (n.level === 0) return '#51cf66'  // Центральный узел
          if (n.level === 1) return '#4dabf7'  // Первый уровень - синий
          if (n.level === 2) return '#74c0fc'  // Второй уровень - светло-синий
          return '#339af0'
        }}
        nodeVal={(n: any) => {
          // Размер узла зависит от типа и уровня
          if (n.id?.startsWith('topic_') || n.level === 0) return 12  // Центральный узел - самый большой
          if (n.id?.startsWith('note_')) return 10
          if (n.id?.startsWith('wiki_')) return 7
          if (n.level === 1) return 7  // Первый уровень
          if (n.level === 2) return 5  // Второй уровень
          return 5
        }}
        linkLabel={(l: any) => l.relation || 'связано'}
        linkWidth={(l: any) => {
          if (l.relation === 'contains' || l.relation === 'part_of') return 3
          return 2
        }}
        linkDirectionalArrowLength={6}
        linkDirectionalArrowRelPos={1}
        linkColor={(l: any) => {
          if (l.relation === 'contains' || l.relation === 'part_of') return '#495057'
          return '#adb5bd'
        }}
        cooldownTicks={100}
        onEngineStop={() => {
          // Не фиксируем позиции автоматически, чтобы узлы могли двигаться
        }}
      />
    </div>
  )
}


