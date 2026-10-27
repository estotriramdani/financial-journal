'use client';

import React, { useState, useEffect } from 'react';
import { X, Plus, CheckCircle2 } from 'lucide-react';
import { Category, Profile, Transaction } from '@/types/database';
import { getLocalCategories, saveLocalTransaction, syncData } from '@/utils/storage';
import { createClient } from '@/utils/supabase/client';
import { IconRenderer } from './IconRenderer';
import { AddCategoryModal } from './AddCategoryModal';

interface AddTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  groupId: string | null;
  currentUser: Profile | null;
  onSaved: (tx: Transaction) => void;
}

export function AddTransactionModal({
  isOpen,
  onClose,
  groupId,
  currentUser,
  onSaved,
}: AddTransactionModalProps) {
  const [type, setType] = useState<'expense' | 'income'>('expense');
  const [amountStr, setAmountStr] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [transactionDate, setTransactionDate] = useState(() => {
    return new Date().toISOString().split('T')[0];
  });
  const [description, setDescription] = useState('');
  const [categories, setCategories] = useState<Category[]>([]);
  const [isAddCategoryOpen, setIsAddCategoryOpen] = useState(false);
  const [isSuccessFeedback, setIsSuccessFeedback] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load categories
  useEffect(() => {
    if (isOpen) {
      const cats = getLocalCategories(groupId);
      setCategories(cats);

      // Auto-select first matching category if none selected
      const matching = cats.filter((c) => c.type === type);
      if (matching.length > 0 && !selectedCategoryId) {
        setSelectedCategoryId(matching[0].id);
      }
    }
  }, [isOpen, groupId, type]);

  // Handle category type change
  const handleTypeChange = (newType: 'expense' | 'income') => {
    setType(newType);
    const matching = categories.filter((c) => c.type === newType);
    if (matching.length > 0) {
      setSelectedCategoryId(matching[0].id);
    } else {
      setSelectedCategoryId(null);
    }
  };

  const filteredCategories = categories.filter((c) => c.type === type);

  // Format currency display
  const formatRupiah = (val: string) => {
    const rawNumber = val.replace(/\D/g, '');
    if (!rawNumber) return '';
    return new Intl.NumberFormat('id-ID').format(parseInt(rawNumber, 10));
  };

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, '');
    setAmountStr(raw);
  };

  const handleAddQuickAmount = (val: number) => {
    const current = parseInt(amountStr || '0', 10);
    setAmountStr((current + val).toString());
  };

  const handleCategoryCreated = (newCat: Category) => {
    setCategories((prev) => [...prev, newCat]);
    setSelectedCategoryId(newCat.id);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const numericAmount = parseInt(amountStr, 10);

    if (!numericAmount || numericAmount <= 0) {
      setError('Masukkan jumlah nominal yang valid');
      return;
    }

    if (!groupId) {
      setError('Pilih grup terlebih dahulu');
      return;
    }

    if (!currentUser) {
      setError('Pengguna belum login');
      return;
    }

    const selectedCategory = categories.find((c) => c.id === selectedCategoryId);

    const newTx: Transaction = {
      id: crypto.randomUUID(),
      group_id: groupId,
      category_id: selectedCategoryId || null,
      type,
      amount: numericAmount,
      description: description.trim() || null,
      transaction_date: transactionDate,
      created_by: currentUser.id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      syncStatus: 'pending_insert',
      categories: selectedCategory || null,
      profiles: {
        name: currentUser.name,
        email: currentUser.email,
      },
    };

    // 1. OFFLINE-FIRST: Save immediately to local storage
    saveLocalTransaction(newTx);
    onSaved(newTx);

    // 2. Play subtle haptic/visual success feedback
    setIsSuccessFeedback(true);

    // 3. Trigger async background sync to Supabase
    try {
      const supabase = createClient();
      syncData(supabase, groupId).catch(console.error);
    } catch (err) {
      console.warn('Background sync trigger skipped:', err);
    }

    setTimeout(() => {
      setIsSuccessFeedback(false);
      setAmountStr('');
      setDescription('');
      onClose();
    }, 600);
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 z-40 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs">
        <div className="w-full max-w-lg bg-[#fffdf6] dark:bg-[#171616] rounded-t-3xl sm:rounded-3xl border border-[#100f0f]/15 dark:border-white/15 shadow-2xl p-5 sm:p-6 overflow-hidden max-h-[92vh] flex flex-col page-transition">
          {/* Header */}
          <div className="flex items-center justify-between pb-3.5 border-b border-[#100f0f]/10 dark:border-white/10">
            <div>
              <span className="text-[11px] font-semibold tracking-wider text-[#64635c] dark:text-[#8e8d85] uppercase">
                Input Catatan
              </span>
              <h3 className="text-xl font-black text-[#100f0f] dark:text-[#fffdf6]">
                {type === 'expense' ? 'Pengeluaran Baru' : 'Pemasukan Baru'}
              </h3>
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

          {isSuccessFeedback ? (
            <div className="flex-1 flex flex-col items-center justify-center py-12 text-center page-transition">
              <CheckCircle2 size={56} className="text-[#e4e24e] animate-bounce" />
              <h4 className="mt-4 text-xl font-black text-[#100f0f] dark:text-[#fffdf6]">Tersimpan!</h4>
              <p className="text-xs text-[#64635c] dark:text-[#8e8d85] mt-1 font-medium">
                Catatan masuk ke local storage & disinkronkan ke cloud.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto pt-3 space-y-4">
              {/* Type Switcher */}
              <div className="grid grid-cols-2 p-1 bg-[#100f0f]/5 dark:bg-white/5 rounded-2xl border border-[#100f0f]/10 dark:border-white/10">
                <button
                  type="button"
                  onClick={() => handleTypeChange('expense')}
                  className={`py-2.5 text-xs font-bold rounded-xl transition-all ${
                    type === 'expense'
                      ? 'bg-[#100f0f] dark:bg-white/20 text-[#e4e24e] shadow-xs'
                      : 'text-[#64635c] dark:text-[#8e8d85] hover:text-[#100f0f] dark:hover:text-[#fffdf6]'
                  }`}
                >
                  🔴 Pengeluaran
                </button>
                <button
                  type="button"
                  onClick={() => handleTypeChange('income')}
                  className={`py-2.5 text-xs font-bold rounded-xl transition-all ${
                    type === 'income'
                      ? 'bg-[#100f0f] dark:bg-white/20 text-[#e4e24e] shadow-xs'
                      : 'text-[#64635c] dark:text-[#8e8d85] hover:text-[#100f0f] dark:hover:text-[#fffdf6]'
                  }`}
                >
                  🟢 Pemasukan
                </button>
              </div>

              {/* Big Amount Input */}
              <div className="p-4 bg-white dark:bg-[#1f1e1e] rounded-2xl border border-[#100f0f]/15 dark:border-white/10 focus-within:border-[#100f0f] dark:focus-within:border-[#e4e24e] transition-all">
                <span className="text-[11px] font-semibold text-[#64635c] dark:text-[#8e8d85] uppercase tracking-wider block mb-1">
                  Nominal Transaksi
                </span>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-black text-[#100f0f] dark:text-[#e4e24e]">Rp</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    required
                    placeholder="0"
                    value={amountStr ? formatRupiah(amountStr) : ''}
                    onChange={handleAmountChange}
                    className="w-full text-3xl font-black text-[#100f0f] dark:text-[#fffdf6] bg-transparent focus:outline-hidden tracking-tight"
                    autoFocus
                  />
                </div>

                {/* Quick Add Amount Chips */}
                <div className="flex flex-wrap gap-1.5 mt-3 pt-3 border-t border-[#100f0f]/5 dark:border-white/10">
                  {[10000, 25000, 50000, 100000, 500000].map((quick) => (
                    <button
                      key={quick}
                      type="button"
                      onClick={() => handleAddQuickAmount(quick)}
                      className="px-2.5 py-1 text-[11px] font-semibold bg-[#100f0f]/5 dark:bg-white/10 hover:bg-[#100f0f]/10 dark:hover:bg-white/15 text-[#100f0f] dark:text-[#fffdf6] rounded-full active-press transition-colors"
                    >
                      +{quick >= 1000 ? `${quick / 1000}k` : quick}
                    </button>
                  ))}
                  {amountStr && (
                    <button
                      type="button"
                      onClick={() => setAmountStr('')}
                      className="px-2.5 py-1 text-[11px] font-semibold bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 rounded-full active-press hover:bg-red-100"
                    >
                      Reset
                    </button>
                  )}
                </div>
              </div>

              {/* Category Picker */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-semibold text-[#64635c] dark:text-[#8e8d85] uppercase tracking-wider">
                    Pilih Kategori ({type === 'expense' ? 'Pengeluaran' : 'Pemasukan'})
                  </label>
                  <button
                    type="button"
                    onClick={() => setIsAddCategoryOpen(true)}
                    className="text-xs font-bold text-[#100f0f] dark:text-[#e4e24e] flex items-center gap-1 hover:underline active-press"
                  >
                    <Plus size={14} />
                    <span>Tambah Kategori</span>
                  </button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-48 overflow-y-auto p-1">
                  {filteredCategories.map((cat) => {
                    const isSelected = selectedCategoryId === cat.id;
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => setSelectedCategoryId(cat.id)}
                        className={`flex items-center gap-2.5 p-2.5 rounded-2xl border text-left transition-all active-press ${
                          isSelected
                            ? 'bg-[#100f0f] dark:bg-white/20 text-[#fffdf6] dark:text-[#e4e24e] border-[#100f0f] dark:border-white/30 shadow-xs'
                            : 'bg-white dark:bg-[#1f1e1e] hover:bg-black/5 dark:hover:bg-white/5 text-[#100f0f] dark:text-[#fffdf6] border-[#100f0f]/15 dark:border-white/10'
                        }`}
                      >
                        <div
                          className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
                          style={{
                            backgroundColor: cat.color || (cat.type === 'expense' ? '#f97316' : '#10b981'),
                            color: '#ffffff',
                          }}
                        >
                          <IconRenderer name={cat.icon} size={16} />
                        </div>
                        <span className="text-xs font-bold truncate">
                          {cat.name}
                        </span>
                      </button>
                    );
                  })}

                  {/* Inline "Tambah Kategori" Card */}
                  <button
                    type="button"
                    onClick={() => setIsAddCategoryOpen(true)}
                    className="flex items-center gap-2 p-2.5 rounded-2xl border-2 border-dashed border-[#100f0f]/25 dark:border-white/25 bg-white/50 dark:bg-white/5 hover:bg-[#faf9b6]/40 dark:hover:bg-white/10 text-[#100f0f] dark:text-[#fffdf6] text-left transition-all active-press"
                  >
                    <div className="w-8 h-8 rounded-full bg-[#100f0f]/5 dark:bg-white/10 flex items-center justify-center shrink-0">
                      <Plus size={16} />
                    </div>
                    <span className="text-xs font-bold">
                      + Tambah Baru
                    </span>
                  </button>
                </div>
              </div>

              {/* Date & Note Inputs */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Date */}
                <div>
                  <label className="text-xs font-semibold text-[#64635c] dark:text-[#8e8d85] uppercase tracking-wider block mb-1">
                    Tanggal
                  </label>
                  <div className="relative">
                    <input
                      type="date"
                      value={transactionDate}
                      onChange={(e) => setTransactionDate(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-white dark:bg-[#1f1e1e] border border-[#100f0f]/15 dark:border-white/10 rounded-2xl text-xs font-medium text-[#100f0f] dark:text-[#fffdf6] focus:outline-hidden focus:border-[#100f0f] dark:focus:border-[#e4e24e]"
                    />
                  </div>
                </div>

                {/* Description */}
                <div>
                  <label className="text-xs font-semibold text-[#64635c] dark:text-[#8e8d85] uppercase tracking-wider block mb-1">
                    Catatan (Opsional)
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: Makan siang bareng tim"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-white dark:bg-[#1f1e1e] border border-[#100f0f]/15 dark:border-white/10 rounded-2xl text-xs font-medium text-[#100f0f] dark:text-[#fffdf6] focus:outline-hidden focus:border-[#100f0f] dark:focus:border-[#e4e24e]"
                  />
                </div>
              </div>

              {/* Creator Attribution */}
              <div className="p-2.5 bg-[#faf9b6]/50 dark:bg-white/5 rounded-xl border border-[#100f0f]/10 dark:border-white/10 flex items-center justify-between text-[11px] text-[#64635c] dark:text-[#8e8d85]">
                <span>Dibuat oleh (created_by):</span>
                <span className="font-bold text-[#100f0f] dark:text-[#e4e24e]">
                  {currentUser?.name || currentUser?.email || 'User'}
                </span>
              </div>

              {/* Submit CTA */}
              <div className="pt-2 pb-1">
                <button
                  type="submit"
                  className="w-full py-4 px-6 rounded-full bg-[#e4e24e] hover:bg-[#d8d645] text-[#100f0f] font-black text-sm tracking-wider uppercase shadow-sm flex items-center justify-center gap-2 active-press transition-colors"
                >
                  Simpan Catatan
                </button>
              </div>
            </form>
          )}
        </div>
      </div>

      {/* Sub-modal: Add Category */}
      <AddCategoryModal
        isOpen={isAddCategoryOpen}
        onClose={() => setIsAddCategoryOpen(false)}
        defaultType={type}
        groupId={groupId}
        userId={currentUser?.id}
        onCreated={handleCategoryCreated}
      />
    </>
  );
}
