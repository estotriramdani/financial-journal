'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { Group, Profile, Transaction } from '@/types/database';
import { IconRenderer } from './IconRenderer';
import { TransactionCard } from './TransactionCard';
import { X, Clock, ArrowDownWideNarrow } from 'lucide-react';

export interface CategoryBreakdownItem {
  key: string;
  name: string;
  icon?: string | null;
  color?: string | null;
  total: number;
  percentage: number;
  transactions: Transaction[];
}

interface CategoryDetailModalProps {
  category: CategoryBreakdownItem | null;
  type: 'expense' | 'income';
  timeframeLabel: string;
  currentUser: Profile | null;
  currentGroup: Group | null;
  isEditModalOpen?: boolean;
  onClose: () => void;
  onEditTransaction?: (transaction: Transaction) => void;
  onDeleteTransaction?: (id: string) => void;
}

type SortOption = 'latest' | 'largest';

export function CategoryDetailModal({
  category,
  type,
  timeframeLabel,
  currentUser,
  currentGroup,
  isEditModalOpen = false,
  onClose,
  onEditTransaction,
  onDeleteTransaction,
}: CategoryDetailModalProps) {
  const [sortState, setSortState] = useState<{ key: string | null; order: SortOption }>({
    key: null,
    order: 'latest',
  });

  const categoryKey = category?.key ?? null;
  const sortBy: SortOption = sortState.key === categoryKey ? sortState.order : 'latest';
  const handleSortChange = (order: SortOption) => {
    setSortState({ key: categoryKey, order });
  };

  // Lock body scroll while modal is open
  useEffect(() => {
    if (!category) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [category]);

  // Close on Escape only when no higher-priority modal/dialog is open
  useEffect(() => {
    if (!category) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.key === 'Escape' &&
        !isEditModalOpen &&
        !document.getElementById('finjrnl-dialog-title')
      ) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [category, isEditModalOpen, onClose]);

  const sortedTransactions = useMemo(() => {
    if (!category) return [];
    return [...category.transactions].sort((a, b) => {
      if (sortBy === 'largest') {
        const diff = Number(b.amount) - Number(a.amount);
        if (diff !== 0) return diff;
      }
      const dateDiff =
        new Date(b.transaction_date).getTime() - new Date(a.transaction_date).getTime();
      if (dateDiff !== 0) return dateDiff;
      return (b.created_at || '').localeCompare(a.created_at || '');
    });
  }, [category, sortBy]);

  if (!category) return null;

  const isIncome = type === 'income';
  const typeLabel = isIncome ? 'Pemasukan' : 'Pengeluaran';

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0,
    }).format(val);
  };

  return (
    <div
      className="fixed inset-0 z-[35] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="category-detail-modal-title"
    >
      <div
        className="w-full max-w-lg bg-[#fffdf6] dark:bg-[#171616] rounded-t-3xl sm:rounded-3xl border border-[#100f0f]/15 dark:border-white/15 overflow-hidden max-h-[88vh] sm:max-h-[85vh] flex flex-col page-transition"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Mobile Drawer Handle */}
        <div className="sm:hidden flex justify-center pt-2.5 pb-1">
          <div className="w-10 h-1 rounded-full bg-[#100f0f]/20 dark:bg-white/20" />
        </div>

        {/* Sticky Header */}
        <div className="px-5 sm:px-6 pt-3 sm:pt-5 pb-4 border-b border-[#100f0f]/10 dark:border-white/10 space-y-3.5 shrink-0">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div
                className="w-11 h-11 rounded-2xl flex items-center justify-center text-white shrink-0"
                style={{ backgroundColor: category.color || '#64635c' }}
              >
                <IconRenderer name={category.icon} size={20} />
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-[10px] font-bold tracking-wider uppercase px-2 py-0.5 rounded-full bg-[#100f0f]/10 dark:bg-white/10 text-[#100f0f] dark:text-[#fffdf6]">
                    {typeLabel}
                  </span>
                  <span className="text-[11px] font-semibold text-[#64635c] dark:text-[#8e8d85]">
                    {timeframeLabel}
                  </span>
                </div>
                <h3
                  id="category-detail-modal-title"
                  className="text-lg sm:text-xl font-black text-[#100f0f] dark:text-[#fffdf6] truncate mt-0.5"
                >
                  {category.name}
                </h3>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/10 text-[#100f0f] dark:text-[#fffdf6] active-press shrink-0"
              aria-label="Tutup rincian kategori"
            >
              <X size={20} />
            </button>
          </div>

          {/* Summary Highlight Bar */}
          <div className="p-3.5 rounded-2xl bg-[#faf9b6] dark:bg-[#282717] border border-[#100f0f]/15 dark:border-[#e4e24e]/25 flex items-center justify-between gap-3">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#100f0f]/75 dark:text-[#e4e24e]/85 block">
                Total {typeLabel}
              </span>
              <span className="text-lg sm:text-xl font-black tracking-tight text-[#100f0f] dark:text-[#e4e24e] font-mono">
                {formatCurrency(category.total)}
              </span>
            </div>
            <div className="text-right">
              <span className="inline-block text-xs font-black px-2.5 py-0.5 rounded-full bg-[#100f0f] dark:bg-[#e4e24e] text-[#fffdf6] dark:text-[#100f0f] font-mono">
                {category.percentage.toFixed(1)}%
              </span>
              <span className="block text-[11px] font-semibold text-[#100f0f]/75 dark:text-[#fffdf6]/80 mt-1">
                {category.transactions.length} transaksi
              </span>
            </div>
          </div>

          {/* Sort Toolbar */}
          {category.transactions.length > 1 && (
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#64635c] dark:text-[#8e8d85]">
                Urutkan
              </span>
              <div className="flex p-0.5 bg-[#100f0f]/5 dark:bg-white/5 rounded-full border border-[#100f0f]/10 dark:border-white/10">
                <button
                  type="button"
                  onClick={() => handleSortChange('latest')}
                  className={`inline-flex items-center gap-1 px-3 py-1 text-[11px] font-bold rounded-full transition-all ${
                    sortBy === 'latest'
                      ? 'bg-[#100f0f] dark:bg-[#e4e24e] text-[#fffdf6] dark:text-[#100f0f]'
                      : 'text-[#64635c] dark:text-[#8e8d85] hover:text-[#100f0f] dark:hover:text-[#fffdf6]'
                  }`}
                >
                  <Clock size={12} />
                  <span>Terbaru</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleSortChange('largest')}
                  className={`inline-flex items-center gap-1 px-3 py-1 text-[11px] font-bold rounded-full transition-all ${
                    sortBy === 'largest'
                      ? 'bg-[#100f0f] dark:bg-[#e4e24e] text-[#fffdf6] dark:text-[#100f0f]'
                      : 'text-[#64635c] dark:text-[#8e8d85] hover:text-[#100f0f] dark:hover:text-[#fffdf6]'
                  }`}
                >
                  <ArrowDownWideNarrow size={12} />
                  <span>Terbesar</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Scrollable Transactions List */}
        <div className="flex-1 overflow-y-auto px-5 sm:px-6 py-4 space-y-2.5">
          {sortedTransactions.length === 0 ? (
            <div className="py-10 text-center space-y-1.5">
              <p className="text-sm font-black text-[#100f0f] dark:text-[#fffdf6]">
                Tidak ada transaksi di kategori ini
              </p>
              <p className="text-xs text-[#64635c] dark:text-[#8e8d85]">
                Transaksi pada kategori ini telah dipindahkan atau dihapus untuk periode {timeframeLabel}.
              </p>
            </div>
          ) : (
            sortedTransactions.map((tx) => {
              const canEdit = Boolean(
                currentUser &&
                  (currentUser.id === tx.created_by ||
                    currentUser.role === 'admin' ||
                    currentGroup?.role === 'owner' ||
                    currentGroup?.role === 'admin')
              );

              return (
                <TransactionCard
                  key={tx.id}
                  transaction={tx}
                  currentUserId={currentUser?.id}
                  canEdit={canEdit}
                  onEdit={onEditTransaction}
                  onDelete={onDeleteTransaction}
                />
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="px-5 sm:px-6 py-3.5 border-t border-[#100f0f]/10 dark:border-white/10 shrink-0 pb-safe">
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 rounded-full bg-[#100f0f] dark:bg-white/15 hover:bg-[#262525] dark:hover:bg-white/20 text-[#fffdf6] text-xs font-bold uppercase tracking-wider active-press transition-colors"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
}
