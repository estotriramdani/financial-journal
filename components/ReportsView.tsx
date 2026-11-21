'use client';

import React, { useState, useMemo } from 'react';
import { Group, Profile, Transaction } from '@/types/database';
import { IconRenderer } from './IconRenderer';
import { MonthFilterBar } from './MonthFilterBar';
import { CategoryDetailModal, CategoryBreakdownItem } from './CategoryDetailModal';
import { useDateFilter } from '@/context/DateFilterContext';
import { TrendingUp, TrendingDown, Wallet, PieChart, ChevronRight } from 'lucide-react';

interface ReportsViewProps {
  currentGroup: Group | null;
  currentUser: Profile | null;
  transactions: Transaction[];
  onEditTransaction?: (transaction: Transaction) => void;
  onDeleteTransaction?: (id: string) => void;
  isEditModalOpen?: boolean;
}

export function ReportsView({
  currentGroup,
  currentUser,
  transactions,
  onEditTransaction,
  onDeleteTransaction,
  isEditModalOpen = false,
}: ReportsViewProps) {
  const { filterTransactions, timeframeLabel } = useDateFilter();
  const [breakdownType, setBreakdownType] = useState<'expense' | 'income'>('expense');
  const [selectedCategoryMeta, setSelectedCategoryMeta] = useState<{
    key: string;
    name: string;
    icon?: string | null;
    color?: string | null;
  } | null>(null);

  const handleBreakdownTypeChange = (type: 'expense' | 'income') => {
    setBreakdownType(type);
    setSelectedCategoryMeta(null);
  };

  // Filter transactions by global timeframe
  const filteredTransactions = useMemo(() => {
    return filterTransactions(transactions);
  }, [transactions, filterTransactions]);

  // Aggregate totals
  const { totalIncome, totalExpense, netBalance } = useMemo(() => {
    let income = 0;
    let expense = 0;

    for (const t of filteredTransactions) {
      if (t.type === 'income') {
        income += Number(t.amount);
      } else {
        expense += Number(t.amount);
      }
    }

    return {
      totalIncome: income,
      totalExpense: expense,
      netBalance: income - expense,
    };
  }, [filteredTransactions]);

  // Category breakdown
  const categoryStats = useMemo<CategoryBreakdownItem[]>(() => {
    const targetTransactions = filteredTransactions.filter((t) => t.type === breakdownType);
    const totalForType = breakdownType === 'expense' ? totalExpense : totalIncome;

    const map = new Map<
      string,
      {
        key: string;
        name: string;
        icon?: string | null;
        color?: string | null;
        total: number;
        transactions: Transaction[];
      }
    >();

    for (const t of targetTransactions) {
      const catKey = t.category_id || 'unknown';
      const catName = t.categories?.name || 'Tanpa Kategori';
      const catIcon = t.categories?.icon;
      const catColor = t.categories?.color;

      const existing = map.get(catKey) || {
        key: catKey,
        name: catName,
        icon: catIcon,
        color: catColor,
        total: 0,
        transactions: [],
      };
      existing.total += Number(t.amount);
      existing.transactions.push(t);
      map.set(catKey, existing);
    }

    const items = Array.from(map.values()).sort((a, b) => b.total - a.total);

    return items.map((item) => ({
      ...item,
      percentage: totalForType > 0 ? (item.total / totalForType) * 100 : 0,
    }));
  }, [filteredTransactions, breakdownType, totalExpense, totalIncome]);

  const selectedCategory = useMemo<CategoryBreakdownItem | null>(() => {
    if (!selectedCategoryMeta) return null;
    const found = categoryStats.find((c) => c.key === selectedCategoryMeta.key);
    if (found) return found;
    return {
      key: selectedCategoryMeta.key,
      name: selectedCategoryMeta.name,
      icon: selectedCategoryMeta.icon,
      color: selectedCategoryMeta.color,
      total: 0,
      percentage: 0,
      transactions: [],
    };
  }, [categoryStats, selectedCategoryMeta]);

  const handleDeleteFromCategory = (id: string) => {
    if (selectedCategory && selectedCategory.transactions.length <= 1) {
      setSelectedCategoryMeta(null);
    }
    onDeleteTransaction?.(id);
  };

  // Member contributor breakdown
  const memberStats = useMemo(() => {
    const map = new Map<string, { name: string; income: number; expense: number; count: number }>();

    for (const t of filteredTransactions) {
      const userId = t.created_by;
      const userName = t.profiles?.name || t.profiles?.email || 'Anggota';
      const existing = map.get(userId) || { name: userName, income: 0, expense: 0, count: 0 };

      if (t.type === 'income') {
        existing.income += Number(t.amount);
      } else {
        existing.expense += Number(t.amount);
      }
      existing.count += 1;
      map.set(userId, existing);
    }

    return Array.from(map.values()).sort((a, b) => b.expense - a.expense);
  }, [filteredTransactions]);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0,
    }).format(val);
  };

  return (
    <div className="space-y-6 page-transition pb-20">
      {/* Header */}
      <div>
        <span className="text-[11px] font-semibold text-[#64635c] dark:text-[#8e8d85] uppercase tracking-wider">
          Laporan Keuangan: {currentGroup?.name || 'Grup Aktif'}
        </span>
        <div className="flex items-center justify-between gap-2 mt-0.5">
          <h2 className="text-2xl font-black text-[#100f0f] dark:text-[#fffdf6]">Statistik & Analisis</h2>
          <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-[#100f0f]/5 dark:bg-white/10 text-[#64635c] dark:text-[#8e8d85]">
            {timeframeLabel}
          </span>
        </div>
      </div>

      {/* Global Month Filter Bar */}
      <MonthFilterBar />

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Total Income */}
        <div className="p-4 bg-white dark:bg-[#1a1919] rounded-3xl border border-[#100f0f]/15 dark:border-white/10 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-[#64635c] dark:text-[#8e8d85] uppercase tracking-wider">
              Total Pemasukan
            </span>
            <div className="w-7 h-7 rounded-full bg-emerald-100 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-400 flex items-center justify-center">
              <TrendingUp size={16} />
            </div>
          </div>
          <p className="text-xl sm:text-2xl font-black text-emerald-700 dark:text-emerald-400">
            {formatCurrency(totalIncome)}
          </p>
        </div>

        {/* Total Expense */}
        <div className="p-4 bg-white dark:bg-[#1a1919] rounded-3xl border border-[#100f0f]/15 dark:border-white/10 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-[#64635c] dark:text-[#8e8d85] uppercase tracking-wider">
              Total Pengeluaran
            </span>
            <div className="w-7 h-7 rounded-full bg-rose-100 dark:bg-rose-950/50 text-rose-800 dark:text-rose-400 flex items-center justify-center">
              <TrendingDown size={16} />
            </div>
          </div>
          <p className="text-xl sm:text-2xl font-black text-[#100f0f] dark:text-[#fffdf6]">
            {formatCurrency(totalExpense)}
          </p>
        </div>

        {/* Net Cash Flow */}
        <div className="p-4 bg-[#faf9b6] dark:bg-[#282717] rounded-3xl border border-[#100f0f]/20 dark:border-[#e4e24e]/30 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-[#100f0f] dark:text-[#e4e24e] uppercase tracking-wider">
              Arus Kas Bersih (Saldo)
            </span>
            <div className="w-7 h-7 rounded-full bg-[#100f0f] dark:bg-[#e4e24e] text-[#e4e24e] dark:text-[#100f0f] flex items-center justify-center">
              <Wallet size={16} />
            </div>
          </div>
          <p
            className={`text-xl sm:text-2xl font-black ${
              netBalance >= 0 ? 'text-[#100f0f] dark:text-[#e4e24e]' : 'text-red-700 dark:text-red-400'
            }`}
          >
            {formatCurrency(netBalance)}
          </p>
        </div>
      </div>

      {/* Category Breakdown Section */}
      <div className="p-5 bg-white dark:bg-[#1a1919] rounded-3xl border border-[#100f0f]/15 dark:border-white/10 shadow-xs space-y-4">
        <div className="flex items-start sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-base font-black text-[#100f0f] dark:text-[#fffdf6] flex items-center gap-2">
              <PieChart size={18} />
              <span>Rincian Berdasarkan Kategori</span>
            </h3>
            {categoryStats.length > 0 && (
              <p className="text-[11px] text-[#64635c] dark:text-[#8e8d85] mt-0.5">
                Ketuk kategori untuk melihat rincian transaksi
              </p>
            )}
          </div>

          {/* Toggle Expense / Income Breakdown */}
          <div className="flex p-1 bg-[#100f0f]/5 dark:bg-white/5 rounded-xl border border-[#100f0f]/10 dark:border-white/10 shrink-0">
            <button
              type="button"
              onClick={() => handleBreakdownTypeChange('expense')}
              className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${
                breakdownType === 'expense'
                  ? 'bg-[#100f0f] dark:bg-white/20 text-[#fffdf6]'
                  : 'text-[#64635c] dark:text-[#8e8d85] hover:text-[#100f0f] dark:hover:text-[#fffdf6]'
              }`}
            >
              Pengeluaran
            </button>
            <button
              type="button"
              onClick={() => handleBreakdownTypeChange('income')}
              className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${
                breakdownType === 'income'
                  ? 'bg-[#100f0f] dark:bg-white/20 text-[#fffdf6]'
                  : 'text-[#64635c] dark:text-[#8e8d85] hover:text-[#100f0f] dark:hover:text-[#fffdf6]'
              }`}
            >
              Pemasukan
            </button>
          </div>
        </div>

        {categoryStats.length === 0 ? (
          <p className="text-xs text-[#64635c] dark:text-[#8e8d85] py-6 text-center">
            Tidak ada transaksi {breakdownType === 'expense' ? 'pengeluaran' : 'pemasukan'} pada periode ini.
          </p>
        ) : (
          <div className="space-y-1.5 pt-1">
            {categoryStats.map((cat) => (
              <button
                key={cat.key}
                type="button"
                data-category-row={cat.name}
                onClick={() =>
                  setSelectedCategoryMeta({
                    key: cat.key,
                    name: cat.name,
                    icon: cat.icon,
                    color: cat.color,
                  })
                }
                className="group text-left p-2.5 -mx-2.5 w-[calc(100%+1.25rem)] rounded-2xl hover:bg-[#fffdf6] dark:hover:bg-white/5 border border-transparent hover:border-[#100f0f]/10 dark:hover:border-white/10 transition-all active-press space-y-2 cursor-pointer"
              >
                <div className="flex items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      className="w-7 h-7 rounded-xl flex items-center justify-center text-white shrink-0"
                      style={{ backgroundColor: cat.color || '#64635c' }}
                    >
                      <IconRenderer name={cat.icon} size={14} />
                    </div>
                    <div className="min-w-0">
                      <span className="font-bold text-[#100f0f] dark:text-[#fffdf6] block truncate">
                        {cat.name}
                      </span>
                      <span className="text-[10px] font-medium text-[#64635c] dark:text-[#8e8d85]">
                        {cat.transactions.length} transaksi
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 font-mono shrink-0">
                    <div className="text-right">
                      <span className="font-bold text-[#100f0f] dark:text-[#fffdf6] block">
                        {formatCurrency(cat.total)}
                      </span>
                      <span className="text-[10px] text-[#64635c] dark:text-[#8e8d85] block">
                        {cat.percentage.toFixed(1)}%
                      </span>
                    </div>
                    <ChevronRight
                      size={16}
                      className="text-[#64635c] dark:text-[#8e8d85] group-hover:text-[#100f0f] dark:group-hover:text-[#e4e24e] group-hover:translate-x-0.5 transition-all"
                    />
                  </div>
                </div>

                {/* Progress bar */}
                <div className="w-full bg-[#100f0f]/5 dark:bg-white/5 h-2 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${Math.min(cat.percentage, 100)}%`,
                      backgroundColor: cat.color || '#100f0f',
                    }}
                  />
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Contributor Breakdown Section */}
      <div className="p-5 bg-white dark:bg-[#1a1919] rounded-3xl border border-[#100f0f]/15 dark:border-white/10 shadow-xs space-y-4">
        <h3 className="text-base font-black text-[#100f0f] dark:text-[#fffdf6]">
          Aktivitas Anggota
        </h3>

        {memberStats.length === 0 ? (
          <p className="text-xs text-[#64635c] dark:text-[#8e8d85] py-4 text-center">
            Belum ada aktivitas transaksi pada periode ini.
          </p>
        ) : (
          <div className="space-y-3">
            {memberStats.map((m, idx) => (
              <div
                key={idx}
                className="p-3 rounded-2xl bg-[#fffdf6] dark:bg-[#100f0f] border border-[#100f0f]/10 dark:border-white/10 flex items-center justify-between text-xs"
              >
                <div>
                  <span className="font-black text-[#100f0f] dark:text-[#fffdf6] block">{m.name}</span>
                  <span className="text-[10px] text-[#64635c] dark:text-[#8e8d85]">
                    {m.count} transaksi
                  </span>
                </div>
                <div className="text-right space-y-0.5">
                  <div className="font-mono text-emerald-700 dark:text-emerald-400 font-bold">
                    +{formatCurrency(m.income)}
                  </div>
                  <div className="font-mono text-[#100f0f] dark:text-[#fffdf6] font-bold">
                    -{formatCurrency(m.expense)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      {/* Category Detail Modal / Drawer */}
      <CategoryDetailModal
        category={selectedCategory}
        type={breakdownType}
        timeframeLabel={timeframeLabel}
        currentUser={currentUser}
        currentGroup={currentGroup}
        isEditModalOpen={isEditModalOpen}
        onClose={() => setSelectedCategoryMeta(null)}
        onEditTransaction={onEditTransaction}
        onDeleteTransaction={onDeleteTransaction ? handleDeleteFromCategory : undefined}
      />
    </div>
  );
}
