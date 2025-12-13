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
  const [isInitialized, setIsInitialized] = useState(false)
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

  // Сохраняем позиции узлов в localStorage при их изменении
  useEffect(() => {
    if (graphData && graphData.nodes && graphData.nodes.length > 0) {
      const nodePositions: Record<string, { fx: number; fy: number }> = {}
      graphData.nodes.forEach((node: any) => {
        if (node.fx !== undefined && node.fx !== null && node.fy !== undefined && node.fy !== null) {
          nodePositions[node.id] = { fx: node.fx, fy: node.fy }
        }
      })
      if (Object.keys(nodePositions).length > 0) {
        localStorage.setItem('graphNodePositions', JSON.stringify(nodePositions))
      }
    }
  }, [graphData])

  // Обновляем данные графа при изменении пропсов, сохраняя позиции узлов
  useEffect(() => {
    if (data && data.nodes && data.nodes.length > 0) {
      // Загружаем сохраненные позиции из localStorage
      let savedPositions: Record<string, { fx: number; fy: number }> = {}
      try {
        const saved = localStorage.getItem('graphNodePositions')
        if (saved) {
          savedPositions = JSON.parse(saved)
        }
      } catch (e) {
        console.warn('Failed to load saved node positions', e)
      }

      // Сохраняем позиции существующих узлов из текущего graphData
      const nodePositions = new Map<string, { fx: number; fy: number }>()
      if (graphData && graphData.nodes) {
        graphData.nodes.forEach((node: any) => {
          // Сохраняем только если узел был зафиксирован (fx/fy установлены и не null)
          if (node.fx !== undefined && node.fx !== null && node.fy !== undefined && node.fy !== null) {
            nodePositions.set(node.id, { fx: node.fx, fy: node.fy })
          }
        })
      }

      // Применяем сохраненные позиции к новым данным
      const updatedNodes = data.nodes.map((node: any) => {
        // Сначала проверяем текущие позиции из graphData
        const currentPos = nodePositions.get(node.id)
        if (currentPos) {
          return { ...node, fx: currentPos.fx, fy: currentPos.fy }
        }
        // Затем проверяем сохраненные позиции из localStorage
        const savedPos = savedPositions[node.id]
        if (savedPos) {
          return { ...node, fx: savedPos.fx, fy: savedPos.fy }
        }
        // Для новых узлов или узлов без фиксированной позиции - убираем fx/fy
        const newNode = { ...node }
        delete newNode.fx
        delete newNode.fy
        return newNode
      })

      setGraphData({ ...data, nodes: updatedNodes })
      setIsInitialized(true)
    } else if (!data || !data.nodes || data.nodes.length === 0) {
      setGraphData({ nodes: [], links: [] })
      setIsInitialized(true)
    }
  }, [data])

  useEffect(() => {
    const updateDimensions = () => {
      // Размеры будут обновляться через ref контейнера
      const container = fgRef.current?.parentElement
      if (container && container.clientWidth > 0 && container.clientHeight > 0) {
        const newWidth = container.clientWidth
        const newHeight = container.clientHeight
        setDimensions({ 
          width: newWidth, 
          height: newHeight 
        })
        // Принудительно обновляем размеры графа
        if (fgRef.current) {
          fgRef.current.width(newWidth)
          fgRef.current.height(newHeight)
          // Перезапускаем симуляцию для применения новых размеров
          if (isInitialized) {
            fgRef.current.d3Force('center')?.strength(0.1)
            fgRef.current.d3Force('charge')?.strength(-300)
            fgRef.current.d3ReheatSimulation()
          }
        }
      } else {
        // Fallback если контейнер еще не готов
        setDimensions({ 
          width: window.innerWidth, 
          height: window.innerHeight - 64 
        })
      }
    }
    
    // Небольшая задержка для корректного расчета размеров после монтирования
    const timeoutId1 = setTimeout(updateDimensions, 50)
    const timeoutId2 = setTimeout(updateDimensions, 200)
    const timeoutId3 = setTimeout(updateDimensions, 500)
    
    updateDimensions()
    window.addEventListener('resize', updateDimensions)
    
    // Используем ResizeObserver для отслеживания изменений размера контейнера
    const container = fgRef.current?.parentElement
    let resizeObserver: ResizeObserver | null = null
    if (container && window.ResizeObserver) {
      resizeObserver = new ResizeObserver(() => {
        // Небольшая задержка для стабилизации размеров
        setTimeout(updateDimensions, 10)
      })
      resizeObserver.observe(container)
    }
    
    return () => {
      clearTimeout(timeoutId1)
      clearTimeout(timeoutId2)
      clearTimeout(timeoutId3)
      window.removeEventListener('resize', updateDimensions)
      if (resizeObserver) {
        resizeObserver.disconnect()
      }
    }
  }, [focusedNode, isInitialized])

  // Сохраняем позиции узлов при перетаскивании
  const handleNodeDrag = useCallback((node: any) => {
    // Фиксируем позицию только перетаскиваемого узла во время drag
    // Это предотвращает отталкивание другими узлами
    if (node) {
      node.fx = node.x
      node.fy = node.y
    }
  }, [])

  const handleNodeDragEnd = useCallback((node: any) => {
    // Сохраняем финальную позицию только перетаскиваемого узла
    // После окончания drag узел остается зафиксированным
    if (node) {
      node.fx = node.x
      node.fy = node.y
    }
  }, [])

  // Theme-aware colors
  const isDark = theme === 'dark' || theme === 'dark-black'
  const isBlack = theme === 'dark-black'
  const bgColor = isBlack ? '#000000' : (isDark ? '#0f172a' : '#f9fafb')

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
    
    // Желтый цвет для узлов с пробелами знаний
    if (n.has_gap || (n.knowledge_gaps && n.knowledge_gaps.length > 0) || (n.recommendations && n.recommendations.length > 0)) {
      return isDark ? '#fbbf24' : '#f59e0b' // Желтый для пробелов знаний
    }
    
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
  // Инициализация сил графа
  useEffect(() => {
    if (fgRef.current && isInitialized) {
      // Настраиваем силы для правильной работы графа
      fgRef.current.d3Force('charge')?.strength(-300)
      fgRef.current.d3Force('link')?.distance(100)
      fgRef.current.d3Force('center')?.strength(0.1)
      // Перезапускаем симуляцию для применения настроек
      fgRef.current.d3ReheatSimulation()
    }
  }, [isInitialized])

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
    const isBlackTheme = theme === 'dark-black'
    ctx.strokeStyle = isDark 
      ? (isBlackTheme ? 'rgba(255, 255, 255, 0.3)' : 'rgba(255, 255, 255, 0.2)')
      : 'rgba(0, 0, 0, 0.1)'
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
    
    const isDarkTheme = theme === 'dark' || theme === 'dark-black'
    const textColor = isDarkTheme 
      ? (isBlackTheme ? 'rgba(255, 255, 255, ' + opacity + ')' : 'rgba(241, 245, 249, ' + opacity + ')')
      : 'rgba(17, 24, 39, ' + opacity + ')'
    
    // Рисуем фон для текста для лучшей читаемости
    const textWidth = ctx.measureText(label).width
    const padding = 4 / globalScale
    ctx.fillStyle = isDarkTheme 
      ? (isBlackTheme ? 'rgba(0, 0, 0, ' + (opacity * 0.8) + ')' : 'rgba(15, 23, 42, ' + (opacity * 0.7) + ')')
      : 'rgba(249, 250, 251, ' + (opacity * 0.9) + ')'
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
        d3AlphaDecay={0.0228}
        d3AlphaMin={0.001}
        onEngineStop={() => {
          // Когда симуляция останавливается, сохраняем финальные позиции
          if (fgRef.current && graphData?.nodes) {
            graphData.nodes.forEach((node: any) => {
              if (node.x !== undefined && node.y !== undefined) {
                // Сохраняем позицию только если узел был зафиксирован
                if (node.fx !== undefined && node.fy !== undefined) {
                  node.fx = node.x
                  node.fy = node.y
                }
              }
            })
          }
        }}
      />
    </div>
  )
}

