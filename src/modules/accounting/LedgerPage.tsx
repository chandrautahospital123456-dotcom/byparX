import { useState, useEffect } from 'react'
import { partiesAPI } from '@/services/api'
import { Button, Empty, SkeletonRows } from '@/components/ui'
import { fmt, fmtDate, downloadCSV } from '@/utils'
import { Download, Search } from 'lucide-react'
import type { Party } from '@/types'

export default function LedgerPage() {
  const [parties,  setParties]  = useState<Party[]>([])
  const [partyId,  setPartyId]  = useState('')
  const [dateFrom, setDateFrom] = useState(
    new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0]
  )
  const [dateTo, setDateTo] = useState(
    new Date().toISOString().split('T')[0]
  )

  // ── Response from backend { party, rows, summary, closingBalance } ──────────
  const [ledgerData, setLedgerData] = useState<any>(null)
  const [loading,    setLoading]    = useState(false)
  const [error,      setError]      = useState('')

  // Load both customers AND suppliers
  useEffect(() => {
    Promise.all([
      partiesAPI.customers({ limit: 500 }),
      partiesAPI.suppliers({ limit: 500 }),
    ]).then(([c, s]) => {
      const customers = (c.data.data || []).map((p: Party) => ({ ...p, _type: 'Customer' }))
      const suppliers = (s.data.data || []).map((p: Party) => ({ ...p, _type: 'Supplier' }))
      setParties([...customers, ...suppliers])
    }).catch(() => {})
  }, [])

  async function generate() {
    if (!partyId) return
    setLoading(true)
    setError('')
    setLedgerData(null)
    try {
      const r    = await partiesAPI.ledger(partyId, { date_from: dateFrom, date_to: dateTo })
      const body = r.data

      // Backend returns: { success, data: { party, rows, summary, closingBalance, opening_balance } }
      const payload = body?.data ?? body

      if (!payload || (!payload.rows && !payload.data)) {
        setError('No ledger data returned from server')
        return
      }

      // Normalise: backend may return rows directly or nested under data
      const rows = payload.rows ?? payload.data ?? []
      setLedgerData({
        party:           payload.party         ?? parties.find(p => p.id === partyId),
        rows,
        summary:         payload.summary       ?? null,
        closingBalance:  payload.closingBalance ?? payload.closing_balance
                          ?? rows[rows.length - 1]?.running_balance
                          ?? 0,
        openingBalance:  payload.opening_balance ?? 0,
      })
    } catch (e: any) {
      setError(e.message || 'Failed to load ledger')
    } finally {
      setLoading(false)
    }
  }

  const rows         = ledgerData?.rows           ?? []
  const party        = ledgerData?.party          ?? parties.find(p => p.id === partyId)
  const closingBal   = ledgerData?.closingBalance ?? 0
  const summary      = ledgerData?.summary
  const dataRows     = rows.filter((r: any) => r.type !== 'opening')  // exclude opening row from totals
  const totalDr      = dataRows.reduce((s: number, e: any) => s + (Number(e.debit)  || 0), 0)
  const totalCr      = dataRows.reduce((s: number, e: any) => s + (Number(e.credit) || 0), 0)
  const partyType    = (party as any)?._type ?? (party?.type === 'supplier' ? 'Supplier' : 'Customer')

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-breadcrumb">Finance</div>
          <h1 className="page-title">Party Ledger</h1>
        </div>
      </div>

      {/* ── Filter bar ──────────────────────────────────────────────────────── */}
      <div className="flex items-end gap-3 mb-4 flex-wrap bg-[var(--surface)] border border-[var(--border)] rounded-xl p-4 shadow-card">
        <div>
          <label className="text-[11px] font-semibold text-[var(--text-3)] uppercase tracking-wide block mb-1">
            Party
          </label>
          <select
            className="erp-input"
            style={{ width: 240 }}
            value={partyId}
            onChange={e => { setPartyId(e.target.value); setLedgerData(null); setError('') }}
          >
            <option value="">Select customer or supplier…</option>
            {/* Group by type */}
            {['Customer', 'Supplier'].map(type => {
              const group = parties.filter((p: any) => p._type === type)
              if (!group.length) return null
              return (
                <optgroup key={type} label={`── ${type}s ──`}>
                  {group.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </optgroup>
              )
            })}
          </select>
        </div>

        <div>
          <label className="text-[11px] font-semibold text-[var(--text-3)] uppercase tracking-wide block mb-1">
            From
          </label>
          <input
            type="date"
            className="erp-input"
            style={{ width: 155 }}
            value={dateFrom}
            onChange={e => setDateFrom(e.target.value)}
          />
        </div>

        <div>
          <label className="text-[11px] font-semibold text-[var(--text-3)] uppercase tracking-wide block mb-1">
            To
          </label>
          <input
            type="date"
            className="erp-input"
            style={{ width: 155 }}
            value={dateTo}
            onChange={e => setDateTo(e.target.value)}
          />
        </div>

        <div className="flex gap-2">
          <Button
            variant="primary"
            icon={<Search size={14}/>}
            loading={loading}
            onClick={generate}
          >
            Show Ledger
          </Button>
          {rows.length > 0 && (
            <Button
              variant="secondary"
              icon={<Download size={14}/>}
              onClick={() => downloadCSV(rows, `ledger-${party?.name || partyId}`)}
            >
              Export
            </Button>
          )}
        </div>
      </div>

      {/* ── Error ───────────────────────────────────────────────────────────── */}
      {error && (
        <div className="alert alert-danger mb-4">{error}</div>
      )}

      {/* ── Ledger table ────────────────────────────────────────────────────── */}
      {(rows.length > 0 || loading) && (
        <div className="table-card">
          {/* Party header */}
          {party && (
            <div className="px-5 py-3.5 border-b border-[var(--border)] flex justify-between items-start">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-base">{party.name}</span>
                  <span className="badge badge-blue">{partyType}</span>
                </div>
                <div className="text-xs text-[var(--text-3)] mt-0.5">
                  {(party as any).phone ? `${(party as any).phone} · ` : ''}
                  {(party as any).pan_no ? `PAN: ${(party as any).pan_no}` : ''}
                </div>
              </div>
              <div className="text-right">
                <div className="text-xs text-[var(--text-4)] mb-0.5">Closing Balance</div>
                <div className={`font-bold text-lg font-mono ${
                  Number(closingBal) > 0 ? 'text-amber-600' : 'text-green-700'
                }`}>
                  {fmt(closingBal)}
                </div>
                {summary && (
                  <div className="text-xs text-[var(--text-4)] mt-0.5">
                    Source: {summary.source === 'accounting' ? '📒 Vouchers' : '📋 Transactions'}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="erp-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Reference</th>
                  <th>Description</th>
                  <th>Type</th>
                  <th className="td-right">Debit</th>
                  <th className="td-right">Credit</th>
                  <th className="td-right">Balance</th>
                </tr>
              </thead>
              <tbody>
                {loading
                  ? <SkeletonRows cols={7} />
                  : rows.map((e: any, i: number) => (
                      <tr
                        key={i}
                        className={e.type === 'opening' ? 'bg-[var(--surface-2)]' : ''}
                      >
                        <td className="td-mono">
                          {e.type === 'opening' ? '—' : (e.date_ad ? fmtDate(e.date_ad) : (e.date || '—'))}
                        </td>
                        <td className="td-mono text-brand">{e.reference || '—'}</td>
                        <td className={e.type === 'opening' ? 'font-semibold text-[var(--text-3)]' : ''}>
                          {e.description || '—'}
                        </td>
                        <td>
                          {e.type
                            ? <span className={`badge ${
                                e.type === 'opening'  ? 'badge-muted'  :
                                e.type === 'SALES'    ? 'badge-blue'   :
                                e.type === 'PURCHASE' ? 'badge-purple' :
                                e.type === 'RECEIPT'  ? 'badge-green'  :
                                e.type === 'PAYMENT'  ? 'badge-red'    :
                                'badge-muted'
                              }`}>{e.type}</span>
                            : '—'
                          }
                        </td>
                        <td className="td-right text-red-600">
                          {Number(e.debit) > 0 ? fmt(e.debit) : '—'}
                        </td>
                        <td className="td-right text-green-700">
                          {Number(e.credit) > 0 ? fmt(e.credit) : '—'}
                        </td>
                        <td className={`td-right font-semibold font-mono ${
                          Number(e.running_balance ?? e.balance) > 0 ? 'text-amber-600' : 'text-green-700'
                        }`}>
                          {fmt(e.running_balance ?? e.balance ?? 0)}
                        </td>
                      </tr>
                    ))
                }
              </tbody>
              {!loading && rows.length > 0 && (
                <tfoot>
                  <tr>
                    <td colSpan={4} className="text-right font-bold text-xs pr-3 text-[var(--text-3)]">
                      PERIOD TOTALS
                    </td>
                    <td className="td-right font-bold font-mono text-red-600">{fmt(totalDr)}</td>
                    <td className="td-right font-bold font-mono text-green-700">{fmt(totalCr)}</td>
                    <td className={`td-right font-bold font-mono ${
                      Number(closingBal) > 0 ? 'text-amber-600' : 'text-green-700'
                    }`}>
                      {fmt(closingBal)}
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      )}

      {/* ── Empty state ──────────────────────────────────────────────────────── */}
      {!loading && !error && ledgerData && rows.length === 0 && (
        <Empty message="No transactions found for this party in the selected date range" />
      )}

      {/* ── Prompt ───────────────────────────────────────────────────────────── */}
      {!loading && !ledgerData && !error && (
        <div className="text-center py-16 text-[var(--text-4)]">
          <div className="text-4xl mb-3">📒</div>
          <p className="text-sm">Select a party and click <strong>Show Ledger</strong></p>
        </div>
      )}
    </div>
  )
}
