'use client';

import React, { useState } from 'react';
import { X, Check } from 'lucide-react';
import { Category } from '@/types/database';
import { saveLocalCategory, syncData } from '@/utils/storage';
import { createClient } from '@/utils/supabase/client';
import { IconRenderer } from './IconRenderer';

interface AddCategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultType?: 'expense' | 'income';
  groupId?: string | null;
  userId?: string;
  onCreated: (category: Category) => void;
}

const AVAILABLE_ICONS = [
  'Utensils', 'Coffee', 'ShoppingBag', 'Car', 'Fuel', 'Zap', 
  'Film', 'HeartPulse', 'GraduationCap', 'Plane', 'Dumbbell', 
  'Smartphone', 'Home', 'Gift', 'Briefcase', 'TrendingUp', 
  'Coins', 'Wallet', 'Landmark', 'Music', 'Book', 'Smile', 'CreditCard'
];

const PRESET_COLORS = [
  '#f97316', '#ef4444', '#ec4899', '#8b5cf6', 
  '#3b82f6', '#06b6d4', '#10b981', '#84cc16', 
  '#eab308', '#64748b', '#100f0f'
];

export function AddCategoryModal({
  isOpen,
  onClose,
  defaultType = 'expense',
  groupId,
  userId,
  onCreated,
}: AddCategoryModalProps) {
  const [name, setName] = useState('');
  const [type, setType] = useState<'expense' | 'income'>(defaultType);
  const [selectedIcon, setSelectedIcon] = useState('Tag');
  const [selectedColor, setSelectedColor] = useState('#f97316');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Nama kategori tidak boleh kosong');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    const newCategory: Category = {
      id: crypto.randomUUID(),
      name: name.trim(),
      type,
      icon: selectedIcon,
      color: selectedColor,
      is_system: false,
      group_id: groupId || null,
      created_by: userId || null,
      created_at: new Date().toISOString(),
      syncStatus: 'pending_insert',
    };

    // 1. Save to local first (Offline-First!)
    saveLocalCategory(newCategory);
    onCreated(newCategory);

    // 2. Trigger background sync
    try {
      const supabase = createClient();
      syncData(supabase, groupId).catch(console.error);
    } catch (err) {
      console.warn('Sync trigger failed:', err);
    }

    setIsSubmitting(false);
    setName('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs transition-opacity">
      <div className="w-full max-w-md bg-[#fffdf6] dark:bg-[#171616] rounded-t-3xl sm:rounded-3xl border border-[#100f0f]/15 dark:border-white/15 shadow-2xl p-6 overflow-hidden max-h-[90vh] flex flex-col page-transition">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[#100f0f]/10 dark:border-white/10">
          <div>
            <span className="text-[11px] font-semibold tracking-wider text-[#64635c] dark:text-[#8e8d85] uppercase">
              Master Data
            </span>
            <h3 className="text-xl font-black text-[#100f0f] dark:text-[#fffdf6]">Tambah Kategori Baru</h3>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/10 text-[#100f0f] dark:text-[#fffdf6] active-press"
          >
            <X size={20} />
          </button>
        </div>

        {error && (
          <div className="mt-3 p-3 text-xs bg-red-100 dark:bg-red-950/60 text-red-800 dark:text-red-300 rounded-xl font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto pt-4 space-y-4">
          {/* Type Toggle */}
          <div>
            <label className="text-xs font-semibold text-[#64635c] dark:text-[#8e8d85] uppercase tracking-wider block mb-1.5">
              Jenis Kategori
            </label>
            <div className="grid grid-cols-2 p-1 bg-[#100f0f]/5 dark:bg-white/5 rounded-2xl border border-[#100f0f]/10 dark:border-white/10">
              <button
                type="button"
                onClick={() => setType('expense')}
                className={`py-2 text-xs font-bold rounded-xl transition-all ${
                  type === 'expense'
                    ? 'bg-[#100f0f] dark:bg-white/20 text-[#fffdf6] dark:text-[#e4e24e] shadow-xs'
                    : 'text-[#64635c] dark:text-[#8e8d85] hover:text-[#100f0f] dark:hover:text-[#fffdf6]'
                }`}
              >
                Pengeluaran
              </button>
              <button
                type="button"
                onClick={() => setType('income')}
                className={`py-2 text-xs font-bold rounded-xl transition-all ${
                  type === 'income'
                    ? 'bg-[#100f0f] dark:bg-white/20 text-[#fffdf6] dark:text-[#e4e24e] shadow-xs'
                    : 'text-[#64635c] dark:text-[#8e8d85] hover:text-[#100f0f] dark:hover:text-[#fffdf6]'
                }`}
              >
                Pemasukan
              </button>
            </div>
          </div>

          {/* Name Input */}
          <div>
            <label className="text-xs font-semibold text-[#64635c] dark:text-[#8e8d85] uppercase tracking-wider block mb-1.5">
              Nama Kategori
            </label>
            <input
              type="text"
              required
              placeholder="Contoh: Kopi, Langganan, Freelance"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-3 bg-white dark:bg-[#1f1e1e] border border-[#100f0f]/20 dark:border-white/10 rounded-2xl text-sm font-medium focus:outline-hidden focus:border-[#100f0f] dark:focus:border-[#e4e24e] text-[#100f0f] dark:text-[#fffdf6]"
            />
          </div>

          {/* Color Picker */}
          <div>
            <label className="text-xs font-semibold text-[#64635c] dark:text-[#8e8d85] uppercase tracking-wider block mb-1.5">
              Warna Tag
            </label>
            <div className="flex flex-wrap gap-2.5">
              {PRESET_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setSelectedColor(c)}
                  className="w-8 h-8 rounded-full flex items-center justify-center transition-transform active-press"
                  style={{ backgroundColor: c }}
                >
                  {selectedColor === c && <Check size={16} className="text-white drop-shadow-sm" />}
                </button>
              ))}
            </div>
          </div>

          {/* Icon Selector */}
          <div>
            <label className="text-xs font-semibold text-[#64635c] dark:text-[#8e8d85] uppercase tracking-wider block mb-1.5">
              Pilih Icon
            </label>
            <div className="grid grid-cols-6 sm:grid-cols-8 gap-2 p-3 bg-white dark:bg-[#1f1e1e] border border-[#100f0f]/15 dark:border-white/10 rounded-2xl max-h-40 overflow-y-auto">
              {AVAILABLE_ICONS.map((iconName) => (
                <button
                  key={iconName}
                  type="button"
                  onClick={() => setSelectedIcon(iconName)}
                  className={`p-2.5 rounded-xl flex items-center justify-center transition-all ${
                    selectedIcon === iconName
                      ? 'bg-[#100f0f] dark:bg-white/20 text-[#e4e24e] shadow-sm'
                      : 'hover:bg-black/5 dark:hover:bg-white/5 text-[#100f0f] dark:text-[#fffdf6]'
                  }`}
                >
                  <IconRenderer name={iconName} size={20} />
                </button>
              ))}
            </div>
          </div>

          {/* Submit Button */}
          <div className="pt-2 pb-1">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3.5 px-6 rounded-full bg-[#e4e24e] hover:bg-[#d8d645] text-[#100f0f] font-bold text-sm tracking-wider uppercase shadow-sm flex items-center justify-center gap-2 active-press transition-colors disabled:opacity-50"
            >
              {isSubmitting ? 'Menyimpan...' : 'Simpan Kategori'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
