import React, { useRef, useEffect, useState, useCallback } from 'react'
import ForceGraph2D from 'react-force-graph-2d'
import { useTheme } from '../contexts/ThemeContext'

interface GraphViewProps {
  data: any;
  onSelectNode: (n: any) => void;
  highlightedTag?: string | null;
  onBackgroundClick?: () => void;
  focusedNode?: any | null;
  selectedNodes?: Set<string>;
}

export const GraphView: React.FC<GraphViewProps> = ({ data, onSelectNode, highlightedTag, onBackgroundClick, focusedNode, selectedNodes = new Set() }) => {
  const fgRef = useRef<any>()
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 })
  const [hoveredNode, setHoveredNode] = useState<any>(null)
  const [graphData, setGraphData] = useState(data)
  const { theme } = useTheme()
  
  // Вычисляем расстояния от сфокусированного узла до всех остальных
  const getNodeDistance = useCallback((nodeId: string) => {
    if (!focusedNode || !graphData?.links) return Infinity
    
    if (nodeId === focusedNode.id) return 0
    
    // BFS для поиска кратчайшего пути
    const visited = new Set<string>()
    const queue: Array<{ id: string; distance: number }> = [{ id: focusedNode.id, distance: 0 }]
    
    while (queue.length > 0) {
      const current = queue.shift()!
      if (current.id === nodeId) return current.distance
      if (visited.has(current.id)) continue
      visited.add(current.id)
      
      // Находим соседей
      graphData.links.forEach((link: any) => {
        if (link.source === current.id || link.source.id === current.id) {
          const targetId = typeof link.target === 'string' ? link.target : link.target.id
          if (!visited.has(targetId)) {
            queue.push({ id: targetId, distance: current.distance + 1 })
          }
        }
        if (link.target === current.id || link.target.id === current.id) {
          const sourceId = typeof link.source === 'string' ? link.source : link.source.id
          if (!visited.has(sourceId)) {
            queue.push({ id: sourceId, distance: current.distance + 1 })
          }
        }
      })
    }
    
    return Infinity
  }, [focusedNode, graphData])
  
  // Определяем, нужно ли показывать имя узла
  const shouldShowLabel = useCallback((node: any) => {
    // Всегда показываем основные узлы (level 0)
    if (node.level === 0 || node.id?.startsWith('topic_')) return true
    
    // Показываем сфокусированный узел
    if (focusedNode && node.id === focusedNode.id) return true
    
    // Показываем ближайшие узлы с убывающей прозрачностью (до 3 уровней)
    if (focusedNode) {
      const distance = getNodeDistance(node.id)
      return distance <= 3
    }
    
    return false
  }, [focusedNode, getNodeDistance])
  
  // Получаем прозрачность для имени узла
  const getLabelOpacity = useCallback((node: any) => {
    if (!focusedNode) {
      // Без фокуса показываем только основные узлы
      if (node.level === 0 || node.id?.startsWith('topic_')) return 1
      return 0
    }
    
    if (node.id === focusedNode.id) return 1 // Сфокусированный узел - полная непрозрачность
    
    if (node.level === 0 || node.id?.startsWith('topic_')) return 0.9 // Основные узлы
    
    const distance = getNodeDistance(node.id)
    if (distance === 1) return 0.8 // Первый уровень - почти непрозрачно
    if (distance === 2) return 0.6 // Второй уровень
    if (distance === 3) return 0.4 // Третий уровень
    return 0 // Остальные скрыты
  }, [focusedNode, getNodeDistance])

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

  // Theme-aware colors
  const isDark = theme === 'dark'
  const bgColor = isDark ? '#0f172a' : '#f9fafb'

  // Node colors based on theme
  const getNodeColor = (n: any) => {
    // Подсветка выбранных узлов в режиме множественного выбора
    if (selectedNodes.has(n.id)) {
      return isDark ? '#f87171' : '#ef4444' // Красный для выбранных
    }
    
    // Подсветка узлов с выбранным тегом
    if (highlightedTag && n.tags && n.tags.includes(highlightedTag)) {
      return isDark ? '#a78bfa' : '#8b5cf6' // Accent color для подсветки
    }
    
    if (n.has_gap) return isDark ? '#f87171' : '#ef4444'
    if (n.id?.startsWith('topic_')) return isDark ? '#34d399' : '#10b981'
    if (n.id?.startsWith('note_')) return isDark ? '#34d399' : '#10b981'
    if (n.id?.startsWith('wiki_')) return isDark ? '#fbbf24' : '#f59e0b'
    if (n.level === 0) return isDark ? '#34d399' : '#10b981'
    if (n.level === 1) return isDark ? '#60a5fa' : '#3b82f6'
    if (n.level === 2) return isDark ? '#93c5fd' : '#60a5fa'
    return isDark ? '#60a5fa' : '#3b82f6'
  }
  
  // Размер узла при подсветке
  const getNodeSize = (n: any) => {
    const baseSize = getNodeVal(n)
    // Выбранные узлы в режиме множественного выбора
    if (selectedNodes.has(n.id)) {
      return baseSize * 1.5 // Увеличиваем размер выбранных узлов
    }
    if (highlightedTag && n.tags && n.tags.includes(highlightedTag)) {
      return baseSize * 1.3 // Увеличиваем размер подсвеченных узлов
    }
    return baseSize
  }
  
  const getNodeVal = (n: any) => {
    // Размер узла зависит от типа и уровня
    if (n.id?.startsWith('topic_') || n.level === 0) return 12  // Центральный узел - самый большой
    if (n.id?.startsWith('note_')) return 10
    if (n.id?.startsWith('wiki_')) return 7
    if (n.level === 1) return 7  // Первый уровень
    if (n.level === 2) return 5  // Второй уровень
    return 5
  }

  const getLinkColor = (l: any) => {
    if (l.relation === 'contains' || l.relation === 'part_of') {
      return isDark ? '#64748b' : '#475569'
    }
    return isDark ? '#475569' : '#94a3b8'
  }

  // Отрисовка узлов и имен с прозрачностью
  const nodeCanvasObject = useCallback((node: any, ctx: CanvasRenderingContext2D, globalScale: number) => {
    // Сначала рисуем сам узел (круг)
    const nodeSize = getNodeSize(node)
    const nodeColor = getNodeColor(node)
    
    // Рисуем круг узла
    ctx.beginPath()
    ctx.arc(node.x, node.y, nodeSize, 0, 2 * Math.PI, false)
    ctx.fillStyle = nodeColor
    ctx.fill()
    
    // Добавляем обводку для лучшей видимости
    ctx.strokeStyle = theme === 'dark' ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.1)'
    ctx.lineWidth = 1 / globalScale
    ctx.stroke()
    
    // Теперь рисуем текст, если нужно
    if (!shouldShowLabel(node)) return
    
    const label = node.name || node.label || node.id
    const opacity = getLabelOpacity(node)
    
    if (opacity <= 0) return
    
    const fontSize = 12 / globalScale
    ctx.font = `${fontSize}px ${getComputedStyle(document.body).fontFamily}`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    
    const isDarkTheme = theme === 'dark'
    const textColor = isDarkTheme ? 'rgba(241, 245, 249, ' + opacity + ')' : 'rgba(17, 24, 39, ' + opacity + ')'
    
    // Рисуем фон для текста для лучшей читаемости
    const textWidth = ctx.measureText(label).width
    const padding = 4 / globalScale
    ctx.fillStyle = isDarkTheme ? 'rgba(15, 23, 42, ' + (opacity * 0.7) + ')' : 'rgba(249, 250, 251, ' + (opacity * 0.9) + ')'
    ctx.fillRect(
      node.x - textWidth / 2 - padding,
      node.y + nodeSize + padding,
      textWidth + padding * 2,
      fontSize + padding * 2
    )
    
    // Рисуем текст
    ctx.fillStyle = textColor
    ctx.fillText(label, node.x, node.y + nodeSize + fontSize / 2 + padding)
  }, [shouldShowLabel, getLabelOpacity, theme, getNodeSize, getNodeColor])

  if (!graphData || !graphData.nodes || graphData.nodes.length === 0) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', background: 'var(--color-background)' }}>
        <p style={{ color: 'var(--color-text-secondary)', fontSize: 16 }}>Граф пуст. Введите заметку и нажмите "Анализировать"</p>
      </div>
    )
  }

  return (
    <div style={{ width: '100%', height: '100%', background: 'var(--color-background)' }}>
      <ForceGraph2D
        ref={fgRef}
        graphData={graphData}
        width={dimensions.width}
        height={dimensions.height}
        backgroundColor={bgColor}
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
        onBackgroundClick={() => onBackgroundClick?.()}
        nodeColor={getNodeColor}
        nodeVal={(n: any) => {
          const size = getNodeSize(n)
          n.__size = size // Сохраняем размер для использования в отрисовке текста
          return size
        }}
        nodeCanvasObject={nodeCanvasObject}
        linkLabel={(l: any) => l.relation || 'связано'}
        linkWidth={(l: any) => {
          if (l.relation === 'contains' || l.relation === 'part_of') return 3
          return 2
        }}
        linkDirectionalArrowLength={6}
        linkDirectionalArrowRelPos={1}
        linkColor={getLinkColor}
        cooldownTicks={100}
        onEngineStop={() => {
          // Не фиксируем позиции автоматически, чтобы узлы могли двигаться
        }}
      />
    </div>
  )
}

