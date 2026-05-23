/**
 * PrintPreviewModal.tsx
 * Enterprise-grade centered print preview modal
 */

import { useRef, useEffect, useState, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Printer,
  Download,
  X,
  Copy,
  Maximize2,
  Mail,
  MessageCircle,
  ChevronRight,
  CheckCircle2,
  Clock,
} from 'lucide-react'

import { fmt, fmtDate } from '@/utils'
import useAuthStore from '@/store/authStore'
import { usePrint, type PrintSize } from './usePrint'
import InvoiceTemplate, { type PrintData } from './InvoiceTemplate'

const TYPE_COLORS: Record<string, string> = {
  SALE: '#16a34a',
  PURCHASE: '#2563eb',
  RECEIPT: '#0891b2',
  PAYMENT: '#7c3aed',
  JOURNAL: '#d97706',
  RETURN: '#dc2626',
  SALE_RETURN: '#dc2626',
  PURCHASE_RETURN: '#b45309',
}

function shareWhatsApp(data: PrintData) {
  const msg = encodeURIComponent(
    `*${data.voucherNo}*\nDate: ${fmtDate(data.date)}\n${
      data.partyName ? `Party: ${data.partyName}\n` : ''
    }Amount: ${fmt(data.netTotal)}`
  )

  window.open(`https://wa.me/?text=${msg}`, '_blank')
}

function shareEmail(data: PrintData, company: any) {
  const subject = encodeURIComponent(
    `${data.voucherNo} from ${company?.name || 'Us'}`
  )

  const body = encodeURIComponent(
    `Dear ${data.partyName || 'Customer'},\n\nPlease find your invoice details:\n\nVoucher No: ${
      data.voucherNo
    }\nDate: ${fmtDate(data.date)}\nAmount: ${fmt(
      data.netTotal
    )}\n\nThank you.`
  )

  window.open(`mailto:?subject=${subject}&body=${body}`)
}

interface PrintPreviewModalProps {
  data: PrintData | null
  open: boolean
  onClose: () => void
  onNextBill?: () => void
  autoprint?: boolean
}

export default function PrintPreviewModal({
  data,
  open,
  onClose,
  onNextBill,
  autoprint = false,
}: PrintPreviewModalProps) {
  const { company } = useAuthStore()

  const { print, downloadPDF } = usePrint()

  const printRef = useRef<HTMLDivElement>(null)

  const [size, setSize] = useState<PrintSize>('a4')
  const [copies, setCopies] = useState(1)
  const [fullscreen, setFullscreen] = useState(false)
  const [printing, setPrinting] = useState(false)

  const printData: PrintData | null = data
    ? {
        ...data,
        company: data.company ?? company,
      }
    : null

  const isMobile =
    typeof window !== 'undefined' && window.innerWidth < 768

  useEffect(() => {
    if (open && autoprint && printData) {
      setTimeout(() => {
        handlePrint()
      }, 600)
    }
  }, [open])

  useEffect(() => {
    if (!open) return

    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'p') {
        e.preventDefault()
        handlePrint()
      }

      if (
        e.key === 'Enter' &&
        !e.shiftKey &&
        !e.ctrlKey
      ) {
        handleNextBill()
      }

      if (e.key === 'Escape') {
        onClose()
      }
    }

    window.addEventListener('keydown', handler)

    return () => {
      window.removeEventListener('keydown', handler)
    }
  }, [open, size, copies])

  const handlePrint = useCallback(async () => {
    if (!printData || !printRef.current || printing) return

    try {
      setPrinting(true)

      await print(printRef, {
        size,
        copies,
        voucherNo: printData.voucherNo,
        type: printData.type,
        partyName: printData.partyName,
        amount: printData.netTotal,
        date: printData.date,
      })
    } finally {
      setPrinting(false)
    }
  }, [printData, size, copies, print, printing])

  const handleDownload = useCallback(() => {
    if (!printData || !printRef.current) return

    const filename = `${printData.voucherNo}.pdf`

    downloadPDF(printRef, filename, { size })
  }, [printData, size, downloadPDF])

  const handleNextBill = useCallback(() => {
    onNextBill?.()
    onClose()
  }, [onNextBill, onClose])

  if (!printData) return null

  if (typeof document === 'undefined') return null

  const typeColor =
    TYPE_COLORS[printData.type] || '#334155'

  return createPortal(
    <AnimatePresence>
      {open && (
        <>
          {/* BACKDROP */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 9998,
              background: 'rgba(0,0,0,0.6)',
              backdropFilter: 'blur(4px)',
            }}
          />

          {/* CENTER CONTAINER */}
          <div
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 9999,
              display: 'flex',
              alignItems: fullscreen
                ? 'stretch'
                : 'center',
              justifyContent: fullscreen
                ? 'stretch'
                : 'center',
              padding: fullscreen ? 0 : 20,
              pointerEvents: 'none',
            }}
          >
            {/* MODAL */}
            <motion.div
              initial={{
                opacity: 0,
                scale: 0.92,
                y: 24,
              }}
              animate={{
                opacity: 1,
                scale: 1,
                y: 0,
              }}
              exit={{
                opacity: 0,
                scale: 0.95,
                y: 12,
              }}
              transition={{
                type: 'spring',
                stiffness: 400,
                damping: 30,
              }}
              style={{
                pointerEvents: 'auto',
                width: fullscreen
                  ? '100vw'
                  : 'min(920px, 96vw)',
                height: fullscreen
                  ? '100vh'
                  : 'auto',
                maxHeight: fullscreen
                  ? '100vh'
                  : '92vh',
                background: 'var(--surface, #fff)',
                borderRadius: fullscreen ? 0 : 20,
                boxShadow:
                  '0 25px 80px rgba(0,0,0,0.35)',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              {/* HEADER */}
              <div
                style={{
                  padding: '16px 20px',
                  borderBottom:
                    '1px solid var(--border,#e2e8f0)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  flexShrink: 0,
                }}
              >
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: '50%',
                    background: typeColor + '18',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <CheckCircle2
                    size={20}
                    style={{ color: typeColor }}
                  />
                </div>

                <div style={{ flex: 1 }}>
                  <div
                    style={{
                      fontWeight: 700,
                      fontSize: 15,
                    }}
                  >
                    {printData.voucherNo}

                    <span
                      style={{
                        marginLeft: 8,
                        fontSize: 10,
                        fontWeight: 700,
                        background: typeColor + '18',
                        color: typeColor,
                        padding: '3px 8px',
                        borderRadius: 99,
                      }}
                    >
                      {printData.type.replace('_', ' ')}
                    </span>
                  </div>

                  <div
                    style={{
                      fontSize: 12,
                      color: '#888',
                      marginTop: 2,
                    }}
                  >
                    {printData.partyName && (
                      <span>
                        {printData.partyName} ·
                      </span>
                    )}{' '}
                    {fmtDate(printData.date)} ·{' '}
                    <b style={{ color: typeColor }}>
                      {fmt(printData.netTotal)}
                    </b>
                  </div>
                </div>

                <div
                  style={{
                    display: 'flex',
                    gap: 4,
                  }}
                >
                  <button
                    onClick={() =>
                      setFullscreen((v) => !v)
                    }
                    style={iconBtn}
                  >
                    <Maximize2 size={16} />
                  </button>

                  <button
                    onClick={onClose}
                    style={iconBtn}
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>

              {/* BODY */}
              <div
                style={{
                  flex: 1,
                  overflow: 'hidden',
                  display: 'flex',
                  flexDirection: isMobile
                    ? 'column'
                    : 'row',
                }}
              >
                {/* PREVIEW */}
                <div
                  style={{
                    flex: 1,
                    overflow: 'auto',
                    padding: 20,
                    background: '#f8fafc',
                  }}
                >
                  <div
                    style={{
                      background: '#fff',
                      borderRadius: 10,
                      boxShadow:
                        '0 2px 12px rgba(0,0,0,0.1)',
                      padding:
                        size === 'a4' ? 24 : 12,
                      maxWidth:
                        size === 'a4'
                          ? 680
                          : size === 'thermal-80'
                          ? 302
                          : 220,
                      margin: '0 auto',
                      transform: 'scale(0.98)',
                      transformOrigin:
                        'top center',
                    }}
                  >
                    <InvoiceTemplate
                      ref={printRef}
                      data={printData}
                      size={size}
                    />
                  </div>
                </div>

                {/* SIDEBAR */}
                <div
                  style={{
                    width: isMobile
                      ? '100%'
                      : 220,
                    borderLeft: isMobile
                      ? 'none'
                      : '1px solid var(--border,#e2e8f0)',
                    borderTop: isMobile
                      ? '1px solid var(--border,#e2e8f0)'
                      : 'none',
                    padding: 16,
                    overflow: 'auto',
                    background:
                      'var(--surface,#fff)',
                  }}
                >
                  {/* PAPER SIZE */}
                  <SectionTitle>
                    Paper Size
                  </SectionTitle>

                  {(
                    [
                      'a4',
                      'thermal-80',
                      'thermal-58',
                    ] as PrintSize[]
                  ).map((s) => (
                    <button
                      key={s}
                      onClick={() => setSize(s)}
                      style={{
                        width: '100%',
                        textAlign: 'left',
                        padding: '8px 10px',
                        marginBottom: 4,
                        borderRadius: 8,
                        cursor: 'pointer',
                        border:
                          size === s
                            ? `1.5px solid ${typeColor}`
                            : '1px solid var(--border,#e2e8f0)',
                        background:
                          size === s
                            ? typeColor + '12'
                            : '#fff',
                        color:
                          size === s
                            ? typeColor
                            : '#444',
                        fontSize: 12,
                        fontWeight:
                          size === s ? 700 : 500,
                      }}
                    >
                      {s === 'a4'
                        ? 'A4 Standard'
                        : s === 'thermal-80'
                        ? 'Thermal 80mm'
                        : 'Thermal 58mm'}
                    </button>
                  ))}

                  {/* COPIES */}
                  <SectionTitle>
                    Copies
                  </SectionTitle>

                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      marginBottom: 14,
                    }}
                  >
                    <button
                      onClick={() =>
                        setCopies((c) =>
                          Math.max(1, c - 1)
                        )
                      }
                      style={qtyBtn}
                    >
                      −
                    </button>

                    <div
                      style={{
                        minWidth: 24,
                        textAlign: 'center',
                        fontWeight: 700,
                      }}
                    >
                      {copies}
                    </div>

                    <button
                      onClick={() =>
                        setCopies((c) =>
                          Math.min(5, c + 1)
                        )
                      }
                      style={qtyBtn}
                    >
                      +
                    </button>
                  </div>

                  <Divider />

                  <ActionBtn
                    icon={<Printer size={15} />}
                    label={
                      printing
                        ? 'Printing...'
                        : 'Print'
                    }
                    shortcut="Ctrl+P"
                    color={typeColor}
                    onClick={handlePrint}
                    primary
                  />

                  <ActionBtn
                    icon={<Download size={15} />}
                    label="Download PDF"
                    color="#2563eb"
                    onClick={handleDownload}
                  />

                  <ActionBtn
                    icon={<Copy size={15} />}
                    label="Duplicate Print"
                    color="#7c3aed"
                    onClick={() => {
                      setCopies(2)

                      setTimeout(
                        handlePrint,
                        100
                      )
                    }}
                  />

                  <Divider />

                  <ActionBtn
                    icon={<Mail size={15} />}
                    label="Email Invoice"
                    color="#0891b2"
                    onClick={() =>
                      shareEmail(
                        printData,
                        company
                      )
                    }
                  />

                  <ActionBtn
                    icon={
                      <MessageCircle size={15} />
                    }
                    label="WhatsApp"
                    color="#16a34a"
                    onClick={() =>
                      shareWhatsApp(printData)
                    }
                  />

                  <div style={{ flex: 1 }} />

                  {onNextBill && (
                    <ActionBtn
                      icon={
                        <ChevronRight size={15} />
                      }
                      label="Next Bill"
                      shortcut="Enter"
                      color="#334155"
                      onClick={handleNextBill}
                      primary
                    />
                  )}

                  <ActionBtn
                    icon={<Clock size={15} />}
                    label="Close"
                    shortcut="Esc"
                    color="#888"
                    onClick={onClose}
                  />
                </div>
              </div>

              {/* FOOTER */}
              <div
                style={{
                  padding: '8px 20px',
                  borderTop:
                    '1px solid var(--border,#e2e8f0)',
                  fontSize: 10,
                  color: '#94a3b8',
                  display: 'flex',
                  gap: 16,
                }}
              >
                <span>
                  <kbd style={kbdStyle}>
                    Ctrl+P
                  </kbd>{' '}
                  Print
                </span>

                {onNextBill && (
                  <span>
                    <kbd style={kbdStyle}>
                      Enter
                    </kbd>{' '}
                    Next Bill
                  </span>
                )}

                <span>
                  <kbd style={kbdStyle}>
                    Esc
                  </kbd>{' '}
                  Close
                </span>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>,
    document.body
  )
}

/* HELPERS */

function SectionTitle({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div
      style={{
        fontSize: 10,
        fontWeight: 700,
        color: '#94a3b8',
        marginBottom: 8,
        marginTop: 10,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
      }}
    >
      {children}
    </div>
  )
}

function Divider() {
  return (
    <div
      style={{
        height: 1,
        background: '#e2e8f0',
        margin: '12px 0',
      }}
    />
  )
}

function ActionBtn({
  icon,
  label,
  shortcut,
  color,
  onClick,
  primary,
}: {
  icon: React.ReactNode
  label: string
  shortcut?: string
  color: string
  onClick: () => void
  primary?: boolean
}) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        width: '100%',
        padding: primary
          ? '9px 10px'
          : '7px 10px',
        borderRadius: 10,
        marginBottom: 6,
        cursor: 'pointer',
        border: primary
          ? `1.5px solid ${color}`
          : '1px solid #e2e8f0',
        background: primary
          ? color
          : 'transparent',
        color: primary ? '#fff' : color,
        fontSize: 12,
        fontWeight: primary ? 700 : 600,
      }}
    >
      {icon}

      <span
        style={{
          flex: 1,
          textAlign: 'left',
        }}
      >
        {label}
      </span>

      {shortcut && (
        <span
          style={{
            fontSize: 9,
            opacity: 0.7,
          }}
        >
          {shortcut}
        </span>
      )}
    </button>
  )
}

const iconBtn: React.CSSProperties = {
  background: 'transparent',
  border: 'none',
  cursor: 'pointer',
  padding: 6,
  borderRadius: 8,
  color: '#64748b',
}

const qtyBtn: React.CSSProperties = {
  width: 28,
  height: 28,
  borderRadius: 8,
  border: '1px solid #e2e8f0',
  background: '#fff',
  cursor: 'pointer',
  fontSize: 16,
  fontWeight: 700,
}

const kbdStyle: React.CSSProperties = {
  background: '#f1f5f9',
  border: '1px solid #e2e8f0',
  borderRadius: 4,
  padding: '1px 5px',
  fontSize: 9,
  fontFamily: 'monospace',
}