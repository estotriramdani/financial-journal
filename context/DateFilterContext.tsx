'use client';

import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { Transaction } from '@/types/database';

export type TimeframeOption = 'this_month' | 'last_month' | 'custom_month' | 'last_30_days' | 'all';

interface DateFilterContextType {
  timeframe: TimeframeOption;
  selectedMonth: string; // YYYY-MM
  timeframeLabel: string;
  setTimeframe: (tf: TimeframeOption) => void;
  setSelectedMonth: (val: string) => void;
  selectTimeframeOption: (tf: TimeframeOption) => void;
  handlePrevMonth: () => void;
  handleNextMonth: () => void;
  formatMonthDisplay: (yearMonth: string) => string;
  filterTransactions: (transactions: Transaction[]) => Transaction[];
}

const DateFilterContext = createContext<DateFilterContextType | undefined>(undefined);

export function DateFilterProvider({ children }: { children: React.ReactNode }) {
  const [timeframe, setTimeframe] = useState<TimeframeOption>('this_month');

  const [selectedMonth, setSelectedMonth] = useState<string>('');

  useEffect(() => {
    const now = new Date();
    setSelectedMonth(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`);
  }, []);

  const formatMonthDisplay = useCallback((yearMonth: string) => {
    if (!yearMonth) return 'Bulan Ini';
    try {
      const [y, m] = yearMonth.split('-').map(Number);
      if (!y || !m) return yearMonth;
      const d = new Date(y, m - 1, 1);
      return new Intl.DateTimeFormat('id-ID', { month: 'long', year: 'numeric' }).format(d);
    } catch {
      return yearMonth;
    }
  }, []);

  const selectTimeframeOption = useCallback((tf: TimeframeOption) => {
    if (tf === 'this_month') {
      const now = new Date();
      setSelectedMonth(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`);
    } else if (tf === 'last_month') {
      const now = new Date();
      const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      setSelectedMonth(`${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, '0')}`);
    }
    setTimeframe(tf);
  }, []);

  const handlePrevMonth = useCallback(() => {
    const [y, m] = selectedMonth.split('-').map(Number);
    const prevDate = new Date(y, m - 2, 1);
    const nextVal = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`;
    setSelectedMonth(nextVal);
    setTimeframe('custom_month');
  }, [selectedMonth]);

  const handleNextMonth = useCallback(() => {
    const [y, m] = selectedMonth.split('-').map(Number);
    const nextDate = new Date(y, m, 1);
    const nextVal = `${nextDate.getFullYear()}-${String(nextDate.getMonth() + 1).padStart(2, '0')}`;
    setSelectedMonth(nextVal);
    setTimeframe('custom_month');
  }, [selectedMonth]);

  const timeframeLabel = useMemo(() => {
    if (timeframe === 'all') return 'Semua Waktu';
    if (timeframe === 'last_30_days') return '30 Hari Terakhir';
    return formatMonthDisplay(selectedMonth);
  }, [timeframe, selectedMonth, formatMonthDisplay]);

  const filterTransactions = useCallback(
    (transactions: Transaction[]) => {
      if (transactions.length === 0 || timeframe === 'all') return transactions;
      const now = new Date();
      const currentYear = now.getFullYear();
      const currentMonth = now.getMonth();

      return transactions.filter((t) => {
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
          return tDate.getFullYear() === y && tDate.getMonth() === m - 1;
        }

        if (timeframe === 'last_30_days') {
          const diffMs = now.getTime() - tDate.getTime();
          return diffMs >= 0 && diffMs <= 30 * 24 * 60 * 60 * 1000;
        }

        return true;
      });
    },
    [timeframe, selectedMonth]
  );

  return (
    <DateFilterContext.Provider
      value={{
        timeframe,
        selectedMonth,
        timeframeLabel,
        setTimeframe,
        setSelectedMonth,
        selectTimeframeOption,
        handlePrevMonth,
        handleNextMonth,
        formatMonthDisplay,
        filterTransactions,
      }}
    >
      {children}
    </DateFilterContext.Provider>
  );
}

export function useDateFilter() {
  const context = useContext(DateFilterContext);
  if (!context) {
    throw new Error('useDateFilter must be used within a DateFilterProvider');
  }
  return context;
}
