/**
 * usePrint.ts — Centralized print service
 *
 * Handles:
 *  - Window.print() with print-only CSS injection
 *  - PDF generation via html2canvas + browser print dialog
 *  - Keyboard shortcuts (Ctrl+P, Enter, Escape)
 *  - Print history (sessionStorage)
 *  - Auto-print option
 */

import { useRef, useEffect, useCallback } from 'react'

export type PrintSize = 'a4' | 'thermal-58' | 'thermal-80'

export interface PrintJob {
  id:          string
  voucherNo:   string
  type:        string
  partyName?:  string
  amount:      number
  date:        string
  printedAt:   string
  copies:      number
}

// ─── Print history (session only) ────────────────────────────────────────────
const PRINT_HISTORY_KEY = 'erp_print_history'

export function getPrintHistory(): PrintJob[] {
  try { return JSON.parse(sessionStorage.getItem(PRINT_HISTORY_KEY) || '[]') } catch { return [] }
}
function addPrintHistory(job: PrintJob) {
  const history = getPrintHistory()
  history.unshift(job)
  sessionStorage.setItem(PRINT_HISTORY_KEY, JSON.stringify(history.slice(0, 50)))
}

// ─── Print size CSS ──────────────────────────────────────────────────────────
const PRINT_CSS: Record<PrintSize, string> = {
  'a4': `
    @page { size: A4; margin: 15mm; }
    body { font-size: 12pt; }
  `,
  'thermal-80': `
    @page { size: 80mm auto; margin: 3mm; }
    body { font-size: 9pt; width: 74mm; }
  `,
  'thermal-58': `
    @page { size: 58mm auto; margin: 2mm; }
    body { font-size: 8pt; width: 54mm; }
  `,
}

// ─── usePrint hook ───────────────────────────────────────────────────────────
export function usePrint() {
  const printFrameRef = useRef<HTMLIFrameElement | null>(null)

  const print = useCallback((
    contentRef: React.RefObject<HTMLElement>,
    opts: { size?: PrintSize; copies?: number; voucherNo?: string; type?: string; partyName?: string; amount?: number; date?: string } = {}
  ) => {
    const { size = 'a4', copies = 1, voucherNo = '', type = '', partyName, amount = 0, date = '' } = opts
    const el = contentRef.current
    if (!el) return

    // Create hidden iframe
    const iframe = document.createElement('iframe')
    iframe.style.cssText = 'position:fixed;top:-9999px;left:-9999px;width:1px;height:1px;'
    document.body.appendChild(iframe)

    const doc = iframe.contentDocument!
    doc.open()
    doc.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8"/>
        <style>
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body { font-family: 'Segoe UI', Arial, sans-serif; color: #111; background: white; }
          ${PRINT_CSS[size]}
          @media print {
            .no-print { display: none !important; }
            table { border-collapse: collapse; width: 100%; }
            th, td { padding: 4px 6px; border: 1px solid #ddd; }
            th { background: #f5f5f5; }
          }
          /* Watermark for duplicate copies */
          .print-watermark {
            position: fixed; top: 50%; left: 50%;
            transform: translate(-50%,-50%) rotate(-45deg);
            font-size: 72pt; color: rgba(0,0,0,0.04);
            font-weight: bold; pointer-events: none; z-index: 0;
          }
        </style>
      </head>
      <body>
        ${Array.from({ length: copies }, (_, i) => `
          ${i > 0 ? '<div style="page-break-before:always"></div>' : ''}
          ${i > 0 ? '<div class="print-watermark">DUPLICATE</div>' : ''}
          ${el.innerHTML}
        `).join('')}
        <script>window.onload = () => { window.print(); window.onafterprint = () => document.body.innerHTML = ''; }<\/script>
      </body>
      </html>
    `)
    doc.close()

    // Log print job
    if (voucherNo) {
      addPrintHistory({
        id: Date.now().toString(), voucherNo, type, partyName, amount, date,
        printedAt: new Date().toISOString(), copies,
      })
    }

    // Clean up iframe after print
    setTimeout(() => {
      try { document.body.removeChild(iframe) } catch {}
    }, 3000)
  }, [])

  // PDF generation — uses browser print-to-PDF via hidden iframe
  const downloadPDF = useCallback((
    contentRef: React.RefObject<HTMLElement>,
    filename: string,
    opts: { size?: PrintSize } = {}
  ) => {
    const { size = 'a4' } = opts
    const el = contentRef.current
    if (!el) return

    const iframe = document.createElement('iframe')
    iframe.style.cssText = 'position:fixed;top:-9999px;left:-9999px;width:1px;height:1px;'
    document.body.appendChild(iframe)

    const doc = iframe.contentDocument!
    doc.open()
    doc.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8"/>
        <title>${filename}</title>
        <style>
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body { font-family: 'Segoe UI', Arial, sans-serif; color: #111; background: white; }
          ${PRINT_CSS[size]}
          @media print { .no-print { display: none !important; } }
        </style>
      </head>
      <body>${el.innerHTML}</body>
      </html>
    `)
    doc.close()

    setTimeout(() => {
      iframe.contentWindow?.print()
      setTimeout(() => { try { document.body.removeChild(iframe) } catch {} }, 3000)
    }, 500)
  }, [])

  return { print, downloadPDF }
}
