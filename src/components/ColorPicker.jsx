import { TEXT_COLORS } from '../lib/signature.js'
import { useT } from '../i18n/index.jsx'

/** Swatches + a native picker for any custom colour. value/onChange use "#rrggbb". */
export default function ColorPicker({ value, onChange, label }) {
  const t = useT()
  const custom = !TEXT_COLORS.includes(value)
  return (
    <div className="color-row" role="radiogroup" aria-label={label || t('Text colour')}>
      {TEXT_COLORS.map((c) => (
        <button key={c} type="button" className={`swatch${c === value ? ' active' : ''}`} style={{ background: c }} onClick={() => onChange(c)} aria-label={c} aria-checked={c === value} role="radio" />
      ))}
      <label className={`swatch${custom ? ' active' : ''}`} title={t('Custom colour')} style={{ background: custom ? value : 'conic-gradient(#f43f5e,#f59e0b,#22c55e,#06b6d4,#6366f1,#d946ef,#f43f5e)', position: 'relative', overflow: 'hidden' }}>
        <input type="color" value={value} onChange={(e) => onChange(e.target.value)} style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer' }} aria-label={t('Custom colour')} />
      </label>
    </div>
  )
}
