import { useState } from 'react'
import Icon from './Icon.jsx'
import { useT } from '../i18n/index.jsx'

export default function Dropzone({ onFile, busy, hint }) {
  const t = useT()
  const [drag, setDrag] = useState(false)
  const pick = (f) => f && onFile(f)
  return (
    <label
      className={`dropzone${drag ? ' drag' : ''}`}
      onDragOver={(e) => { e.preventDefault(); setDrag(true) }}
      onDragLeave={() => setDrag(false)}
      onDrop={(e) => { e.preventDefault(); setDrag(false); pick(e.dataTransfer.files?.[0]) }}
    >
      <input type="file" accept="application/pdf,.pdf" hidden disabled={busy} onChange={(e) => { pick(e.target.files?.[0]); e.target.value = '' }} />
      <div className="dz-icon">{busy ? <span className="spinner" style={{ borderTopColor: '#fff' }} /> : <Icon name="upload" size={26} />}</div>
      <h3 style={{ marginBottom: 4 }}>{busy ? t('Uploading…') : t('Drop your PDF here or click to browse')}</h3>
      <div className="muted small">{hint || t('PDF up to 20 MB')}</div>
    </label>
  )
}
