import { useRef } from 'react'

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v))

/**
 * A draggable / resizable box positioned in normalized page coordinates.
 * item: { x, y, w, h } (0..1). onChange(patch). keepRatio locks aspect while resizing.
 */
export default function Placeable({ item, page, selected, onSelect, onChange, onRemove, keepRatio, children, className = '', label }) {
  const start = useRef(null)

  const begin = (mode) => (e) => {
    e.preventDefault()
    e.stopPropagation()
    onSelect?.()
    e.currentTarget.setPointerCapture(e.pointerId)
    start.current = { mode, px: e.clientX, py: e.clientY, item: { ...item } }
  }
  const move = (e) => {
    const s = start.current
    if (!s) return
    const dx = (e.clientX - s.px) / page.w
    const dy = (e.clientY - s.py) / page.h
    if (s.mode === 'move') {
      onChange({ x: clamp(s.item.x + dx, 0, 1 - s.item.w), y: clamp(s.item.y + dy, 0, 1 - s.item.h) })
    } else {
      let w = clamp(s.item.w + dx, 0.02, 1 - s.item.x)
      let h = keepRatio ? (w * s.item.h) / s.item.w : clamp(s.item.h + dy, 0.012, 1 - s.item.y)
      if (s.item.y + h > 1) { h = 1 - s.item.y; if (keepRatio) w = (h * s.item.w) / s.item.h }
      onChange({ w, h })
    }
  }
  const end = () => { start.current = null }

  const onKey = (e) => {
    const step = e.shiftKey ? 0.02 : 0.004
    const map = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] }
    if (map[e.key]) {
      e.preventDefault()
      onChange({ x: clamp(item.x + map[e.key][0], 0, 1 - item.w), y: clamp(item.y + map[e.key][1], 0, 1 - item.h) })
    } else if ((e.key === 'Delete' || e.key === 'Backspace') && onRemove) {
      e.preventDefault()
      onRemove()
    }
  }

  return (
    <div
      className={`placed ${selected ? 'selected' : ''} ${className}`}
      style={{ left: `${item.x * 100}%`, top: `${item.y * 100}%`, width: `${item.w * 100}%`, height: `${item.h * 100}%` }}
      onPointerDown={begin('move')}
      onPointerMove={move}
      onPointerUp={end}
      onPointerCancel={end}
      onKeyDown={onKey}
      tabIndex={0}
      role="button"
      aria-label={label || 'Placed item — drag to move, arrow keys to nudge'}
    >
      {children}
      {onRemove && (
        <button className="remove" onPointerDown={(e) => e.stopPropagation()} onClick={(e) => { e.stopPropagation(); onRemove() }} aria-label="Remove">×</button>
      )}
      <span className="handle" onPointerDown={begin('resize')} onPointerMove={move} onPointerUp={end} />
    </div>
  )
}
