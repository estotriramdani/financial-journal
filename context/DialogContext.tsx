'use client';

import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import { AlertTriangle, CheckCircle2, Info, Trash2, X } from 'lucide-react';

export type DialogVariant = 'info' | 'success' | 'warning' | 'danger';

export interface AlertOptions {
  title?: string;
  message: string;
  variant?: DialogVariant;
  confirmText?: string;
}

export interface ConfirmOptions {
  title?: string;
  message: string;
  variant?: DialogVariant;
  confirmText?: string;
  cancelText?: string;
}

interface DialogState {
  type: 'alert' | 'confirm';
  title: string;
  message: string;
  variant: DialogVariant;
  confirmText: string;
  cancelText: string;
}

interface DialogContextType {
  showAlert: (options: string | AlertOptions) => Promise<void>;
  showConfirm: (options: string | ConfirmOptions) => Promise<boolean>;
}

const DialogContext = createContext<DialogContextType | undefined>(undefined);

export function DialogProvider({ children }: { children: React.ReactNode }) {
  const [dialog, setDialog] = useState<DialogState | null>(null);
  const resolverRef = useRef<((value: boolean) => void) | null>(null);

  const closeDialog = useCallback((result: boolean) => {
    setDialog(null);
    if (resolverRef.current) {
      resolverRef.current(result);
      resolverRef.current = null;
    }
  }, []);

  const showAlert = useCallback((options: string | AlertOptions): Promise<void> => {
    const opts: AlertOptions =
      typeof options === 'string' ? { message: options } : options;

    return new Promise((resolve) => {
      resolverRef.current = () => resolve();
      setDialog({
        type: 'alert',
        title: opts.title || 'Informasi',
        message: opts.message,
        variant: opts.variant || 'info',
        confirmText: opts.confirmText || 'Mengerti',
        cancelText: 'Tutup',
      });
    });
  }, []);

  const showConfirm = useCallback((options: string | ConfirmOptions): Promise<boolean> => {
    const opts: ConfirmOptions =
      typeof options === 'string' ? { message: options } : options;

    return new Promise((resolve) => {
      resolverRef.current = resolve;
      setDialog({
        type: 'confirm',
        title: opts.title || 'Konfirmasi Tindakan',
        message: opts.message,
        variant: opts.variant || 'warning',
        confirmText: opts.confirmText || 'Ya, Lanjutkan',
        cancelText: opts.cancelText || 'Batal',
      });
    });
  }, []);

  // Support Escape key to dismiss
  useEffect(() => {
    if (!dialog) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closeDialog(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [dialog, closeDialog]);

  const renderIcon = (variant: DialogVariant) => {
    switch (variant) {
      case 'danger':
        return (
          <div className="w-11 h-11 rounded-2xl bg-rose-500/15 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
            <Trash2 size={22} />
          </div>
        );
      case 'warning':
        return (
          <div className="w-11 h-11 rounded-2xl bg-[#faf9b6] dark:bg-[#e4e24e]/20 text-[#100f0f] dark:text-[#e4e24e] flex items-center justify-center shrink-0">
            <AlertTriangle size={22} />
          </div>
        );
      case 'success':
        return (
          <div className="w-11 h-11 rounded-2xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
            <CheckCircle2 size={22} />
          </div>
        );
      case 'info':
      default:
        return (
          <div className="w-11 h-11 rounded-2xl bg-[#faf9b6] dark:bg-[#e4e24e]/20 text-[#100f0f] dark:text-[#e4e24e] flex items-center justify-center shrink-0">
            <Info size={22} />
          </div>
        );
    }
  };

  return (
    <DialogContext.Provider value={{ showAlert, showConfirm }}>
      {children}

      {dialog && (
        <div
          className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4 bg-black/65 backdrop-blur-xs transition-opacity"
          onClick={() => closeDialog(false)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="finjrnl-dialog-title"
        >
          <div
            className="w-full max-w-sm bg-[#fffdf6] dark:bg-[#171616] rounded-3xl border border-[#100f0f]/15 dark:border-white/15 p-6 space-y-5 page-transition"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3.5">
                {renderIcon(dialog.variant)}
                <div>
                  <span className="text-[10px] font-bold tracking-widest uppercase text-[#64635c] dark:text-[#8e8d85] block">
                    FINJRNL
                  </span>
                  <h3
                    id="finjrnl-dialog-title"
                    className="text-base sm:text-lg font-black text-[#100f0f] dark:text-[#fffdf6] leading-snug"
                  >
                    {dialog.title}
                  </h3>
                </div>
              </div>

              <button
                type="button"
                onClick={() => closeDialog(false)}
                className="p-1.5 rounded-full text-[#64635c] hover:text-[#100f0f] dark:text-[#8e8d85] dark:hover:text-[#fffdf6] hover:bg-black/5 dark:hover:bg-white/10 active-press transition-colors"
                aria-label="Tutup dialog"
              >
                <X size={18} />
              </button>
            </div>

            {/* Message Body */}
            <p className="text-xs sm:text-sm text-[#64635c] dark:text-[#b5b4ac] leading-relaxed whitespace-pre-line">
              {dialog.message}
            </p>

            {/* Action Pills */}
            <div className="flex items-center justify-end gap-2.5 pt-1">
              {dialog.type === 'confirm' && (
                <button
                  type="button"
                  onClick={() => closeDialog(false)}
                  className="flex-1 py-3 px-4 rounded-full border border-[#100f0f] dark:border-white/25 text-[#100f0f] dark:text-[#fffdf6] text-xs font-bold uppercase tracking-wider hover:bg-[#100f0f]/5 dark:hover:bg-white/10 active-press transition-colors"
                >
                  {dialog.cancelText}
                </button>
              )}

              <button
                type="button"
                onClick={() => closeDialog(true)}
                className={`flex-1 py-3 px-5 rounded-full text-xs font-black uppercase tracking-wider active-press transition-colors ${
                  dialog.variant === 'danger'
                    ? 'bg-rose-600 hover:bg-rose-700 text-white'
                    : 'bg-[#e4e24e] hover:bg-[#d8d645] text-[#100f0f]'
                }`}
              >
                {dialog.confirmText}
              </button>
            </div>
          </div>
        </div>
      )}
    </DialogContext.Provider>
  );
}

export function useDialog() {
  const context = useContext(DialogContext);
  if (!context) {
    throw new Error('useDialog must be used within a DialogProvider');
  }
  return context;
}
