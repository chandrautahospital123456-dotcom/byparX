import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  FileText, Inbox, DollarSign, Package, AlertTriangle,
  Users, BarChart2, BookOpen, TrendingUp, TrendingDown,
  ShoppingCart, Clock, ArrowUpRight,
} from 'lucide-react'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar,
} from 'recharts'
import { useDashboard, useSales } from '@/hooks/useQuery'
import useAuthStore from '@/store/authStore'
import { fmt, fmtDate } from '@/utils'
import { StatCard, SkeletonRows, Badge } from '@/components/ui'
import { PATHS } from '@/constants'

// ─── Animated stat card wrapper ───────────────────────────────────────────────
function AnimatedStat(props: Parameters<typeof StatCard>[0] & { delay?: number }) {
  const { delay = 0, ...rest } = props
  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay, duration: .3 }}>
      <StatCard {...rest} />
    </motion.div>
  )
}

// ─── Quick action card ────────────────────────────────────────────────────────
function QuickAction({ label, path, color, icon }: { label: string; path: string; color: string; icon: React.ReactNode }) {
  const navigate = useNavigate()
  return (
    <button
      onClick={() => navigate(path)}
      className="flex items-center gap-3 p-3.5 bg-[var(--surface)] border border-[var(--border)] rounded-xl hover:border-[var(--brand)] hover:shadow-md transition-all duration-200 text-left w-full group"
    >
      <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: `${color}18` }}>
        <div style={{ color }}>{icon}</div>
      </div>
      <span className="text-sm font-semibold text-[var(--text-2)] group-hover:text-[var(--text)]">{label}</span>
      <ArrowUpRight size={14} className="ml-auto text-[var(--text-4)] group-hover:text-[var(--brand)]" />
    </button>
  )
}

export default function DashboardPage() {
  const { user, company } = useAuthStore()
  const { data: stats, isLoading }  = useDashboard()
  const { data: salesData }         = useSales({ limit: 6, page: 1 })
  const recentSales = (salesData?.data as any[]) || []
  const navigate = useNavigate()

  // Mock sparkline data — replace with real when /reports/monthly-trend exists
  const sparkData = [
    { name: 'Mon', sales: 0 }, { name: 'Tue', sales: 0 },
    { name: 'Wed', sales: 0 }, { name: 'Thu', sales: 0 },
    { name: 'Fri', sales: 0 }, { name: 'Sat', sales: 0 },
    { name: 'Sun', sales: 0 },
  ]

  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <div>
          <div className="page-breadcrumb">Overview</div>
          <h1 className="page-title">
            {isLoading ? 'Dashboard' : `Hey, ${user?.name?.split(' ')[0] || 'there'} 👋`}
          </h1>
          {company?.name && (
            <p className="text-xs text-[var(--text-3)] mt-0.5">{company.name}</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => navigate(PATHS.SALES)} className="btn btn-primary">
            <FileText size={14}/> New Invoice
          </button>
        </div>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3 mb-5">
        <AnimatedStat delay={0}    label="Today's Sales"  value={isLoading ? '—' : fmt(stats?.today?.sales_total)} sub={`${stats?.today?.sales_count || 0} invoices`} color="var(--brand)"  icon={<FileText size={20} strokeWidth={1.8}/>} />
        <AnimatedStat delay={.05}  label="Monthly Revenue" value={isLoading ? '—' : fmt(stats?.this_month?.revenue)} color="var(--green)"  icon={<TrendingUp size={20} strokeWidth={1.8}/>} />
        <AnimatedStat delay={.1}   label="Receivable"    value={isLoading ? '—' : fmt(stats?.receivable)}         color="var(--amber)"  icon={<DollarSign size={20} strokeWidth={1.8}/>} />
        <AnimatedStat delay={.15}  label="Payable"       value={isLoading ? '—' : fmt(stats?.payable)}            color="var(--red)"    icon={<TrendingDown size={20} strokeWidth={1.8}/>} />
        <AnimatedStat delay={.2}   label="Stock Value"   value={isLoading ? '—' : fmt(stats?.stock_value)}        color="var(--purple)" icon={<Package size={20} strokeWidth={1.8}/>} />
        <AnimatedStat delay={.25}  label="Low Stock"     value={isLoading ? '—' : String(stats?.low_stock_items || 0)} color="var(--red)" icon={<AlertTriangle size={20} strokeWidth={1.8}/>} onClick={() => navigate(PATHS.PRODUCTS)} />
      </div>

      {/* Middle row */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 mb-4">
        {/* Recent Sales */}
        <div className="xl:col-span-2 table-card">
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-[var(--border)]">
            <div>
              <div className="font-bold text-sm text-[var(--text)]">Recent Sales</div>
              <div className="text-xs text-[var(--text-3)]">Latest invoices</div>
            </div>
            <button onClick={() => navigate(PATHS.SALES)} className="btn btn-ghost btn-sm text-brand">
              View all →
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="erp-table">
              <thead>
                <tr>
                  <th>Invoice</th><th>Party</th><th>Amount</th><th>Mode</th><th>Status</th>
                </tr>
              </thead>
              <tbody>
                {isLoading
                  ? <SkeletonRows cols={5} rows={5} />
                  : recentSales.length
                    ? recentSales.map((s: any) => (
                        <tr key={s.id} className="clickable" onClick={() => navigate(PATHS.SALES)}>
                          <td className="td-mono text-brand">{s.invoice_no}</td>
                          <td>{s.party_name || 'Walk-in'}</td>
                          <td className="td-right">{fmt(s.net_total || s.total)}</td>
                          <td><Badge status={s.payment_mode}/></td>
                          <td><Badge status={s.status}/></td>
                        </tr>
                      ))
                    : <tr><td colSpan={5} className="text-center py-10 text-[var(--text-4)] text-sm">No sales yet</td></tr>
                }
              </tbody>
            </table>
          </div>
        </div>

        {/* Quick actions */}
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-4 shadow-card">
          <div className="font-bold text-sm text-[var(--text)] mb-3">Quick Actions</div>
          <div className="flex flex-col gap-2">
            <QuickAction label="New Invoice"   path={PATHS.SALES}      color="var(--brand)"  icon={<FileText size={16}/>}  />
            <QuickAction label="New Purchase"  path={PATHS.PURCHASE}   color="var(--purple)" icon={<Inbox size={16}/>}     />
            <QuickAction label="Add Customer"  path={PATHS.CUSTOMERS}  color="var(--teal)"   icon={<Users size={16}/>}     />
            <QuickAction label="Add Product"   path={PATHS.PRODUCTS}   color="var(--green)"  icon={<Package size={16}/>}   />
            <QuickAction label="Accounting"    path={PATHS.ACCOUNTING} color="var(--red)"    icon={<BookOpen size={16}/>}  />
            <QuickAction label="Reports"       path={PATHS.REPORTS}    color="var(--amber)"  icon={<BarChart2 size={16}/>} />
          </div>
        </div>
      </div>

      {/* Alerts row */}
      {((stats?.low_stock_items || 0) > 0 || (stats?.expiry_alerts || 0) > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {(stats?.low_stock_items || 0) > 0 && (
            <motion.div
              initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
              className="flex items-center gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl cursor-pointer hover:bg-amber-100 transition-colors"
              onClick={() => navigate(PATHS.PRODUCTS)}
            >
              <div className="w-9 h-9 bg-amber-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <AlertTriangle size={18} className="text-amber-600"/>
              </div>
              <div>
                <div className="font-bold text-sm text-amber-800">{stats!.low_stock_items} items below minimum stock</div>
                <div className="text-xs text-amber-600">Click to review products</div>
              </div>
              <ArrowUpRight size={15} className="ml-auto text-amber-400"/>
            </motion.div>
          )}
          {(stats?.expiry_alerts || 0) > 0 && (
            <motion.div
              initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }}
              className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-xl cursor-pointer hover:bg-red-100 transition-colors"
              onClick={() => navigate(PATHS.STOCK)}
            >
              <div className="w-9 h-9 bg-red-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <Clock size={18} className="text-red-600"/>
              </div>
              <div>
                <div className="font-bold text-sm text-red-800">{stats!.expiry_alerts} batches expiring within 30 days</div>
                <div className="text-xs text-red-600">Click to review stock</div>
              </div>
              <ArrowUpRight size={15} className="ml-auto text-red-400"/>
            </motion.div>
          )}
        </div>
      )}
    </div>
  )
}
