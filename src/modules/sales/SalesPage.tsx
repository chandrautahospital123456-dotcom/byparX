import { useState, useEffect, useCallback } from 'react'
import { useForm } from 'react-hook-form'
import { motion } from 'framer-motion'
import { Printer, FilePlus, RotateCcw, List, FileText } from 'lucide-react'
import { salesAPI, partiesAPI, productsAPI } from '@/services/api'
import useUIStore from '@/store/uiStore'
import {
  Button, Tabs, Modal, StatCard, Badge, Pagination,
  SkeletonRows, Alert, Empty, SearchInput,
} from '@/components/ui'
import InvoiceRowsTable, { newRow, type InvoiceRow } from '@/components/forms/InvoiceRowsTable'
import { fmt, fmtDate, calcInvoiceTotals } from '@/utils'
import { PrintPreviewModal } from '@/components/print'
import type { PrintData } from '@/components/print'
import { PAYMENT_MODES } from '@/constants'
import type { Product, Party, Sale } from '@/types'

const LIMIT = 20

export default function SalesPage() {
  const { success, error } = useUIStore()
  const [tab, setTab]      = useState('new')

  // Master data
  const [customers, setCustomers] = useState<Party[]>([])
  const [products,  setProducts]  = useState<Product[]>([])

  // List state
  const [sales,     setSales]     = useState<Sale[]>([])
  const [total,     setTotal]     = useState(0)
  const [page,      setPage]      = useState(1)
  const [search,    setSearch]    = useState('')
  const [loading,   setLoading]   = useState(false)

  // Form state
  const [rows,      setRows]      = useState<InvoiceRow[]>([newRow()])
  const [saving,    setSaving]    = useState(false)
  const [flash,     setFlash]     = useState<{ type: 'success'|'danger'; msg: string } | null>(null)
  const [lastInvDate, setLastInvDate] = useState<string | null>(null)
  const [printData, setPrintData] = useState<PrintData | null>(null)
  const [detailId,  setDetailId]  = useState<string | null>(null)
  const [detail,    setDetail]    = useState<Sale | null>(null)

  const { register, handleSubmit, reset, watch, formState: { errors } } = useForm({
    defaultValues: {
      customer_id: '', date: new Date().toISOString().split('T')[0],
      payment_mode: 'cash', discount_pct: 0, notes: '',
    },
  })

  // Load master data once
  useEffect(() => {
    partiesAPI.customers({ limit: 500 }).then(r => setCustomers(r.data.data || [])).catch(() => {})
    productsAPI.list({ limit: 500 }).then(r => setProducts(r.data.data || [])).catch(() => {})
  }, [])

  // Load list
  const loadList = useCallback(async () => {
    setLoading(true)
    try {
      const r = await salesAPI.list({ page, limit: LIMIT, search: search || undefined })
      setSales(r.data.data || [])
      setTotal(r.data.pagination?.total || 0)
    } catch (e: any) { error('Load failed', e.message) }
    finally { setLoading(false) }
  }, [page, search])

  useEffect(() => { if (tab === 'list') loadList() }, [tab, loadList])

  // Load detail
  useEffect(() => {
    if (!detailId) { setDetail(null); return }
    salesAPI.get(detailId).then(r => setDetail(r.data.data)).catch(() => setDetail(null))
  }, [detailId])


  const discountPct = Number(watch('discount_pct')) || 0

  // Fetch latest sales invoice date for frontend date validation
  useEffect(() => {
    salesAPI.list({ limit: 1, status: 'active' })
      .then(r => {
        const list = r.data?.data ?? []
        if (list.length && list[0].date_ad) setLastInvDate(list[0].date_ad)
      })
      .catch(() => {})
  }, [])

  const onSubmit = handleSubmit(async (data) => {
    const validRows = rows.filter(r => r.product_id && Number(r.qty) > 0)
    if (!validRows.length) { setFlash({ type: 'danger', msg: 'Add at least one product' }); return }

    // Frontend date sequence guard — matches backend validation
    if (lastInvDate && data.date && data.date < lastInvDate) {
      setFlash({
        type: 'danger',
        msg:  `Sales entry date cannot be earlier than the previous sales invoice date (${lastInvDate}).`,
      })
      return
    }

    setSaving(true); setFlash(null)
    try {
      const res = await salesAPI.create({
        party_id:     data.customer_id || undefined,
        date_ad:      data.date,
        payment_mode: data.payment_mode,
        discount_pct: discountPct,
        notes:        data.notes,
        items:        validRows.map(r => ({
          product_id:   r.product_id,
          product_name: r.product_name,
          batch_no:     r.batch_no || undefined,
          expiry:       r.expiry   || undefined,
          qty:          Number(r.qty),
          bonus:        Number(r.bonus) || 0,
          rate:         Number(r.rate),
          cc_pct:       Number(r.cc_pct) || 0,
          vat_pct:      Number(r.vat_pct) || 13,
          amount:       r.amount,
          cc_amount:    r.cc_amount,
        })),
      })
      const saved = res.data.data
      // Build PrintData for the modal
      setPrintData({
        voucherNo:   saved.invoice_no,
        type:        'SALE',
        date:        saved.date_ad || saved.date_bs || data.date,
        paymentMode: saved.payment_mode,
        partyName:   customers.find(c => c.id === data.customer_id)?.name,
        items:       validRows.map(r => ({
          product_name: r.product_name,
          batch_no:     r.batch_no,
          expiry:       r.expiry,
          qty:          Number(r.qty),
          bonus:        Number(r.bonus) || 0,
          rate:         Number(r.rate),
          discount_pct: Number(r.discount_pct) || 0,
          cc_pct:       Number(r.cc_pct) || 0,
          cc_amount:    Number(r.cc_amount) || 0,
          amount:       Number(r.amount),
        })),
        subtotal:    saved.subtotal,
        ccAmount:    saved.cc_amount,
        netTotal:    saved.net_total,
        paidAmount:  saved.paid_amount,
        dueAmount:   saved.due_amount,
      })
      setFlash({ type: 'success', msg: `Invoice ${res.data.data.invoice_no} created!` })
      reset(); setRows([newRow()])
    } catch (e: any) { setFlash({ type: 'danger', msg: e.message }) }
    finally { setSaving(false) }
  })

  async function cancelSale(id: string) {
    if (!confirm('Cancel this sale?')) return
    try { await salesAPI.cancel(id); success('Sale cancelled'); loadList() }
    catch (e: any) { error('Cannot cancel', e.message) }
  }

  const tabList = [
    { id: 'new',  label: 'New Invoice', icon: <FilePlus size={14}/> },
    { id: 'list', label: 'All Invoices', icon: <List size={14}/> },
  ]

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-breadcrumb">Transactions</div>
          <h1 className="page-title">Sales / POS</h1>
        </div>
      </div>

      <Tabs tabs={tabList} active={tab} onChange={setTab} />

      {/* ── NEW INVOICE ── */}
      {tab === 'new' && (
        <div>
          {flash && (
            <Alert
              type={flash.type === 'success' ? 'success' : 'danger'}
              message={flash.msg}
              onClose={() => setFlash(null)}
            />
          )}

          {/* PrintPreviewModal — opens after successful save */}
          <PrintPreviewModal
            data={printData}
            open={!!printData}
            onClose={() => { setPrintData(null); setFlash(null) }}
            onNextBill={() => {
              setPrintData(null)
              setFlash(null)
              setRows([newRow()])
              reset({ customer_id: '', date: new Date().toISOString().split('T')[0], payment_mode: 'cash', discount_pct: 0, notes: '' })
            }}
          />

          {/* Header form */}
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-4 mb-4 shadow-card">
            <div className="form-grid">
              <div>
                <label className="text-[11px] font-semibold text-[var(--text-3)] uppercase tracking-wide block mb-1.5">Customer</label>
                <select className="erp-input" {...register('customer_id')}>
                  <option value="">Walk-in Customer</option>
                  {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[11px] font-semibold text-[var(--text-3)] uppercase tracking-wide block mb-1.5">Date</label>
                <input type="date" className="erp-input" min={lastInvDate || undefined} {...register('date')} />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-[var(--text-3)] uppercase tracking-wide block mb-1.5">Payment Mode</label>
                <select className="erp-input" {...register('payment_mode')}>
                  {PAYMENT_MODES.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[11px] font-semibold text-[var(--text-3)] uppercase tracking-wide block mb-1.5">Invoice Discount %</label>
                <input type="number" className="erp-input" step="0.01" min="0" max="100" {...register('discount_pct')} />
              </div>
              <div style={{ gridColumn: 'span 2' }}>
                <label className="text-[11px] font-semibold text-[var(--text-3)] uppercase tracking-wide block mb-1.5">Notes</label>
                <input className="erp-input" placeholder="Optional notes…" {...register('notes')} />
              </div>
            </div>
          </div>

          {/* Items */}
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-4 mb-4 shadow-card">
            <div className="font-bold text-sm text-[var(--text)] mb-3">Invoice Items</div>
            <InvoiceRowsTable rows={rows} products={products} onChange={setRows} />
          </div>

          <div className="flex justify-end">
            <Button variant="primary" size="lg" loading={saving} onClick={onSubmit}>
              <FileText size={15}/> Create Invoice
            </Button>
          </div>
        </div>
      )}

      {/* ── INVOICE LIST ── */}
      {tab === 'list' && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <SearchInput value={search} onChange={v => { setSearch(v); setPage(1) }} className="w-64" />
          </div>
          <div className="table-card">
            <div className="overflow-x-auto">
              <table className="erp-table">
                <thead>
                  <tr>
                    <th>Invoice No</th><th>Date</th><th>Customer</th>
                    <th className="td-right">Total</th><th className="td-right">Paid</th>
                    <th className="td-right">Due</th><th>Mode</th><th>Status</th><th></th>
                  </tr>
                </thead>
                <tbody>
                  {loading
                    ? <SkeletonRows cols={9} />
                    : sales.length
                      ? sales.map(s => (
                          <tr key={s.id} className="clickable" onClick={() => setDetailId(s.id)}>
                            <td className="td-mono text-brand">{s.invoice_no}</td>
                            <td className="td-mono">{fmtDate(s.date_ad)}</td>
                            <td>{s.party_name || 'Walk-in'}</td>
                            <td className="td-right">{fmt(s.net_total)}</td>
                            <td className="td-right text-green-700">{fmt(s.paid_amount)}</td>
                            <td className={`td-right ${Number(s.due_amount) > 0 ? 'text-amber-600' : ''}`}>{fmt(s.due_amount)}</td>
                            <td><Badge status={s.payment_mode}/></td>
                            <td><Badge status={s.status}/></td>
                            <td onClick={e => e.stopPropagation()}>
                              {s.status === 'active' && (
                                <Button variant="danger" size="sm" onClick={() => cancelSale(s.id)}>Cancel</Button>
                              )}
                            </td>
                          </tr>
                        ))
                      : <tr><td colSpan={9}><Empty message="No sales found"/></td></tr>
                  }
                </tbody>
              </table>
            </div>
            <Pagination page={page} total={total} limit={LIMIT} onChange={setPage} />
          </div>
        </div>
      )}

      {/* Sale detail modal */}
      <Modal
        open={!!detailId}
        onClose={() => setDetailId(null)}
        title={detail ? `Invoice: ${detail.invoice_no}` : 'Loading…'}
        size="lg"
      >
        {detail && (
          <div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
              {[
                ['Party',    detail.party_name || 'Walk-in'],
                ['Date',     fmtDate(detail.date_ad)],
                ['Payment',  detail.payment_mode],
                ['Status',   ''],
                ['Net Total',fmt(detail.net_total)],
                ['Due',      fmt(detail.due_amount)],
              ].map(([label, val], i) => (
                <div key={i} className="bg-[var(--surface-2)] rounded-lg p-3">
                  <div className="text-[10px] font-bold uppercase tracking-wide text-[var(--text-4)] mb-1">{label}</div>
                  {label === 'Status'
                    ? <Badge status={detail.status}/>
                    : <div className="font-semibold text-sm text-[var(--text)]">{val}</div>
                  }
                </div>
              ))}
            </div>
            <div className="table-card">
              <table className="erp-table items-table">
                <thead><tr><th>Product</th><th>Batch</th><th>Expiry</th><th className="td-right">Qty</th><th className="td-right">Rate</th><th className="td-right">Amount</th></tr></thead>
                <tbody>
                  {(detail.items || []).map((it, i) => (
                    <tr key={i}>
                      <td>{it.product_name}</td>
                      <td className="td-mono">{it.batch_no || '—'}</td>
                      <td className="td-mono">{it.expiry || '—'}</td>
                      <td className="td-right">{it.qty}</td>
                      <td className="td-right">{fmt(it.rate)}</td>
                      <td className="td-right font-semibold">{fmt(it.amount)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <td colSpan={5} className="text-right font-bold text-sm pr-3">NET TOTAL</td>
                    <td className="td-right font-bold text-brand">{fmt(detail.net_total)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
