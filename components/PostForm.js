'use client'
import { useActionState } from 'react'
import { createPost } from '@/app/actions'
import { CATEGORIES } from '@/lib/labels'
import FormStatus from './FormStatus'

export default function PostForm({ role }) {
  const [state, action, pending] = useActionState(createPost, null)
  const staff = role === 'admin' || role === 'lawyer'
  const cats = staff ? Object.keys(CATEGORIES) : ['lawyers', 'general']
  return (
    <form action={action} key={state?.ok}>
      <label htmlFor="category">נושא</label>
      <select id="category" name="category">{cats.map((c) => <option key={c} value={c}>{CATEGORIES[c]}</option>)}</select>
      <label htmlFor="title">כותרת</label><input id="title" name="title" required />
      <label htmlFor="body">תוכן</label><textarea id="body" name="body" rows={4} />
      <label htmlFor="visibility">מי יראה?</label>
      <select id="visibility" name="visibility" defaultValue={staff ? 'public' : 'private'}>
        {staff ? <>
          <option value="public">כל הדיירים</option>
          <option value="private">צוות בלבד</option>
        </> : <>
          <option value="private">רק לנציגות{' '}(ולעורכי הדין אם סימנתי)</option>
          <option value="public">לפרסום לכל הדיירים, אחרי אישור הנציגות</option>
        </>}
      </select>
      {!staff && <label style={{ fontWeight: 400, display: 'flex', gap: 8, alignItems: 'center' }}>
        <input type="checkbox" name="to_lawyers" defaultChecked style={{ width: 'auto' }} /> לשלוח גם לעורכי הדין של הפרויקט</label>}
      {role === 'admin' && <label style={{ fontWeight: 400, display: 'flex', gap: 8, alignItems: 'center' }}>
        <input type="checkbox" name="is_announcement" style={{ width: 'auto' }} /> להציג גם בדף הבית הציבורי</label>}
      <div className="row"><button className="btn btn-navy" disabled={pending}>פרסום</button></div>
      <FormStatus state={state} />
    </form>
  )
}
