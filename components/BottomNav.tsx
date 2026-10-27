'use client';

import React from 'react';
import { BookOpen, PieChart, Plus, Users, User } from 'lucide-react';

export type NavTab = 'journal' | 'reports' | 'groups' | 'profile';

interface BottomNavProps {
  activeTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  onOpenAddModal: () => void;
}

export function BottomNav({ activeTab, onTabChange, onOpenAddModal }: BottomNavProps) {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-30 bg-[#fffdf6]/95 dark:bg-[#100f0f]/95 backdrop-blur-md border-t border-[#100f0f]/10 dark:border-white/10 pb-safe">
      <div className="max-w-md mx-auto px-4 py-2 flex items-center justify-around">
        {/* Tab 1: Journal */}
        <button
          data-tab="journal"
          onClick={() => onTabChange('journal')}
          className={`flex flex-col items-center justify-center p-1.5 transition-all active-press ${
            activeTab === 'journal'
              ? 'text-[#100f0f] dark:text-[#e4e24e]'
              : 'text-[#64635c] dark:text-[#8e8d85] hover:text-[#100f0f] dark:hover:text-[#fffdf6]'
          }`}
        >
          <BookOpen size={20} className={activeTab === 'journal' ? 'stroke-[2.5]' : 'stroke-[1.7]'} />
          <span className="text-[10px] font-bold mt-1">Jurnal</span>
          {activeTab === 'journal' && (
            <span className="w-1.5 h-1.5 rounded-full bg-[#100f0f] dark:bg-[#e4e24e] mt-0.5" />
          )}
        </button>

        {/* Tab 2: Reports */}
        <button
          data-tab="reports"
          onClick={() => onTabChange('reports')}
          className={`flex flex-col items-center justify-center p-1.5 transition-all active-press ${
            activeTab === 'reports'
              ? 'text-[#100f0f] dark:text-[#e4e24e]'
              : 'text-[#64635c] dark:text-[#8e8d85] hover:text-[#100f0f] dark:hover:text-[#fffdf6]'
          }`}
        >
          <PieChart size={20} className={activeTab === 'reports' ? 'stroke-[2.5]' : 'stroke-[1.7]'} />
          <span className="text-[10px] font-bold mt-1">Laporan</span>
          {activeTab === 'reports' && (
            <span className="w-1.5 h-1.5 rounded-full bg-[#100f0f] dark:bg-[#e4e24e] mt-0.5" />
          )}
        </button>

        {/* Center: Add (+) Floating CTA */}
        <button
          data-tab="add"
          onClick={onOpenAddModal}
          className="relative -top-3 w-13 h-13 rounded-full bg-[#e4e24e] hover:bg-[#d8d645] text-[#100f0f] border-2 border-[#100f0f] dark:border-black shadow-lg flex items-center justify-center active-press transition-transform hover:scale-105"
          title="Input Transaksi Baru"
        >
          <Plus size={28} className="stroke-[3]" />
        </button>

        {/* Tab 3: Groups */}
        <button
          data-tab="groups"
          onClick={() => onTabChange('groups')}
          className={`flex flex-col items-center justify-center p-1.5 transition-all active-press ${
            activeTab === 'groups'
              ? 'text-[#100f0f] dark:text-[#e4e24e]'
              : 'text-[#64635c] dark:text-[#8e8d85] hover:text-[#100f0f] dark:hover:text-[#fffdf6]'
          }`}
        >
          <Users size={20} className={activeTab === 'groups' ? 'stroke-[2.5]' : 'stroke-[1.7]'} />
          <span className="text-[10px] font-bold mt-1">Grup</span>
          {activeTab === 'groups' && (
            <span className="w-1.5 h-1.5 rounded-full bg-[#100f0f] dark:bg-[#e4e24e] mt-0.5" />
          )}
        </button>

        {/* Tab 4: Profile & Settings */}
        <button
          data-tab="profile"
          onClick={() => onTabChange('profile')}
          className={`flex flex-col items-center justify-center p-1.5 transition-all active-press ${
            activeTab === 'profile'
              ? 'text-[#100f0f] dark:text-[#e4e24e]'
              : 'text-[#64635c] dark:text-[#8e8d85] hover:text-[#100f0f] dark:hover:text-[#fffdf6]'
          }`}
        >
          <User size={20} className={activeTab === 'profile' ? 'stroke-[2.5]' : 'stroke-[1.7]'} />
          <span className="text-[10px] font-bold mt-1">Profil</span>
          {activeTab === 'profile' && (
            <span className="w-1.5 h-1.5 rounded-full bg-[#100f0f] dark:bg-[#e4e24e] mt-0.5" />
          )}
        </button>
      </div>
    </div>
  );
}
