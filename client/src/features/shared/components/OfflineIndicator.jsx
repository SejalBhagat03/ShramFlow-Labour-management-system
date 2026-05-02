import React, { useState, useEffect } from 'react';
import { WifiOff, Wifi } from 'lucide-react';
import { useTranslation } from 'react-i18next';

/**
 * OfflineIndicator
 * Shows a subtle, premium notification when the application is offline.
 */
export const OfflineIndicator = () => {
    const { t } = useTranslation();
    const [isOffline, setIsOffline] = useState(!navigator.onLine);
    const [showReconnected, setShowReconnected] = useState(false);

    useEffect(() => {
        const handleOnline = () => {
            setIsOffline(false);
            setShowReconnected(true);
            const timer = setTimeout(() => setShowReconnected(false), 4000);
            return () => clearTimeout(timer);
        };
        const handleOffline = () => {
            setIsOffline(true);
            setShowReconnected(false);
        };

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    if (!isOffline && !showReconnected) return null;

    return (
        <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-3 pointer-events-none sm:bottom-8 sm:right-8">
            {isOffline && (
                <div className="flex items-center gap-3.5 bg-destructive/20 backdrop-blur-xl text-destructive px-5 py-3 rounded-2xl shadow-[0_8px_32px_0_rgba(220,38,38,0.3)] border border-destructive/30 animate-in slide-in-from-bottom-8 duration-500 ease-out fill-mode-both">
                    <div className="bg-destructive/20 p-2 rounded-full ring-1 ring-destructive/30 animate-pulse">
                        <WifiOff className="h-4 w-4" />
                    </div>
                    <div className="flex flex-col">
                        <span className="text-[10px] font-bold uppercase tracking-[0.1em] opacity-60 leading-none mb-1">{t('status')}</span>
                        <span className="text-sm font-bold tracking-tight">{t('offlineStatus')}</span>
                    </div>
                </div>
            )}
            {showReconnected && (
                <div className="flex items-center gap-3.5 bg-emerald-500/20 backdrop-blur-xl text-emerald-700 px-5 py-3 rounded-2xl shadow-[0_8px_32px_0_rgba(16,185,129,0.3)] border border-emerald-500/30 animate-in slide-in-from-bottom-8 fade-in duration-500 ease-out fill-mode-both">
                    <div className="bg-emerald-500/20 p-2 rounded-full ring-1 ring-emerald-500/30">
                        <Wifi className="h-4 w-4" />
                    </div>
                    <div className="flex flex-col">
                        <span className="text-[10px] font-bold uppercase tracking-[0.1em] opacity-60 leading-none mb-1">{t('status')}</span>
                        <span className="text-sm font-bold tracking-tight">{t('connectionRestored')}</span>
                    </div>
                </div>
            )}
        </div>
    );
};
