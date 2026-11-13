import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { api, apiBuffer, downloadFromApi } from '../../api/client.js'
import { useAuth } from '../../context/AuthContext.jsx'
import { useToast } from '../../context/ToastContext.jsx'
import { useT } from '../../i18n/index.jsx'
import { Loading, PageHead } from '../../components/Layout.jsx'
import SignEditor from '../../components/SignEditor.jsx'
import Icon from '../../components/Icon.jsx'

export default function DocumentSign() {
  const { id } = useParams()
  const { user } = useAuth()
  const t = useT()
  const toast = useToast()
  const [doc, setDoc] = useState(null)
  const [buffer, setBuffer] = useState(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    Promise.all([api(`/api/documents/${id}`), apiBuffer(`/api/documents/${id}/file`)])
      .then(([d, b]) => { setDoc(d.document); setBuffer(b) })
      .catch(toast.error)
  }, [id, toast])

  const submit = async (placements) => {
    setBusy(true)
    try {
      const { document } = await api(`/api/documents/${id}/sign`, { method: 'POST', body: { placements } })
      setDoc(document)
      await downloadFromApi(`/api/documents/${id}/download`)
      toast.success('Signed PDF saved to your library and downloaded')
    } catch (e) {
      toast.error(e)
    } finally {
      setBusy(false)
    }
  }

  if (!doc) return <Loading />
  return (
    <>
      <PageHead title={doc.title} subtitle={`${t('{n} page(s)', { n: doc.pageCount })} · ${doc.isSigned ? t('a signed version exists — signing again replaces it') : t('not signed yet')}`}>
        <Link to="/app/documents" className="btn btn-ghost">{t('Back')}</Link>
        {doc.isSigned && <button className="btn btn-ghost" onClick={() => downloadFromApi(`/api/documents/${id}/download`).catch(toast.error)}><Icon name="download" size={16} /> {t('Signed PDF')}</button>}
      </PageHead>
      {buffer && <SignEditor buffer={buffer} onSubmit={submit} submitting={busy} defaultName={user.fullName} submitLabel={t('Sign, save & download')} />}
    </>
  )
}
