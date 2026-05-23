import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { motion } from 'framer-motion'
import { Eye, EyeOff, UserPlus } from 'lucide-react'
import { authAPI } from '@/services/api'
import useAuthStore from '@/store/authStore'
import { PATHS } from '@/constants'
import { Spinner } from '@/components/ui'

const schema = z.object({
  name:            z.string().min(2, 'Name required'),
  email:           z.string().email('Invalid email'),
  password:        z.string().min(8, 'Minimum 8 characters'),
  phone:           z.string().optional(),
  company_name:    z.string().min(2, 'Company name required'),
  company_address: z.string().optional(),
  company_phone:   z.string().optional(),
  pan_no:          z.string().optional(),
  invoice_prefix:  z.string().optional(),
})
type Form = z.infer<typeof schema>

export default function SignupPage() {
  const navigate = useNavigate()
  const setAuth  = useAuthStore((s) => s.setAuth)
  const [showPw, setShowPw] = useState(false)
  const [apiErr, setApiErr] = useState('')

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<Form>({
    resolver: zodResolver(schema),
  })

  const onSubmit = async (data: Form) => {
    setApiErr('')
    try {
      const res  = await authAPI.register(data)
      const body = res.data.data
      setAuth({ token: body.token, user: body.user, company: body.company })
      navigate(PATHS.DASHBOARD, { replace: true })
    } catch (e: any) {
      setApiErr(e.message || 'Registration failed')
    }
  }

  return (
    <div className="min-h-screen bg-[var(--bg)] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: .3 }}
        className="w-full max-w-lg"
      >
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-brand mb-3 shadow-md">
            <svg width="26" height="26" viewBox="0 0 26 26" fill="none">
              <path d="M8 13h10M13 8v10" stroke="#fff" strokeWidth="2.5" strokeLinecap="round"/>
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-[var(--text)]">Create your account</h1>
          <p className="text-sm text-[var(--text-3)] mt-1">Set up your pharma ERP in minutes</p>
        </div>

        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-7 shadow-card">
          {apiErr && <div className="alert alert-danger mb-4 text-sm">{apiErr}</div>}

          <form onSubmit={handleSubmit(onSubmit)}>
            {/* Company */}
            <p className="text-[10px] font-bold text-[var(--text-4)] uppercase tracking-widest mb-3 pb-1.5 border-b border-[var(--border)]">
              Company Details
            </p>
            <div className="form-grid mb-4">
              <div className="form-grid-item" style={{ gridColumn: 'span 2' }}>
                <label className="text-[11px] font-semibold text-[var(--text-3)] uppercase tracking-wide block mb-1.5">Company Name *</label>
                <input className="erp-input" placeholder="Nepal Pharma Pvt. Ltd." {...register('company_name')} />
                {errors.company_name && <p className="text-xs text-red-500 mt-1">{errors.company_name.message}</p>}
              </div>
              <div>
                <label className="text-[11px] font-semibold text-[var(--text-3)] uppercase tracking-wide block mb-1.5">PAN / VAT No</label>
                <input className="erp-input" placeholder="123456789" {...register('pan_no')} />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-[var(--text-3)] uppercase tracking-wide block mb-1.5">Invoice Prefix</label>
                <input className="erp-input" placeholder="INV" {...register('invoice_prefix')} />
              </div>
              <div style={{ gridColumn: 'span 2' }}>
                <label className="text-[11px] font-semibold text-[var(--text-3)] uppercase tracking-wide block mb-1.5">Address</label>
                <input className="erp-input" placeholder="Kathmandu, Nepal" {...register('company_address')} />
              </div>
            </div>

            {/* User */}
            <p className="text-[10px] font-bold text-[var(--text-4)] uppercase tracking-widest mb-3 pb-1.5 border-b border-[var(--border)]">
              Admin Account
            </p>
            <div className="form-grid mb-5">
              <div>
                <label className="text-[11px] font-semibold text-[var(--text-3)] uppercase tracking-wide block mb-1.5">Full Name *</label>
                <input className="erp-input" placeholder="Ram Kumar" {...register('name')} />
                {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name.message}</p>}
              </div>
              <div>
                <label className="text-[11px] font-semibold text-[var(--text-3)] uppercase tracking-wide block mb-1.5">Phone</label>
                <input className="erp-input" placeholder="9841234567" {...register('phone')} />
              </div>
              <div style={{ gridColumn: 'span 2' }}>
                <label className="text-[11px] font-semibold text-[var(--text-3)] uppercase tracking-wide block mb-1.5">Email *</label>
                <input type="email" className="erp-input" placeholder="admin@company.com" {...register('email')} />
                {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email.message}</p>}
              </div>
              <div style={{ gridColumn: 'span 2' }}>
                <label className="text-[11px] font-semibold text-[var(--text-3)] uppercase tracking-wide block mb-1.5">Password *</label>
                <div className="relative">
                  <input
                    type={showPw ? 'text' : 'password'}
                    className="erp-input pr-10"
                    placeholder="Minimum 8 characters"
                    {...register('password')}
                  />
                  <button type="button" onClick={() => setShowPw(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-4)] hover:text-[var(--text-2)]">
                    {showPw ? <EyeOff size={15}/> : <Eye size={15}/>}
                  </button>
                </div>
                {errors.password && <p className="text-xs text-red-500 mt-1">{errors.password.message}</p>}
              </div>
            </div>

            <button type="submit" disabled={isSubmitting}
              className="btn btn-primary w-full justify-center h-10 text-sm">
              {isSubmitting ? <Spinner size={16}/> : <UserPlus size={15}/>}
              {isSubmitting ? 'Creating account…' : 'Create account'}
            </button>
          </form>

          <p className="text-center text-sm text-[var(--text-3)] mt-4">
            Already have an account?{' '}
            <Link to={PATHS.LOGIN} className="text-brand font-semibold hover:underline">Sign in</Link>
          </p>
        </div>
      </motion.div>
    </div>
  )
}
