'use client';

import React, { useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { getAppUrl } from '@/utils/url';
import { ArrowRight, Lock, Mail, User, ShieldCheck, ArrowLeft, Send } from 'lucide-react';

interface AuthViewProps {
  onAuthSuccess: () => void;
}

export function AuthView({ onAuthSuccess }: AuthViewProps) {
  const [mode, setMode] = useState<'login' | 'register' | 'forgot'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const supabase = createClient();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccessMsg(null);

    try {
      if (mode === 'register') {
        if (!name.trim()) {
          throw new Error('Nama lengkap diperlukan');
        }

        const baseUrl = getAppUrl();
        const { data, error: signUpErr } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            data: {
              name: name.trim(),
            },
            emailRedirectTo: `${baseUrl}/auth/callback`,
          },
        });

        if (signUpErr) throw signUpErr;

        if (data.session) {
          onAuthSuccess();
        } else {
          setSuccessMsg('Pendaftaran berhasil! Silakan periksa email Anda untuk verifikasi atau hubungi admin.');
          setMode('login');
        }
      } else if (mode === 'login') {
        const { error: signInErr } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });

        if (signInErr) throw signInErr;
        onAuthSuccess();
      } else if (mode === 'forgot') {
        if (!email.trim()) {
          throw new Error('Masukkan alamat email terdaftar');
        }

        const baseUrl = getAppUrl();
        const redirectTo = `${baseUrl}/auth/callback?next=/reset-password`;
        const { error: resetErr } = await supabase.auth.resetPasswordForEmail(email.trim(), {
          redirectTo,
        });

        if (resetErr) throw resetErr;

        setSuccessMsg(
          'Tautan pemulihan password telah dikirim ke email Anda! Silakan periksa kotak masuk atau spam.'
        );
      }
    } catch (err: any) {
      setError(err.message || 'Terjadi kesalahan saat otentikasi');
    } finally {
      setLoading(false);
    }
  };

  const handleFillAdmin = () => {
    setEmail('admin@financialjournal.com');
    setPassword('Admin123!@#');
    setMode('login');
    setError(null);
    setSuccessMsg(null);
  };

  return (
    <div className="min-h-screen flex flex-col justify-center items-center px-4 py-8 bg-[#fffdf6] dark:bg-[#100f0f] text-[#100f0f] dark:text-[#fffdf6] transition-colors">
      {/* Brand Header */}
      <div className="w-full max-w-sm mb-6 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#100f0f] dark:bg-[#e4e24e] text-[#e4e24e] dark:text-[#100f0f] text-xs font-black tracking-widest uppercase mb-3">
          FINJRNL
        </div>
        <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-[#100f0f] dark:text-[#fffdf6]">
          Jurnal Keuangan
        </h1>
        <p className="text-xs text-[#64635c] dark:text-[#8e8d85] mt-1.5 font-medium">
          Pencatatan pengeluaran & pemasukan harian, kolaboratif & offline-first.
        </p>
      </div>

      {/* Main Card */}
      <div className="w-full max-w-sm bg-white dark:bg-[#1a1919] rounded-3xl border border-[#100f0f]/15 dark:border-white/10 shadow-xl p-6 page-transition">
        {/* Toggle Mode (for login & register) */}
        {mode !== 'forgot' ? (
          <div className="grid grid-cols-2 p-1 bg-[#100f0f]/5 dark:bg-white/5 rounded-2xl border border-[#100f0f]/10 dark:border-white/10 mb-5">
            <button
              type="button"
              onClick={() => {
                setMode('login');
                setError(null);
                setSuccessMsg(null);
              }}
              className={`py-2 text-xs font-bold rounded-xl transition-all ${
                mode === 'login'
                  ? 'bg-[#100f0f] dark:bg-white/20 text-[#fffdf6] shadow-xs'
                  : 'text-[#64635c] dark:text-[#8e8d85] hover:text-[#100f0f] dark:hover:text-[#fffdf6]'
              }`}
            >
              Masuk
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('register');
                setError(null);
                setSuccessMsg(null);
              }}
              className={`py-2 text-xs font-bold rounded-xl transition-all ${
                mode === 'register'
                  ? 'bg-[#100f0f] dark:bg-white/20 text-[#fffdf6] shadow-xs'
                  : 'text-[#64635c] dark:text-[#8e8d85] hover:text-[#100f0f] dark:hover:text-[#fffdf6]'
              }`}
            >
              Daftar Baru
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-between mb-5 pb-3 border-b border-[#100f0f]/10 dark:border-white/10">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#64635c] dark:text-[#8e8d85]">
                Pemulihan Akun
              </span>
              <h3 className="text-lg font-black text-[#100f0f] dark:text-[#fffdf6]">
                Lupa Password
              </h3>
            </div>
            <button
              type="button"
              onClick={() => {
                setMode('login');
                setError(null);
                setSuccessMsg(null);
              }}
              className="p-1.5 text-xs font-bold text-[#64635c] dark:text-[#8e8d85] hover:text-[#100f0f] dark:hover:text-[#fffdf6] flex items-center gap-1 active-press"
            >
              <ArrowLeft size={14} />
              <span>Kembali</span>
            </button>
          </div>
        )}

        {error && (
          <div className="mb-4 p-3 text-xs bg-red-100 dark:bg-red-950/60 text-red-800 dark:text-red-300 rounded-xl font-medium">
            {error}
          </div>
        )}

        {successMsg && (
          <div className="mb-4 p-3 text-xs bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 rounded-xl font-medium">
            {successMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5">
          {mode === 'register' && (
            <div>
              <label className="text-xs font-semibold text-[#64635c] dark:text-[#8e8d85] uppercase tracking-wider block mb-1">
                Nama Lengkap
              </label>
              <div className="relative">
                <User size={16} className="absolute left-3.5 top-3.5 text-[#64635c] dark:text-[#8e8d85]" />
                <input
                  type="text"
                  required
                  placeholder="Nama Anda"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-[#fffdf6] dark:bg-[#100f0f] border border-[#100f0f]/20 dark:border-white/15 rounded-2xl text-xs font-medium focus:outline-hidden focus:border-[#100f0f] dark:focus:border-[#e4e24e] text-[#100f0f] dark:text-[#fffdf6]"
                />
              </div>
            </div>
          )}

          <div>
            <label className="text-xs font-semibold text-[#64635c] dark:text-[#8e8d85] uppercase tracking-wider block mb-1">
              Email
            </label>
            <div className="relative">
              <Mail size={16} className="absolute left-3.5 top-3.5 text-[#64635c] dark:text-[#8e8d85]" />
              <input
                type="email"
                required
                placeholder="nama@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-[#fffdf6] dark:bg-[#100f0f] border border-[#100f0f]/20 dark:border-white/15 rounded-2xl text-xs font-medium focus:outline-hidden focus:border-[#100f0f] dark:focus:border-[#e4e24e] text-[#100f0f] dark:text-[#fffdf6]"
              />
            </div>
          </div>

          {mode !== 'forgot' && (
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-[#64635c] dark:text-[#8e8d85] uppercase tracking-wider">
                  Password
                </label>
                {mode === 'login' && (
                  <button
                    type="button"
                    onClick={() => {
                      setMode('forgot');
                      setError(null);
                      setSuccessMsg(null);
                    }}
                    className="text-[11px] font-bold text-[#64635c] dark:text-[#8e8d85] hover:text-[#100f0f] dark:hover:text-[#e4e24e] hover:underline"
                  >
                    Lupa password?
                  </button>
                )}
              </div>
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
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 py-3.5 px-6 rounded-full bg-[#e4e24e] hover:bg-[#d8d645] text-[#100f0f] font-black text-xs uppercase tracking-wider shadow-sm flex items-center justify-center gap-2 active-press transition-colors disabled:opacity-50"
          >
            {loading ? (
              <span>Memproses...</span>
            ) : mode === 'login' ? (
              <>
                <span>Masuk ke Aplikasi</span>
                <ArrowRight size={16} />
              </>
            ) : mode === 'register' ? (
              <>
                <span>Daftar Sekarang</span>
                <ArrowRight size={16} />
              </>
            ) : (
              <>
                <span>Kirim Link Reset Password</span>
                <Send size={15} />
              </>
            )}
          </button>
        </form>

        {/* Extra info for Forgot mode */}
        {mode === 'forgot' && (
          <div className="mt-4 p-3 bg-[#faf9b6]/60 dark:bg-white/5 rounded-2xl border border-[#100f0f]/10 dark:border-white/10 text-[11px] text-[#64635c] dark:text-[#8e8d85]">
            <p className="font-semibold text-[#100f0f] dark:text-[#e4e24e] mb-1">💡 Catatan:</p>
            <p>
              Tautan reset password akan dikirim ke email Anda. Jika tidak menerima email, Anda juga dapat meminta Administrator akun untuk mereset password Anda secara instan.
            </p>
          </div>
        )}

        {/* Demo / Seed Admin Quick Fill */}
        {mode === 'login' && (
          <div className="mt-6 pt-4 border-t border-[#100f0f]/10 dark:border-white/10 text-center">
            <p className="text-[11px] text-[#64635c] dark:text-[#8e8d85] mb-2 font-medium">
              Akun Admin Ter-seed:
            </p>
            <button
              type="button"
              onClick={handleFillAdmin}
              className="w-full py-2 px-3 bg-[#faf9b6] dark:bg-[#282717] hover:bg-[#faf9b6]/80 dark:hover:bg-[#282717]/80 text-[#100f0f] dark:text-[#e4e24e] rounded-xl text-xs font-bold border border-[#100f0f]/20 dark:border-[#e4e24e]/30 flex items-center justify-center gap-1.5 active-press transition-colors"
            >
              <ShieldCheck size={14} />
              <span>Login sebagai Admin (admin@financialjournal.com)</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
