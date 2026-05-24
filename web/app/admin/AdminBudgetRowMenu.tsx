'use client';

import { MoreVertical, Pencil, Trash2 } from 'lucide-react';
import { useEffect, useId, useRef, useState } from 'react';

import { adminBtnGhostClass } from './admin-ui';

type Props = {
  isDeleting: boolean;
  onEdit: () => void;
  onDelete: () => void;
};

export function AdminBudgetRowMenu({ isDeleting, onEdit, onDelete }: Props) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (rootRef.current?.contains(event.target as Node)) return;
      setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  const menuItemClass =
    'flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm text-zinc-700 transition-colors hover:bg-zinc-100 disabled:pointer-events-none disabled:opacity-50 dark:text-zinc-200 dark:hover:bg-zinc-800';

  const deleteMenuItemClass =
    'flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm font-medium text-red-600 transition-colors hover:bg-red-50 disabled:pointer-events-none disabled:opacity-50 dark:text-red-400 dark:hover:bg-red-950/40';

  return (
    <div className="relative shrink-0" ref={rootRef}>
      <button
        type="button"
        aria-label="Expense actions"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        onClick={() => setOpen((value) => !value)}
        className={`${adminBtnGhostClass} px-2 opacity-70 group-hover:opacity-100`}
      >
        <MoreVertical className="h-4 w-4" strokeWidth={2} aria-hidden />
      </button>
      {open ? (
        <div
          id={menuId}
          role="menu"
          className="absolute right-0 top-full z-20 mt-1 min-w-44 rounded-lg border border-zinc-200 bg-white py-1 shadow-lg shadow-zinc-950/10 dark:border-zinc-600 dark:bg-zinc-900 dark:shadow-black/40"
        >
          <button
            type="button"
            role="menuitem"
            className={menuItemClass}
            onClick={() => {
              onEdit();
              setOpen(false);
            }}
          >
            <Pencil className="h-4 w-4 shrink-0" strokeWidth={2} aria-hidden />
            Edit
          </button>
          <button
            type="button"
            role="menuitem"
            disabled={isDeleting}
            className={deleteMenuItemClass}
            onClick={() => {
              onDelete();
              setOpen(false);
            }}
          >
            <Trash2
              className="h-4 w-4 shrink-0 text-red-600 dark:text-red-400"
              strokeWidth={2}
              aria-hidden
            />
            {isDeleting ? 'Deleting…' : 'Delete'}
          </button>
        </div>
      ) : null}
    </div>
  );
}
