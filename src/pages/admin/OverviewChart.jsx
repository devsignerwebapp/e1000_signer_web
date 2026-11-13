import { useState } from 'react'
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { fmtNum } from '../../lib/format.js'
import { formatDate, useT } from '../../i18n/index.jsx'

// Validated categorical palette (light surface), assigned to entities in fixed order.
const SERIES = [
  { key: 'registrations', label: 'Registrations', color: '#2a78d6' },
  { key: 'logins', label: 'Sign-ins', color: '#eb6834' },
  { key: 'uploads', label: 'Uploads', color: '#1baf7a' },
  { key: 'signatures', label: 'Signatures', color: '#eda100' },
  { key: 'templates', label: 'Templates', color: '#e87ba4' },
  { key: 'api', label: 'API requests', color: '#008300' },
]

const shortDate = (d) => formatDate(`${d}T00:00:00`, 'short')

function ChartTooltip({ active, payload, label, t }) {
  if (!active || !payload?.length) return null
  return (
    <div className="chart-tooltip">
      <div style={{ fontWeight: 700, marginBottom: 6 }}>{shortDate(label)}</div>
      {payload.map((p) => (
        <div key={p.dataKey} className="tt-row">
          <span><i style={{ width: 10, height: 3, borderRadius: 2, background: p.color, display: 'inline-block' }} />{t(SERIES.find((s) => s.key === p.dataKey)?.label)}</span>
          <b>{fmtNum(p.value)}</b>
        </div>
      ))}
    </div>
  )
}

/** Linear overview of platform activity per day. */
export default function OverviewChart({ series, days, onDays }) {
  const t = useT()
  const [hidden, setHidden] = useState(() => new Set(['api']))
  const [view, setView] = useState('chart')
  const toggle = (k) => setHidden((h) => {
    const n = new Set(h)
    if (n.has(k)) n.delete(k)
    else n.add(k)
    return n
  })
  const visible = SERIES.filter((s) => !hidden.has(s.key))

  return (
    <div className="card">
      <div className="row-between" style={{ marginBottom: 14 }}>
        <div>
          <h3 style={{ margin: 0 }}>{t('Activity overview')}</h3>
          <div className="small muted">{t('Events per day · last {n} days', { n: days })}</div>
        </div>
        <div className="row">
          <div className="tabs">
            {[7, 30, 90].map((d) => <button key={d} className={`tab${days === d ? ' active' : ''}`} onClick={() => onDays(d)}>{t('{n}d', { n: d })}</button>)}
          </div>
          <div className="tabs">
            <button className={`tab${view === 'chart' ? ' active' : ''}`} onClick={() => setView('chart')}>{t('Chart')}</button>
            <button className={`tab${view === 'table' ? ' active' : ''}`} onClick={() => setView('table')}>{t('Table')}</button>
          </div>
        </div>
      </div>

      <div className="chart-legend" role="group" aria-label={t('Toggle series')} style={{ marginBottom: 10 }}>
        {SERIES.map((s) => (
          <button key={s.key} className={`legend-item${hidden.has(s.key) ? ' off' : ''}`} onClick={() => toggle(s.key)} aria-pressed={!hidden.has(s.key)}>
            <span className="sw" style={{ background: s.color }} />{t(s.label)}
          </button>
        ))}
      </div>

      {view === 'chart' ? (
        <div style={{ width: '100%', height: 320 }}>
          <ResponsiveContainer>
            <LineChart data={series} margin={{ top: 8, right: 12, left: -12, bottom: 0 }}>
              <CartesianGrid stroke="rgba(120,130,220,.14)" vertical={false} />
              <XAxis dataKey="date" tickFormatter={shortDate} tick={{ fill: '#7c84ad', fontSize: 12 }} axisLine={{ stroke: 'rgba(120,130,220,.25)' }} tickLine={false} minTickGap={24} />
              <YAxis allowDecimals={false} tick={{ fill: '#7c84ad', fontSize: 12 }} axisLine={false} tickLine={false} width={44} />
              <Tooltip content={<ChartTooltip t={t} />} cursor={{ stroke: 'rgba(91,108,255,.35)', strokeWidth: 1 }} />
              {visible.map((s) => (
                <Line key={s.key} type="monotone" dataKey={s.key} stroke={s.color} strokeWidth={2} dot={false} activeDot={{ r: 4.5, strokeWidth: 2, stroke: '#fff' }} isAnimationActive={false} />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="table-wrap" style={{ maxHeight: 340, overflowY: 'auto' }}>
          <table className="table">
            <thead><tr><th>{t('Date')}</th>{SERIES.map((s) => <th key={s.key} className="num">{t(s.label)}</th>)}<th className="num">{t('All events')}</th></tr></thead>
            <tbody>
              {[...series].reverse().map((r) => (
                <tr key={r.date}><td>{shortDate(r.date)}</td>{SERIES.map((s) => <td key={s.key} className="num">{fmtNum(r[s.key])}</td>)}<td className="num"><b>{fmtNum(r.total)}</b></td></tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
