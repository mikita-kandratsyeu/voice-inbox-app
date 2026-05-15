import {
  deleteAdminBudgetExpense,
  patchAdminBudgetExpense,
} from '@/server/api/admin/budget.handlers';

export const PATCH = patchAdminBudgetExpense;
export const DELETE = deleteAdminBudgetExpense;
