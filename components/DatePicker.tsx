'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { DayPicker } from 'react-day-picker';
import { format, parseISO, isValid, subDays } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, X } from 'lucide-react';

interface DatePickerProps {
  value: string; // YYYY-MM-DD
  onChange: (dateStr: string) => void;
  placeholder?: string;
}

export function DatePicker({
  value,
  onChange,
  placeholder = 'Pilih tanggal',
}: DatePickerProps) {
  const [isOpen, setIsOpen] = useState(false);

  const selectedDate = useMemo(() => {
    if (!value) return undefined;
    const parsed = parseISO(value);
    return isValid(parsed) ? parsed : undefined;
  }, [value]);

  const [month, setMonth] = useState<Date | undefined>(selectedDate);

  useEffect(() => {
    if (selectedDate) {
      setMonth(selectedDate);
    }
  }, [selectedDate]);

  const handleSelectDate = (date: Date | undefined) => {
    if (!date) return;
    onChange(format(date, 'yyyy-MM-dd'));
    setIsOpen(false);
  };

  const handleQuickSelect = (offsetDays: number) => {
    const target = offsetDays === 0 ? new Date() : subDays(new Date(), offsetDays);
    setMonth(target);
    onChange(format(target, 'yyyy-MM-dd'));
    setIsOpen(false);
  };

  const displayLabel = useMemo(() => {
    if (!selectedDate) return placeholder;
    return format(selectedDate, 'd MMM yyyy', { locale: localeId });
  }, [selectedDate, placeholder]);

  return (
    <div className="relative">
      {/* Trigger Button (shadcn-style) */}
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="w-full px-3.5 py-2.5 bg-white dark:bg-[#1f1e1e] hover:bg-[#100f0f]/[0.02] dark:hover:bg-white/[0.04] border border-[#100f0f]/15 dark:border-white/10 focus:border-[#100f0f] dark:focus:border-[#e4e24e] rounded-2xl text-xs font-bold text-[#100f0f] dark:text-[#fffdf6] flex items-center justify-between gap-2 transition-all active-press text-left"
      >
        <span className="flex items-center gap-2 truncate">
          <CalendarIcon size={15} className="text-[#64635c] dark:text-[#e4e24e] shrink-0" />
          <span className={selectedDate ? 'text-[#100f0f] dark:text-[#fffdf6]' : 'text-[#64635c] dark:text-[#8e8d85]'}>
            {displayLabel}
          </span>
        </span>
        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#100f0f]/5 dark:bg-white/10 text-[#64635c] dark:text-[#8e8d85] shrink-0">
          Ubah
        </span>
      </button>

      {/* Calendar Popover / Dialog Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs"
          onClick={() => setIsOpen(false)}
        >
          <div
            className="w-full max-w-[330px] bg-[#fffdf6] dark:bg-[#171616] border border-[#100f0f]/15 dark:border-white/15 rounded-3xl p-4 space-y-3 page-transition"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Top Header & Quick Presets */}
            <div className="flex items-center justify-between pb-2.5 border-b border-[#100f0f]/10 dark:border-white/10">
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => handleQuickSelect(0)}
                  className="px-3 py-1 rounded-full bg-[#e4e24e] text-[#100f0f] text-[11px] font-black tracking-wide active-press transition-colors"
                >
                  Hari Ini
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickSelect(1)}
                  className="px-3 py-1 rounded-full bg-[#100f0f]/5 hover:bg-[#100f0f]/10 dark:bg-white/10 dark:hover:bg-white/15 text-[#100f0f] dark:text-[#fffdf6] text-[11px] font-bold active-press transition-colors"
                >
                  Kemarin
                </button>
              </div>

              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-full text-[#64635c] hover:text-[#100f0f] dark:text-[#8e8d85] dark:hover:text-[#fffdf6] hover:bg-black/5 dark:hover:bg-white/10 active-press"
                aria-label="Tutup kalender"
              >
                <X size={16} />
              </button>
            </div>

            {/* DayPicker Calendar */}
            <DayPicker
              mode="single"
              locale={localeId}
              selected={selectedDate}
              onSelect={handleSelectDate}
              month={month}
              onMonthChange={setMonth}
              showOutsideDays
              classNames={{
                root: 'w-full select-none',
                months: 'flex flex-col',
                month: 'space-y-3',
                month_caption: 'flex items-center justify-between px-1 pt-0.5',
                caption_label: 'text-sm font-black capitalize text-[#100f0f] dark:text-[#fffdf6]',
                nav: 'flex items-center gap-1',
                button_previous:
                  'w-7 h-7 rounded-xl bg-[#100f0f]/5 hover:bg-[#100f0f]/10 dark:bg-white/10 dark:hover:bg-white/20 text-[#100f0f] dark:text-[#fffdf6] flex items-center justify-center active-press transition-colors',
                button_next:
                  'w-7 h-7 rounded-xl bg-[#100f0f]/5 hover:bg-[#100f0f]/10 dark:bg-white/10 dark:hover:bg-white/20 text-[#100f0f] dark:text-[#fffdf6] flex items-center justify-center active-press transition-colors',
                month_grid: 'w-full border-collapse',
                weekdays: 'grid grid-cols-7 mb-1',
                weekday:
                  'text-[11px] font-bold uppercase text-[#64635c] dark:text-[#8e8d85] text-center py-1',
                week: 'grid grid-cols-7 gap-1 mt-1',
                day: 'text-center p-0 relative flex items-center justify-center',
                day_button:
                  'w-9 h-9 rounded-xl text-xs font-bold flex items-center justify-center transition-all hover:bg-[#100f0f]/10 dark:hover:bg-white/10 text-[#100f0f] dark:text-[#fffdf6] active-press',
                selected:
                  '[&>button]:!bg-[#e4e24e] [&>button]:!text-[#100f0f] [&>button]:font-black [&>button]:shadow-2xs',
                today:
                  '[&>button]:border [&>button]:border-[#100f0f]/40 dark:[&>button]:border-[#e4e24e]/60 [&>button]:font-black',
                outside:
                  '[&>button]:text-[#64635c]/35 dark:[&>button]:text-[#8e8d85]/35',
                disabled: 'opacity-30 pointer-events-none',
                hidden: 'invisible',
              }}
              components={{
                Chevron: ({ orientation }) =>
                  orientation === 'left' ? (
                    <ChevronLeft size={15} />
                  ) : (
                    <ChevronRight size={15} />
                  ),
              }}
            />

            {/* Selected Date Footer Preview */}
            {selectedDate && (
              <div className="pt-2 border-t border-[#100f0f]/10 dark:border-white/10 flex items-center justify-between text-[11px]">
                <span className="text-[#64635c] dark:text-[#8e8d85] font-medium">Terpilih:</span>
                <span className="font-black text-[#100f0f] dark:text-[#e4e24e]">
                  {format(selectedDate, 'EEEE, d MMMM yyyy', { locale: localeId })}
                </span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
