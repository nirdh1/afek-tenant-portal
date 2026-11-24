import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// פתיחת קובץ מצורף להודעה: רק למי שרשאי לראות את ההודעה
export async function GET(request, { params }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: post } = await supabase.from('posts').select('id, title, attachment_path').eq('id', id).single()
  if (!post?.attachment_path) return new NextResponse('הקובץ לא נמצא או שאין הרשאה', { status: 404 })
  const { data, error } = await supabase.storage.from('documents').createSignedUrl(post.attachment_path, 300)
  if (error) return new NextResponse('הקובץ לא נמצא', { status: 404 })
  await supabase.rpc('log_activity', { p_action: 'פתח קובץ מצורף', p_details: post.title })
  return NextResponse.redirect(data.signedUrl)
}
