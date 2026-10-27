'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { KeyRound, Lock, CheckCircle2, ArrowRight } from 'lucide-react';

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const supabase = createClient();

  useEffect(() => {
    supabase.auth.getSession();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        console.log('Recovery session active');
      }
    });

    return () => subscription.unsubscribe();
  }, [supabase]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password.length < 6) {
      setError('Password baru minimal 6 karakter');
      return;
    }

    if (password !== confirmPassword) {
      setError('Konfirmasi password tidak cocok');
      return;
    }

    setLoading(true);

    try {
      const { error: updateErr } = await supabase.auth.updateUser({
        password,
      });

      if (updateErr) throw updateErr;

      setSuccess(true);
      setTimeout(() => {
        router.push('/');
      }, 2000);
    } catch (err: any) {
      setError(err.message || 'Gagal mereset password. Pastikan link reset masih berlaku.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-center items-center px-4 py-8 bg-[#fffdf6] dark:bg-[#100f0f] text-[#100f0f] dark:text-[#fffdf6] transition-colors">
      {/* Brand Header */}
      <div className="w-full max-w-sm mb-6 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#100f0f] dark:bg-[#e4e24e] text-[#e4e24e] dark:text-[#100f0f] text-xs font-black tracking-widest uppercase mb-3">
          FINJRNL
        </div>
        <h1 className="text-3xl font-black tracking-tight text-[#100f0f] dark:text-[#fffdf6]">
          Atur Password Baru
        </h1>
        <p className="text-xs text-[#64635c] dark:text-[#8e8d85] mt-1.5 font-medium">
          Masukkan password baru untuk akun FINJRNL Anda.
        </p>
      </div>

      {/* Main Card */}
      <div className="w-full max-w-sm bg-white dark:bg-[#1a1919] rounded-3xl border border-[#100f0f]/15 dark:border-white/10 shadow-xl p-6 page-transition">
        {success ? (
          <div className="text-center py-6 space-y-3">
            <CheckCircle2 size={48} className="mx-auto text-emerald-600 dark:text-emerald-400 animate-bounce" />
            <h3 className="text-lg font-black text-[#100f0f] dark:text-[#fffdf6]">
              Password Berhasil Diperbarui!
            </h3>
            <p className="text-xs text-[#64635c] dark:text-[#8e8d85]">
              Mengalihkan Anda kembali ke aplikasi...
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 text-xs bg-red-100 dark:bg-red-950/60 text-red-800 dark:text-red-300 rounded-xl font-medium">
                {error}
              </div>
            )}

            <div>
              <label className="text-xs font-semibold text-[#64635c] dark:text-[#8e8d85] uppercase tracking-wider block mb-1">
                Password Baru
              </label>
              <div className="relative">
                <Lock size={16} className="absolute left-3.5 top-3.5 text-[#64635c] dark:text-[#8e8d85]" />
                <input
                  type="password"
                  required
                  minLength={6}
                  placeholder="Minimal 6 karakter"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-[#fffdf6] dark:bg-[#100f0f] border border-[#100f0f]/20 dark:border-white/15 rounded-2xl text-xs font-medium focus:outline-hidden focus:border-[#100f0f] dark:focus:border-[#e4e24e] text-[#100f0f] dark:text-[#fffdf6]"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-[#64635c] dark:text-[#8e8d85] uppercase tracking-wider block mb-1">
                Konfirmasi Password Baru
              </label>
              <div className="relative">
                <KeyRound size={16} className="absolute left-3.5 top-3.5 text-[#64635c] dark:text-[#8e8d85]" />
                <input
                  type="password"
                  required
                  minLength={6}
                  placeholder="Ulangi password baru"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-[#fffdf6] dark:bg-[#100f0f] border border-[#100f0f]/20 dark:border-white/15 rounded-2xl text-xs font-medium focus:outline-hidden focus:border-[#100f0f] dark:focus:border-[#e4e24e] text-[#100f0f] dark:text-[#fffdf6]"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 px-6 rounded-full bg-[#e4e24e] hover:bg-[#d8d645] text-[#100f0f] font-black text-xs uppercase tracking-wider shadow-sm flex items-center justify-center gap-2 active-press transition-colors disabled:opacity-50 mt-2"
            >
              <span>{loading ? 'Menyimpan...' : 'Simpan Password Baru'}</span>
              <ArrowRight size={16} />
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
