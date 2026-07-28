// lib/api/types/finance.ts

import type { Expense as ExpenseType } from '@/lib/api/finance/expenseApi';

export type ExpenseStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'REIMBURSED';

export interface ExpenseFilters {
  search?: string;
  category?: string;
  status?: ExpenseStatus | 'ALL';
  startDate?: string;
  endDate?: string;
}

// Re-exported from expenseApi for convenience
export type Expense = ExpenseType;
