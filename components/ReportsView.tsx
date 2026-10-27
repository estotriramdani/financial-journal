'use client';

import React, { useState, useMemo } from 'react';
import { Group, Transaction } from '@/types/database';
import { IconRenderer } from './IconRenderer';
import { MonthFilterBar } from './MonthFilterBar';
import { useDateFilter } from '@/context/DateFilterContext';
import { TrendingUp, TrendingDown, Wallet, PieChart } from 'lucide-react';

interface ReportsViewProps {
  currentGroup: Group | null;
  transactions: Transaction[];
}

export function ReportsView({ currentGroup, transactions }: ReportsViewProps) {
  const { filterTransactions, timeframeLabel } = useDateFilter();
  const [breakdownType, setBreakdownType] = useState<'expense' | 'income'>('expense');

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
  const categoryStats = useMemo(() => {
    const targetTransactions = filteredTransactions.filter((t) => t.type === breakdownType);
    const totalForType = breakdownType === 'expense' ? totalExpense : totalIncome;

    const map = new Map<string, { name: string; icon?: string | null; color?: string | null; total: number }>();

    for (const t of targetTransactions) {
      const catKey = t.category_id || 'unknown';
      const catName = t.categories?.name || 'Tanpa Kategori';
      const catIcon = t.categories?.icon;
      const catColor = t.categories?.color;

      const existing = map.get(catKey) || {
        name: catName,
        icon: catIcon,
        color: catColor,
        total: 0,
      };
      existing.total += Number(t.amount);
      map.set(catKey, existing);
    }

    const items = Array.from(map.values()).sort((a, b) => b.total - a.total);

    return items.map((item) => ({
      ...item,
      percentage: totalForType > 0 ? (item.total / totalForType) * 100 : 0,
    }));
  }, [filteredTransactions, breakdownType, totalExpense, totalIncome]);

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
        <div className="flex items-center justify-between">
          <h3 className="text-base font-black text-[#100f0f] dark:text-[#fffdf6] flex items-center gap-2">
            <PieChart size={18} />
            <span>Rincian Berdasarkan Kategori</span>
          </h3>

          {/* Toggle Expense / Income Breakdown */}
          <div className="flex p-1 bg-[#100f0f]/5 dark:bg-white/5 rounded-xl border border-[#100f0f]/10 dark:border-white/10">
            <button
              onClick={() => setBreakdownType('expense')}
              className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${
                breakdownType === 'expense'
                  ? 'bg-[#100f0f] dark:bg-white/20 text-[#fffdf6]'
                  : 'text-[#64635c] dark:text-[#8e8d85] hover:text-[#100f0f] dark:hover:text-[#fffdf6]'
              }`}
            >
              Pengeluaran
            </button>
            <button
              onClick={() => setBreakdownType('income')}
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
          <div className="space-y-3.5 pt-2">
            {categoryStats.map((cat, idx) => (
              <div key={idx} className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-5 h-5 rounded-md flex items-center justify-center text-white"
                      style={{ backgroundColor: cat.color || '#64635c' }}
                    >
                      <IconRenderer name={cat.icon} size={12} />
                    </div>
                    <span className="font-bold text-[#100f0f] dark:text-[#fffdf6]">{cat.name}</span>
                  </div>
                  <div className="flex items-center gap-2 font-mono">
                    <span className="font-bold text-[#100f0f] dark:text-[#fffdf6]">
                      {formatCurrency(cat.total)}
                    </span>
                    <span className="text-[11px] text-[#64635c] dark:text-[#8e8d85] w-12 text-right">
                      {cat.percentage.toFixed(1)}%
                    </span>
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
              </div>
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
    </div>
  );
}
