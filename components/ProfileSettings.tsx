'use client';

import React, { useState, useEffect } from 'react';
import { Profile } from '@/types/database';
import { createClient } from '@/utils/supabase/client';
import {
  KeyRound,
  ShieldAlert,
  RefreshCw,
  LogOut,
  Smartphone,
  Sun,
  Moon,
  Laptop,
  CheckCircle2,
  UserCheck,
} from 'lucide-react';
import { getPendingSyncCount, syncData } from '@/utils/storage';
import { applyTheme, getSavedTheme, ThemeMode } from '@/utils/theme';
import { useDialog } from '@/context/DialogContext';

interface AdminUserProfile extends Profile {
  email_confirmed_at?: string | null;
  last_sign_in_at?: string | null;
  is_activated?: boolean;
}

interface ProfileSettingsProps {
  currentUser: Profile | null;
  onLogout: () => void;
}

export function ProfileSettings({ currentUser, onLogout }: ProfileSettingsProps) {
  const { showAlert, showConfirm } = useDialog();
  // Theme state
  const [theme, setTheme] = useState<ThemeMode>('system');

  // Password change state
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordMsg, setPasswordMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  // Admin state
  const [allUsers, setAllUsers] = useState<AdminUserProfile[]>([]);
  const [selectedUserToReset, setSelectedUserToReset] = useState<AdminUserProfile | null>(null);
  const [adminNewPassword, setAdminNewPassword] = useState('');
  const [adminMsg, setAdminMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [activatingUserId, setActivatingUserId] = useState<string | null>(null);

  // Sync state
  const [pendingCount, setPendingCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState<string | null>(null);

  // PWA install prompt
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  // PWA version & update state
  const [isCheckingUpdate, setIsCheckingUpdate] = useState(false);
  const [updateCheckResult, setUpdateCheckResult] = useState<{
    status: 'idle' | 'checking' | 'latest' | 'update_available' | 'error';
    message?: string;
  } | null>(null);

  const supabase = createClient();

  useEffect(() => {
    setTheme(getSavedTheme());
    setPendingCount(getPendingSyncCount());

    const handleBeforeInstall = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    const handleThemeChange = (e: any) => {
      if (e.detail?.mode) setTheme(e.detail.mode);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    window.addEventListener('finjrnl:theme-changed', handleThemeChange);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('finjrnl:theme-changed', handleThemeChange);
    };
  }, []);

  const handleSelectTheme = (mode: ThemeMode) => {
    setTheme(mode);
    applyTheme(mode);
  };

  const fetchUsers = () => {
    if (currentUser?.role === 'admin') {
      setIsLoadingUsers(true);
      fetch('/api/admin/users')
        .then((res) => res.json())
        .then((data) => {
          if (data.users) setAllUsers(data.users);
        })
        .catch(console.error)
        .finally(() => setIsLoadingUsers(false));
    }
  };

  // Fetch users if admin
  useEffect(() => {
    fetchUsers();
  }, [currentUser]);

  // Handle user changing their own password
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordMsg(null);

    if (newPassword.length < 6) {
      setPasswordMsg({ type: 'error', text: 'Password baru minimal 6 karakter.' });
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordMsg({ type: 'error', text: 'Konfirmasi password tidak cocok.' });
      return;
    }

    setIsChangingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) throw error;

      setPasswordMsg({ type: 'success', text: 'Password Anda berhasil diperbarui!' });
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setPasswordMsg({ type: 'error', text: err.message || 'Gagal mengubah password.' });
    } finally {
      setIsChangingPassword(false);
    }
  };

  // Handle Admin activating an account manually
  const handleActivateUser = async (userId: string, email: string) => {
    setActivatingUserId(userId);
    setAdminMsg(null);

    try {
      const res = await fetch('/api/admin/activate-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal mengaktivasi akun');

      setAdminMsg({
        type: 'success',
        text: `Sukses! Akun ${email} telah diaktivasi secara manual.`,
      });

      // Update local user state
      setAllUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, is_activated: true, email_confirmed_at: new Date().toISOString() } : u))
      );
    } catch (err: any) {
      setAdminMsg({ type: 'error', text: err.message || 'Gagal mengaktivasi akun' });
    } finally {
      setActivatingUserId(null);
    }
  };

  // Handle Admin resetting another user's password
  const handleAdminResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserToReset || !adminNewPassword) return;

    setAdminMsg(null);
    try {
      const res = await fetch('/api/admin/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: selectedUserToReset.id,
          newPassword: adminNewPassword,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Gagal mereset password');
      }

      setAdminMsg({
        type: 'success',
        text: `Sukses! Password untuk ${selectedUserToReset.email} berhasil direset.`,
      });
      setSelectedUserToReset(null);
      setAdminNewPassword('');
    } catch (err: any) {
      setAdminMsg({ type: 'error', text: err.message || 'Gagal mereset password' });
    }
  };

  // Manual trigger sync
  const handleManualSync = async () => {
    setIsSyncing(true);
    setSyncMsg(null);
    try {
      const res = await syncData(supabase);
      if (res.success) {
        setPendingCount(getPendingSyncCount());
        setSyncMsg(`Sinkronisasi selesai. (${res.syncedCount} item diproses)`);
      } else {
        setSyncMsg(`Sinkronisasi tertunda: ${res.error}`);
      }
    } catch (e: any) {
      setSyncMsg(`Error: ${e.message}`);
    } finally {
      setIsSyncing(false);
    }
  };

  // Trigger PWA install
  const handleInstallApp = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const choiceResult = await deferredPrompt.userChoice;
      if (choiceResult.outcome === 'accepted') {
        setDeferredPrompt(null);
        await showAlert({
          title: 'Aplikasi Diinstal',
          message: 'FINJRNL sedang ditambahkan ke layar utama perangkat Anda.',
          variant: 'success',
          confirmText: 'Mantap',
        });
      }
    } else {
      const isStandalone =
        typeof window !== 'undefined' &&
        (window.matchMedia('(display-mode: standalone)').matches ||
          (window.navigator as any).standalone === true);

      if (isStandalone) {
        await showAlert({
          title: 'PWA Sudah Terpasang',
          message:
            'Anda saat ini sudah menjalankan FINJRNL dalam mode aplikasi terpasang (Standalone PWA).',
          variant: 'success',
          confirmText: 'Tutup',
        });
      } else {
        await showAlert({
          title: 'Cara Install Aplikasi (PWA)',
          message:
            '• iOS (Safari): Ketuk ikon Share lalu pilih "Add to Home Screen".\n• Android (Chrome): Buka menu browser (⋮) lalu pilih "Install app" atau "Tambahkan ke Layar Utama".',
          variant: 'info',
          confirmText: 'Mengerti',
        });
      }
    }
  };

  // Check PWA updates
  const handleCheckAppUpdate = async () => {
    setIsCheckingUpdate(true);
    setUpdateCheckResult({ status: 'checking', message: 'Memeriksa versi terbaru...' });

    try {
      // 1. Trigger SW registration check
      if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
        window.dispatchEvent(new CustomEvent('finjrnl:check-pwa-update'));
        const reg = await navigator.serviceWorker.getRegistration();
        if (reg) {
          await reg.update().catch(() => {});
          if (reg.waiting) {
            setUpdateCheckResult({
              status: 'update_available',
              message: 'Versi baru telah diunduh dan siap dipasang!',
            });
            setIsCheckingUpdate(false);
            return;
          }
        }
      }

      // 2. Fetch version endpoint from server
      const res = await fetch('/api/version', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        const serverVersion = data.version || '1.2.0';
        const currentVersion = '1.2.0';

        if (serverVersion !== currentVersion) {
          setUpdateCheckResult({
            status: 'update_available',
            message: `Versi baru (${serverVersion}) tersedia!`,
          });
        } else {
          setUpdateCheckResult({
            status: 'latest',
            message: `Aplikasi Anda sudah menggunakan versi paling mutakhir (v${currentVersion}).`,
          });
        }
      } else {
        setUpdateCheckResult({
          status: 'latest',
          message: 'Aplikasi sudah up to date.',
        });
      }
    } catch {
      setUpdateCheckResult({
        status: 'latest',
        message: 'Versi aplikasi saat ini sudah aktif.',
      });
    } finally {
      setIsCheckingUpdate(false);
    }
  };

  return (
    <div className="space-y-6 page-transition pb-20">
      {/* User Card */}
      <div className="p-5 bg-white dark:bg-[#1a1919] rounded-3xl border border-[#100f0f]/15 dark:border-white/10 shadow-xs flex items-center justify-between gap-4">
        <div className="flex items-center gap-3.5 min-w-0">
          <div className="w-12 h-12 rounded-full bg-[#100f0f] dark:bg-[#e4e24e] text-[#e4e24e] dark:text-[#100f0f] font-black text-lg flex items-center justify-center shrink-0">
            {(currentUser?.name || currentUser?.email || 'U')[0].toUpperCase()}
          </div>
          <div className="min-w-0">
            <h3 className="text-base font-black text-[#100f0f] dark:text-[#fffdf6] truncate">
              {currentUser?.name || 'Pengguna'}
            </h3>
            <p className="text-xs text-[#64635c] dark:text-[#8e8d85] truncate font-medium">
              {currentUser?.email}
            </p>
            <div className="mt-1">
              <span
                className={`inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-black rounded-full uppercase tracking-wider ${
                  currentUser?.role === 'admin'
                    ? 'bg-[#e4e24e] text-[#100f0f]'
                    : 'bg-[#100f0f]/5 dark:bg-white/10 text-[#64635c] dark:text-[#8e8d85]'
                }`}
              >
                {currentUser?.role === 'admin' ? '👑 Admin' : 'Anggota'}
              </span>
            </div>
          </div>
        </div>

        <button
          onClick={async () => {
            const confirmed = await showConfirm({
              title: 'Keluar dari Akun?',
              message: 'Apakah Anda yakin ingin keluar dari sesi akun FINJRNL saat ini?',
              variant: 'warning',
              confirmText: 'Ya, Keluar',
              cancelText: 'Batal',
            });
            if (confirmed) {
              onLogout();
            }
          }}
          className="p-3 text-[#64635c] hover:text-red-600 dark:hover:text-red-400 rounded-2xl hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors active-press"
          title="Keluar"
        >
          <LogOut size={20} />
        </button>
      </div>

      {/* TAMPILAN & DARK MODE SETTINGS */}
      <div className="p-5 bg-white dark:bg-[#1a1919] rounded-3xl border border-[#100f0f]/15 dark:border-white/10 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-[#64635c] dark:text-[#8e8d85] uppercase tracking-wider block">
              Personalisasi
            </span>
            <h4 className="text-sm font-black text-[#100f0f] dark:text-[#fffdf6]">
              Tema Tampilan (Dark Mode)
            </h4>
          </div>
        </div>

        <p className="text-xs text-[#64635c] dark:text-[#8e8d85]">
          Pilih tema tampilan sesuai kenyamanan mata Anda.
        </p>

        {/* 3-Way Mode Switcher */}
        <div className="grid grid-cols-3 p-1 bg-[#100f0f]/5 dark:bg-white/5 rounded-2xl border border-[#100f0f]/10 dark:border-white/10 gap-1">
          <button
            type="button"
            onClick={() => handleSelectTheme('light')}
            className={`py-2 px-2 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-all active-press ${
              theme === 'light'
                ? 'bg-white text-[#100f0f] shadow-xs'
                : 'text-[#64635c] dark:text-[#8e8d85] hover:text-[#100f0f] dark:hover:text-[#fffdf6]'
            }`}
          >
            <Sun size={14} />
            <span>Terang</span>
          </button>

          <button
            type="button"
            onClick={() => handleSelectTheme('dark')}
            className={`py-2 px-2 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-all active-press ${
              theme === 'dark'
                ? 'bg-[#100f0f] text-[#e4e24e] shadow-xs dark:bg-white/20 dark:text-[#e4e24e]'
                : 'text-[#64635c] dark:text-[#8e8d85] hover:text-[#100f0f] dark:hover:text-[#fffdf6]'
            }`}
          >
            <Moon size={14} />
            <span>Gelap</span>
          </button>

          <button
            type="button"
            onClick={() => handleSelectTheme('system')}
            className={`py-2 px-2 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-all active-press ${
              theme === 'system'
                ? 'bg-[#e4e24e] text-[#100f0f] shadow-xs'
                : 'text-[#64635c] dark:text-[#8e8d85] hover:text-[#100f0f] dark:hover:text-[#fffdf6]'
            }`}
          >
            <Laptop size={14} />
            <span>Sistem</span>
          </button>
        </div>
      </div>

      {/* Offline & Sync Status Card */}
      <div className="p-5 bg-white dark:bg-[#1a1919] rounded-3xl border border-[#100f0f]/15 dark:border-white/10 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-[#64635c] dark:text-[#8e8d85] uppercase tracking-wider block">
              Penyimpanan & Sinkronisasi
            </span>
            <h4 className="text-sm font-black text-[#100f0f] dark:text-[#fffdf6]">
              Status Offline-First
            </h4>
          </div>
          <span
            className={`px-2.5 py-1 text-xs font-bold rounded-full ${
              pendingCount > 0
                ? 'bg-amber-100 text-amber-900 dark:bg-amber-950/50 dark:text-amber-300'
                : 'bg-emerald-100 text-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-300'
            }`}
          >
            {pendingCount > 0 ? `${pendingCount} Belum Sinkron` : 'Sinkron Penuh'}
          </span>
        </div>

        <p className="text-xs text-[#64635c] dark:text-[#8e8d85]">
          Setiap input otomatis tersimpan di HP/perangkat Anda terlebih dahulu. Data akan diunggah
          otomatis saat sinyal stabil.
        </p>

        {syncMsg && (
          <div className="p-2.5 bg-[#faf9b6] dark:bg-white/10 text-[#100f0f] dark:text-[#fffdf6] rounded-xl text-xs font-semibold">
            {syncMsg}
          </div>
        )}

        <button
          onClick={handleManualSync}
          disabled={isSyncing}
          className="w-full py-2.5 px-4 bg-[#100f0f]/5 dark:bg-white/5 hover:bg-[#100f0f]/10 dark:hover:bg-white/10 rounded-2xl text-xs font-bold text-[#100f0f] dark:text-[#fffdf6] flex items-center justify-center gap-2 active-press transition-colors disabled:opacity-50"
        >
          <RefreshCw size={14} className={isSyncing ? 'animate-spin' : ''} />
          <span>{isSyncing ? 'Menyinkronkan...' : 'Sinkronkan Sekarang'}</span>
        </button>
      </div>

      {/* PWA & Version Checker Card */}
      <div className="p-5 bg-white dark:bg-[#1a1919] rounded-3xl border border-[#100f0f]/15 dark:border-white/10 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-[#100f0f]/10 dark:border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#100f0f] dark:bg-[#e4e24e] text-[#e4e24e] dark:text-[#100f0f] flex items-center justify-center shrink-0">
              <Smartphone size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-black text-[#100f0f] dark:text-[#fffdf6]">
                  Aplikasi PWA & Versi
                </h4>
                <span className="text-[10px] font-black px-1.5 py-0.5 rounded-md bg-[#faf9b6] dark:bg-[#282717] text-[#100f0f] dark:text-[#e4e24e] border border-[#100f0f]/15 dark:border-[#e4e24e]/30">
                  v1.2.0
                </span>
              </div>
              <p className="text-[11px] text-[#64635c] dark:text-[#8e8d85] mt-0.5">
                Installable, offline-first, dan otomatis tersinkronisasi.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleInstallApp}
            className="px-3.5 py-1.5 bg-[#100f0f] dark:bg-[#e4e24e] text-[#fffdf6] dark:text-[#100f0f] rounded-full text-xs font-bold active-press shrink-0 shadow-xs"
          >
            {deferredPrompt ? 'Install PWA' : 'Info PWA'}
          </button>
        </div>

        {/* Update Checker Action */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <span className="text-xs font-bold text-[#100f0f] dark:text-[#fffdf6] block">
              Pembaruan Aplikasi
            </span>
            <span className="text-[11px] text-[#64635c] dark:text-[#8e8d85]">
              Periksa apakah Anda menggunakan versi aplikasi yang paling up to date.
            </span>
          </div>

          <button
            type="button"
            onClick={handleCheckAppUpdate}
            disabled={isCheckingUpdate}
            className="px-4 py-2 bg-[#100f0f]/5 hover:bg-[#100f0f]/10 dark:bg-white/10 dark:hover:bg-white/15 text-[#100f0f] dark:text-[#fffdf6] rounded-xl text-xs font-bold flex items-center justify-center gap-2 active-press transition-colors disabled:opacity-50 shrink-0"
          >
            <RefreshCw size={14} className={isCheckingUpdate ? 'animate-spin' : ''} />
            <span>{isCheckingUpdate ? 'Memeriksa...' : 'Periksa Pembaruan'}</span>
          </button>
        </div>

        {updateCheckResult && (
          <div
            className={`p-3 rounded-2xl text-xs font-semibold flex items-center justify-between gap-2 page-transition ${
              updateCheckResult.status === 'update_available'
                ? 'bg-amber-100 text-amber-900 dark:bg-amber-950/60 dark:text-amber-200 border border-amber-300 dark:border-amber-700/60'
                : updateCheckResult.status === 'latest'
                ? 'bg-emerald-100 text-emerald-900 dark:bg-emerald-950/60 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-800/60'
                : 'bg-gray-100 text-gray-800 dark:bg-white/10 dark:text-gray-200'
            }`}
          >
            <span>{updateCheckResult.message}</span>
            {updateCheckResult.status === 'update_available' && (
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="px-3 py-1 bg-[#100f0f] text-white dark:bg-[#e4e24e] dark:text-[#100f0f] text-[11px] font-black rounded-lg active-press"
              >
                Update Sekarang
              </button>
            )}
          </div>
        )}
      </div>

      {/* Change Password Section */}
      <div className="p-5 bg-white dark:bg-[#1a1919] rounded-3xl border border-[#100f0f]/15 dark:border-white/10 shadow-xs space-y-4">
        <div className="flex items-center gap-2">
          <KeyRound size={18} className="text-[#100f0f] dark:text-[#e4e24e]" />
          <h4 className="text-sm font-black text-[#100f0f] dark:text-[#fffdf6]">
            Ganti Password Akun
          </h4>
        </div>

        {passwordMsg && (
          <div
            className={`p-3 rounded-2xl text-xs font-semibold ${
              passwordMsg.type === 'success'
                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300'
                : 'bg-red-100 text-red-800 dark:bg-red-950/50 dark:text-red-300'
            }`}
          >
            {passwordMsg.text}
          </div>
        )}

        <form onSubmit={handleChangePassword} className="space-y-3">
          <div>
            <label className="text-xs font-semibold text-[#64635c] dark:text-[#8e8d85] block mb-1">
              Password Baru
            </label>
            <input
              type="password"
              required
              minLength={6}
              placeholder="Minimal 6 karakter"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full px-4 py-2.5 bg-[#fffdf6] dark:bg-[#100f0f] border border-[#100f0f]/20 dark:border-white/15 rounded-2xl text-xs font-medium focus:outline-hidden focus:border-[#100f0f] dark:focus:border-[#e4e24e] text-[#100f0f] dark:text-[#fffdf6]"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-[#64635c] dark:text-[#8e8d85] block mb-1">
              Konfirmasi Password Baru
            </label>
            <input
              type="password"
              required
              minLength={6}
              placeholder="Ulangi password baru"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-4 py-2.5 bg-[#fffdf6] dark:bg-[#100f0f] border border-[#100f0f]/20 dark:border-white/15 rounded-2xl text-xs font-medium focus:outline-hidden focus:border-[#100f0f] dark:focus:border-[#e4e24e] text-[#100f0f] dark:text-[#fffdf6]"
            />
          </div>

          <button
            type="submit"
            disabled={isChangingPassword}
            className="w-full py-3 bg-[#e4e24e] text-[#100f0f] font-bold text-xs uppercase tracking-wider rounded-full active-press hover:bg-[#d8d645] transition-colors disabled:opacity-50"
          >
            {isChangingPassword ? 'Menyimpan...' : 'Perbarui Password'}
          </button>
        </form>
      </div>

      {/* Admin Panel (Visible for Admin role) */}
      {currentUser?.role === 'admin' && (
        <div className="p-5 bg-white dark:bg-[#1a1919] rounded-3xl border-2 border-[#100f0f] dark:border-[#e4e24e] shadow-sm space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-[#100f0f]/10 dark:border-white/10">
            <ShieldAlert size={20} className="text-[#100f0f] dark:text-[#e4e24e]" />
            <div>
              <h4 className="text-sm font-black text-[#100f0f] dark:text-[#fffdf6]">
                Panel Administrator
              </h4>
              <p className="text-[11px] text-[#64635c] dark:text-[#8e8d85]">
                Kelola pengguna, aktivasi manual akun & reset password.
              </p>
            </div>
          </div>

          {adminMsg && (
            <div
              className={`p-3 rounded-2xl text-xs font-semibold ${
                adminMsg.type === 'success'
                  ? 'bg-[#faf9b6] text-[#100f0f] dark:bg-[#e4e24e]/20 dark:text-[#e4e24e]'
                  : 'bg-red-100 text-red-800 dark:bg-red-950/50 dark:text-red-300'
              }`}
            >
              {adminMsg.text}
            </div>
          )}

          {/* Reset password modal / form if user selected */}
          {selectedUserToReset && (
            <div className="p-4 bg-[#fffdf6] dark:bg-[#100f0f] rounded-2xl border border-[#100f0f]/20 dark:border-white/15 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#100f0f] dark:text-[#fffdf6]">
                  Reset Password: {selectedUserToReset.email}
                </span>
                <button
                  onClick={() => setSelectedUserToReset(null)}
                  className="text-xs text-[#64635c] dark:text-[#8e8d85] hover:underline"
                >
                  Batal
                </button>
              </div>

              <form onSubmit={handleAdminResetPassword} className="space-y-2">
                <input
                  type="text"
                  required
                  placeholder="Masukkan password baru untuk user"
                  value={adminNewPassword}
                  onChange={(e) => setAdminNewPassword(e.target.value)}
                  className="w-full px-3 py-2 bg-white dark:bg-[#1a1919] border border-[#100f0f]/20 dark:border-white/15 rounded-xl text-xs font-medium text-[#100f0f] dark:text-[#fffdf6]"
                />
                <button
                  type="submit"
                  className="w-full py-2 bg-[#100f0f] dark:bg-[#e4e24e] text-[#fffdf6] dark:text-[#100f0f] text-xs font-bold rounded-xl active-press hover:bg-black"
                >
                  Simpan Password Baru
                </button>
              </form>
            </div>
          )}

          {/* Users List for Admin */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold text-[#64635c] dark:text-[#8e8d85] uppercase tracking-wider block">
                Daftar Pengguna Terdaftar ({allUsers.length})
              </label>
              <button
                type="button"
                onClick={fetchUsers}
                className="text-[11px] font-bold text-[#64635c] dark:text-[#8e8d85] hover:text-[#100f0f] dark:hover:text-[#fffdf6] flex items-center gap-1"
              >
                <RefreshCw size={12} className={isLoadingUsers ? 'animate-spin' : ''} />
                <span>Segarkan</span>
              </button>
            </div>

            {isLoadingUsers ? (
              <p className="text-xs text-[#64635c] dark:text-[#8e8d85] py-2">Memuat pengguna...</p>
            ) : (
              <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
                {allUsers.map((u) => {
                  const isActivated = u.is_activated || Boolean(u.email_confirmed_at);
                  const isCurrentActivating = activatingUserId === u.id;

                  return (
                    <div
                      key={u.id}
                      className="p-3 bg-[#fffdf6] dark:bg-[#100f0f] rounded-2xl border border-[#100f0f]/10 dark:border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-xs font-bold text-[#100f0f] dark:text-[#fffdf6] truncate">
                            {u.name || 'Tanpa Nama'}
                          </span>
                          <span className="text-[10px] px-1.5 py-0.2 rounded-md bg-[#100f0f]/5 dark:bg-white/10 text-[#64635c] dark:text-[#8e8d85] font-semibold uppercase">
                            {u.role}
                          </span>
                          {isActivated ? (
                            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded-md bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 text-[10px] font-bold">
                              <CheckCircle2 size={10} /> Aktif
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded-md bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 text-[10px] font-bold">
                              Belum Aktif
                            </span>
                          )}
                        </div>
                        <span className="text-[11px] text-[#64635c] dark:text-[#8e8d85] block truncate mt-0.5">
                          {u.email}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 self-end sm:self-auto shrink-0">
                        {!isActivated && (
                          <button
                            type="button"
                            onClick={() => handleActivateUser(u.id, u.email)}
                            disabled={isCurrentActivating}
                            className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold rounded-xl active-press transition-colors disabled:opacity-50 flex items-center gap-1"
                            title="Aktivasi Akun Manual"
                          >
                            <UserCheck size={13} />
                            <span>{isCurrentActivating ? 'Mengaktivasi...' : 'Aktivasi'}</span>
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => {
                            setSelectedUserToReset(u);
                            setAdminNewPassword('GantiPassword123!');
                          }}
                          className="px-2.5 py-1.5 bg-[#faf9b6] hover:bg-[#e4e24e] dark:bg-[#e4e24e]/20 dark:hover:bg-[#e4e24e]/40 text-[#100f0f] dark:text-[#e4e24e] text-[11px] font-bold rounded-xl border border-[#100f0f]/15 dark:border-[#e4e24e]/30 active-press transition-colors"
                        >
                          Reset Password
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
