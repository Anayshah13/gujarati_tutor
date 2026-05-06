import { supabase } from './supabaseClient'

export async function ensureBasicUser() {
  const { data: { session } } = await supabase.auth.getSession()
  if (session?.user) return session.user

  // Fallback "basic login" without UI for now
  // In a real app, you would wire this to a login form.
  const email = 'student@gujgyani.com'
  const password = 'basicpassword123'

  let { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error && error.message.includes('Invalid login credentials')) {
    // Auto-create if it doesn't exist
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
    })
    if (signUpError) throw signUpError
    return signUpData.user
  }

  if (error) throw error
  return data.user
}

export async function getUser() {
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

export async function signOut() {
  await supabase.auth.signOut()
}
