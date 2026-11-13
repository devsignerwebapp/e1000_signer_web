import { useState } from 'react'
import { Link } from 'react-router-dom'
import { api, saveBlob } from '../api/client.js'
import Dropzone from '../components/Dropzone.jsx'
import SignEditor from '../components/SignEditor.jsx'
import Icon from '../components/Icon.jsx'
import { useToast } from '../context/ToastContext.jsx'
import { useT } from '../i18n/index.jsx'

export default function Demo() {
  const t = useT()
  const toast = useToast()
  const [file, setFile] = useState(null)
  const [buffer, setBuffer] = useState(null)
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)

  const choose = async (f) => {
    if (!/\.pdf$/i.test(f.name) && f.type !== 'application/pdf') return toast.error('Please choose a PDF file')
    if (f.size > 20 * 1024 * 1024) return toast.error('PDF must be 20 MB or smaller')
    setFile(f)
    setBuffer(await f.arrayBuffer())
    setDone(false)
  }

  const submit = async (placements) => {
    setBusy(true)
    try {
      const form = new FormData()
      form.append('file', file)
      form.append('placements', JSON.stringify(placements))
      const res = await api('/api/public/demo/sign', { method: 'POST', form, raw: true })
      saveBlob(await res.blob(), file.name.replace(/\.pdf$/i, '') + '-signed.pdf')
      toast.success('Signed PDF downloaded')
      setDone(true)
    } catch (e) {
      toast.error(e)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="container page">
      <div className="page-head">
        <div>
          <span className="badge"><Icon name="sparkles" size={13} /> {t('Demo mode · nothing is stored')}</span>
          <h1 className="mt-1">{t('Try E1000Signer')}</h1>
          <p>{t('Upload a PDF, add your signature, download the signed copy. No account needed.')}</p>
        </div>
        {file && <button className="btn btn-ghost" onClick={() => { setFile(null); setBuffer(null) }}><Icon name="refresh" size={16} /> {t('Use another file')}</button>}
      </div>

      {done && (
        <div className="alert alert-success" style={{ marginBottom: 18 }}>
          {t('Your signed PDF is downloaded. Want templates, client links and the API?')} <Link to="/register"><b>{t('Create a free account →')}</b></Link>
        </div>
      )}

      {!buffer ? (
        <div style={{ maxWidth: 720, margin: '20px auto' }}>
          <Dropzone onFile={choose} hint={t('PDF up to 20 MB · processed in memory, never saved')} />
        </div>
      ) : (
        <SignEditor buffer={buffer} onSubmit={submit} submitting={busy} />
      )}
    </div>
  )
}
