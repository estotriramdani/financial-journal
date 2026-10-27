'use client';

import React from 'react';
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';
import { useDateFilter, TimeframeOption } from '@/context/DateFilterContext';

interface MonthFilterBarProps {
  className?: string;
}

export function MonthFilterBar({ className = '' }: MonthFilterBarProps) {
  const {
    timeframe,
    selectedMonth,
    setSelectedMonth,
    setTimeframe,
    selectTimeframeOption,
    handlePrevMonth,
    handleNextMonth,
    formatMonthDisplay,
  } = useDateFilter();

  const isMonthNavVisible =
    timeframe === 'this_month' || timeframe === 'last_month' || timeframe === 'custom_month';

  return (
    <div className={`space-y-2.5 ${className}`}>
      {/* Timeframe Chips */}
      <div className="flex items-center justify-between gap-2 overflow-x-auto no-scrollbar py-0.5">
        <div className="flex flex-wrap gap-1.5 p-1 bg-white dark:bg-[#1a1919] rounded-2xl border border-[#100f0f]/15 dark:border-white/10 shadow-2xs">
          {[
            { id: 'this_month', label: 'Bulan Ini' },
            { id: 'last_month', label: 'Bulan Lalu' },
            { id: 'custom_month', label: 'Pilih Bulan' },
            { id: 'last_30_days', label: '30 Hari' },
            { id: 'all', label: 'Semua' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => selectTimeframeOption(tab.id as TimeframeOption)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all active-press shrink-0 ${
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
      {isMonthNavVisible && (
        <div className="p-2.5 sm:p-3 bg-white dark:bg-[#1a1919] rounded-2xl border border-[#100f0f]/15 dark:border-white/10 flex items-center justify-between gap-3 shadow-2xs page-transition">
          <button
            type="button"
            onClick={handlePrevMonth}
            className="p-2 rounded-xl bg-[#100f0f]/5 hover:bg-[#100f0f]/10 dark:bg-white/10 dark:hover:bg-white/15 text-[#100f0f] dark:text-[#fffdf6] active-press transition-colors"
            title="Bulan Sebelumnya"
            aria-label="Bulan Sebelumnya"
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
            aria-label="Bulan Berikutnya"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      )}
    </div>
  );
}
