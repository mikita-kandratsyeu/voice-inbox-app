'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

import { formatCents } from '@/lib/admin-budget-money';

import {
  AdminCard,
  adminBtnPrimaryClass,
  adminBtnSecondaryClass,
  adminInputClass,
  adminSelectClass,
} from './admin-ui';
import Link from 'next/link';

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

type BudgetRowProps = {
  item: BudgetItem;
  onTotals: (totals: Record<string, number>) => void;
  onReplace: (item: BudgetItem) => void;
  onRemove: (id: string) => void;
};

function BudgetExpenseRow({ item, onTotals, onReplace, onRemove }: BudgetRowProps) {
  const [spentAt, setSpentAt] = useState(() => isoToDateInput(item.spentAt));
  const [category, setCategory] = useState(item.category ?? '');
  const [description, setDescription] = useState(item.description);
  const [amount, setAmount] = useState(() => centsToAmountInput(item.amountCents));
  const [currency, setCurrency] = useState(() => normalizeCurrency(item.currency));
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setSpentAt(isoToDateInput(item.spentAt));
    setCategory(item.category ?? '');
    setDescription(item.description);
    setAmount(centsToAmountInput(item.amountCents));
    setCurrency(normalizeCurrency(item.currency));
    setError(null);
  }, [item]);

  const dirty = useMemo(() => {
    return (
      spentAt !== isoToDateInput(item.spentAt) ||
      (category || '') !== (item.category ?? '') ||
      description !== item.description ||
      amount !== centsToAmountInput(item.amountCents) ||
      currency !== normalizeCurrency(item.currency)
    );
  }, [item, spentAt, category, description, amount, currency]);

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
    } catch {
      setError('Network error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!globalThis.confirm('Delete this expense line?')) return;
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
    <tr className="border-b border-zinc-100 align-top dark:border-zinc-700/80">
      <td className="py-2 pr-2">
        <input
          type="date"
          value={spentAt}
          onChange={(e) => setSpentAt(e.target.value)}
          className={`${adminInputClass} w-[9.5rem] py-1.5 text-xs`}
        />
      </td>
      <td className="py-2 pr-2">
        <input
          type="text"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          placeholder="Hosting, AI…"
          maxLength={80}
          className={`${adminInputClass} min-w-[6rem] py-1.5 text-xs`}
        />
      </td>
      <td className="py-2 pr-2">
        <input
          type="text"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          maxLength={500}
          className={`${adminInputClass} min-w-[12rem] py-1.5 text-xs`}
        />
      </td>
      <td className="py-2 pr-2">
        <div className="flex flex-wrap items-center gap-1.5">
          <input
            type="text"
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className={`${adminInputClass} w-24 py-1.5 text-right font-mono text-xs`}
            aria-label="Amount"
          />
          <select
            value={normalizeCurrency(currency)}
            onChange={(e) => setCurrency(e.target.value)}
            className={`${adminSelectClass} min-w-[4.25rem] py-1.5 text-xs`}
            aria-label="Currency"
          >
            {rowCurrencyOptions(currency).map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
      </td>
      <td className="py-2 text-right">
        <div className="flex flex-col items-end gap-1">
          <div className="flex flex-wrap justify-end gap-1.5">
            <button
              type="button"
              disabled={!dirty || saving}
              onClick={() => void handleSave()}
              className={`${adminBtnPrimaryClass} px-2.5 py-1 text-xs disabled:pointer-events-none disabled:opacity-40`}
            >
              {saving ? 'Saving…' : 'Save'}
            </button>
            <button
              type="button"
              disabled={deleting}
              onClick={() => void handleDelete()}
              className="rounded-lg border border-red-200 bg-white px-2.5 py-1 text-xs font-medium text-red-700 shadow-sm hover:bg-red-50 disabled:opacity-50 dark:border-red-900 dark:bg-zinc-800 dark:text-red-400 dark:hover:bg-red-950/40"
            >
              {deleting ? '…' : 'Delete'}
            </button>
          </div>
          {error ? (
            <p className="max-w-[12rem] text-left text-[11px] text-red-600 dark:text-red-400">
              {error}
            </p>
          ) : null}
        </div>
      </td>
    </tr>
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
      <AdminCard
        title="Budget ledger"
        description="Manual expense lines; amounts are stored exactly (minor units). Totals update from the database after each change."
        headerRight={
          <div className="flex items-center gap-2">
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
        <section
          className="mb-6 rounded-xl border border-dashed border-zinc-200 bg-zinc-50/80 p-4 dark:border-zinc-600 dark:bg-zinc-800/40"
          aria-label="Add expense"
        >
          <h3 className="mb-3 text-sm font-medium text-zinc-800 dark:text-zinc-200">New expense</h3>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-12 lg:items-end">
            <div className="lg:col-span-2">
              <label className="mb-1 block text-xs font-medium text-zinc-500 dark:text-zinc-400">
                Date
              </label>
              <input
                type="date"
                value={nDate}
                onChange={(e) => setNDate(e.target.value)}
                className={adminInputClass}
              />
            </div>
            <div className="lg:col-span-2">
              <label className="mb-1 block text-xs font-medium text-zinc-500 dark:text-zinc-400">
                Category
              </label>
              <input
                type="text"
                value={nCategory}
                onChange={(e) => setNCategory(e.target.value)}
                placeholder="Optional"
                maxLength={80}
                className={adminInputClass}
              />
            </div>
            <div className="lg:col-span-4">
              <label className="mb-1 block text-xs font-medium text-zinc-500 dark:text-zinc-400">
                Description
              </label>
              <input
                type="text"
                value={nDescription}
                onChange={(e) => setNDescription(e.target.value)}
                placeholder="What you paid for"
                maxLength={500}
                className={adminInputClass}
              />
            </div>
            <div className="flex flex-wrap gap-2 lg:col-span-3">
              <div className="min-w-[5rem] flex-1">
                <label className="mb-1 block text-xs font-medium text-zinc-500 dark:text-zinc-400">
                  Amount
                </label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={nAmount}
                  onChange={(e) => setNAmount(e.target.value)}
                  placeholder="0.00"
                  className={`${adminInputClass} font-mono`}
                />
              </div>
              <div className="w-24">
                <label className="mb-1 block text-xs font-medium text-zinc-500 dark:text-zinc-400">
                  Curr.
                </label>
                <select
                  value={nCurrency}
                  onChange={(e) => setNCurrency(e.target.value)}
                  className={adminSelectClass}
                >
                  {CURRENCIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="lg:col-span-1">
              <button
                type="button"
                disabled={adding || !nDescription.trim() || !nAmount.trim()}
                onClick={() => void handleAdd()}
                className={`${adminBtnPrimaryClass} w-full whitespace-nowrap`}
              >
                {adding ? 'Adding…' : 'Add'}
              </button>
            </div>
          </div>
          {addError ? (
            <p className="mt-2 text-sm text-red-600 dark:text-red-400">{addError}</p>
          ) : null}
        </section>

        {loading ? (
          <p className="text-sm text-zinc-500">Loading…</p>
        ) : listError ? (
          <p className="text-sm text-red-600 dark:text-red-400">{listError}</p>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-[720px] w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-zinc-200 dark:border-zinc-600">
                    <th className="py-2 pr-2 font-medium text-zinc-600 dark:text-zinc-400">Date</th>
                    <th className="py-2 pr-2 font-medium text-zinc-600 dark:text-zinc-400">
                      Category
                    </th>
                    <th className="py-2 pr-2 font-medium text-zinc-600 dark:text-zinc-400">
                      Description
                    </th>
                    <th className="py-2 pr-2 font-medium text-zinc-600 dark:text-zinc-400">
                      Amount
                    </th>
                    <th className="py-2 text-right font-medium text-zinc-600 dark:text-zinc-400">
                      {' '}
                    </th>
                  </tr>
                </thead>
                <tbody>
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
              {items.length === 0 ? (
                <p className="mt-3 text-sm text-zinc-500">No lines yet — add an expense above.</p>
              ) : null}
            </div>

            <div className="mt-6 border-t border-zinc-200 pt-4 dark:border-zinc-700">
              <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                Totals (all lines in DB)
              </p>
              {totalsSorted.length === 0 ? (
                <p className="mt-2 text-lg font-semibold tabular-nums text-zinc-900 dark:text-zinc-50">
                  {formatCents(0, 'USD')}
                </p>
              ) : (
                <ul className="mt-2 space-y-1">
                  {totalsSorted.map(([cur, cents]) => (
                    <li
                      key={cur}
                      className="flex items-baseline justify-between gap-4 text-lg font-semibold tabular-nums text-zinc-900 dark:text-zinc-50"
                    >
                      <span className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
                        {cur}
                      </span>
                      <span>{formatCents(cents, cur)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </>
        )}
      </AdminCard>
    </div>
  );
}
