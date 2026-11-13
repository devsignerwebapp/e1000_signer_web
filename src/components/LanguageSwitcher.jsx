import { LANGS, useI18n } from '../i18n/index.jsx'
import { api, tokenStore } from '../api/client.js'

/** EN | AZ segmented switch. Saves the choice locally and on the account (for email language). */
export default function LanguageSwitcher() {
  const { lang, setLang } = useI18n()
  const choose = (code) => {
    if (code === lang) return
    setLang(code)
    if (tokenStore.get()) api('/api/account/profile', { method: 'PATCH', body: { locale: code } }).catch(() => {})
  }
  return (
    <div className="tabs lang-switch" role="radiogroup" aria-label="Language">
      {LANGS.map((l) => (
        <button key={l.code} className={`tab${lang === l.code ? ' active' : ''}`} onClick={() => choose(l.code)} title={l.label} aria-checked={lang === l.code} role="radio">
          {l.short}
        </button>
      ))}
    </div>
  )
}
