import { createClient } from '@supabase/supabase-js'
import { demoSession, demoUser } from '@/lib/demoData'

// Static env reads only. In Vite builds, each `import.meta.env.X` is replaced
// with a string literal at build time — in demo builds, vite.config's `define`
// forces VITE_SUPABASE_URL/KEY to "" so they never appear in the bundle. In
// Node.js (serverless functions), `import.meta.env` is undefined and the
// catch branch falls back to process.env. Avoid `import.meta.env` as a bare
// reference — that triggers Vite to inject the entire env object into the
// bundle, which would leak prod credentials.
let supabaseUrl, supabaseAnonKey, isDemoModeEnv
try {
  supabaseUrl = import.meta.env.VITE_SUPABASE_URL
  supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
  isDemoModeEnv = import.meta.env.VITE_DEMO_MODE === 'true'
} catch {
  supabaseUrl = process.env.VITE_SUPABASE_URL
  supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY
  isDemoModeEnv = process.env.VITE_DEMO_MODE === 'true'
}

if (!isDemoModeEnv && (!supabaseUrl || !supabaseAnonKey)) {
  throw new Error('Missing Supabase environment variables. Please check your .env.local file.')
}

// --- Demo stub --------------------------------------------------------------
// Chainable proxy whose every property access yields a callable that returns
// the same proxy. Awaiting it resolves to { data: null, error: null, count: 0 }.
// Belt-and-suspenders for any read path that misses an explicit demo branch —
// the call returns null instead of escaping to real Supabase.
function createStubChain() {
  const resolved = { data: null, error: null, count: 0 }
  const handler = {
    get(_target, prop) {
      if (prop === 'then') {
        return (onFulfilled, onRejected) =>
          Promise.resolve(resolved).then(onFulfilled, onRejected)
      }
      if (prop === Symbol.toPrimitive || prop === Symbol.iterator) return undefined
      return (..._args) => stub
    },
    apply() {
      return stub
    },
  }
  const stub = new Proxy(function () {}, handler)
  return stub
}

function createDemoSupabase() {
  return {
    from: () => createStubChain(),
    rpc: () => createStubChain(),
    storage: {
      from: () => ({
        upload: async () => ({ data: null, error: null }),
        remove: async () => ({ data: null, error: null }),
        getPublicUrl: () => ({ data: { publicUrl: '' } }),
      }),
    },
    auth: {
      // Auto-signed-in: every session read yields the demo user
      getSession: async () => ({ data: { session: demoSession }, error: null }),
      getUser: async () => ({ data: { user: demoUser }, error: null }),
      onAuthStateChange: (_callback) => ({
        data: { subscription: { unsubscribe: () => {} } },
      }),
      signInWithPassword: async () => ({ data: null, error: { message: 'Demo mode — sign-in disabled' } }),
      signUp: async () => ({ data: null, error: { message: 'Demo mode — sign-up disabled' } }),
      signInWithOAuth: async () => ({ data: null, error: { message: 'Demo mode — OAuth disabled' } }),
      signInWithOtp: async () => ({ data: null, error: { message: 'Demo mode — OTP disabled' } }),
      signOut: async () => ({ error: null }),
      refreshSession: async () => ({ data: { session: demoSession }, error: null }),
    },
  }
}

// --- Real client (mobile-safe storage) --------------------------------------
const createSafeStorage = () => {
  const TIMEOUT_MS = 1000

  return {
    getItem: async (key) => {
      try {
        const storagePromise = new Promise((resolve) => {
          try {
            resolve(localStorage.getItem(key))
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
    },
  }
}

export const supabase = isDemoModeEnv
  ? createDemoSupabase()
  : createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storage: createSafeStorage(),
        storageKey: 'sb-auth-token',
      },
    })
