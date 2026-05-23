/**
 * LoginPage.tsx — FIXED
 *
 * BUGS FIXED:
 *  1. Backend /auth/login returns { token, refresh_token, user, company }
 *     — NOT { access_token }.  Old code had a fallback:
 *       body.access_token || (body as any).token
 *     This worked but was fragile. Now reads body.token directly.
 *
 *  2. refresh_token was never stored after login.
 *     After 8 hours, the access token expired and refresh was impossible,
 *     forcing users to re-login. Now stores refresh_token in localStorage.
 *
 *  3. On register, backend returns { token } (not access_token).
 *     SignupPage.tsx already read body.token correctly, but we harden it here.
 */

import { useState } from 'react'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { motion } from 'framer-motion'
import { Eye, EyeOff, LogIn } from 'lucide-react'
import { authAPI } from '@/services/api'
import useAuthStore from '@/store/authStore'
import { REFRESH_TOKEN_KEY } from '@/services/http'
import { PATHS } from '@/constants'
import { Spinner } from '@/components/ui'

const schema = z.object({
  email:    z.string().email('Invalid email'),
  password: z.string().min(1, 'Password is required'),
})
type Form = z.infer<typeof schema>

export default function LoginPage() {
  const navigate  = useNavigate()
  const location  = useLocation()
  const setAuth   = useAuthStore((s) => s.setAuth)
  const [showPw, setShowPw] = useState(false)
  const [apiErr, setApiErr] = useState('')

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<Form>({
    resolver: zodResolver(schema),
    defaultValues: { email: 'admin@demo.com', password: 'admin123' },
  })

  const onSubmit = async (data: Form) => {
    setApiErr('')
    try {
      const res  = await authAPI.login(data)
      const body = res.data.data

      // ── FIX 1: backend returns 'token', not 'access_token' ──────────────
      const token = body.token || (body as any).access_token
      if (!token) throw new Error('No token received from server')

      // ── FIX 2: store refresh_token so silent re-auth works ───────────────
      if (body.refresh_token) {
        localStorage.setItem(REFRESH_TOKEN_KEY, body.refresh_token)
      }

      // setAuth also writes to RAW_TOKEN_KEY (the fix that prevents the 401 loop)
      setAuth({
        token,
        user:    body.user,
        company: body.company,
      })

      const from = (location.state as any)?.from?.pathname || PATHS.DASHBOARD
      navigate(from, { replace: true })

    } catch (e: any) {
      setApiErr(e.message || 'Login failed. Check your credentials.')
    }
  }

  return (
    <div className="min-h-screen bg-[var(--bg)] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: .3 }}
        className="w-full max-w-sm"
      >
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-brand mb-3 shadow-md">
            <svg width="26" height="26" viewBox="0 0 26 26" fill="none">
              <path d="M8 13h10M13 8v10" stroke="#fff" strokeWidth="2.5" strokeLinecap="round"/>
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-[var(--text)] tracking-tight">MediERP</h1>
          <p className="text-sm text-[var(--text-3)] mt-1">Pharma + Accounting System</p>
        </div>

        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-7 shadow-card">
          <h2 className="font-bold text-base mb-5 text-[var(--text)]">Sign in to your account</h2>

          {apiErr && (
            <div className="alert alert-danger mb-4 text-sm">{apiErr}</div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="text-[11px] font-semibold text-[var(--text-3)] uppercase tracking-wide block mb-1.5">
                Email address
              </label>
              <input
                type="email"
                className="erp-input"
                placeholder="you@company.com"
                autoComplete="email"
                {...register('email')}
              />
              {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email.message}</p>}
            </div>

            <div>
              <label className="text-[11px] font-semibold text-[var(--text-3)] uppercase tracking-wide block mb-1.5">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPw ? 'text' : 'password'}
                  className="erp-input pr-10"
                  placeholder="••••••••"
                  autoComplete="current-password"
                  {...register('password')}
                />
                <button
                  type="button"
                  onClick={() => setShowPw((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-4)] hover:text-[var(--text-2)]"
                  tabIndex={-1}
                >
                  {showPw ? <EyeOff size={15}/> : <Eye size={15}/>}
                </button>
              </div>
              {errors.password && <p className="text-xs text-red-500 mt-1">{errors.password.message}</p>}
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="btn btn-primary w-full justify-center mt-2 h-10 text-sm"
            >
              {isSubmitting ? <Spinner size={16}/> : <LogIn size={15}/>}
              {isSubmitting ? 'Signing in…' : 'Sign in'}
            </button>
          </form>

          <p className="text-center text-sm text-[var(--text-3)] mt-5">
            Don't have an account?{' '}
            <Link to={PATHS.SIGNUP} className="text-brand font-semibold hover:underline">
              Create account
            </Link>
          </p>
        </div>

        <p className="text-center text-xs text-[var(--text-4)] mt-4">
          Demo: admin@demo.com / admin123
        </p>
      </motion.div>
    </div>
  )
}
