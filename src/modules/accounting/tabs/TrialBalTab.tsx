import { useState } from 'react'
import { useTrialBalance } from '@/hooks/useQuery'
import { Button, SkeletonRows, Empty } from '@/components/ui'
import { fmt, downloadCSV } from '@/utils'
import { Download, Search } from 'lucide-react'
import type { TrialBalanceRow } from '@/types'

export default function TrialBalTab() {
  const [dateFrom, setDateFrom] = useState(new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0])
  const [dateTo,   setDateTo]   = useState(new Date().toISOString().split('T')[0])
  const [query,    setQuery]    = useState({ date_from: '', date_to: '' })

  const { data: rows, isLoading } = useTrialBalance(
    query.date_from ? query : undefined
  )
  const data = (rows as TrialBalanceRow[]) || []

  const totalDr = data.reduce((s, r) => s + (r.closing_debit  || 0), 0)
  const totalCr = data.reduce((s, r) => s + (r.closing_credit || 0), 0)

  function generate() {
    setQuery({ date_from: dateFrom, date_to: dateTo })
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-4 flex-wrap bg-[var(--surface)] border border-[var(--border)] rounded-xl p-4 shadow-card">
        <div>
          <label className="text-[11px] font-semibold text-[var(--text-3)] uppercase tracking-wide block mb-1">From</label>
          <input type="date" className="erp-input" style={{ width: 155 }} value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
        </div>
        <div>
          <label className="text-[11px] font-semibold text-[var(--text-3)] uppercase tracking-wide block mb-1">To</label>
          <input type="date" className="erp-input" style={{ width: 155 }} value={dateTo} onChange={e => setDateTo(e.target.value)} />
        </div>
        <div className="flex items-end gap-2" style={{ paddingTop: 20 }}>
          <Button variant="primary" icon={<Search size={14}/>} onClick={generate}>Generate</Button>
          {data.length > 0 && (
            <Button variant="secondary" icon={<Download size={14}/>}
              onClick={() => downloadCSV(data as any, 'trial-balance')}>
              Export
            </Button>
          )}
        </div>
      </div>

      {(query.date_from || data.length > 0) && (
        <div className="table-card">
          <div className="px-4 py-3 border-b border-[var(--border)] font-bold text-sm">
            Trial Balance — {query.date_from} to {query.date_to}
          </div>
          <div className="overflow-x-auto">
            <table className="erp-table">
              <thead>
                <tr>
                  <th>Account Code</th>
                  <th>Account Name</th>
                  <th>Type</th>
                  <th className="td-right">Opening Dr</th>
                  <th className="td-right">Opening Cr</th>
                  <th className="td-right">Period Dr</th>
                  <th className="td-right">Period Cr</th>
                  <th className="td-right">Closing Dr</th>
                  <th className="td-right">Closing Cr</th>
                </tr>
              </thead>
              <tbody>
                {isLoading
                  ? <SkeletonRows cols={9} />
                  : data.length
                    ? data.map((r, i) => (
                        <tr key={i}>
                          <td className="td-mono text-brand">{r.account_code}</td>
                          <td className="font-medium">{r.name}</td>
                          <td><span className="badge badge-muted">{r.account_type}</span></td>
                          <td className="td-right">{r.opening_debit  > 0 ? fmt(r.opening_debit)  : '—'}</td>
                          <td className="td-right">{r.opening_credit > 0 ? fmt(r.opening_credit) : '—'}</td>
                          <td className="td-right">{r.period_debit   > 0 ? fmt(r.period_debit)   : '—'}</td>
                          <td className="td-right">{r.period_credit  > 0 ? fmt(r.period_credit)  : '—'}</td>
                          <td className="td-right font-semibold text-red-600">{r.closing_debit  > 0 ? fmt(r.closing_debit)  : '—'}</td>
                          <td className="td-right font-semibold text-green-700">{r.closing_credit > 0 ? fmt(r.closing_credit) : '—'}</td>
                        </tr>
                      ))
                    : <tr><td colSpan={9}><Empty message="No data — click Generate"/></td></tr>
                }
              </tbody>
              {data.length > 0 && (
                <tfoot>
                  <tr>
                    <td colSpan={7} className="text-right font-bold text-sm pr-3">TOTALS</td>
                    <td className={`td-right font-bold font-mono ${Math.abs(totalDr - totalCr) > 0.01 ? 'text-red-500' : 'text-green-700'}`}>{fmt(totalDr)}</td>
                    <td className={`td-right font-bold font-mono ${Math.abs(totalDr - totalCr) > 0.01 ? 'text-red-500' : 'text-green-700'}`}>{fmt(totalCr)}</td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
