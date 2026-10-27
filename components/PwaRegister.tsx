'use client';

import React, { useState, useEffect } from 'react';
import { RefreshCw, Sparkles, X } from 'lucide-react';

export function PwaRegister() {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [swRegistration, setSwRegistration] = useState<ServiceWorkerRegistration | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;

    // Register service worker
    navigator.serviceWorker
      .register('/sw.js')
      .then((reg) => {
        setSwRegistration(reg);

        // Check if an updated worker is already waiting
        if (reg.waiting) {
          setUpdateAvailable(true);
        }

        // Detect update found
        reg.onupdatefound = () => {
          const installingWorker = reg.installing;
          if (installingWorker) {
            installingWorker.onstatechange = () => {
              if (installingWorker.state === 'installed' && navigator.serviceWorker.controller) {
                setUpdateAvailable(true);
                window.dispatchEvent(new CustomEvent('finjrnl:pwa-update-found'));
              }
            };
          }
        };
      })
      .catch((err) => {
        console.warn('Service Worker registration skipped or failed:', err);
      });

    // Handle controller change (reloaded after skipWaiting)
    let refreshing = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (!refreshing) {
        refreshing = true;
        window.location.reload();
      }
    });

    // Listen to manual update check requests
    const handleManualCheck = async () => {
      if (!navigator.serviceWorker) return;
      try {
        const reg = await navigator.serviceWorker.getRegistration();
        if (reg) {
          await reg.update();
          if (reg.waiting) {
            setUpdateAvailable(true);
          }
        }
      } catch (e) {
        console.error('Manual PWA update check error:', e);
      }
    };

    window.addEventListener('finjrnl:check-pwa-update', handleManualCheck);
    return () => window.removeEventListener('finjrnl:check-pwa-update', handleManualCheck);
  }, []);

  const handleApplyUpdate = () => {
    setIsUpdating(true);
    if (swRegistration?.waiting) {
      swRegistration.waiting.postMessage({ type: 'SKIP_WAITING' });
    } else {
      window.location.reload();
    }
  };

  if (!updateAvailable) return null;

  return (
    <div className="fixed top-14 left-4 right-4 z-50 max-w-md mx-auto page-transition">
      <div className="p-3.5 bg-[#100f0f] dark:bg-[#fffdf6] text-[#fffdf6] dark:text-[#100f0f] rounded-2xl shadow-2xl border border-[#e4e24e] flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-[#e4e24e] text-[#100f0f] flex items-center justify-center shrink-0">
            <Sparkles size={16} />
          </div>
          <div className="min-w-0">
            <h4 className="text-xs font-black truncate">Versi Baru Tersedia!</h4>
            <p className="text-[10px] text-gray-300 dark:text-gray-600 truncate">
              Klik perbarui untuk memuat versi paling up to date.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={handleApplyUpdate}
            disabled={isUpdating}
            className="px-3 py-1.5 bg-[#e4e24e] text-[#100f0f] text-xs font-black rounded-xl active-press hover:bg-[#d8d645] flex items-center gap-1 disabled:opacity-50"
          >
            <RefreshCw size={12} className={isUpdating ? 'animate-spin' : ''} />
            <span>{isUpdating ? 'Memuat...' : 'Perbarui'}</span>
          </button>
          <button
            onClick={() => setUpdateAvailable(false)}
            className="p-1 text-gray-400 hover:text-white dark:hover:text-black rounded-lg"
            title="Tutup"
          >
            <X size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
