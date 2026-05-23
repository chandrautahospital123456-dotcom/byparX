/**
 * constants/index.ts — FIXED
 *
 * BUG: STORAGE_KEYS.TOKEN was 'erp_token'.
 *      Zustand persist() also used 'erp_token' as its storage key.
 *      localStorage['erp_token'] = '{"state":{"token":"eyJ..."},...}'  ← JSON, not JWT
 *      http.ts: localStorage.getItem('erp_token') → got JSON blob → 401
 *
 * FIX:
 *   - RAW_TOKEN_KEY in authStore.ts = 'erp_raw_token'  (plain JWT string)
 *   - Zustand persist key = 'erp_auth_state'           (JSON state blob)
 *   - STORAGE_KEYS.TOKEN kept for reference but http.ts uses RAW_TOKEN_KEY directly
 *
 * IMPORTANT: http.ts and authStore.ts import RAW_TOKEN_KEY directly.
 *            STORAGE_KEYS.TOKEN is no longer used for Bearer auth.
 */

// ─── Storage keys ─────────────────────────────────────────────────────────────
export const STORAGE_KEYS = {
  TOKEN:    'erp_raw_token',    // ← FIXED: plain JWT string (written by authStore.setAuth)
  AUTH:     'erp_auth_state',   // ← Zustand persist JSON blob (renamed from 'erp_token')
  THEME:    'erp_theme',
  SIDEBAR:  'erp_sidebar_collapsed',
  TEMPLATE: 'erp_template',
} as const

// ─── API ───────────────────────────────────────────────────────────────────────
export const API_BASE    = '/api/v1'
export const API_TIMEOUT = 20_000

// ─── Pagination ───────────────────────────────────────────────────────────────
export const DEFAULT_PAGE_SIZE = 20
export const PAGE_SIZE_OPTIONS = [10, 20, 50, 100]

// ─── Roles & permissions ──────────────────────────────────────────────────────
export const ROLES = {
  OWNER:      'owner',
  ADMIN:      'admin',
  MANAGER:    'manager',
  ACCOUNTANT: 'accountant',
  CASHIER:    'cashier',
  VIEWER:     'viewer',
} as const

export const ROLE_PERMISSIONS: Record<string, string[]> = {
  owner:      ['*'],
  admin:      ['*'],
  manager:    ['sales.*', 'purchases.*', 'products.*', 'parties.*', 'reports.*', 'accounting.view', 'settings.view'],
  accountant: ['accounting.*', 'reports.*', 'sales.view', 'purchases.view', 'parties.view'],
  cashier:    ['sales.*', 'products.view', 'parties.view', 'stock.view'],
  viewer:     ['*.view'],
}

// ─── Payment modes ────────────────────────────────────────────────────────────
export const PAYMENT_MODES = [
  { value: 'cash',   label: 'Cash'          },
  { value: 'credit', label: 'Credit'        },
  { value: 'card',   label: 'Card'          },
  { value: 'online', label: 'Online/UPI'    },
  { value: 'bank',   label: 'Bank Transfer' },
] as const

// ─── Account types ────────────────────────────────────────────────────────────
export const ACCOUNT_TYPES = [
  { value: 'asset',     label: 'Asset'     },
  { value: 'liability', label: 'Liability' },
  { value: 'income',    label: 'Income'    },
  { value: 'expense',   label: 'Expense'   },
  { value: 'equity',    label: 'Equity'    },
] as const

export const VOUCHER_TYPES = [
  { value: 'RECEIPT',     label: 'Receipt'      },
  { value: 'PAYMENT',     label: 'Payment'      },
  { value: 'JOURNAL',     label: 'Journal'      },
  { value: 'CONTRA',      label: 'Contra'       },
  { value: 'DEBIT_NOTE',  label: 'Debit Note'   },
  { value: 'CREDIT_NOTE', label: 'Credit Note'  },
  { value: 'OPENING',     label: 'Opening Entry'},
] as const

// ─── Units ────────────────────────────────────────────────────────────────────
export const PRODUCT_UNITS = ['PCS','BOX','STRIP','BOTTLE','TUBE','VIAL','SACHET','KG','LTR','SHEET'] as const

// ─── User roles ───────────────────────────────────────────────────────────────
export const USER_ROLES = [
  { value: 'admin',      label: 'Admin'      },
  { value: 'manager',    label: 'Manager'    },
  { value: 'accountant', label: 'Accountant' },
  { value: 'cashier',    label: 'Cashier'    },
  { value: 'viewer',     label: 'Viewer'     },
] as const

// ─── Query keys ───────────────────────────────────────────────────────────────
export const QK = {
  PRODUCTS:     'products',
  PRODUCT:      'product',
  CUSTOMERS:    'customers',
  SUPPLIERS:    'suppliers',
  PARTY:        'party',
  LEDGER:       'ledger',
  SALES:        'sales',
  SALE:         'sale',
  PURCHASES:    'purchases',
  PURCHASE:     'purchase',
  STOCK:        'stock',
  BATCHES:      'batches',
  ACCOUNTS:     'accounts',
  VOUCHERS:     'vouchers',
  VOUCHER:      'voucher',
  TRIAL_BAL:    'trial-balance',
  RECEIPTS:     'receipts',
  PAYMENTS:     'payments',
  DASHBOARD:    'dashboard',
  REPORTS:      'reports',
  COMPANY:      'company',
  USERS:        'users',
  TEMPLATES:    'templates',
  FISCAL_YEARS: 'fiscal-years',
  AUDIT_LOG:    'audit-log',
} as const

// ─── Routes ───────────────────────────────────────────────────────────────────
export const PATHS = {
  LOGIN:      '/login',
  SIGNUP:     '/signup',
  DASHBOARD:  '/dashboard',
  SALES:      '/sales',
  PURCHASE:   '/purchase',
  RETURNS:    '/returns',
  PRODUCTS:   '/products',
  STOCK:      '/stock',
  RECEIVES:   '/receives',
  CUSTOMERS:  '/customers',
  SUPPLIERS:  '/suppliers',
  ACCOUNTING: '/accounting',
  LEDGER:     '/ledger',
  REPORTS:    '/reports',
  SETTINGS:   '/settings',
} as const
