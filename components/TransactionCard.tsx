'use client';

import React from 'react';
import { Transaction } from '@/types/database';
import { IconRenderer } from './IconRenderer';
import { CloudOff, Trash2, Pencil } from 'lucide-react';

interface TransactionCardProps {
  transaction: Transaction;
  currentUserId?: string;
  canEdit?: boolean;
  onEdit?: (transaction: Transaction) => void;
  onDelete?: (id: string) => void;
}

export function TransactionCard({ transaction, currentUserId, canEdit, onEdit, onDelete }: TransactionCardProps) {
  const isIncome = transaction.type === 'income';
  const category = transaction.categories;
  const creatorName = transaction.profiles?.name || 'Anggota';
  const isLocalPending = transaction.syncStatus === 'pending_insert';

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return new Intl.DateTimeFormat('id-ID', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      }).format(d);
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="group relative p-4 bg-white dark:bg-[#1a1919] rounded-2xl border border-[#100f0f]/10 dark:border-white/10 shadow-xs hover:border-[#100f0f]/30 dark:hover:border-white/25 transition-all flex items-center justify-between gap-3">
      {/* Category Icon & Details */}
      <div className="flex items-center gap-3.5 min-w-0">
        <div
          className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 shadow-xs"
          style={{
            backgroundColor: category?.color || (isIncome ? '#10b981' : '#f97316'),
            color: '#ffffff',
          }}
        >
          <IconRenderer name={category?.icon} size={20} />
        </div>

        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-black text-[#100f0f] dark:text-[#fffdf6] truncate">
              {category?.name || 'Tanpa Kategori'}
            </span>
            {isLocalPending && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-bold bg-[#faf9b6] dark:bg-[#282717] text-[#100f0f] dark:text-[#e4e24e] rounded-md border border-[#100f0f]/20 dark:border-[#e4e24e]/30">
                <CloudOff size={10} />
                <span>Lokal</span>
              </span>
            )}
          </div>

          {transaction.description && (
            <p className="text-xs text-[#64635c] dark:text-[#8e8d85] truncate mt-0.5 font-medium">
              {transaction.description}
            </p>
          )}

          <div className="flex items-center gap-2 mt-1 text-[11px] text-[#64635c] dark:text-[#8e8d85]">
            <span>{formatDate(transaction.transaction_date)}</span>
            <span>•</span>
            <span className="font-semibold text-[#100f0f]/80 dark:text-[#fffdf6]/80">Oleh: {creatorName}</span>
          </div>
        </div>
      </div>

      {/* Amount and Actions */}
      <div className="flex items-center gap-2 shrink-0">
        <div className="text-right">
          <span
            className={`text-sm sm:text-base font-black tracking-tight ${
              isIncome ? 'text-emerald-600 dark:text-emerald-400' : 'text-[#100f0f] dark:text-[#fffdf6]'
            }`}
          >
            {isIncome ? '+' : '-'} {formatCurrency(transaction.amount)}
          </span>
          <span className="block text-[10px] font-semibold uppercase tracking-wider text-[#64635c] dark:text-[#8e8d85]">
            {isIncome ? 'Pemasukan' : 'Pengeluaran'}
          </span>
        </div>

        {onEdit && (canEdit ?? (currentUserId === transaction.created_by)) && (
          <button
            onClick={() => onEdit(transaction)}
            className="p-1.5 text-[#64635c] hover:text-[#100f0f] dark:text-[#8e8d85] dark:hover:text-[#fffdf6] rounded-lg hover:bg-black/5 dark:hover:bg-white/10 transition-colors opacity-70 group-hover:opacity-100"
            title="Edit Transaksi"
          >
            <Pencil size={15} />
          </button>
        )}

        {onDelete && (canEdit ?? (currentUserId === transaction.created_by)) && (
          <button
            onClick={() => {
              if (confirm('Hapus transaksi ini?')) {
                onDelete(transaction.id);
              }
            }}
            className="p-1.5 text-[#64635c] hover:text-red-600 dark:text-[#8e8d85] dark:hover:text-red-400 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors opacity-70 group-hover:opacity-100"
            title="Hapus Transaksi"
          >
            <Trash2 size={16} />
          </button>
        )}
      </div>
    </div>
  );
}
