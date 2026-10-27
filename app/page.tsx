'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Group, Profile, Transaction } from '@/types/database';
import { createClient } from '@/utils/supabase/client';
import {
  getActiveGroupId,
  getLocalGroups,
  getLocalTransactions,
  setActiveGroupId,
  syncData,
  deleteLocalTransaction,
} from '@/utils/storage';
import { AuthView } from '@/components/AuthView';
import { Navbar } from '@/components/Navbar';
import { BottomNav, NavTab } from '@/components/BottomNav';
import { TransactionCard } from '@/components/TransactionCard';
import { AddTransactionModal } from '@/components/AddTransactionModal';
import { ReportsView } from '@/components/ReportsView';
import { GroupManagement } from '@/components/GroupManagement';
import { ProfileSettings } from '@/components/ProfileSettings';
import { Plus, ArrowDownLeft, ArrowUpRight, Wallet, Search } from 'lucide-react';

export default function HomePage() {
  const [currentUser, setCurrentUser] = useState<Profile | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<NavTab>('journal');

  // Groups and transactions state
  const [groups, setGroups] = useState<Group[]>([]);
  const [activeGroup, setActiveGroup] = useState<Group | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isAddTxOpen, setIsAddTxOpen] = useState(false);

  // Filters for Journal tab
  const [typeFilter, setTypeFilter] = useState<'all' | 'expense' | 'income'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const supabase = createClient();

  // Load user profile & session
  const checkAuth = useCallback(async () => {
    setIsAuthLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setCurrentUser(null);
        setIsAuthLoading(false);
        return;
      }

      // Fetch profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (profile) {
        setCurrentUser(profile);
      } else {
        // Fallback profile if trigger not yet finished
        const fallback: Profile = {
          id: user.id,
          name: user.user_metadata?.name || user.email?.split('@')[0] || 'User',
          email: user.email || '',
          role: (user.app_metadata?.role as any) || 'user',
        };
        setCurrentUser(fallback);
      }
    } catch (e) {
      console.error('Auth check error:', e);
    } finally {
      setIsAuthLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  // Load local data and sync
  const reloadData = useCallback(async (selectedGroupId?: string) => {
    // 1. Load groups
    const localGroups = getLocalGroups();
    setGroups(localGroups);

    let currentGId = selectedGroupId || getActiveGroupId();
    if (!currentGId && localGroups.length > 0) {
      currentGId = localGroups[0].id;
      setActiveGroupId(currentGId);
    }

    const currentG = localGroups.find((g) => g.id === currentGId) || localGroups[0] || null;
    setActiveGroup(currentG);

    // 2. Load transactions from local storage (Offline-First: INSTANT RENDER!)
    const localTxs = getLocalTransactions(currentG?.id);
    setTransactions(localTxs);

    // 3. Trigger background sync if user logged in
    if (navigator.onLine && currentG) {
      syncData(supabase, currentG.id)
        .then(() => {
          // Re-read merged local transactions after sync
          const refreshed = getLocalTransactions(currentG.id);
          setTransactions(refreshed);
          const refreshedGroups = getLocalGroups();
          setGroups(refreshedGroups);
        })
        .catch(console.error);
    }
  }, [supabase]);

  useEffect(() => {
    if (currentUser) {
      reloadData();
    }
  }, [currentUser, reloadData]);

  // Listen to sync events from background
  useEffect(() => {
    const handleDataChanged = () => {
      const currentGId = getActiveGroupId();
      const localTxs = getLocalTransactions(currentGId);
      setTransactions(localTxs);
      const localGroups = getLocalGroups();
      setGroups(localGroups);
      if (currentGId) {
        const found = localGroups.find((g) => g.id === currentGId);
        if (found) setActiveGroup(found);
      }
    };

    window.addEventListener('finjrnl:data-changed', handleDataChanged);
    return () => window.removeEventListener('finjrnl:data-changed', handleDataChanged);
  }, []);

  const handleSelectGroup = (group: Group) => {
    setActiveGroupId(group.id);
    setActiveGroup(group);
    reloadData(group.id);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setCurrentUser(null);
  };

  const handleDeleteTransaction = (id: string) => {
    deleteLocalTransaction(id);
    setTransactions((prev) => prev.filter((t) => t.id !== id));
    // Trigger sync to delete on server
    syncData(supabase, activeGroup?.id).catch(console.error);
  };

  // Calculations for active group
  const { totalIncome, totalExpense, netBalance } = useMemo(() => {
    let income = 0;
    let expense = 0;
    for (const t of transactions) {
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
  }, [transactions]);

  // Filtered transactions for feed
  const filteredTransactions = useMemo(() => {
    return transactions.filter((t) => {
      if (typeFilter !== 'all' && t.type !== typeFilter) return false;
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const catMatch = t.categories?.name?.toLowerCase().includes(query);
        const descMatch = t.description?.toLowerCase().includes(query);
        const userMatch = t.profiles?.name?.toLowerCase().includes(query);
        return catMatch || descMatch || userMatch;
      }
      return true;
    });
  }, [transactions, typeFilter, searchQuery]);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0,
    }).format(val);
  };

  if (isAuthLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#fffdf6] dark:bg-[#100f0f]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-[#100f0f] dark:border-[#e4e24e] border-t-transparent rounded-full animate-spin" />
          <span className="text-xs font-black tracking-widest text-[#100f0f] dark:text-[#e4e24e] uppercase">
            FINJRNL Memuat...
          </span>
        </div>
      </div>
    );
  }

  // Not authenticated
  if (!currentUser) {
    return <AuthView onAuthSuccess={checkAuth} />;
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#fffdf6] dark:bg-[#100f0f] text-[#100f0f] dark:text-[#fffdf6] transition-colors">
      {/* Top Navbar */}
      <Navbar
        currentGroup={activeGroup}
        groups={groups}
        onSelectGroup={handleSelectGroup}
        onOpenGroupTab={() => setActiveTab('groups')}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-2xl w-full mx-auto px-4 py-5">
        {/* TAB 1: JOURNAL (FEED & QUICK INPUT) */}
        {activeTab === 'journal' && (
          <div className="space-y-5 page-transition pb-20">
            {/* Balance Overview Card */}
            <div className="p-5 sm:p-6 bg-[#100f0f] dark:bg-[#1a1919] text-[#fffdf6] rounded-3xl border border-transparent dark:border-white/10 shadow-xl space-y-4">
              <div className="flex items-center justify-between text-xs text-[#64635c] dark:text-[#8e8d85]">
                <span className="uppercase font-bold tracking-wider text-gray-400">
                  Saldo Kas Grup
                </span>
                <span className="font-semibold text-white px-2.5 py-0.5 rounded-full bg-white/10 text-[11px]">
                  {activeGroup?.name || 'Grup'}
                </span>
              </div>

              <div>
                <span className="text-3xl sm:text-4xl font-black tracking-tight text-[#e4e24e]">
                  {formatCurrency(netBalance)}
                </span>
              </div>

              {/* In vs Out mini pills */}
              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-white/10">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                    <ArrowDownLeft size={16} />
                  </div>
                  <div>
                    <span className="text-[10px] text-gray-400 block font-medium">Pemasukan</span>
                    <span className="text-xs font-bold text-white">
                      +{formatCurrency(totalIncome)}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center">
                    <ArrowUpRight size={16} />
                  </div>
                  <div>
                    <span className="text-[10px] text-gray-400 block font-medium">Pengeluaran</span>
                    <span className="text-xs font-bold text-white">
                      -{formatCurrency(totalExpense)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Filter & Search Bar */}
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                {/* Type Filter Buttons */}
                <div className="flex p-1 bg-white dark:bg-[#1a1919] rounded-2xl border border-[#100f0f]/15 dark:border-white/10 shadow-2xs">
                  <button
                    onClick={() => setTypeFilter('all')}
                    className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all ${
                      typeFilter === 'all'
                        ? 'bg-[#100f0f] dark:bg-white/20 text-[#fffdf6]'
                        : 'text-[#64635c] dark:text-[#8e8d85] hover:text-[#100f0f] dark:hover:text-[#fffdf6]'
                    }`}
                  >
                    Semua
                  </button>
                  <button
                    onClick={() => setTypeFilter('expense')}
                    className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all ${
                      typeFilter === 'expense'
                        ? 'bg-[#100f0f] dark:bg-white/20 text-[#fffdf6]'
                        : 'text-[#64635c] dark:text-[#8e8d85] hover:text-[#100f0f] dark:hover:text-[#fffdf6]'
                    }`}
                  >
                    Pengeluaran
                  </button>
                  <button
                    onClick={() => setTypeFilter('income')}
                    className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all ${
                      typeFilter === 'income'
                        ? 'bg-[#100f0f] dark:bg-white/20 text-[#fffdf6]'
                        : 'text-[#64635c] dark:text-[#8e8d85] hover:text-[#100f0f] dark:hover:text-[#fffdf6]'
                    }`}
                  >
                    Pemasukan
                  </button>
                </div>

                {/* Direct quick add trigger */}
                <button
                  onClick={() => setIsAddTxOpen(true)}
                  className="px-3.5 py-2 bg-[#e4e24e] text-[#100f0f] rounded-2xl text-xs font-black flex items-center gap-1 active-press hover:bg-[#d8d645] shadow-2xs"
                >
                  <Plus size={16} />
                  <span>Catat</span>
                </button>
              </div>

              {/* Search input */}
              <div className="relative">
                <Search size={15} className="absolute left-3.5 top-3 text-[#64635c] dark:text-[#8e8d85]" />
                <input
                  type="text"
                  placeholder="Cari transaksi, kategori, atau anggota..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-white dark:bg-[#1a1919] border border-[#100f0f]/15 dark:border-white/10 rounded-2xl text-xs font-medium focus:outline-hidden focus:border-[#100f0f] dark:focus:border-[#e4e24e] text-[#100f0f] dark:text-[#fffdf6]"
                />
              </div>
            </div>

            {/* Transactions Feed */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between text-xs font-bold text-[#64635c] dark:text-[#8e8d85] px-1">
                <span>Daftar Transaksi ({filteredTransactions.length})</span>
                <span>Terbaru</span>
              </div>

              {filteredTransactions.length === 0 ? (
                <div className="p-8 text-center bg-white dark:bg-[#1a1919] rounded-3xl border border-dashed border-[#100f0f]/20 dark:border-white/15 space-y-3">
                  <div className="w-12 h-12 rounded-full bg-[#faf9b6] dark:bg-[#e4e24e]/20 text-[#100f0f] dark:text-[#e4e24e] mx-auto flex items-center justify-center">
                    <Wallet size={24} />
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-[#100f0f] dark:text-[#fffdf6]">
                      Belum Ada Catatan Transaksi
                    </h4>
                    <p className="text-xs text-[#64635c] dark:text-[#8e8d85] mt-1 max-w-xs mx-auto">
                      Mulai catat pengeluaran atau pemasukan pertama Anda untuk grup ini.
                    </p>
                  </div>
                  <button
                    onClick={() => setIsAddTxOpen(true)}
                    className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-[#e4e24e] text-[#100f0f] rounded-full text-xs font-bold uppercase tracking-wider active-press shadow-xs hover:bg-[#d8d645]"
                  >
                    <Plus size={16} />
                    <span>Input Transaksi</span>
                  </button>
                </div>
              ) : (
                filteredTransactions.map((tx) => (
                  <TransactionCard
                    key={tx.id}
                    transaction={tx}
                    currentUserId={currentUser.id}
                    onDelete={handleDeleteTransaction}
                  />
                ))
              )}
            </div>
          </div>
        )}

        {/* TAB 2: REPORTS */}
        {activeTab === 'reports' && (
          <ReportsView
            currentGroup={activeGroup}
            transactions={transactions}
          />
        )}

        {/* TAB 3: GROUPS */}
        {activeTab === 'groups' && (
          <GroupManagement
            currentGroup={activeGroup}
            currentUser={currentUser}
            onGroupSelected={handleSelectGroup}
          />
        )}

        {/* TAB 4: PROFILE & SETTINGS */}
        {activeTab === 'profile' && (
          <ProfileSettings
            currentUser={currentUser}
            onLogout={handleLogout}
          />
        )}
      </main>

      {/* Floating Add Transaction Modal */}
      <AddTransactionModal
        isOpen={isAddTxOpen}
        onClose={() => setIsAddTxOpen(false)}
        groupId={activeGroup?.id || null}
        currentUser={currentUser}
        onSaved={(newTx) => {
          setTransactions((prev) => {
            if (prev.some((t) => t.id === newTx.id)) return prev;
            return [newTx, ...prev];
          });
        }}
      />

      {/* Mobile Bottom Navigation Bar */}
      <BottomNav
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onOpenAddModal={() => setIsAddTxOpen(true)}
      />
    </div>
  );
}
