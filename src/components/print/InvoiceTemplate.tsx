/**
 * InvoiceTemplate.tsx
 * The actual printable content — rendered inside PrintPreviewModal
 * and also injected into the print iframe.
 *
 * Supports: Sales Invoice, Purchase Bill, Receipt, Payment, Journal, Return
 */
import { forwardRef } from 'react'
import { fmt, fmtDate } from '@/utils'
import type { Company } from '@/types'

export interface PrintData {
  // Core voucher fields
  voucherNo:    string
  type:         'SALE' | 'PURCHASE' | 'RECEIPT' | 'PAYMENT' | 'JOURNAL' | 'RETURN' | 'SALE_RETURN' | 'PURCHASE_RETURN'
  date:         string
  narration?:   string
  referenceNo?: string
  status?:      string

  // Party
  partyName?:   string
  partyAddress?:string
  partyPhone?:  string
  partyPan?:    string

  // Financial
  items?:       PrintItem[]
  subtotal?:    number
  discountAmt?: number
  ccAmount?:    number
  netTotal:     number
  paidAmount?:  number
  dueAmount?:   number
  paymentMode?: string

  // Company
  company?:     Company | null
}

export interface PrintItem {
  product_name: string
  batch_no?:    string
  expiry?:      string
  qty:          number
  bonus?:       number
  rate:         number
  discount_pct?:number
  cc_pct?:      number
  cc_amount?:   number
  amount:       number
}

const TYPE_LABELS: Record<string, string> = {
  SALE:             'TAX INVOICE',
  PURCHASE:         'PURCHASE BILL',
  RECEIPT:          'RECEIPT VOUCHER',
  PAYMENT:          'PAYMENT VOUCHER',
  JOURNAL:          'JOURNAL VOUCHER',
  RETURN:           'RETURN NOTE',
  SALE_RETURN:      'SALES RETURN NOTE',
  PURCHASE_RETURN:  'PURCHASE RETURN NOTE',
}

// eslint-disable-next-line react/display-name
const InvoiceTemplate = forwardRef<HTMLDivElement, { data: PrintData; size?: 'a4' | 'thermal-80' | 'thermal-58'; copyLabel?: string }>(
  ({ data, size = 'a4', copyLabel = 'ORIGINAL' }, ref) => {
    const isA4      = size === 'a4'
    const isThermal = size.startsWith('thermal')
    const co        = data.company

    const hasItems = (data.items?.length ?? 0) > 0
    const isSale   = data.type === 'SALE'

    return (
      <div
        ref={ref}
        className="invoice-template"
        style={{
          fontFamily: "'Segoe UI', Arial, sans-serif",
          fontSize:   isA4 ? '12px' : '10px',
          color:      '#111',
          background: '#fff',
          width:      size === 'a4' ? '100%' : size === 'thermal-80' ? '74mm' : '54mm',
          padding:    isA4 ? '0' : '3mm',
        }}
      >
        {/* ── Copy label (ORIGINAL / DUPLICATE) ──────────────────────────── */}
        <div style={{ textAlign: 'right', fontSize: '9px', color: '#888', marginBottom: 4 }}>
          {copyLabel}
        </div>

        {/* ── Company header ──────────────────────────────────────────────── */}
        <div style={{ textAlign: 'center', borderBottom: '2px solid #111', paddingBottom: isA4 ? 12 : 6, marginBottom: isA4 ? 12 : 6 }}>
          {co?.name && (
            <div style={{ fontSize: isA4 ? '18px' : '13px', fontWeight: 'bold', letterSpacing: 1 }}>
              {co.name}
            </div>
          )}
          {(co as any)?.address && (
            <div style={{ fontSize: '10px', color: '#444', marginTop: 2 }}>{(co as any).address}</div>
          )}
          {co?.pan_no && (
            <div style={{ fontSize: '10px', color: '#444' }}>PAN: {co.pan_no}</div>
          )}
          {(co as any)?.phone && (
            <div style={{ fontSize: '10px', color: '#444' }}>Tel: {(co as any).phone}</div>
          )}
        </div>

        {/* ── Voucher type title ──────────────────────────────────────────── */}
        <div style={{ textAlign: 'center', fontWeight: 'bold', fontSize: isA4 ? '14px' : '11px', marginBottom: isA4 ? 10 : 5, textDecoration: 'underline', letterSpacing: 1 }}>
          {TYPE_LABELS[data.type] || data.type}
        </div>

        {/* ── Header info row ─────────────────────────────────────────────── */}
        {isA4 ? (
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
            {/* Party */}
            <div style={{ flex: 1 }}>
              {data.partyName && (
                <>
                  <div style={{ fontSize: '10px', color: '#666', marginBottom: 2 }}>
                    {isSale ? 'Bill To' : 'Vendor'}
                  </div>
                  <div style={{ fontWeight: 'bold' }}>{data.partyName}</div>
                  {data.partyAddress && <div style={{ fontSize: '10px' }}>{data.partyAddress}</div>}
                  {data.partyPhone   && <div style={{ fontSize: '10px' }}>Tel: {data.partyPhone}</div>}
                  {data.partyPan     && <div style={{ fontSize: '10px' }}>PAN: {data.partyPan}</div>}
                </>
              )}
            </div>
            {/* Voucher meta */}
            <div style={{ textAlign: 'right' }}>
              <table style={{ fontSize: '11px', marginLeft: 'auto' }}>
                <tbody>
                  <tr>
                    <td style={{ color: '#666', paddingRight: 8 }}>Invoice No:</td>
                    <td style={{ fontWeight: 'bold' }}>{data.voucherNo}</td>
                  </tr>
                  <tr>
                    <td style={{ color: '#666', paddingRight: 8 }}>Date:</td>
                    <td>{fmtDate(data.date)}</td>
                  </tr>
                  {data.paymentMode && (
                    <tr>
                      <td style={{ color: '#666', paddingRight: 8 }}>Payment:</td>
                      <td style={{ textTransform: 'capitalize' }}>{data.paymentMode}</td>
                    </tr>
                  )}
                  {data.referenceNo && (
                    <tr>
                      <td style={{ color: '#666', paddingRight: 8 }}>Ref:</td>
                      <td>{data.referenceNo}</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          /* Thermal compact header */
          <div style={{ fontSize: '9px', marginBottom: 4 }}>
            <div><b>No:</b> {data.voucherNo} &nbsp; <b>Date:</b> {fmtDate(data.date)}</div>
            {data.partyName && <div><b>Party:</b> {data.partyName}</div>}
            {data.paymentMode && <div style={{ textTransform: 'capitalize' }}><b>Mode:</b> {data.paymentMode}</div>}
          </div>
        )}

        {/* ── Items table ─────────────────────────────────────────────────── */}
        {hasItems && (
          <table style={{
            width: '100%', borderCollapse: 'collapse',
            fontSize: isA4 ? '11px' : '9px', marginBottom: isA4 ? 12 : 6,
          }}>
            <thead>
              <tr style={{ background: '#f5f5f5', borderTop: '1px solid #ccc', borderBottom: '1px solid #ccc' }}>
                <th style={{ padding: '4px 4px', textAlign: 'left' }}>#</th>
                <th style={{ padding: '4px 4px', textAlign: 'left' }}>Item</th>
                {!isThermal && <th style={{ padding: '4px 4px', textAlign: 'left' }}>Batch/Exp</th>}
                <th style={{ padding: '4px 4px', textAlign: 'right' }}>Qty</th>
                {!isThermal && <th style={{ padding: '4px 4px', textAlign: 'right' }}>Bonus</th>}
                <th style={{ padding: '4px 4px', textAlign: 'right' }}>Rate</th>
                {!isThermal && <th style={{ padding: '4px 4px', textAlign: 'right' }}>Disc%</th>}
                <th style={{ padding: '4px 4px', textAlign: 'right' }}>Amount</th>
              </tr>
            </thead>
            <tbody>
              {data.items!.map((item, i) => (
                <tr key={i} style={{ borderBottom: '1px solid #eee' }}>
                  <td style={{ padding: '3px 4px' }}>{i + 1}</td>
                  <td style={{ padding: '3px 4px' }}>
                    <div>{item.product_name}</div>
                    {isThermal && item.batch_no && (
                      <div style={{ fontSize: '8px', color: '#666' }}>
                        {item.batch_no}{item.expiry ? ` Exp:${item.expiry}` : ''}
                      </div>
                    )}
                  </td>
                  {!isThermal && (
                    <td style={{ padding: '3px 4px', fontSize: '10px', color: '#555' }}>
                      {item.batch_no || '—'}
                      {item.expiry && <><br/><span style={{ fontSize: '9px' }}>{item.expiry}</span></>}
                    </td>
                  )}
                  <td style={{ padding: '3px 4px', textAlign: 'right' }}>{item.qty}</td>
                  {!isThermal && <td style={{ padding: '3px 4px', textAlign: 'right' }}>{item.bonus || '—'}</td>}
                  <td style={{ padding: '3px 4px', textAlign: 'right' }}>{fmt(item.rate)}</td>
                  {!isThermal && <td style={{ padding: '3px 4px', textAlign: 'right' }}>{item.discount_pct ? `${item.discount_pct}%` : '—'}</td>}
                  <td style={{ padding: '3px 4px', textAlign: 'right', fontWeight: 500 }}>{fmt(item.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* ── Totals ──────────────────────────────────────────────────────── */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: isA4 ? 16 : 8 }}>
          <table style={{ fontSize: isA4 ? '11px' : '9px', minWidth: isA4 ? '200px' : '120px' }}>
            <tbody>
              {data.subtotal !== undefined && data.subtotal !== data.netTotal && (
                <tr>
                  <td style={{ paddingRight: 12, color: '#666' }}>Subtotal</td>
                  <td style={{ textAlign: 'right' }}>{fmt(data.subtotal)}</td>
                </tr>
              )}
              {(data.discountAmt ?? 0) > 0 && (
                <tr style={{ color: '#d33' }}>
                  <td style={{ paddingRight: 12 }}>Discount</td>
                  <td style={{ textAlign: 'right' }}>−{fmt(data.discountAmt)}</td>
                </tr>
              )}
              {(data.ccAmount ?? 0) > 0 && (
                <tr>
                  <td style={{ paddingRight: 12, color: '#666' }}>CC Charge</td>
                  <td style={{ textAlign: 'right' }}>{fmt(data.ccAmount)}</td>
                </tr>
              )}
              <tr style={{ borderTop: '2px solid #111', fontWeight: 'bold', fontSize: isA4 ? '13px' : '11px' }}>
                <td style={{ paddingRight: 12, paddingTop: 4 }}>TOTAL</td>
                <td style={{ textAlign: 'right', paddingTop: 4 }}>{fmt(data.netTotal)}</td>
              </tr>
              {(data.paidAmount ?? 0) > 0 && (
                <tr style={{ color: '#1a7a3a' }}>
                  <td style={{ paddingRight: 12 }}>Paid</td>
                  <td style={{ textAlign: 'right' }}>{fmt(data.paidAmount)}</td>
                </tr>
              )}
              {(data.dueAmount ?? 0) > 0 && (
                <tr style={{ color: '#c55', fontWeight: 'bold' }}>
                  <td style={{ paddingRight: 12 }}>Balance Due</td>
                  <td style={{ textAlign: 'right' }}>{fmt(data.dueAmount)}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* ── Narration ───────────────────────────────────────────────────── */}
        {data.narration && (
          <div style={{ fontSize: '10px', color: '#555', marginBottom: 8, borderTop: '1px solid #eee', paddingTop: 6 }}>
            <b>Narration:</b> {data.narration}
          </div>
        )}

        {/* ── Signature section (A4 only) ─────────────────────────────────── */}
        {isA4 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 32, borderTop: '1px solid #eee', paddingTop: 16 }}>
            <div style={{ textAlign: 'center', fontSize: '10px', color: '#666' }}>
              <div style={{ borderTop: '1px solid #555', width: 120, marginBottom: 4 }}/>
              Prepared By
            </div>
            <div style={{ textAlign: 'center', fontSize: '10px', color: '#666' }}>
              <div style={{ borderTop: '1px solid #555', width: 120, marginBottom: 4 }}/>
              Checked By
            </div>
            <div style={{ textAlign: 'center', fontSize: '10px', color: '#666' }}>
              <div style={{ borderTop: '1px solid #555', width: 120, marginBottom: 4 }}/>
              Authorised By
            </div>
          </div>
        )}

        {/* ── Footer ──────────────────────────────────────────────────────── */}
        <div style={{ textAlign: 'center', fontSize: '9px', color: '#888', marginTop: isA4 ? 20 : 8, borderTop: '1px dashed #ccc', paddingTop: 6 }}>
          {isThermal
            ? `${data.voucherNo} • ${fmtDate(data.date)}`
            : `Thank you for your business! • Printed: ${new Date().toLocaleString()}`
          }
        </div>
      </div>
    )
  }
)

export default InvoiceTemplate
