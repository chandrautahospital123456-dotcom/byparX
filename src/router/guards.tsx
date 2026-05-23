/**
 * guards.tsx — FIXED
 *
 * ROOT CAUSE OF BUG 3 (final piece):
 * ────────────────────────────────────────────────────────
 * OLD behaviour: RequireAuth only checked isAuthenticated from Zustand state.
 * After a hard refresh:
 *   1. Zustand rehydrates from localStorage ('erp_auth_state')
 *   2. isAuthenticated = true, but token in HTTP header was the corrupted JSON blob
 *   3. First API call → 401 → redirect to /login
 *   4. isAuthenticated still true → redirect back to dashboard → infinite loop
 *
 * FIX:
 *   On mount, RequireAuth calls /auth/me to validate the token is real.
 *   If /me returns 200 → session is valid → render children.
 *   If /me returns 401 → clear auth state → redirect to /login cleanly.
 *   Show a loading spinner during this check (prevents flash of wrong page).
 *
 * This is the standard SPA session-validation pattern used by all production apps.
 */

import { useState, useEffect } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { authAPI } from '@/services/api'
import useAuthStore from '@/store/authStore'
import { RAW_TOKEN_KEY } from '@/store/authStore'
import { REFRESH_TOKEN_KEY } from '@/services/http'
import { PATHS } from '@/constants'
import { Spinner } from '@/components/ui'

// ── RequireAuth ───────────────────────────────────────────────────────────
// Validates the session on every mount. Shows spinner while checking.
export function RequireAuth({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, setAuth, updateUser, logout } = useAuthStore()
  const location = useLocation()
  const [checking, setChecking] = useState(true)
  const [valid,    setValid]    = useState(false)

  useEffect(() => {
    // No token at all → no need to check, redirect immediately
    const rawToken = localStorage.getItem(RAW_TOKEN_KEY)
    if (!rawToken || rawToken === 'null' || rawToken === 'undefined') {
      setChecking(false)
      setValid(false)
      return
    }

    // Token exists → validate with /auth/me
    authAPI.me()
      .then((res) => {
        const { user, company } = res.data.data
        // Update user/company in case they changed since last login
        updateUser(user)
        if (company) useAuthStore.getState().setCompany(company)
        setValid(true)
      })
      .catch((err) => {
        // Token is invalid/expired — clean logout
        console.warn('[RequireAuth] Session invalid:', err?.message)
        logout()
        localStorage.removeItem(RAW_TOKEN_KEY)
        // Don't remove refresh token here — http.ts may have already retried.
        // If we're here, both access + refresh have failed.
        localStorage.removeItem(REFRESH_TOKEN_KEY)
        setValid(false)
      })
      .finally(() => setChecking(false))
  }, []) // Only runs once on mount

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--bg)]">
        <div className="flex flex-col items-center gap-3">
          <Spinner size={32} className="text-brand" />
          <p className="text-sm text-[var(--text-3)]">Verifying session…</p>
        </div>
      </div>
    )
  }

  if (!valid) {
    return <Navigate to={PATHS.LOGIN} state={{ from: location }} replace />
  }

  return <>{children}</>
}

// ── RequireGuest ──────────────────────────────────────────────────────────
// Redirects authenticated users away from login/signup pages.
export function RequireGuest({ children }: { children: React.ReactNode }) {
  const rawToken = localStorage.getItem(RAW_TOKEN_KEY)
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)

  // If we have a raw token and Zustand says authenticated, go to dashboard
  if (rawToken && rawToken !== 'null' && isAuthenticated) {
    return <Navigate to={PATHS.DASHBOARD} replace />
  }

  return <>{children}</>
}

// ── RequireRole ───────────────────────────────────────────────────────────
export function RequireRole({
  children,
  roles,
  fallback,
}: {
  children:  React.ReactNode
  roles:     string[]
  fallback?: React.ReactNode
}) {
  const role = useAuthStore((s) => s.user?.role)
  const can  = useAuthStore((s) => s.can)

  const allowed = roles.some((r) => {
    if (r === 'owner' || r === 'admin') return role === 'owner' || role === 'admin'
    if (r.endsWith('.*')) return can(r.replace('.*', '.view'))
    return role === r || can(r)
  })

  if (!allowed) {
    return fallback ? <>{fallback}</> : (
      <div className="flex items-center justify-center h-64 text-[var(--text-3)]">
        <div className="text-center">
          <div className="text-4xl mb-3">🔒</div>
          <p className="font-semibold text-[var(--text-2)]">Access Denied</p>
          <p className="text-sm mt-1">You don't have permission to view this page.</p>
          <p className="text-xs mt-2 text-[var(--text-4)]">Your role: {role}</p>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
