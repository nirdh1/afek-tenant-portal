import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// פתיחת מסמך: בודק הרשאה (דרך RLS), רושם פעילות ומפנה לקישור זמני
export async function GET(request, { params }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: doc } = await supabase.from('documents').select('*').eq('id', id).single()
  if (!doc) return new NextResponse('אין הרשאה למסמך הזה', { status: 404 })
  const { data, error } = await supabase.storage.from('documents').createSignedUrl(doc.storage_path, 120)
  if (error) return new NextResponse('המסמך לא נמצא', { status: 404 })
  await supabase.rpc('log_activity', { p_action: 'צפה במסמך', p_details: doc.title })
  return NextResponse.redirect(data.signedUrl)
}
