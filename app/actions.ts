'use server'

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { COOKIE } from '@/lib/session'

export async function logout() {
  cookies().delete(COOKIE)
  redirect('/login')
}
