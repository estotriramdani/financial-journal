'use client';

import React, { useState, useEffect } from 'react';
import { Group } from '@/types/database';
import { CloudOff, RefreshCw, ChevronDown, CheckCircle2 } from 'lucide-react';
import { getPendingSyncCount, syncData } from '@/utils/storage';
import { createClient } from '@/utils/supabase/client';

interface NavbarProps {
  currentGroup: Group | null;
  groups: Group[];
  onSelectGroup: (group: Group) => void;
  onOpenGroupTab: () => void;
}

export function Navbar({ currentGroup, groups, onSelectGroup, onOpenGroupTab }: NavbarProps) {
  const [isOnline, setIsOnline] = useState(true);
  const [pendingCount, setPendingCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const [showGroupMenu, setShowGroupMenu] = useState(false);

  const supabase = createClient();

  const updateStatus = () => {
    if (typeof window !== 'undefined') {
      setIsOnline(navigator.onLine);
      setPendingCount(getPendingSyncCount());
    }
  };

  useEffect(() => {
    updateStatus();

    const handleOnline = () => {
      setIsOnline(true);
      setIsSyncing(true);
      syncData(supabase)
        .catch(console.error)
        .finally(() => {
          setIsSyncing(false);
          updateStatus();
        });
    };

    const handleOffline = () => {
      setIsOnline(false);
      updateStatus();
    };

    const handleDataChanged = () => {
      updateStatus();
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('finjrnl:data-changed', handleDataChanged);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('finjrnl:data-changed', handleDataChanged);
    };
  }, []);

  const handleSyncClick = async () => {
    if (isSyncing) return;
    setIsSyncing(true);
    try {
      await syncData(supabase, currentGroup?.id);
    } catch (e) {
      console.error(e);
    } finally {
      setIsSyncing(false);
      updateStatus();
    }
  };

  return (
    <header className="sticky top-0 z-30 bg-[#fffdf6]/90 dark:bg-[#100f0f]/90 backdrop-blur-md border-b border-[#100f0f]/10 dark:border-white/10 px-4 py-3">
      <div className="max-w-2xl mx-auto flex items-center justify-between gap-2">
        {/* Logo */}
        <div className="flex items-center gap-2">
          <span className="font-black text-lg tracking-tighter text-[#100f0f] dark:text-[#fffdf6]">
            FINJRNL
          </span>
          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-sm bg-[#e4e24e] text-[#100f0f] uppercase">
            PWA
          </span>
        </div>

        {/* Group Selector Pill */}
        <div className="relative">
          <button
            onClick={() => setShowGroupMenu(!showGroupMenu)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#100f0f] dark:bg-[#1a1919] text-[#fffdf6] border border-transparent dark:border-white/15 rounded-full text-xs font-bold active-press shadow-xs hover:bg-black dark:hover:bg-white/10 max-w-[170px]"
          >
            <span className="truncate">{currentGroup?.name || 'Pilih Grup'}</span>
            <ChevronDown size={14} className="shrink-0 text-[#e4e24e]" />
          </button>

          {/* Dropdown Menu */}
          {showGroupMenu && (
            <div className="absolute left-1/2 -translate-x-1/2 mt-2 w-56 bg-white dark:bg-[#1a1919] rounded-2xl border border-[#100f0f]/15 dark:border-white/10 shadow-xl p-1.5 z-40 page-transition">
              <span className="text-[10px] font-bold text-[#64635c] dark:text-[#8e8d85] uppercase tracking-wider block px-3 py-1">
                Grup Tersedia
              </span>
              <div className="max-h-48 overflow-y-auto space-y-0.5">
                {groups.map((g) => (
                  <button
                    key={g.id}
                    onClick={() => {
                      onSelectGroup(g);
                      setShowGroupMenu(false);
                    }}
                    className={`w-full text-left px-3 py-2 text-xs font-semibold rounded-xl flex items-center justify-between transition-colors ${
                      currentGroup?.id === g.id
                        ? 'bg-[#100f0f] dark:bg-white/15 text-[#e4e24e]'
                        : 'text-[#100f0f] dark:text-[#fffdf6] hover:bg-black/5 dark:hover:bg-white/5'
                    }`}
                  >
                    <span className="truncate">{g.name}</span>
                    {currentGroup?.id === g.id && <CheckCircle2 size={14} />}
                  </button>
                ))}
              </div>
              <div className="border-t border-[#100f0f]/10 dark:border-white/10 mt-1 pt-1">
                <button
                  onClick={() => {
                    setShowGroupMenu(false);
                    onOpenGroupTab();
                  }}
                  className="w-full text-left px-3 py-1.5 text-xs font-bold text-[#100f0f] dark:text-[#e4e24e] hover:bg-black/5 dark:hover:bg-white/5 rounded-xl block"
                >
                  + Kelola / Buat Grup
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Sync / Offline Status Pill */}
        <button
          onClick={handleSyncClick}
          disabled={isSyncing}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold transition-all active-press border ${
            isSyncing
              ? 'bg-[#faf9b6] dark:bg-[#282717] text-[#100f0f] dark:text-[#e4e24e] border-[#100f0f]/20 dark:border-[#e4e24e]/30'
              : !isOnline
              ? 'bg-amber-100 dark:bg-amber-950/50 text-amber-900 dark:text-amber-300 border-amber-300 dark:border-amber-700/50'
              : pendingCount > 0
              ? 'bg-[#faf9b6] dark:bg-[#282717] text-[#100f0f] dark:text-[#e4e24e] border-[#100f0f]/20 dark:border-[#e4e24e]/30'
              : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/40'
          }`}
          title="Klik untuk sinkronisasi manual"
        >
          {isSyncing ? (
            <>
              <RefreshCw size={12} className="animate-spin text-[#100f0f] dark:text-[#e4e24e]" />
              <span className="hidden sm:inline">Sinkronisasi...</span>
            </>
          ) : !isOnline ? (
            <>
              <CloudOff size={12} className="text-amber-800 dark:text-amber-400" />
              <span>Offline {pendingCount > 0 && `(${pendingCount})`}</span>
            </>
          ) : pendingCount > 0 ? (
            <>
              <RefreshCw size={12} className="text-[#100f0f] dark:text-[#e4e24e]" />
              <span>{pendingCount} Lokal</span>
            </>
          ) : (
            <>
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="hidden sm:inline">Online</span>
            </>
          )}
        </button>
      </div>
    </header>
  );
}
