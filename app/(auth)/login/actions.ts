'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

type ActionResult = { status: 'error'; message: string }

export async function signIn(
  _prev: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  const email = formData.get('email')
  const password = formData.get('password')

  if (!email || typeof email !== 'string' || !email.includes('@')) {
    return { status: 'error', message: 'Bitte eine gültige E-Mail eingeben.' }
  }
  if (!password || typeof password !== 'string' || password.length < 1) {
    return { status: 'error', message: 'Bitte ein Passwort eingeben.' }
  }

  const supabase = await createClient()

  const { data, error } = await supabase.auth.signInWithPassword({
    email: email.trim().toLowerCase(),
    password,
  })

  if (error) {
    return { status: 'error', message: 'E-Mail oder Passwort falsch.' }
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', data.user.id)
    .single()

  if (profile?.role === 'admin') {
    redirect('/admin/dashboard')
  }

  redirect('/portal')
}
