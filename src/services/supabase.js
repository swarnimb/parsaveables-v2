import { createClient } from '@supabase/supabase-js'

// Support both Vite (import.meta.env) and Node.js (process.env) environments
const getEnv = (key) => {
  // Try Vite environment first (frontend)
  if (typeof import.meta !== 'undefined' && import.meta.env) {
    return import.meta.env[key]
  }
  // Fall back to Node.js environment (serverless functions)
  return process.env[key]
}

const supabaseUrl = getEnv('VITE_SUPABASE_URL')
const supabaseAnonKey = getEnv('VITE_SUPABASE_ANON_KEY')

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables. Please check your .env.local file.')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
