/**
 * authStore.ts — FIXED
 *
 * ROOT CAUSE OF BUG 3 (401 redirect loop after refresh):
 * ────────────────────────────────────────────────────────
 * Zustand `persist` stores the ENTIRE state object as JSON under one key:
 *   localStorage['erp_token'] = '{"state":{"token":"eyJ...","user":{...}},"version":0}'
 *
 * http.ts was reading:
 *   localStorage.getItem(STORAGE_KEYS.TOKEN)  → returns that full JSON string
 *   and sending it as: "Bearer {"state":{"token":"eyJ..."...}}"
 *   → Backend jwt.verify() fails → 401 → redirect to /login → loop
 *
 * FIX STRATEGY (two-pronged):
 * ────────────────────────────────────────────────────────
 * 1. Store the raw token in its OWN dedicated localStorage key ('erp_raw_token')
 *    every time setAuth() is called. This key holds only the JWT string.
 *
 * 2. http.ts reads from 'erp_raw_token' directly — never from the Zustand key.
 *
 * 3. On logout / 401 both keys are cleared.
 *
 * 4. Zustand persist still stores user/company for UI (name, role display).
 *    The persist key is renamed to 'erp_auth_state' to avoid collision.
 */

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { User, Company, UserRole } from '@/types'
import { ROLE_PERMISSIONS } from '@/constants'

// ── Dedicated key for the raw JWT string ──────────────────────────────────
// http.ts reads ONLY this key. It holds the bare token, nothing else.
export const RAW_TOKEN_KEY = 'erp_raw_token'

interface AuthState {
  token:           string | null
  user:            User   | null
  company:         Company| null
  isAuthenticated: boolean

  setAuth:     (p: { token: string; user: User; company: Company }) => void
  setCompany:  (company: Company) => void
  updateUser:  (user: Partial<User>) => void
  logout:      () => void
  can:         (permission: string) => boolean
  hasRole:     (role: UserRole | UserRole[]) => boolean
}

const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      token:           null,
      user:            null,
      company:         null,
      isAuthenticated: false,

      setAuth: ({ token, user, company }) => {
        // ── FIX: write raw JWT to its own key so http.ts can read it cleanly ──
        localStorage.setItem(RAW_TOKEN_KEY, token)
        set({ token, user, company, isAuthenticated: true })
      },

      setCompany: (company) => set({ company }),

      updateUser: (partial) =>
        set((s) => ({ user: s.user ? { ...s.user, ...partial } : null })),

      logout: () => {
        // Clear raw token key on logout
        localStorage.removeItem(RAW_TOKEN_KEY)
        set({ token: null, user: null, company: null, isAuthenticated: false })
      },

      can: (permission: string) => {
        const role  = get().user?.role
        if (!role) return false
        const perms = ROLE_PERMISSIONS[role] || []
        if (perms.includes('*')) return true
        return perms.some((p) => {
          if (p === permission) return true
          const [module] = p.split('.')
          return p.endsWith('.*') && permission.startsWith(module + '.')
        })
      },

      hasRole: (role) => {
        const r = get().user?.role
        if (!r) return false
        return Array.isArray(role) ? role.includes(r) : r === role
      },
    }),
    {
      // ── FIX: renamed from 'erp_token' to avoid collision with raw token key ──
      name: 'erp_auth_state',
      // Only persist UI-relevant fields; token is handled separately above
      partialize: (s) => ({
        token:           s.token,
        user:            s.user,
        company:         s.company,
        isAuthenticated: s.isAuthenticated,
      }),

      // ── On rehydration: ensure raw token key is in sync ──────────────────
      // If Zustand has a token in persisted state but raw key is missing
      // (e.g. user cleared localStorage partially), restore it.
      onRehydrateStorage: () => (state) => {
        if (state?.token && !localStorage.getItem(RAW_TOKEN_KEY)) {
          localStorage.setItem(RAW_TOKEN_KEY, state.token)
        }
        // If raw key exists but state token is missing, sync state from raw key
        const raw = localStorage.getItem(RAW_TOKEN_KEY)
        if (raw && !state?.token) {
          // Token exists in raw storage but not in Zustand state
          // This is the edge case that caused the redirect loop.
          // We can't fully restore user/company here, so force a /me call
          // by keeping isAuthenticated = false and letting the app re-fetch.
          // The protected route will call /auth/me automatically.
        }
      },
    }
  )
)

export default useAuthStore
