import { redirect } from 'next/navigation'
import { getMe } from '@/lib/supabase/server'

export default async function AdminLayout({ children }) {
  const { profile } = await getMe()
  if (profile?.role !== 'admin') redirect('/')
  return children
}
