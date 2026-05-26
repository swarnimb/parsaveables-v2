import { toast } from '@/hooks/use-toast'

export const isDemoMode = import.meta.env.VITE_DEMO_MODE === 'true'

let lastToastAt = 0
const TOAST_DEBOUNCE_MS = 1500

/**
 * Show a "[Demo] action not saved" toast (debounced) and return a mock-success
 * shape compatible with most write callers. Use at every client write chokepoint
 * after checking `isDemoMode`.
 */
export function demoBlock(actionName = 'action') {
  const now = Date.now()
  if (now - lastToastAt > TOAST_DEBOUNCE_MS) {
    lastToastAt = now
    toast({
      title: '[Demo] action not saved',
      description: `This is a read-only demo. "${actionName}" was not persisted.`,
    })
  }
  return { success: false, demo: true, error: 'Demo mode' }
}

/**
 * Mock Response for fetch() calls in demo mode. Returns a Response-like object
 * with .ok=true and .json() yielding { success: true, demo: true }.
 */
export function demoFetchResponse(actionName = 'action') {
  demoBlock(actionName)
  return {
    ok: true,
    status: 200,
    json: async () => ({ success: true, demo: true, message: 'Demo mode — not persisted' }),
  }
}
