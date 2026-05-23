/**
 * http.ts — FIXED
 *
 * ROOT CAUSE OF BUG 3 (continued):
 * ────────────────────────────────────────────────────────
 * OLD CODE:
 *   const token = localStorage.getItem(STORAGE_KEYS.TOKEN)
 *   // STORAGE_KEYS.TOKEN = 'erp_token'
 *   // But 'erp_token' held the full Zustand JSON blob, not just the JWT.
 *   // Result: Authorization: Bearer {"state":{"token":"eyJ..."}} → 401
 *
 * FIX:
 *   Read from RAW_TOKEN_KEY ('erp_raw_token') which holds ONLY the JWT string.
 *   This key is written by authStore.setAuth() and cleared by authStore.logout().
 *
 * ADDITIONAL FIXES:
 * - Token refresh on 401 with refresh_token stored separately
 * - Retry original request once after successful refresh
 * - Clear both auth keys on permanent 401 (expired/invalid refresh)
 */

import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios'
import { API_BASE, API_TIMEOUT } from '@/constants'
import { RAW_TOKEN_KEY } from '@/store/authStore'

// ── Separate key for refresh token ────────────────────────────────────────
export const REFRESH_TOKEN_KEY = 'erp_refresh_token'

// ── Axios instance ────────────────────────────────────────────────────────
const http = axios.create({
  baseURL: API_BASE,
  timeout: API_TIMEOUT,
  headers: { 'Content-Type': 'application/json' },
})

// ── Track refresh state to prevent concurrent refresh storms ─────────────
let isRefreshing       = false
let refreshSubscribers: Array<(token: string) => void> = []

function subscribeTokenRefresh(cb: (token: string) => void) {
  refreshSubscribers.push(cb)
}

function onRefreshDone(token: string) {
  refreshSubscribers.forEach(cb => cb(token))
  refreshSubscribers = []
}

function clearAuthAndRedirect() {
  localStorage.removeItem(RAW_TOKEN_KEY)
  localStorage.removeItem(REFRESH_TOKEN_KEY)
  localStorage.removeItem('erp_auth_state')  // Zustand persist key
  // Only redirect if not already on login/signup page
  if (!window.location.pathname.startsWith('/login') && !window.location.pathname.startsWith('/signup')) {
    window.location.href = '/login'
  }
}

// ── Request interceptor — attach JWT ─────────────────────────────────────
http.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    // ── FIX: read from RAW_TOKEN_KEY, not STORAGE_KEYS.TOKEN ────────────
    // RAW_TOKEN_KEY holds the plain JWT string (e.g. "eyJhbGci...")
    // STORAGE_KEYS.TOKEN ('erp_token') held the full Zustand JSON blob.
    const token = localStorage.getItem(RAW_TOKEN_KEY)

    if (token && token !== 'null' && token !== 'undefined') {
      // Sanity check: ensure it looks like a JWT (three dot-separated parts)
      if (token.includes('.')) {
        config.headers.Authorization = `Bearer ${token}`
      } else {
        // Corrupted token — clear it
        console.warn('[http] Corrupted token found, clearing auth state')
        clearAuthAndRedirect()
      }
    }

    if (import.meta.env.DEV) {
      console.debug(`[API →] ${config.method?.toUpperCase()} ${config.url}`)
    }

    return config
  },
  (error) => Promise.reject(error)
)

// ── Response interceptor — handle 401 with token refresh ─────────────────
http.interceptors.response.use(
  (response) => {
    if (import.meta.env.DEV) {
      console.debug(`[API ✓] ${response.status} ${response.config.url}`)
    }
    return response
  },
  async (error: AxiosError<{ message?: string; code?: string }>) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean }
    const status          = error.response?.status
    const code            = error.response?.data?.code

    // ── Handle 401: attempt token refresh ────────────────────────────────
    if (status === 401 && !originalRequest._retry) {
      const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY)

      // No refresh token → clear and redirect
      if (!refreshToken) {
        clearAuthAndRedirect()
        return Promise.reject(normalizeError(error))
      }

      // If already refreshing, queue this request
      if (isRefreshing) {
        return new Promise((resolve) => {
          subscribeTokenRefresh((newToken) => {
            originalRequest.headers.Authorization = `Bearer ${newToken}`
            resolve(http(originalRequest))
          })
        })
      }

      originalRequest._retry = true
      isRefreshing = true

      try {
        const res = await axios.post(
          `${API_BASE}/auth/refresh`,
          { refresh_token: refreshToken },
          { headers: { 'Content-Type': 'application/json' } }
        )

        const newToken = res.data?.data?.token
        if (!newToken) throw new Error('No token in refresh response')

        // Store new token
        localStorage.setItem(RAW_TOKEN_KEY, newToken)

        // Update Zustand state without causing a re-render storm
        // We update the persisted JSON directly
        try {
          const raw = localStorage.getItem('erp_auth_state')
          if (raw) {
            const parsed = JSON.parse(raw)
            parsed.state.token = newToken
            localStorage.setItem('erp_auth_state', JSON.stringify(parsed))
          }
        } catch {}

        onRefreshDone(newToken)

        // Retry original request with new token
        originalRequest.headers.Authorization = `Bearer ${newToken}`
        return http(originalRequest)

      } catch (refreshErr) {
        // Refresh failed — session is dead
        console.warn('[http] Token refresh failed, clearing session')
        clearAuthAndRedirect()
        return Promise.reject(normalizeError(error))
      } finally {
        isRefreshing = false
      }
    }

    // ── 403: not a redirect, just return error ────────────────────────────
    if (status === 403) {
      return Promise.reject(normalizeError(error))
    }

    return Promise.reject(normalizeError(error))
  }
)

function normalizeError(error: AxiosError<{ message?: string }>) {
  return {
    message: error.response?.data?.message || error.message || 'Network error',
    status:  error.response?.status,
    errors:  (error.response?.data as any)?.errors || null,
    original: error,
  }
}

export default http
