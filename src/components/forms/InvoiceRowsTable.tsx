import { Plus, Trash2 } from 'lucide-react'
import { fmt, calcRowAmount } from '@/utils'
import type { Product } from '@/types'

export interface InvoiceRow {
  _id:         number
  product_id:  string
  product_name:string
  batch_no:    string
  expiry:      string
  qty:         number
  bonus:       number
  rate:        number | string
  discount_pct:number
  cc_pct:      number
  vat_pct:     number
  amount:      number
  cc_amount:   number
}

export const newRow = (): InvoiceRow => ({
  _id: Math.random(), product_id: '', product_name: '',
  batch_no: '', expiry: '', qty: 1, bonus: 0, rate: '',
  discount_pct: 0, cc_pct: 0, vat_pct: 13, amount: 0, cc_amount: 0,
})

interface Props {
  rows:      InvoiceRow[]
  products:  Product[]
  onChange:  (rows: InvoiceRow[]) => void
  showBonus?:   boolean
  showCC?:      boolean
  showDiscount?:boolean
  showExpiry?:  boolean
  showBatch?:   boolean
}

export default function InvoiceRowsTable({
  rows, products, onChange,
  showBonus = true, showCC = true, showDiscount = false,
  showExpiry = true, showBatch = true,
}: Props) {
  function update(idx: number, key: keyof InvoiceRow, val: unknown) {
    const next = rows.map((r, i) => {
      if (i !== idx) return r
      const updated = { ...r, [key]: val }
      // Auto-fill rate + vat when product selected
      if (key === 'product_id') {
        const p = products.find((x) => x.id === val)
        if (p) {
          updated.product_name = p.name
          updated.rate         = p.sales_rate
          updated.vat_pct      = p.vat_percent || 13
        }
      }
      // Recalc amount — bonus MUST be passed so cc_amount = bonus × rate × (cc_pct/100)
      const { amount, cc_amount } = calcRowAmount({
        qty:           Number(updated.qty),
        rate:          Number(updated.rate),
        bonus:         Number(updated.bonus)        || 0,   // FIX: was missing — cc_amount always 0
        discount_pct:  Number(updated.discount_pct) || 0,
        cc_pct:        Number(updated.cc_pct)       || 0,
        vat_pct:       Number(updated.vat_pct)      || 0,
      })
      return { ...updated, amount, cc_amount }
    })
    onChange(next)
  }

  function addRow()          { onChange([...rows, newRow()]) }
  function removeRow(idx: number) { onChange(rows.filter((_, i) => i !== idx)) }

  const subtotal = rows.reduce((s, r) => s + r.amount, 0)

  const numInput = (idx: number, key: keyof InvoiceRow, w = 65) => (
    <input
      type="number"
      className="erp-input"
      style={{ width: w, padding: '5px 7px', fontSize: 12, textAlign: 'right' }}
      value={(rows[idx] as any)[key] ?? ''}
      onChange={(e) => update(idx, key, e.target.value === '' ? '' : Number(e.target.value))}
    />
  )

  return (
    <div>
      <div className="overflow-x-auto rounded-lg border border-[var(--border)]">
        <table className="erp-table items-table" style={{ minWidth: 680 }}>
          <thead>
            <tr>
              <th style={{ minWidth: 160 }}>Product</th>
              {showBatch  && <th style={{ width: 90 }}>Batch</th>}
              {showExpiry && <th style={{ width: 90 }}>Expiry</th>}
              <th style={{ width: 60 }}>Qty</th>
              {showBonus  && <th style={{ width: 60 }}>Bonus</th>}
              <th style={{ width: 80 }}>Rate</th>
              {showDiscount && <th style={{ width: 65 }}>Disc%</th>}
              <th style={{ width: 55 }}>VAT%</th>
              {showCC     && <th style={{ width: 55 }}>CC%</th>}
              {showCC     && <th style={{ width: 80, textAlign: 'right' }}>CC Amt</th>}
              <th style={{ width: 90, textAlign: 'right' }}>Amount</th>
              <th style={{ width: 36 }}></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, idx) => (
              <tr key={row._id}>
                <td>
                  <select
                    className="erp-input"
                    style={{ fontSize: 12, padding: '5px 7px' }}
                    value={row.product_id}
                    onChange={(e) => update(idx, 'product_id', e.target.value)}
                  >
                    <option value="">Select product…</option>
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </td>
                {showBatch && (
                  <td>
                    <input
                      className="erp-input"
                      style={{ width: 85, padding: '5px 7px', fontSize: 12 }}
                      value={row.batch_no}
                      onChange={(e) => update(idx, 'batch_no', e.target.value)}
                      placeholder="B001"
                    />
                  </td>
                )}
                {showExpiry && (
                  <td>
                    <input
                      className="erp-input"
                      style={{ width: 85, padding: '5px 7px', fontSize: 12 }}
                      value={row.expiry}
                      onChange={(e) => update(idx, 'expiry', e.target.value)}
                      placeholder="MM/YY"
                    />
                  </td>
                )}
                <td>{numInput(idx, 'qty', 58)}</td>
                {showBonus  && <td>{numInput(idx, 'bonus', 55)}</td>}
                <td>{numInput(idx, 'rate', 78)}</td>
                {showDiscount && <td>{numInput(idx, 'discount_pct', 58)}</td>}
                <td>{numInput(idx, 'vat_pct', 52)}</td>
                {showCC     && <td>{numInput(idx, 'cc_pct', 52)}</td>}
                {showCC     && (
                  <td className="td-right" style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-3)' }}>
                    {row.cc_amount > 0 ? fmt(row.cc_amount) : '—'}
                  </td>
                )}
                <td className="td-right font-semibold" style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>
                  {fmt(row.amount)}
                </td>
                <td>
                  <button
                    className="w-6 h-6 flex items-center justify-center text-[var(--text-4)] hover:text-red-500 transition-colors"
                    onClick={() => removeRow(idx)}
                    tabIndex={-1}
                  >
                    <Trash2 size={13}/>
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between mt-2.5">
        <button className="btn btn-secondary btn-sm" onClick={addRow}>
          <Plus size={13}/> Add row
        </button>
        <div className="text-right">
          <span className="text-xs text-[var(--text-3)] font-mono mr-2">SUBTOTAL</span>
          <span className="text-base font-bold font-mono text-[var(--text)]">{fmt(subtotal)}</span>
        </div>
      </div>
    </div>
  )
}
