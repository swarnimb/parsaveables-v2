import { toast } from '@/hooks/use-toast'

export const isDemoMode = import.meta.env.VITE_DEMO_MODE === 'true'

let lastToastAt = 0
const TOAST_DEBOUNCE_MS = 2500

const MOCK_RESULT = { success: false, demo: true, error: 'Demo mode' }

/**
 * Short-circuit an explicit user-initiated write in demo mode with a
 * "this is a demo" toast. Use for actions the user clearly meant to perform:
 * placing a blessing, opening a PULPy window, buying an advantage, etc.
 *
 * Debounced — rapid-fire clicks only show one toast.
 */
export function demoBlock() {
  const now = Date.now()
  if (now - lastToastAt > TOAST_DEBOUNCE_MS) {
    lastToastAt = now
    toast({
      title: 'Read-only demo',
      description: 'Visit GitHub to view the project.',
    })
  }
  return MOCK_RESULT
}

/**
 * Short-circuit a passive/tracking write in demo mode WITHOUT showing a toast.
 * Use for writes that happen as a side effect of navigation or UI state —
 * e.g. mark-notifications-as-read when the bell dropdown opens, tutorial
 * completion flags. The visitor didn't ask for these to happen; they
 * shouldn't see "action not saved" every time they look at something.
 */
export function demoSilent() {
  return MOCK_RESULT
}

/**
 * Mock Response for fetch() calls in demo mode. Returns a Response-like
 * object with .ok=true and .json() yielding { success: true, demo: true }.
 * Fires the demo toast since this is for explicit user actions.
 */
export function demoFetchResponse() {
  demoBlock()
  return {
    ok: true,
    status: 200,
    json: async () => ({ success: true, demo: true, message: 'Demo mode — not persisted' }),
  }
}
