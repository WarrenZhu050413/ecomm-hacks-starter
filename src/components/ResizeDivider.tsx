import React, { useState, useCallback, useEffect } from 'react'

interface ResizeDividerProps {
  onDrag: (deltaX: number) => void
  onDragEnd: () => void
  onDoubleClick?: () => void
}

export function ResizeDivider({
  onDrag,
  onDragEnd,
  onDoubleClick,
}: ResizeDividerProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [startX, setStartX] = useState(0)

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    setIsDragging(true)
    setStartX(e.clientX)
  }, [])

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isDragging) return
      const deltaX = e.clientX - startX
      setStartX(e.clientX)
      onDrag(deltaX)
    },
    [isDragging, startX, onDrag]
  )

  const handleMouseUp = useCallback(() => {
    if (isDragging) {
      setIsDragging(false)
      onDragEnd()
    }
  }, [isDragging, onDragEnd])

  // Attach global listeners when dragging
  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
      document.body.style.cursor = 'col-resize'
      document.body.style.userSelect = 'none'
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }
  }, [isDragging, handleMouseMove, handleMouseUp])

  return (
    <div
      className={`resize-divider ${isDragging ? 'dragging' : ''}`}
      onMouseDown={handleMouseDown}
      onDoubleClick={onDoubleClick}
      title="Drag to resize • Double-click to reset"
    />
  )
}
