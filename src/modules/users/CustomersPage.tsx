import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { Plus } from 'lucide-react'
import { useCustomers, useCreateCustomer, useUpdateParty, useDeleteParty, usePartyLedger } from '@/hooks/useQuery'
import { Button, Modal, Badge, Pagination, SkeletonRows, Empty, SearchInput, ConfirmDialog } from '@/components/ui'
import { useDebounce } from '@/hooks/useDebounce'
import { fmt, fmtDate } from '@/utils'
import type { Party } from '@/types'

const schema = z.object({
  name:           z.string().min(1, 'Required'),
  phone:          z.string().optional(),
  email:          z.string().email().optional().or(z.literal('')),
  address:        z.string().optional(),
  pan_no:         z.string().optional(),
  credit_limit:   z.coerce.number().optional(),
  credit_days:    z.coerce.number().default(30),
  opening_balance:z.coerce.number().default(0),
})
type Form = z.infer<typeof schema>

function PartyForm({ initial, onClose, onCreate }: { initial?: Party | null; onClose: () => void; onCreate: (d: Form) => Promise<void> }) {
  const update = useUpdateParty()
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<Form>({
    resolver: zodResolver(schema),
    defaultValues: initial ? {
      name: initial.name, phone: initial.phone || '', email: initial.email || '',
      address: initial.address || '', pan_no: initial.pan_no || '',
      credit_limit: initial.credit_limit, credit_days: initial.credit_days || 30,
      opening_balance: initial.opening_balance,
    } : { credit_days: 30, opening_balance: 0 },
  })

  const onSubmit = handleSubmit(async (data) => {
    if (initial) await update.mutateAsync({ id: initial.id, data })
    else         await onCreate(data)
    onClose()
  })

  return (
    <>
      <div className="form-grid">
        <div style={{ gridColumn: 'span 2' }}>
          <label className="text-[11px] font-semibold text-[var(--text-3)] uppercase tracking-wide block mb-1.5">Name *</label>
          <input className="erp-input" {...register('name')} />
          {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name.message}</p>}
        </div>
        {[['Phone','phone'],['Email','email'],['PAN No','pan_no'],['Address','address']].map(([l,n]) => (
          <div key={n}>
            <label className="text-[11px] font-semibold text-[var(--text-3)] uppercase tracking-wide block mb-1.5">{l}</label>
            <input className="erp-input" {...register(n as keyof Form)} />
          </div>
        ))}
        <div>
          <label className="text-[11px] font-semibold text-[var(--text-3)] uppercase tracking-wide block mb-1.5">Credit Limit</label>
          <input type="number" className="erp-input" {...register('credit_limit')} />
        </div>
        <div>
          <label className="text-[11px] font-semibold text-[var(--text-3)] uppercase tracking-wide block mb-1.5">Credit Days</label>
          <input type="number" className="erp-input" {...register('credit_days')} />
        </div>
        <div>
          <label className="text-[11px] font-semibold text-[var(--text-3)] uppercase tracking-wide block mb-1.5">Opening Balance</label>
          <input type="number" className="erp-input" {...register('opening_balance')} />
        </div>
      </div>
      <div className="flex justify-end gap-2 mt-5 pt-4 border-t border-[var(--border)]">
        <Button variant="secondary" onClick={onClose}>Cancel</Button>
        <Button variant="primary" loading={isSubmitting} onClick={onSubmit}>
          {initial ? 'Save' : 'Create Customer'}
        </Button>
      </div>
    </>
  )
}

function LedgerModal({ party, onClose }: { party: Party; onClose: () => void }) {
  const { data, isLoading } = usePartyLedger(party.id)
  // usePartyLedger now returns { rows, party, summary, closingBalance }
  const rows           = (data as any)?.rows           ?? []
  const closingBalance = (data as any)?.closingBalance ?? 0
  return (
    <Modal open onClose={onClose} title={`Ledger — ${party.name}`} size="xl">
      {/* Closing balance header */}
      <div className="flex justify-end mb-3 text-sm">
        <span className="text-[var(--text-3)] mr-2">Closing Balance:</span>
        <span className={`font-bold font-mono ${Number(closingBalance) > 0 ? 'text-amber-600' : 'text-green-700'}`}>
          {fmt(closingBalance)}
        </span>
      </div>
      <div className="table-card">
        <div className="overflow-x-auto">
          <table className="erp-table">
            <thead><tr><th>Date</th><th>Reference</th><th>Description</th><th className="td-right">Debit</th><th className="td-right">Credit</th><th className="td-right">Balance</th></tr></thead>
            <tbody>
              {isLoading
                ? <tr><td colSpan={6} className="text-center py-4 text-[var(--text-3)]">Loading…</td></tr>
                : rows.length
                  ? rows.map((e: any, i: number) => (
                      <tr key={i} className={e.type === 'opening' ? 'bg-[var(--surface-2)]' : ''}>
                        <td className="td-mono">{e.date ? fmtDate(e.date_ad || e.date) : '—'}</td>
                        <td className="td-mono text-brand">{e.reference || '—'}</td>
                        <td>{e.description || '—'}</td>
                        <td className="td-right text-red-600">{Number(e.debit)  > 0 ? fmt(e.debit)  : '—'}</td>
                        <td className="td-right text-green-700">{Number(e.credit) > 0 ? fmt(e.credit) : '—'}</td>
                        <td className="td-right font-semibold td-mono">{fmt(e.running_balance ?? e.balance ?? 0)}</td>
                      </tr>
                    ))
                  : <tr><td colSpan={6}><Empty message="No ledger entries"/></td></tr>
              }
            </tbody>
          </table>
        </div>
      </div>
    </Modal>
  )
}

export default function CustomersPage() {
  const [page, setPage]     = useState(1)
  const [searchRaw, setSearch] = useState('')
  const search = useDebounce(searchRaw, 400)
  const [modal,      setModal]      = useState(false)
  const [editing,    setEditing]    = useState<Party | null>(null)
  const [ledgerParty,setLedgerParty]= useState<Party | null>(null)
  const [delId,      setDelId]      = useState<string | null>(null)
  const create = useCreateCustomer()
  const del    = useDeleteParty()

  const { data, isLoading } = useCustomers({ page, limit: 20, search: search || undefined })
  const rows  = (data?.data as Party[]) || []
  const total = (data?.pagination as any)?.total || 0

  return (
    <div>
      <div className="page-header">
        <div><div className="page-breadcrumb">Parties</div><h1 className="page-title">Customers</h1></div>
        <Button variant="primary" icon={<Plus size={14}/>} onClick={() => { setEditing(null); setModal(true) }}>
          New Customer
        </Button>
      </div>

      <div className="flex items-center gap-2 mb-3">
        <SearchInput value={searchRaw} onChange={setSearch} className="w-64" />
      </div>

      <div className="table-card">
        <div className="overflow-x-auto">
          <table className="erp-table">
            <thead><tr><th>Code</th><th>Name</th><th>Phone</th><th>PAN</th><th className="td-right">Credit Limit</th><th className="td-right">Balance</th><th></th></tr></thead>
            <tbody>
              {isLoading
                ? <SkeletonRows cols={7} />
                : rows.length
                  ? rows.map(c => (
                      <tr key={c.id}>
                        <td className="td-mono text-brand">{c.code}</td>
                        <td className="font-semibold">{c.name}</td>
                        <td>{c.phone || '—'}</td>
                        <td className="td-mono">{c.pan_no || '—'}</td>
                        <td className="td-right">{c.credit_limit ? fmt(c.credit_limit) : '—'}</td>
                        <td className={`td-right font-semibold ${Number(c.current_balance) > 0 ? 'text-amber-600' : ''}`}>{fmt(c.current_balance)}</td>
                        <td>
                          <div className="flex gap-1">
                            <Button variant="ghost" size="sm" onClick={() => setLedgerParty(c)}>Ledger</Button>
                            <Button variant="ghost" size="sm" onClick={() => { setEditing(c); setModal(true) }}>Edit</Button>
                            <Button variant="danger" size="sm" onClick={() => setDelId(c.id)}>Del</Button>
                          </div>
                        </td>
                      </tr>
                    ))
                  : <tr><td colSpan={7}><Empty message="No customers found"/></td></tr>
              }
            </tbody>
          </table>
        </div>
        <Pagination page={page} total={total} limit={20} onChange={setPage} />
      </div>

      <Modal open={modal} onClose={() => { setModal(false); setEditing(null) }}
        title={editing ? 'Edit Customer' : 'New Customer'} size="lg">
        <PartyForm initial={editing} onClose={() => { setModal(false); setEditing(null) }}
          onCreate={(d) => create.mutateAsync(d)} />
      </Modal>

      {ledgerParty && <LedgerModal party={ledgerParty} onClose={() => setLedgerParty(null)} />}

      <ConfirmDialog open={!!delId} onClose={() => setDelId(null)}
        onConfirm={() => del.mutate(delId!)}
        title="Delete Customer" message="Delete this customer permanently?" danger />
    </div>
  )
}
