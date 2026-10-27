'use client';

import React, { useState, useMemo } from 'react';
import { Group, Transaction } from '@/types/database';
import { IconRenderer } from './IconRenderer';
import { TrendingUp, TrendingDown, Wallet, PieChart, ChevronLeft, ChevronRight, Calendar } from 'lucide-react';

interface ReportsViewProps {
  currentGroup: Group | null;
  transactions: Transaction[];
}

type TimeframeOption = 'this_month' | 'last_month' | 'custom_month' | 'last_30_days' | 'all';

export function ReportsView({ currentGroup, transactions }: ReportsViewProps) {
  const [timeframe, setTimeframe] = useState<TimeframeOption>('this_month');
  const [breakdownType, setBreakdownType] = useState<'expense' | 'income'>('expense');

  // Year-Month state in YYYY-MM format (e.g. 2026-10)
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  const formatMonthDisplay = (yearMonth: string) => {
    try {
      const [y, m] = yearMonth.split('-').map(Number);
      const d = new Date(y, m - 1, 1);
      return new Intl.DateTimeFormat('id-ID', { month: 'long', year: 'numeric' }).format(d);
    } catch {
      return yearMonth;
    }
  };

  const handlePrevMonth = () => {
    const [y, m] = selectedMonth.split('-').map(Number);
    const prevDate = new Date(y, m - 2, 1);
    const nextVal = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`;
    setSelectedMonth(nextVal);
    setTimeframe('custom_month');
  };

  const handleNextMonth = () => {
    const [y, m] = selectedMonth.split('-').map(Number);
    const nextDate = new Date(y, m, 1);
    const nextVal = `${nextDate.getFullYear()}-${String(nextDate.getMonth() + 1).padStart(2, '0')}`;
    setSelectedMonth(nextVal);
    setTimeframe('custom_month');
  };

  // Filter transactions by timeframe
  const filteredTransactions = useMemo(() => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    return transactions.filter((t) => {
      if (timeframe === 'all') return true;
      const tDate = new Date(t.transaction_date);

      if (timeframe === 'this_month') {
        return tDate.getFullYear() === currentYear && tDate.getMonth() === currentMonth;
      }

      if (timeframe === 'last_month') {
        const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1;
        const lastMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear;
        return tDate.getFullYear() === lastMonthYear && tDate.getMonth() === lastMonth;
      }

      if (timeframe === 'custom_month') {
        const [y, m] = selectedMonth.split('-').map(Number);
        return tDate.getFullYear() === y && tDate.getMonth() === (m - 1);
      }

      if (timeframe === 'last_30_days') {
        const diffMs = now.getTime() - tDate.getTime();
        return diffMs >= 0 && diffMs <= 30 * 24 * 60 * 60 * 1000;
      }

      return true;
    });
  }, [transactions, timeframe, selectedMonth]);

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
      {/* Header & Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <span className="text-[11px] font-semibold text-[#64635c] dark:text-[#8e8d85] uppercase tracking-wider">
            Laporan Keuangan: {currentGroup?.name || 'Grup Aktif'}
          </span>
          <h2 className="text-2xl font-black text-[#100f0f] dark:text-[#fffdf6]">Statistik & Analisis</h2>
        </div>

        {/* Timeframe Chips */}
        <div className="flex flex-wrap gap-1.5 p-1 bg-white dark:bg-[#1a1919] rounded-2xl border border-[#100f0f]/15 dark:border-white/10 self-start">
          {[
            { id: 'this_month', label: 'Bulan Ini' },
            { id: 'last_month', label: 'Bulan Lalu' },
            { id: 'custom_month', label: 'Pilih Bulan' },
            { id: 'last_30_days', label: '30 Hari' },
            { id: 'all', label: 'Semua' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                if (tab.id === 'this_month') {
                  const now = new Date();
                  setSelectedMonth(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`);
                } else if (tab.id === 'last_month') {
                  const now = new Date();
                  const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
                  setSelectedMonth(`${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, '0')}`);
                }
                setTimeframe(tab.id as TimeframeOption);
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all active-press ${
                timeframe === tab.id
                  ? 'bg-[#100f0f] dark:bg-white/20 text-[#fffdf6]'
                  : 'text-[#64635c] dark:text-[#8e8d85] hover:text-[#100f0f] dark:hover:text-[#fffdf6]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Month Navigator & Selector Bar */}
      {(timeframe === 'this_month' || timeframe === 'last_month' || timeframe === 'custom_month') && (
        <div className="p-3 bg-white dark:bg-[#1a1919] rounded-2xl border border-[#100f0f]/15 dark:border-white/10 flex items-center justify-between gap-3 shadow-2xs page-transition">
          <button
            type="button"
            onClick={handlePrevMonth}
            className="p-2 rounded-xl bg-[#100f0f]/5 hover:bg-[#100f0f]/10 dark:bg-white/10 dark:hover:bg-white/15 text-[#100f0f] dark:text-[#fffdf6] active-press transition-colors"
            title="Bulan Sebelumnya"
          >
            <ChevronLeft size={16} />
          </button>

          <div className="relative flex items-center justify-center gap-2 px-3 py-1.5 rounded-xl bg-[#fffdf6] dark:bg-[#100f0f] border border-[#100f0f]/10 dark:border-white/10 hover:border-[#100f0f]/30 dark:hover:border-white/30 transition-all cursor-pointer">
            <Calendar size={15} className="text-[#100f0f] dark:text-[#e4e24e]" />
            <span className="text-xs sm:text-sm font-black text-[#100f0f] dark:text-[#fffdf6]">
              {formatMonthDisplay(selectedMonth)}
            </span>
            <span className="text-[10px] font-semibold text-[#64635c] dark:text-[#8e8d85] underline">
              (Ganti)
            </span>
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => {
                if (e.target.value) {
                  setSelectedMonth(e.target.value);
                  setTimeframe('custom_month');
                }
              }}
              className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
              title="Pilih Bulan & Tahun"
            />
          </div>

          <button
            type="button"
            onClick={handleNextMonth}
            className="p-2 rounded-xl bg-[#100f0f]/5 hover:bg-[#100f0f]/10 dark:bg-white/10 dark:hover:bg-white/15 text-[#100f0f] dark:text-[#fffdf6] active-press transition-colors"
            title="Bulan Berikutnya"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      )}

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
                      className="w-6 h-6 rounded-lg flex items-center justify-center text-white"
                      style={{ backgroundColor: cat.color || '#100f0f' }}
                    >
                      <IconRenderer name={cat.icon} size={14} />
                    </div>
                    <span className="font-bold text-[#100f0f] dark:text-[#fffdf6]">{cat.name}</span>
                  </div>
                  <div className="text-right">
                    <span className="font-black text-[#100f0f] dark:text-[#fffdf6]">
                      {formatCurrency(cat.total)}
                    </span>
                    <span className="ml-2 text-[11px] font-semibold text-[#64635c] dark:text-[#8e8d85]">
                      ({cat.percentage.toFixed(1)}%)
                    </span>
                  </div>
                </div>

                {/* Visual Progress Bar */}
                <div className="h-2 w-full bg-[#100f0f]/5 dark:bg-white/10 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${cat.percentage}%`,
                      backgroundColor: cat.color || '#e4e24e',
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Member Contribution Breakdown */}
      {memberStats.length > 0 && (
        <div className="p-5 bg-white dark:bg-[#1a1919] rounded-3xl border border-[#100f0f]/15 dark:border-white/10 shadow-xs space-y-3">
          <h3 className="text-base font-black text-[#100f0f] dark:text-[#fffdf6]">
            Kontribusi Anggota Grup
          </h3>
          <p className="text-xs text-[#64635c] dark:text-[#8e8d85]">
            Aktivitas input transaksi oleh masing-masing kolaborator pada periode ini.
          </p>
          <div className="divide-y divide-[#100f0f]/10 dark:divide-white/10 pt-1">
            {memberStats.map((member, idx) => (
              <div key={idx} className="py-2.5 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-[#100f0f] dark:bg-[#e4e24e] text-[#e4e24e] dark:text-[#100f0f] font-bold text-xs flex items-center justify-center">
                    {member.name[0].toUpperCase()}
                  </div>
                  <div>
                    <span className="text-xs font-bold text-[#100f0f] dark:text-[#fffdf6] block">
                      {member.name}
                    </span>
                    <span className="text-[10px] text-[#64635c] dark:text-[#8e8d85]">
                      {member.count} transaksi
                    </span>
                  </div>
                </div>
                <div className="text-right text-xs">
                  <span className="block font-black text-rose-600 dark:text-rose-400">
                    -{formatCurrency(member.expense)}
                  </span>
                  {member.income > 0 && (
                    <span className="block font-semibold text-emerald-600 dark:text-emerald-400 text-[11px]">
                      +{formatCurrency(member.income)}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
