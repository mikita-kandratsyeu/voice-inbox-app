'use client';

import { Plus, Receipt, Wallet } from 'lucide-react';
import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { formatCents } from '@/lib/admin-budget-money';

import { AdminBudgetRowMenu } from './AdminBudgetRowMenu';
import {
  AdminCard,
  AdminStatusBadge,
  adminBtnPrimaryClass,
  adminBtnSecondaryClass,
  adminInputClass,
  adminSelectClass,
} from './admin-ui';

type BudgetItem = {
  id: string;
  spentAt: string;
  category: string | null;
  description: string;
  amountCents: number;
  currency: string;
  createdAt: string;
  updatedAt: string;
};

const CURRENCIES = ['USD', 'EUR', 'GBP', 'RUB', 'PLN'] as const;

function normalizeCurrency(code: string | null | undefined): string {
  if (code?.length === 3 && /^[A-Za-z]{3}$/.test(code)) {
    return code.toUpperCase();
  }
  return 'USD';
}

function rowCurrencyOptions(current: string): string[] {
  const u = normalizeCurrency(current);
  const set = new Set<string>([...CURRENCIES]);
  if (!set.has(u)) {
    return [u, ...CURRENCIES];
  }
  return [...CURRENCIES];
}

function isoToDateInput(iso: string): string {
  const d = new Date(iso);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function formatSpentDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

const tableCellClass = 'px-4 py-3.5 align-middle text-sm';

function todayDateInput(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function centsToAmountInput(cents: number): string {
  return (cents / 100).toFixed(2);
}

type ExpenseFormFieldsProps = {
  spentAt: string;
  category: string;
  description: string;
  amount: string;
  currency: string;
  onSpentAtChange: (value: string) => void;
  onCategoryChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
  onAmountChange: (value: string) => void;
  onCurrencyChange: (value: string) => void;
  currencyOptions: string[];
  idPrefix: string;
};

function ExpenseFormFields({
  spentAt,
  category,
  description,
  amount,
  currency,
  onSpentAtChange,
  onCategoryChange,
  onDescriptionChange,
  onAmountChange,
  onCurrencyChange,
  currencyOptions,
  idPrefix,
}: ExpenseFormFieldsProps) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-12 lg:items-end">
      <div className="lg:col-span-2">
        <label
          htmlFor={`${idPrefix}-date`}
          className="mb-1 block text-xs font-medium text-zinc-500 dark:text-zinc-400"
        >
          Date
        </label>
        <input
          id={`${idPrefix}-date`}
          type="date"
          value={spentAt}
          onChange={(e) => onSpentAtChange(e.target.value)}
          className={adminInputClass}
        />
      </div>
      <div className="lg:col-span-2">
        <label
          htmlFor={`${idPrefix}-category`}
          className="mb-1 block text-xs font-medium text-zinc-500 dark:text-zinc-400"
        >
          Category
        </label>
        <input
          id={`${idPrefix}-category`}
          type="text"
          value={category}
          onChange={(e) => onCategoryChange(e.target.value)}
          placeholder="Hosting, AI…"
          maxLength={80}
          className={adminInputClass}
        />
      </div>
      <div className="lg:col-span-4">
        <label
          htmlFor={`${idPrefix}-description`}
          className="mb-1 block text-xs font-medium text-zinc-500 dark:text-zinc-400"
        >
          Description
        </label>
        <input
          id={`${idPrefix}-description`}
          type="text"
          value={description}
          onChange={(e) => onDescriptionChange(e.target.value)}
          placeholder="What you paid for"
          maxLength={500}
          className={adminInputClass}
        />
      </div>
      <div className="flex gap-2 lg:col-span-3">
        <div className="min-w-0 flex-1">
          <label
            htmlFor={`${idPrefix}-amount`}
            className="mb-1 block text-xs font-medium text-zinc-500 dark:text-zinc-400"
          >
            Amount
          </label>
          <input
            id={`${idPrefix}-amount`}
            type="text"
            inputMode="decimal"
            value={amount}
            onChange={(e) => onAmountChange(e.target.value)}
            placeholder="0.00"
            className={`${adminInputClass} font-mono tabular-nums`}
          />
        </div>
        <div className="w-24 shrink-0">
          <label
            htmlFor={`${idPrefix}-currency`}
            className="mb-1 block text-xs font-medium text-zinc-500 dark:text-zinc-400"
          >
            Currency
          </label>
          <select
            id={`${idPrefix}-currency`}
            value={normalizeCurrency(currency)}
            onChange={(e) => onCurrencyChange(e.target.value)}
            className={adminSelectClass}
          >
            {currencyOptions.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}

type BudgetRowProps = {
  item: BudgetItem;
  onTotals: (totals: Record<string, number>) => void;
  onReplace: (item: BudgetItem) => void;
  onRemove: (id: string) => void;
};

function BudgetExpenseRow({ item, onTotals, onReplace, onRemove }: BudgetRowProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [spentAt, setSpentAt] = useState(() => isoToDateInput(item.spentAt));
  const [category, setCategory] = useState(item.category ?? '');
  const [description, setDescription] = useState(item.description);
  const [amount, setAmount] = useState(() => centsToAmountInput(item.amountCents));
  const [currency, setCurrency] = useState(() => normalizeCurrency(item.currency));
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isEditing) return;
    setSpentAt(isoToDateInput(item.spentAt));
    setCategory(item.category ?? '');
    setDescription(item.description);
    setAmount(centsToAmountInput(item.amountCents));
    setCurrency(normalizeCurrency(item.currency));
    setError(null);
  }, [item, isEditing]);

  const dirty = useMemo(() => {
    return (
      spentAt !== isoToDateInput(item.spentAt) ||
      (category || '') !== (item.category ?? '') ||
      description !== item.description ||
      amount !== centsToAmountInput(item.amountCents) ||
      currency !== normalizeCurrency(item.currency)
    );
  }, [item, spentAt, category, description, amount, currency]);

  const resetForm = () => {
    setSpentAt(isoToDateInput(item.spentAt));
    setCategory(item.category ?? '');
    setDescription(item.description);
    setAmount(centsToAmountInput(item.amountCents));
    setCurrency(normalizeCurrency(item.currency));
    setError(null);
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/budget/${encodeURIComponent(item.id)}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          spentAt,
          category: category.trim() || null,
          description: description.trim(),
          amount,
          currency,
        }),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        item?: BudgetItem;
        totals?: Record<string, number>;
        error?: string;
      };
      if (!res.ok || !data.ok || !data.item || !data.totals) {
        setError(data.error ?? 'Save failed');
        return;
      }
      onReplace(data.item);
      onTotals(data.totals);
      setIsEditing(false);
    } catch {
      setError('Network error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!globalThis.confirm('Delete this expense?')) return;
    setDeleting(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/budget/${encodeURIComponent(item.id)}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      const data = (await res.json()) as {
        ok?: boolean;
        totals?: Record<string, number>;
        error?: string;
      };
      if (!res.ok || !data.ok || !data.totals) {
        setError(data.error ?? 'Delete failed');
        return;
      }
      onRemove(item.id);
      onTotals(data.totals);
    } catch {
      setError('Network error');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
      <tr
        className={`group transition-colors ${
          isEditing
            ? 'bg-indigo-50/50 dark:bg-indigo-950/20'
            : 'hover:bg-zinc-50/80 dark:hover:bg-zinc-800/40'
        }`}
      >
        <td className={`${tableCellClass} whitespace-nowrap text-zinc-700 dark:text-zinc-300`}>
          <time dateTime={item.spentAt.slice(0, 10)}>{formatSpentDate(item.spentAt)}</time>
        </td>
        <td className={`${tableCellClass} text-left`}>
          {item.category?.trim() ? (
            <AdminStatusBadge tone="neutral">{item.category.trim()}</AdminStatusBadge>
          ) : (
            <span className="text-xs text-zinc-400 dark:text-zinc-500">—</span>
          )}
        </td>
        <td
          className={`${tableCellClass} max-w-xs text-zinc-900 dark:text-zinc-100 sm:max-w-md`}
          title={item.description}
        >
          <span className="line-clamp-2 leading-snug">{item.description}</span>
        </td>
        <td
          className={`${tableCellClass} whitespace-nowrap text-right font-medium tabular-nums text-zinc-900 dark:text-zinc-50`}
        >
          {formatCents(item.amountCents, item.currency)}
        </td>
        <td className={`${tableCellClass} w-12 px-2 text-right`}>
          <AdminBudgetRowMenu
            isDeleting={deleting}
            onEdit={() => {
              resetForm();
              setIsEditing(true);
            }}
            onDelete={() => void handleDelete()}
          />
        </td>
      </tr>
      {isEditing ? (
        <tr className="border-b border-zinc-100 bg-zinc-50/90 dark:border-zinc-800 dark:bg-zinc-900/60">
          <td colSpan={5} className="px-3 py-4 sm:px-4">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
              Edit expense
            </p>
            <ExpenseFormFields
              idPrefix={`edit-${item.id}`}
              spentAt={spentAt}
              category={category}
              description={description}
              amount={amount}
              currency={currency}
              onSpentAtChange={setSpentAt}
              onCategoryChange={setCategory}
              onDescriptionChange={setDescription}
              onAmountChange={setAmount}
              onCurrencyChange={setCurrency}
              currencyOptions={rowCurrencyOptions(currency)}
            />
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <button
                type="button"
                disabled={!dirty || saving || !description.trim() || !amount.trim()}
                onClick={() => void handleSave()}
                className={adminBtnPrimaryClass}
              >
                {saving ? 'Saving…' : 'Save changes'}
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={() => {
                  resetForm();
                  setIsEditing(false);
                }}
                className={adminBtnSecondaryClass}
              >
                Cancel
              </button>
            </div>
            {error ? <p className="mt-2 text-sm text-red-600 dark:text-red-400">{error}</p> : null}
          </td>
        </tr>
      ) : null}
      {!isEditing && error ? (
        <tr>
          <td colSpan={5} className="pb-2 text-sm text-red-600 dark:text-red-400">
            {error}
          </td>
        </tr>
      ) : null}
    </>
  );
}

export function AdminBudgetPanel() {
  const [items, setItems] = useState<BudgetItem[]>([]);
  const [totals, setTotals] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);

  const [nDate, setNDate] = useState(todayDateInput);
  const [nCategory, setNCategory] = useState('');
  const [nDescription, setNDescription] = useState('');
  const [nAmount, setNAmount] = useState('');
  const [nCurrency, setNCurrency] = useState('USD');
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  const fetchList = useCallback(async () => {
    setLoading(true);
    setListError(null);
    try {
      const res = await fetch('/api/admin/budget', { credentials: 'include' });
      const data = (await res.json()) as {
        ok?: boolean;
        items?: BudgetItem[];
        totals?: Record<string, number>;
        error?: string;
      };
      if (!res.ok || !data.ok || !data.items || !data.totals) {
        setListError(data.error ?? 'Failed to load budget');
        return;
      }
      setItems(data.items);
      setTotals(data.totals);
    } catch {
      setListError('Request failed');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchList();
  }, [fetchList]);

  const totalsSorted = useMemo(() => {
    return Object.entries(totals).sort(([a], [b]) => a.localeCompare(b));
  }, [totals]);

  const handleAdd = async () => {
    setAdding(true);
    setAddError(null);
    try {
      const res = await fetch('/api/admin/budget', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          spentAt: nDate,
          category: nCategory.trim() || null,
          description: nDescription.trim(),
          amount: nAmount,
          currency: nCurrency,
        }),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        item?: BudgetItem;
        totals?: Record<string, number>;
        error?: string;
      };
      if (!res.ok || !data.ok || !data.item || !data.totals) {
        setAddError(data.error ?? 'Could not add expense');
        return;
      }
      setItems((prev) => [data.item!, ...prev]);
      setTotals(data.totals);
      setNDescription('');
      setNAmount('');
      setNCategory('');
      setNDate(todayDateInput());
    } catch {
      setAddError('Network error');
    } finally {
      setAdding(false);
    }
  };

  return (
    <div className="space-y-6">
      {!loading && !listError ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {totalsSorted.map(([cur, cents]) => (
            <div
              key={cur}
              className="rounded-2xl border border-zinc-200/90 bg-white p-4 shadow-sm shadow-zinc-950/5 dark:border-zinc-700/90 dark:bg-zinc-900/95 dark:shadow-black/20"
            >
              <p className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                Total · {cur}
              </p>
              <p className="mt-1 text-2xl font-semibold tabular-nums tracking-tight text-zinc-900 dark:text-zinc-50">
                {formatCents(cents, cur)}
              </p>
            </div>
          ))}
          <div className="rounded-2xl border border-zinc-200/90 bg-white p-4 shadow-sm shadow-zinc-950/5 dark:border-zinc-700/90 dark:bg-zinc-900/95 dark:shadow-black/20">
            <p className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
              Expenses
            </p>
            <p className="mt-1 text-2xl font-semibold tabular-nums tracking-tight text-zinc-900 dark:text-zinc-50">
              {items.length}
            </p>
          </div>
        </div>
      ) : null}

      <AdminCard
        title="Budget ledger"
        description="Track manual expenses. Amounts are stored in minor units; totals refresh after each change."
        headerRight={
          <div className="flex flex-wrap items-center gap-2">
            <Link href="/api/admin/budget/export" className={adminBtnSecondaryClass}>
              Export CSV
            </Link>
            <button
              type="button"
              onClick={() => void fetchList()}
              className={adminBtnSecondaryClass}
            >
              Refresh
            </button>
          </div>
        }
      >
        <section className="mb-8 rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-900/50">
          <div className="mb-4 flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400">
              <Plus className="h-4 w-4" strokeWidth={2} aria-hidden />
            </div>
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Add expense</h3>
          </div>
          <ExpenseFormFields
            idPrefix="new"
            spentAt={nDate}
            category={nCategory}
            description={nDescription}
            amount={nAmount}
            currency={nCurrency}
            onSpentAtChange={setNDate}
            onCategoryChange={setNCategory}
            onDescriptionChange={setNDescription}
            onAmountChange={setNAmount}
            onCurrencyChange={setNCurrency}
            currencyOptions={[...CURRENCIES]}
          />
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={adding || !nDescription.trim() || !nAmount.trim()}
              onClick={() => void handleAdd()}
              className={adminBtnPrimaryClass}
            >
              {adding ? 'Adding…' : 'Add expense'}
            </button>
          </div>
          {addError ? (
            <p className="mt-2 text-sm text-red-600 dark:text-red-400">{addError}</p>
          ) : null}
        </section>

        {loading ? (
          <p className="text-sm text-zinc-500">Loading expenses…</p>
        ) : listError ? (
          <p className="text-sm text-red-600 dark:text-red-400">{listError}</p>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-zinc-200 px-6 py-14 text-center dark:border-zinc-700">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
              <Receipt className="h-6 w-6" strokeWidth={1.75} aria-hidden />
            </div>
            <p className="mt-4 text-sm font-medium text-zinc-800 dark:text-zinc-200">
              No expenses yet
            </p>
            <p className="mt-1 max-w-sm text-sm text-zinc-500 dark:text-zinc-400">
              Add your first line above — hosting, AI credits, domains, and other project costs.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-zinc-200 dark:border-zinc-700">
            <table className="w-full min-w-[36rem] table-fixed text-left text-sm">
              <colgroup>
                <col className="w-[7.25rem]" />
                <col className="w-[9.5rem]" />
                <col />
                <col className="w-[8.75rem]" />
                <col className="w-12" />
              </colgroup>
              <thead className="sticky top-0 z-10 bg-zinc-50 text-xs font-medium uppercase tracking-wide text-zinc-500 dark:bg-zinc-800/95 dark:text-zinc-400">
                <tr>
                  <th className={`${tableCellClass} text-left font-medium`}>Date</th>
                  <th className={`${tableCellClass} text-left font-medium`}>Category</th>
                  <th className={`${tableCellClass} text-left font-medium`}>Description</th>
                  <th className={`${tableCellClass} text-right font-medium`}>Amount</th>
                  <th className={`${tableCellClass} w-12 px-2`}>
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 bg-white dark:divide-zinc-800 dark:bg-zinc-900/30">
                {items.map((item) => (
                  <BudgetExpenseRow
                    key={item.id}
                    item={item}
                    onTotals={setTotals}
                    onReplace={(next) =>
                      setItems((prev) => prev.map((x) => (x.id === next.id ? next : x)))
                    }
                    onRemove={(id) => setItems((prev) => prev.filter((x) => x.id !== id))}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}

        {!loading && !listError && totalsSorted.length === 0 && items.length > 0 ? (
          <p className="mt-4 flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
            <Wallet className="h-3.5 w-3.5 shrink-0" strokeWidth={2} aria-hidden />
            Totals by currency appear once amounts are saved.
          </p>
        ) : null}
      </AdminCard>
    </div>
  );
}
