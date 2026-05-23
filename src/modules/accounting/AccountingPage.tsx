import { useState } from 'react'
import { Tabs } from '@/components/ui'
import VouchersTab    from './tabs/VouchersTab'
import AccountsTab    from './tabs/AccountsTab'
import PeriodsTab     from './tabs/PeriodsTab'
import ReceiptsTab    from './tabs/ReceiptsTab'
import PaymentsTab    from './tabs/PaymentsTab'
import TrialBalTab    from './tabs/TrialBalTab'

const TABS = [
  { id: 'vouchers',  label: 'Vouchers'       },
  { id: 'receipts',  label: 'Receipts'       },
  { id: 'payments',  label: 'Payments'       },
  { id: 'accounts',  label: 'Chart of Accounts' },
  { id: 'trial',     label: 'Trial Balance'  },
  { id: 'periods',   label: 'Periods'        },
]

export default function AccountingPage() {
  const [tab, setTab] = useState('vouchers')

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-breadcrumb">Finance</div>
          <h1 className="page-title">Accounting</h1>
        </div>
      </div>

      <Tabs tabs={TABS} active={tab} onChange={setTab} />

      {tab === 'vouchers'  && <VouchersTab />}
      {tab === 'receipts'  && <ReceiptsTab />}
      {tab === 'payments'  && <PaymentsTab />}
      {tab === 'accounts'  && <AccountsTab />}
      {tab === 'trial'     && <TrialBalTab />}
      {tab === 'periods'   && <PeriodsTab />}
    </div>
  )
}
