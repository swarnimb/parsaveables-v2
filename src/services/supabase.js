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

// Custom storage adapter with timeout protection for mobile browsers
const createSafeStorage = () => {
  const STORAGE_KEY = 'sb-auth-token'
  const TIMEOUT_MS = 1000 // 1 second timeout for storage operations

  return {
    getItem: async (key) => {
      try {
        // Race storage access against timeout
        const storagePromise = new Promise((resolve) => {
          try {
            const item = localStorage.getItem(key)
            resolve(item)
          } catch (err) {
            console.warn('localStorage.getItem failed:', err)
            resolve(null)
          }
        })

        const timeoutPromise = new Promise((resolve) =>
          setTimeout(() => {
            console.warn('localStorage.getItem timed out after 1s')
            resolve(null)
          }, TIMEOUT_MS)
        )

        return await Promise.race([storagePromise, timeoutPromise])
      } catch (err) {
        console.error('Storage getItem error:', err)
        return null
      }
    },

    setItem: async (key, value) => {
      try {
        const storagePromise = new Promise((resolve) => {
          try {
            localStorage.setItem(key, value)
            resolve()
          } catch (err) {
            console.warn('localStorage.setItem failed:', err)
            resolve()
          }
        })

        const timeoutPromise = new Promise((resolve) =>
          setTimeout(() => {
            console.warn('localStorage.setItem timed out after 1s')
            resolve()
          }, TIMEOUT_MS)
        )

        await Promise.race([storagePromise, timeoutPromise])
      } catch (err) {
        console.error('Storage setItem error:', err)
      }
    },

    removeItem: async (key) => {
      try {
        const storagePromise = new Promise((resolve) => {
          try {
            localStorage.removeItem(key)
            resolve()
          } catch (err) {
            console.warn('localStorage.removeItem failed:', err)
            resolve()
          }
        })

        const timeoutPromise = new Promise((resolve) =>
          setTimeout(() => {
            console.warn('localStorage.removeItem timed out after 1s')
            resolve()
          }, TIMEOUT_MS)
        )

        await Promise.race([storagePromise, timeoutPromise])
      } catch (err) {
        console.error('Storage removeItem error:', err)
      }
    }
  }
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false, // Disable URL detection to avoid issues on mobile
    storage: createSafeStorage(),
    storageKey: 'sb-auth-token',
  }
})
