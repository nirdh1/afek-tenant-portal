'use client'
import { useState } from 'react'
import { createPost } from '@/app/actions'
import { createClient } from '@/lib/supabase/client'
import { CATEGORIES } from '@/lib/labels'
import FormStatus from './FormStatus'

export default function PostForm({ role }) {
  const [state, setState] = useState(null)
  const [busy, setBusy] = useState(false)
  const [formKey, setFormKey] = useState(0)
  const staff = role === 'admin' || role === 'lawyer'
  const cats = staff ? Object.keys(CATEGORIES) : ['lawyers', 'general']

  async function submit(e) {
    e.preventDefault()
    const f = new FormData(e.currentTarget)
    const file = f.get('file')
    f.delete('file')
    setBusy(true); setState(null)
    if (file && file.size) {
      if (file.size > 50 * 1024 * 1024) { setBusy(false); setState({ error: 'הקובץ גדול מ-50MB' }); return }
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      const ext = (file.name.split('.').pop() || 'pdf').toLowerCase().replace(/[^a-z0-9]/g, '') || 'pdf'
      const path = `posts/${user.id}/${crypto.randomUUID()}.${ext}`
      const { error } = await supabase.storage.from('documents').upload(path, file, { contentType: file.type || undefined })
      if (error) { setBusy(false); setState({ error: 'העלאת הקובץ נכשלה: ' + error.message }); return }
      f.set('attachment_path', path)
      f.set('attachment_name', file.name)
    }
    const res = await createPost(null, f)
    setBusy(false); setState(res)
    if (res?.ok) setFormKey((k) => k + 1)
  }

  return (
    <form onSubmit={submit} key={formKey}>
      <label htmlFor="category">נושא</label>
      <select id="category" name="category">{cats.map((c) => <option key={c} value={c}>{CATEGORIES[c]}</option>)}</select>
      <label htmlFor="title">כותרת</label><input id="title" name="title" required />
      <label htmlFor="body">תוכן</label><textarea id="body" name="body" rows={4} />
      <label htmlFor="file">צירוף קובץ (לא חובה)</label>
      <input id="file" name="file" type="file" accept=".pdf,.doc,.docx,.jpg,.jpeg,.png" />
      {staff ? <>
        <label htmlFor="visibility">מי יראה?</label>
        <select id="visibility" name="visibility" defaultValue="public">
          <option value="public">כל הדיירים</option>
          <option value="private">צוות בלבד</option>
        </select>
      </> : <>
        <input type="hidden" name="visibility" value="private" />
        <p className="small">השאלה תגיע רק לנציגות (ולעורכי הדין אם סימנת). אם היא תתאים לכלל הדיירים, הנציגות תוכל לפרסם אותה.</p>
      </>}
      {!staff && <label style={{ fontWeight: 400, display: 'flex', gap: 8, alignItems: 'center' }}>
        <input type="checkbox" name="to_lawyers" defaultChecked style={{ width: 'auto' }} /> לשלוח גם לעורכי הדין של הפרויקט</label>}
      {role === 'admin' && <>
        <label style={{ fontWeight: 400, display: 'flex', gap: 8, alignItems: 'center' }}>
          <input type="checkbox" name="is_announcement" style={{ width: 'auto' }} /> להציג גם בדף הבית</label>
        <label style={{ fontWeight: 400, display: 'flex', gap: 8, alignItems: 'center' }}>
          <input type="checkbox" name="featured" style={{ width: 'auto' }} /> <b>להציג בגדול בראש דף הבית</b></label>
      </>}
      <div className="row"><button className="btn btn-navy" disabled={busy}>{busy ? 'שולח...' : 'פרסום'}</button></div>
      <FormStatus state={state} />
    </form>
  )
}
