import { useEffect } from 'react'
import Icon from './Icon.jsx'
import { useT } from '../i18n/index.jsx'

export default function Modal({ title, onClose, children, width }) {
  const t = useT()
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose?.()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])
  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose?.()}>
      <div className="modal" role="dialog" aria-modal="true" aria-label={title} style={width ? { maxWidth: width } : undefined}>
        <div className="modal-head">
          <h3>{title}</h3>
          <button className="btn btn-text btn-icon" onClick={onClose} aria-label={t('Close')}><Icon name="x" /></button>
        </div>
        {children}
      </div>
    </div>
  )
}
