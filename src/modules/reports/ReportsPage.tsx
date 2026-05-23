import { useState, useEffect, useCallback } from 'react'
import { Tabs, Button, Empty, SkeletonRows } from '@/components/ui'
import { reportsAPI, accountingAPI } from '@/services/api'
import useUIStore from '@/store/uiStore'
import { fmt, fmtDate, downloadCSV } from '@/utils'
import { Download, Printer, Search, TrendingUp, TrendingDown } from 'lucide-react'

const REPORT_TABS = [
  { id: 'sales',      label: 'Sales Report'       },
  { id: 'purchases',  label: 'Purchase Report'    },
  { id: 'pnl',        label: 'Profit & Loss'      },
  { id: 'stock',      label: 'Stock Valuation'    },
  { id: 'expiry',     label: 'Expiry Report'      },
  { id: 'party_bal',  label: 'Party Balances'     },
]

function DateFilter({ dateFrom, dateTo, onChange, onGenerate, loading }: {
  dateFrom: string; dateTo: string;
  onChange: (k: 'from'|'to', v: string) => void;
  onGenerate: () => void; loading?: boolean;
}) {
  return (
    <div className="flex items-end gap-3 mb-4 flex-wrap bg-[var(--surface)] border border-[var(--border)] rounded-xl p-4 shadow-card">
      <div>
        <label className="text-[11px] font-semibold text-[var(--text-3)] uppercase tracking-wide block mb-1">From</label>
        <input type="date" className="erp-input" style={{ width: 155 }} value={dateFrom} onChange={e => onChange('from', e.target.value)} />
      </div>
      <div>
        <label className="text-[11px] font-semibold text-[var(--text-3)] uppercase tracking-wide block mb-1">To</label>
        <input type="date" className="erp-input" style={{ width: 155 }} value={dateTo} onChange={e => onChange('to', e.target.value)} />
      </div>
      <Button variant="primary" icon={<Search size={14}/>} loading={loading} onClick={onGenerate}>Generate</Button>
    </div>
  )
}

function SalesReport() {
  const [dateFrom, setDateFrom] = useState(new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0])
  const [dateTo,   setDateTo]   = useState(new Date().toISOString().split('T')[0])
  const [rows,     setRows]     = useState<any[]>([])
  const [loading,  setLoading]  = useState(false)
  const { error }              = useUIStore()

  async function generate() {
    setLoading(true)
    try { const r = await reportsAPI.sales({ date_from: dateFrom, date_to: dateTo }); const body = r.data?.data; setRows(Array.isArray(body) ? body : (body?.data ?? [])) }
    catch (e: any) { error('Failed', e.message) }
    finally { setLoading(false) }
  }

  const total = rows.reduce((s: number, r: any) => s + Number(r.net_total || r.total || 0), 0)

  return (
    <>
      <DateFilter dateFrom={dateFrom} dateTo={dateTo}
        onChange={(k,v) => k === 'from' ? setDateFrom(v) : setDateTo(v)}
        onGenerate={generate} loading={loading} />
      {rows.length > 0 && (
        <div className="table-card">
          <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)]">
            <div className="font-bold text-sm">{rows.length} invoices · Total: <span className="text-brand">{fmt(total)}</span></div>
            <Button variant="secondary" size="sm" icon={<Download size={13}/>} onClick={() => downloadCSV(rows, 'sales-report')}>Export</Button>
          </div>
          <div className="overflow-x-auto">
            <table className="erp-table">
              <thead><tr><th>Invoice</th><th>Date</th><th>Party</th><th className="td-right">Total</th><th className="td-right">Paid</th><th className="td-right">Due</th><th>Mode</th><th>Status</th></tr></thead>
              <tbody>
                {rows.map((r: any, i: number) => (
                  <tr key={i}>
                    <td className="td-mono text-brand">{r.invoice_no}</td>
                    <td className="td-mono">{fmtDate(r.date_ad)}</td>
                    <td>{r.party_name || 'Walk-in'}</td>
                    <td className="td-right">{fmt(r.net_total || r.total)}</td>
                    <td className="td-right text-green-700">{fmt(r.paid_amount || 0)}</td>
                    <td className={`td-right ${Number(r.due_amount) > 0 ? 'text-amber-600' : ''}`}>{fmt(r.due_amount || 0)}</td>
                    <td><span className="badge badge-blue">{r.payment_mode}</span></td>
                    <td><span className={`badge ${r.status === 'active' ? 'badge-green' : 'badge-red'}`}>{r.status}</span></td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={3} className="text-right font-bold text-sm pr-3">TOTAL</td>
                  <td className="td-right font-bold text-brand">{fmt(total)}</td>
                  <td colSpan={4}/>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}
    </>
  )
}

function PurchaseReport() {
  const [dateFrom, setDateFrom] = useState(new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0])
  const [dateTo,   setDateTo]   = useState(new Date().toISOString().split('T')[0])
  const [rows,     setRows]     = useState<any[]>([])
  const [loading,  setLoading]  = useState(false)
  const { error }              = useUIStore()

  async function generate() {
    setLoading(true)
    try { const r = await reportsAPI.purchases({ date_from: dateFrom, date_to: dateTo }); const body = r.data?.data; setRows(Array.isArray(body) ? body : (body?.data ?? [])) }
    catch (e: any) { error('Failed', e.message) }
    finally { setLoading(false) }
  }

  const total = rows.reduce((s: number, r: any) => s + Number(r.net_total || 0), 0)

  return (
    <>
      <DateFilter dateFrom={dateFrom} dateTo={dateTo}
        onChange={(k,v) => k === 'from' ? setDateFrom(v) : setDateTo(v)}
        onGenerate={generate} loading={loading} />
      {rows.length > 0 && (
        <div className="table-card">
          <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)]">
            <div className="font-bold text-sm">{rows.length} bills · Total: <span className="text-brand">{fmt(total)}</span></div>
            <Button variant="secondary" size="sm" icon={<Download size={13}/>} onClick={() => downloadCSV(rows, 'purchase-report')}>Export</Button>
          </div>
          <div className="overflow-x-auto">
            <table className="erp-table">
              <thead><tr><th>Bill No</th><th>Date</th><th>Supplier</th><th className="td-right">Total</th><th className="td-right">Due</th><th>Status</th></tr></thead>
              <tbody>
                {rows.map((r: any, i: number) => (
                  <tr key={i}>
                    <td className="td-mono text-brand">{r.bill_no}</td>
                    <td className="td-mono">{fmtDate(r.date_ad)}</td>
                    <td>{r.party_name || '—'}</td>
                    <td className="td-right">{fmt(r.net_total)}</td>
                    <td className={`td-right ${Number(r.due_amount) > 0 ? 'text-amber-600' : ''}`}>{fmt(r.due_amount || 0)}</td>
                    <td><span className={`badge ${r.status === 'active' ? 'badge-green' : 'badge-red'}`}>{r.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  )
}

function PnLReport() {
  const [dateFrom, setDateFrom] = useState(new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0])
  const [dateTo,   setDateTo]   = useState(new Date().toISOString().split('T')[0])
  const [report,   setReport]   = useState<any>(null)
  const [loading,  setLoading]  = useState(false)
  const { error }              = useUIStore()

  async function generate() {
    setLoading(true)
    try { const r = await accountingAPI.pnl({ date_from: dateFrom, date_to: dateTo });
        // Backend returns: { income:{rows:[],total}, expense:{rows:[],total}, net_profit }
        const raw = r.data?.data ?? r.data ?? {}
        // Normalise to flat shape the component expects
        setReport({
          income:        Array.isArray(raw.income)  ? raw.income  : (raw.income?.rows  ?? []),
          expenses:      Array.isArray(raw.expense) ? raw.expense : (raw.expense?.rows ?? []),
          total_income:  raw.income?.total  ?? raw.total_income  ?? raw.total_revenue  ?? 0,
          total_expense: raw.expense?.total ?? raw.total_expense ?? raw.total_expenses ?? 0,
          net_profit:    raw.net_profit ?? 0,
        }) }
    catch (e: any) { error('Failed', e.message) }
    finally { setLoading(false) }
  }

  return (
    <>
      <DateFilter dateFrom={dateFrom} dateTo={dateTo}
        onChange={(k,v) => k === 'from' ? setDateFrom(v) : setDateTo(v)}
        onGenerate={generate} loading={loading} />
      {report && (
        <div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div className="table-card">
              <div className="px-4 py-3 border-b border-[var(--border)] font-bold text-sm text-green-700 flex items-center gap-2">
                <TrendingUp size={16}/> Income
              </div>
              <table className="erp-table">
                <thead><tr><th>Account</th><th className="td-right">Amount</th></tr></thead>
                <tbody>
                  {(report.income || []).map((r: any, i: number) => (
                    <tr key={i}><td>{r.name}</td><td className="td-right text-green-700">{fmt(r.balance || r.amount)}</td></tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <td className="font-bold text-sm text-right pr-3">TOTAL</td>
                    <td className="td-right font-bold text-green-700">{fmt(report.total_income)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
            <div className="table-card">
              <div className="px-4 py-3 border-b border-[var(--border)] font-bold text-sm text-red-600 flex items-center gap-2">
                <TrendingDown size={16}/> Expenses
              </div>
              <table className="erp-table">
                <thead><tr><th>Account</th><th className="td-right">Amount</th></tr></thead>
                <tbody>
                  {(report.expenses || []).map((r: any, i: number) => (
                    <tr key={i}><td>{r.name}</td><td className="td-right text-red-600">{fmt(r.balance || r.amount)}</td></tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <td className="font-bold text-sm text-right pr-3">TOTAL</td>
                    <td className="td-right font-bold text-red-600">{fmt(report.total_expense)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-6 text-center shadow-card">
            <div className="text-xs font-bold uppercase tracking-widest text-[var(--text-4)] mb-2">NET PROFIT / LOSS</div>
            <div className={`text-4xl font-bold font-mono ${Number(report.net_profit) >= 0 ? 'text-green-700' : 'text-red-600'}`}>
              {Number(report.net_profit) >= 0 ? '+' : ''}{fmt(report.net_profit)}
            </div>
          </div>
        </div>
      )}
    </>
  )
}

function StockReport() {
  const [rows, setRows]    = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const { error }         = useUIStore()

  async function generate() {
    setLoading(true)
    try { const r = await reportsAPI.stock(); const body = r.data?.data; setRows(Array.isArray(body) ? body : (body?.data ?? [])) }
    catch (e: any) { error('Failed', e.message) }
    finally { setLoading(false) }
  }

  const totalValue = rows.reduce((s: number, r: any) => s + Number(r.stock_value || 0), 0)

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <Button variant="primary" icon={<Search size={14}/>} loading={loading} onClick={generate}>Load Report</Button>
        {rows.length > 0 && <Button variant="secondary" size="sm" icon={<Download size={13}/>} onClick={() => downloadCSV(rows, 'stock-report')}>Export</Button>}
      </div>
      {rows.length > 0 && (
        <div className="table-card">
          <div className="px-4 py-3 border-b border-[var(--border)] font-bold text-sm">
            {rows.length} products · Value: <span className="text-brand">{fmt(totalValue)}</span>
          </div>
          <div className="overflow-x-auto">
            <table className="erp-table">
              <thead><tr><th>Code</th><th>Product</th><th>Unit</th><th className="td-right">Stock</th><th className="td-right">P.Rate</th><th className="td-right">Value</th></tr></thead>
              <tbody>
                {rows.map((r: any, i: number) => (
                  <tr key={i}>
                    <td className="td-mono text-brand">{r.item_code}</td>
                    <td>{r.name}</td>
                    <td><span className="badge badge-muted">{r.unit}</span></td>
                    <td className={`td-right ${r.low_stock ? 'text-red-600' : ''}`}>{r.current_stock}</td>
                    <td className="td-right">{fmt(r.purchase_rate)}</td>
                    <td className="td-right font-semibold">{fmt(r.stock_value)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  )
}

function ExpiryReport() {
  const [rows, setRows]    = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const { error }         = useUIStore()

  async function generate() {
    setLoading(true)
    try { const r = await reportsAPI.expiry(); const body = r.data?.data; setRows(Array.isArray(body) ? body : (body?.data ?? [])) }
    catch (e: any) { error('Failed', e.message) }
    finally { setLoading(false) }
  }

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <Button variant="primary" icon={<Search size={14}/>} loading={loading} onClick={generate}>Load Expiry Report</Button>
        {rows.length > 0 && <Button variant="secondary" size="sm" icon={<Download size={13}/>} onClick={() => downloadCSV(rows, 'expiry-report')}>Export</Button>}
      </div>
      {rows.length > 0 ? (
        <div className="table-card">
          <div className="overflow-x-auto">
            <table className="erp-table">
              <thead><tr><th>Product</th><th>Batch</th><th className="td-right">Qty</th><th>Expiry</th><th className="td-right">Days Left</th></tr></thead>
              <tbody>
                {rows.map((r: any, i: number) => {
                  const days = r.expiry_date ? Math.round((new Date(r.expiry_date).getTime() - Date.now()) / 86400000) : null
                  return (
                    <tr key={i} className={days !== null && days < 0 ? 'bg-red-50' : days !== null && days < 30 ? 'bg-amber-50' : ''}>
                      <td className="font-medium">{r.product_name}</td>
                      <td className="td-mono">{r.batch_no || '—'}</td>
                      <td className="td-right">{r.qty_available}</td>
                      <td className={`td-mono ${days !== null && days < 30 ? 'text-red-600 font-bold' : 'text-amber-600'}`}>{r.expiry || '—'}</td>
                      <td className={`td-right font-semibold font-mono ${days !== null && days < 0 ? 'text-red-600' : days !== null && days < 30 ? 'text-amber-600' : ''}`}>
                        {days !== null ? `${days}d` : '—'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : <Empty message="Click 'Load Expiry Report' to see results" />}
    </>
  )
}

function PartyBalanceReport() {
  const [rows,    setRows]    = useState<any[]>([])
  const [summary, setSummary] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [type,    setType]    = useState('customer')
  const { error }             = useUIStore()

  const load = useCallback(async (t: string) => {
    setLoading(true)
    try {
      const r    = await reportsAPI.partyBalance({ type: t })
      const body = r.data?.data ?? r.data ?? {}
      // Backend returns { data: [...], total, total_balance, total_due }
      const arr  = Array.isArray(body) ? body : (body?.data ?? [])
      setRows(arr)
      setSummary({ total_balance: body?.total_balance ?? 0, total_due: body?.total_due ?? 0, count: body?.total ?? arr.length })
    } catch (e: any) { error('Load failed', e.message) }
    finally { setLoading(false) }
  }, [])

  // Auto-load on mount and when type changes
  useEffect(() => { load(type) }, [type])

  const totalBalance = summary?.total_balance ?? rows.reduce((s: number, r: any) => s + Number(r.balance || 0), 0)
  const totalDue     = summary?.total_due     ?? rows.reduce((s: number, r: any) => s + Number(r.total_due || 0), 0)

  return (
    <>
      {/* Filter bar */}
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <select className="erp-input" style={{ width: 160 }} value={type}
          onChange={e => setType(e.target.value)}>
          <option value="customer">Customers</option>
          <option value="supplier">Suppliers</option>
        </select>
        <Button variant="primary" icon={<Search size={14}/>} loading={loading} onClick={() => load(type)}>
          Refresh
        </Button>
        {rows.length > 0 && (
          <Button variant="secondary" size="sm" icon={<Download size={13}/>}
            onClick={() => downloadCSV(rows, `party-balance-${type}`)}>
            Export CSV
          </Button>
        )}
        {/* Summary pills */}
        {summary && (
          <div className="flex gap-3 ml-auto text-sm">
            <div className="bg-[var(--surface)] border border-[var(--border)] rounded-lg px-3 py-1.5">
              <span className="text-[var(--text-3)] mr-1">{type === 'customer' ? 'Total Receivable' : 'Total Payable'}:</span>
              <span className={`font-bold font-mono ${Number(totalBalance) > 0 ? 'text-amber-600' : 'text-green-700'}`}>
                {fmt(totalBalance)}
              </span>
            </div>
            <div className="bg-[var(--surface)] border border-[var(--border)] rounded-lg px-3 py-1.5">
              <span className="text-[var(--text-3)] mr-1">Parties:</span>
              <span className="font-bold">{summary.count}</span>
            </div>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="table-card">
        <div className="overflow-x-auto">
          <table className="erp-table">
            <thead>
              <tr>
                <th>Code</th>
                <th>Name</th>
                <th>Phone</th>
                <th>PAN</th>
                <th className="td-right">Total Invoiced</th>
                <th className="td-right">Total Paid</th>
                <th className="td-right">Due</th>
                <th className="td-right">Balance</th>
              </tr>
            </thead>
            <tbody>
              {loading
                ? <SkeletonRows cols={8} />
                : rows.length
                  ? rows.map((r: any, i: number) => (
                      <tr key={i}>
                        <td className="td-mono text-brand">{r.code || '—'}</td>
                        <td className="font-semibold">{r.name}</td>
                        <td>{r.phone || '—'}</td>
                        <td className="td-mono text-xs">{r.pan_no || '—'}</td>
                        <td className="td-right">{fmt(r.total_invoiced || 0)}</td>
                        <td className="td-right text-green-700">{fmt(r.total_paid || 0)}</td>
                        <td className="td-right text-red-600">{fmt(r.total_due || 0)}</td>
                        <td className={`td-right font-bold font-mono ${
                          Number(r.balance || r.current_balance || 0) > 0
                            ? 'text-amber-600' : 'text-green-700'
                        }`}>
                          {fmt(r.balance ?? r.current_balance ?? 0)}
                        </td>
                      </tr>
                    ))
                  : (
                      <tr>
                        <td colSpan={8}>
                          <Empty message={`No ${type}s found`} />
                        </td>
                      </tr>
                    )
              }
            </tbody>
            {!loading && rows.length > 0 && (
              <tfoot>
                <tr>
                  <td colSpan={4} className="text-right font-bold text-xs pr-3 text-[var(--text-3)]">TOTALS</td>
                  <td className="td-right font-bold font-mono">{fmt(rows.reduce((s: number, r: any) => s + Number(r.total_invoiced||0), 0))}</td>
                  <td className="td-right font-bold font-mono text-green-700">{fmt(rows.reduce((s: number, r: any) => s + Number(r.total_paid||0), 0))}</td>
                  <td className="td-right font-bold font-mono text-red-600">{fmt(totalDue)}</td>
                  <td className={`td-right font-bold font-mono ${Number(totalBalance) > 0 ? 'text-amber-600' : 'text-green-700'}`}>{fmt(totalBalance)}</td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </>
  )
}

export default function ReportsPage() {
  const [tab, setTab] = useState('sales')

  return (
    <div>
      <div className="page-header">
        <div><div className="page-breadcrumb">Analytics</div><h1 className="page-title">Reports</h1></div>
      </div>

      <Tabs tabs={REPORT_TABS} active={tab} onChange={setTab} />

      {tab === 'sales'     && <SalesReport />}
      {tab === 'purchases' && <PurchaseReport />}
      {tab === 'pnl'       && <PnLReport />}
      {tab === 'stock'     && <StockReport />}
      {tab === 'expiry'    && <ExpiryReport />}
      {tab === 'party_bal' && <PartyBalanceReport />}
    </div>
  )
}
