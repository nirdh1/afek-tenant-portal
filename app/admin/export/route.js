import { NextResponse } from 'next/server'
import { getMe } from '@/lib/supabase/server'
import { loadRegistrants, COLUMNS } from '@/lib/registrants'

// ייצוא כל הנרשמים לקובץ CSV שנפתח באקסל (עם BOM לעברית)
export async function GET() {
  const { supabase, profile } = await getMe()
  if (profile?.role !== 'admin') return new NextResponse('אין הרשאה', { status: 403 })
  const { users } = await loadRegistrants(supabase)
  const cell = (v) => {
    let s = String(v ?? '')
    if (/^[=+\-@]/.test(s)) s = "'" + s
    return `"${s.replace(/"/g, '""')}"`
  }
  const lines = [COLUMNS.map(([, l]) => cell(l)).join(','), ...users.map((r) => COLUMNS.map(([k]) => cell(r[k])).join(','))]
  await supabase.rpc('log_activity', { p_action: 'ייצא את רשימת הנרשמים' })
  const date = new Date().toISOString().slice(0, 10)
  return new NextResponse('﻿' + lines.join('\r\n'), {
    headers: {
      'content-type': 'text/csv; charset=utf-8',
      'content-disposition': `attachment; filename="registrants-${date}.csv"`,
    },
  })
}
