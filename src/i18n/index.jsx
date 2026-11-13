// Lightweight i18n. English source strings are the keys:  t('Sign in')  →  'Daxil ol' in Azerbaijani.
// Missing translations fall back to English. Interpolation: t('Hello, {name}', { name }).
// Add a language: create ./<code>.js exporting a { 'English key': 'translation' } map and list it in LANGS.
import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import az from './az.js'

export const LANGS = [
  { code: 'en', label: 'English', short: 'EN', locale: 'en-GB' },
  { code: 'az', label: 'Azərbaycanca', short: 'AZ', locale: 'az-Latn-AZ' },
]
const DICTS = { az }
const KEY = 'e1k_lang'

function readLang() {
  try {
    const v = localStorage.getItem(KEY)
    if (LANGS.some((l) => l.code === v)) return v
  } catch { /* ignore */ }
  return 'en' // English is the default
}

let current = readLang()
if (typeof document !== 'undefined') document.documentElement.lang = current

export const getLang = () => current
export const getLocale = () => LANGS.find((l) => l.code === current)?.locale || 'en-GB'

// Browsers ship little or no Azerbaijani date data (Chrome prints "M11 13"), so we format az dates ourselves.
const AZ_MONTHS = ['yan', 'fev', 'mar', 'apr', 'may', 'iyn', 'iyl', 'avq', 'sen', 'okt', 'noy', 'dek']
const pad2 = (n) => String(n).padStart(2, '0')
/**
 * Locale-aware date formatting.
 * style: 'day' → "13 noy 2026" · 'datetime' → "13 noy 2026, 14:05" · 'short' → "13 noy"
 */
export function formatDate(value, style = 'day') {
  const d = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(d.getTime())) return '—'
  if (current === 'az') {
    const base = `${d.getDate()} ${AZ_MONTHS[d.getMonth()]}`
    if (style === 'short') return base
    const day = `${base} ${d.getFullYear()}`
    return style === 'datetime' ? `${day}, ${pad2(d.getHours())}:${pad2(d.getMinutes())}` : day
  }
  const opts = style === 'short' ? { month: 'short', day: 'numeric' } : style === 'datetime' ? { dateStyle: 'medium', timeStyle: 'short' } : { dateStyle: 'medium' }
  return d.toLocaleString(getLocale(), opts)
}

const missing = new Set()
/** Translate outside React components (formatters, api client). Components should use useT(). */
export function translate(key, vars) {
  let s = key
  if (current !== 'en') {
    const hit = DICTS[current]?.[key]
    if (hit) s = hit
    else if (import.meta.env.DEV && !missing.has(key)) {
      missing.add(key)
      console.debug(`[i18n] missing ${current} translation:`, key)
    }
  }
  if (vars) s = s.replace(/\{(\w+)\}/g, (m, k) => (vars[k] ?? m))
  return s
}

const I18nContext = createContext({ lang: 'en', setLang: () => {}, t: translate })

export function I18nProvider({ children }) {
  const [lang, setLangState] = useState(current)
  const setLang = useCallback((code) => {
    current = code
    try { localStorage.setItem(KEY, code) } catch { /* ignore */ }
    document.documentElement.lang = code
    setLangState(code)
  }, [])
  // `t` changes identity with the language so memoised children re-render.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const t = useCallback((key, vars) => translate(key, vars), [lang])
  const value = useMemo(() => ({ lang, setLang, t }), [lang, setLang, t])
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

// eslint-disable-next-line react/only-export-components
export const useI18n = () => useContext(I18nContext)
// eslint-disable-next-line react/only-export-components
export const useT = () => useContext(I18nContext).t
