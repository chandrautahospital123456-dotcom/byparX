import http from '@/services/http'
import type { ApiResponse, Company, User, Sale, SaleItem, Purchase, PurchaseItem,
  Product, Party, Account, Voucher, VoucherLine, DashboardStats, PnLReport,
  TrialBalanceRow, LedgerEntry, StockBatch, InvoiceTemplate, FiscalYear, AuditLog } from '@/types'

type Params = Record<string, unknown>

// ─── Auth ──────────────────────────────────────────────────────────────────────
export const authAPI = {
  login:          (data: { email: string; password: string }) =>
    http.post<ApiResponse<{ access_token: string; user: User; company: Company }>>('/auth/login', data),
  register:       (data: Params) =>
    http.post<ApiResponse<{ token: string; user: User; company: Company }>>('/auth/register', data),
  logout:         () => http.post('/auth/logout'),
  me:             () => http.get<ApiResponse<User>>('/auth/me'),
  changePassword: (data: { current_password: string; new_password: string }) =>
    http.put('/auth/change-password', data),
  refresh:        (data: { refresh_token: string }) => http.post('/auth/refresh', data),
}

// ─── Products ─────────────────────────────────────────────────────────────────
export const productsAPI = {
  list:       (params?: Params) => http.get<ApiResponse<Product[]>>('/products', { params }),
  get:        (id: string)      => http.get<ApiResponse<Product>>(`/products/${id}`),
  create:     (data: Partial<Product>) => http.post<ApiResponse<Product>>('/products', data),
  update:     (id: string, data: Partial<Product>) => http.put<ApiResponse<Product>>(`/products/${id}`, data),
  delete:     (id: string)      => http.delete(`/products/${id}`),
  stock:      (id: string)      => http.get(`/products/${id}/stock`),
  adjust:     (id: string, data: { qty: number; reason: string }) =>
    http.post(`/products/${id}/adjust`, data),
  categories: ()                => http.get('/products/categories'),
}

// ─── Sales ────────────────────────────────────────────────────────────────────
export const salesAPI = {
  list:   (params?: Params) => http.get<ApiResponse<Sale[]>>('/sales', { params }),
  get:    (id: string)      => http.get<ApiResponse<Sale>>(`/sales/${id}`),
  create: (data: {
    party_id?: string; date_ad: string; payment_mode: string;
    discount_pct?: number; notes?: string; items: SaleItem[]
  }) => http.post<ApiResponse<Sale>>('/sales', data),
  cancel: (id: string, data?: { reason?: string }) => http.put(`/sales/${id}/cancel`, data || {}),
  stats:  (params?: Params) => http.get<ApiResponse<DashboardStats>>('/sales/summary/stats', { params }),
}

// ─── Purchases ────────────────────────────────────────────────────────────────
export const purchasesAPI = {
  list:   (params?: Params) => http.get<ApiResponse<Purchase[]>>('/purchases', { params }),
  get:    (id: string)      => http.get<ApiResponse<Purchase>>(`/purchases/${id}`),
  create: (data: {
    party_id?: string; date_ad: string; payment_mode: string;
    supplier_bill_no?: string; items: PurchaseItem[]
  }) => http.post<ApiResponse<Purchase>>('/purchases', data),
  cancel: (id: string) => http.put(`/purchases/${id}/cancel`),
}

// ─── Returns ──────────────────────────────────────────────────────────────────
export const returnsAPI = {
  list:   (params?: Params) => http.get('/returns', { params }),
  get:    (id: string)      => http.get(`/returns/${id}`),
  create: (data: Params)    => http.post('/returns', data),
}

// ─── Receives (Inventory In) ──────────────────────────────────────────────────
export const receivesAPI = {
  list:   (params?: Params) => http.get('/receives', { params }),
  create: (data: Params)    => http.post('/receives', data),
  delete: (id: string)      => http.delete(`/receives/${id}`),
}

// ─── Stock ────────────────────────────────────────────────────────────────────
export const stockAPI = {
  list:    (params?: Params) => http.get('/stock', { params }),
  batches: (params?: Params) => http.get<ApiResponse<StockBatch[]>>('/stock/batches', { params }),
  summary: ()                => http.get('/stock/summary'),
}

// ─── Parties ──────────────────────────────────────────────────────────────────
export const partiesAPI = {
  customers:      (params?: Params) => http.get<ApiResponse<Party[]>>('/parties/customers', { params }),
  suppliers:      (params?: Params) => http.get<ApiResponse<Party[]>>('/parties/suppliers', { params }),
  get:            (id: string)      => http.get<ApiResponse<Party>>(`/parties/${id}`),
  createCustomer: (data: Partial<Party>) => http.post<ApiResponse<Party>>('/parties/customers', data),
  createSupplier: (data: Partial<Party>) => http.post<ApiResponse<Party>>('/parties/suppliers', data),
  update:         (id: string, data: Partial<Party>) => http.put<ApiResponse<Party>>(`/parties/${id}`, data),
  delete:         (id: string)      => http.delete(`/parties/${id}`),
  ledger:         (id: string, params?: Params) =>
    http.get<ApiResponse<LedgerEntry[]>>(`/parties/${id}/ledger`, { params }),
}

// ─── Accounting ───────────────────────────────────────────────────────────────
export const accountingAPI = {
  // Accounts
  accounts:      (params?: Params) => http.get<ApiResponse<Account[]>>('/accounting/accounts', { params }),
  createAccount: (data: Partial<Account>) => http.post<ApiResponse<Account>>('/accounting/accounts', data),
  updateAccount: (id: string, data: Partial<Account>) => http.put(`/accounting/accounts/${id}`, data),

  // Vouchers (generic — covers receipts, payments, journal)
  vouchers:       (params?: Params) => http.get<ApiResponse<Voucher[]>>('/accounting/vouchers', { params }),
  voucher:        (id: string)      => http.get<ApiResponse<Voucher>>(`/accounting/vouchers/${id}`),
  createVoucher:  (data: { voucher_type: string; voucher_date: string; narration?: string; party_id?: string; lines: VoucherLine[] }) =>
    http.post<ApiResponse<Voucher>>('/accounting/vouchers', data),
  postVoucher:    (id: string)      => http.post(`/accounting/vouchers/${id}/post`, {}),
  reverseVoucher: (id: string)      => http.post(`/accounting/vouchers/${id}/reverse`, {}),

  // Specific voucher endpoints (kept for backwards compat)
  receipts:      (params?: Params) => http.get('/accounting/receipts', { params }),
  createReceipt: (data: Params)    => http.post('/accounting/receipts', data),
  payments:      (params?: Params) => http.get('/accounting/payments', { params }),
  createPayment: (data: Params)    => http.post('/accounting/payments', data),
  journal:       (params?: Params) => http.get('/accounting/journal', { params }),
  createJV:      (data: Params)    => http.post('/accounting/journal', data),

  // Reports
  trialBalance:  (params?: Params) =>
    http.get<ApiResponse<TrialBalanceRow[]>>('/accounting/trial-balance', { params }),
  pnl:           (params?: Params) =>
    http.get<ApiResponse<PnLReport>>('/accounting/reports/pnl', { params }),
  balanceSheet:  (params?: Params) =>
    http.get('/accounting/reports/balance-sheet', { params }),
  partyLedger:   (id: string, params?: Params) =>
    http.get(`/accounting/party-ledger/${id}`, { params }),

  // Periods
  periods:       ()           => http.get('/accounting/periods'),
  lockPeriod:    (id: string) => http.post(`/accounting/periods/${id}/lock`, {}),
  unlockPeriod:  (id: string) => http.post(`/accounting/periods/${id}/unlock`, {}),
}

// ─── Reports ──────────────────────────────────────────────────────────────────
export const reportsAPI = {
  dashboard:   (params?: Params) => http.get<ApiResponse<DashboardStats>>('/reports/dashboard', { params }),
  sales:       (params?: Params) => http.get('/reports/sales',        { params }),
  purchases:   (params?: Params) => http.get('/reports/purchases',    { params }),
  profitLoss:  (params?: Params) => http.get('/reports/profit-loss',  { params }),
  stock:       (params?: Params) => http.get('/reports/stock',        { params }),
  stockLedger: (params?: Params) => http.get('/reports/stock-ledger', { params }),
  expiry:      (params?: Params) => http.get('/reports/expiry',       { params }),
  lowStock:    ()                => http.get('/reports/low-stock'),
  partyBalance:(params?: Params) => http.get('/reports/party-balance',{ params }),
}

// ─── Date utility ─────────────────────────────────────────────────────────────
export const dateAPI = {
  today:    ()                       => http.get('/date/today'),
  adToBS:   (date: string)           => http.get('/date/ad-to-bs', { params: { date } }),
  bsToAD:   (y: number, m: number, d: number) =>
    http.get('/date/bs-to-ad', { params: { year: y, month: m, day: d } }),
  calendar: (y: number, m: number)   => http.get('/date/calendar', { params: { year: y, month: m } }),
}

// ─── Settings ─────────────────────────────────────────────────────────────────
export const settingsAPI = {
  company:          ()           => http.get<ApiResponse<Company>>('/settings/company'),
  updateCompany:    (data: Partial<Company>) => http.put('/settings/company', data),
  uploadLogo:       (file: File) => {
    const fd = new FormData(); fd.append('logo', file)
    return http.post('/settings/company/logo', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
  },
  users:            (params?: Params) => http.get<ApiResponse<User[]>>('/settings/users', { params }),
  createUser:       (data: Partial<User> & { password: string }) =>
    http.post<ApiResponse<User>>('/settings/users', data),
  updateUser:       (id: string, data: Partial<User>) => http.put(`/settings/users/${id}`, data),
  templates:        () => http.get<ApiResponse<InvoiceTemplate[]>>('/settings/invoice-templates'),
  createTemplate:   (data: Params) => http.post('/settings/invoice-templates', data),
  updateTemplate:   (id: string, data: Params) => http.put(`/settings/invoice-templates/${id}`, data),
  deleteTemplate:   (id: string) => http.delete(`/settings/invoice-templates/${id}`),
  setDefaultTemplate:(id: string) => http.put(`/settings/invoice-templates/${id}/set-default`),
  fiscalYears:      () => http.get<ApiResponse<FiscalYear[]>>('/settings/fiscal-years'),
  createFiscalYear: (data: Params) => http.post('/settings/fiscal-years', data),
  auditLog:         (params?: Params) => http.get<ApiResponse<AuditLog[]>>('/settings/audit-log', { params }),
}
