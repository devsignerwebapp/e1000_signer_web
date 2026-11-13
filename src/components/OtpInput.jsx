import { useRef } from 'react'
import { useT } from '../i18n/index.jsx'

/** Four separate digit boxes with auto-advance, backspace and paste support. */
export default function OtpInput({ value, onChange, onComplete, disabled }) {
  const t = useT()
  const refs = useRef([])
  const digits = value.padEnd(4, ' ').slice(0, 4).split('')

  const set = (next) => {
    const clean = next.replace(/\D/g, '').slice(0, 4)
    onChange(clean)
    if (clean.length === 4) onComplete?.(clean)
  }

  return (
    <div className="otp" onPaste={(e) => { e.preventDefault(); set(e.clipboardData.getData('text')); refs.current[3]?.focus() }}>
      {digits.map((d, i) => (
        <input
          key={i}
          ref={(el) => (refs.current[i] = el)}
          inputMode="numeric"
          autoComplete={i === 0 ? 'one-time-code' : 'off'}
          maxLength={1}
          value={d.trim()}
          disabled={disabled}
          autoFocus={i === 0}
          aria-label={t('Digit {n}', { n: i + 1 })}
          onChange={(e) => {
            const ch = e.target.value.replace(/\D/g, '').slice(-1)
            if (!ch) return
            const arr = value.padEnd(4, ' ').split('')
            arr[i] = ch
            set(arr.join('').replace(/ /g, ''))
            if (i < 3) refs.current[i + 1]?.focus()
          }}
          onKeyDown={(e) => {
            if (e.key === 'Backspace') {
              e.preventDefault()
              const arr = value.split('')
              if (arr[i]) { arr.splice(i, 1); onChange(arr.join('')) }
              else if (i > 0) { arr.splice(i - 1, 1); onChange(arr.join('')); refs.current[i - 1]?.focus() }
            }
            if (e.key === 'ArrowLeft' && i > 0) refs.current[i - 1]?.focus()
            if (e.key === 'ArrowRight' && i < 3) refs.current[i + 1]?.focus()
          }}
        />
      ))}
    </div>
  )
}
