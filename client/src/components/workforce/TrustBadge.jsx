import React from 'react';
import { Award, Star, ShieldCheck, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

export const TrustBadge = ({ score = 0 }) => {
    // Determine badge type based on score (0-100)
    let config = {
        label: 'New Recruit',
        color: 'bg-slate-100 text-slate-600 border-slate-200',
        icon: Star,
        glow: ''
    };

    if (score >= 90) {
        config = {
            label: 'Elite Pro',
            color: 'bg-amber-50 text-amber-700 border-amber-200',
            icon: Award,
            glow: 'shadow-[0_0_15px_rgba(245,158,11,0.3)]'
        };
    } else if (score >= 75) {
        config = {
            label: 'Top Performer',
            color: 'bg-emerald-50 text-emerald-700 border-emerald-200',
            icon: ShieldCheck,
            glow: ''
        };
    } else if (score >= 50) {
        config = {
            label: 'Reliable',
            color: 'bg-blue-50 text-blue-700 border-blue-200',
            icon: Zap,
            glow: ''
        };
    }

    const Icon = config.icon;

    return (
        <motion.div 
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className={cn(
                "flex items-center gap-1.5 px-3 py-1 rounded-full border text-[10px] font-black uppercase tracking-widest transition-all",
                config.color,
                config.glow
            )}
        >
            <Icon className="h-3 w-3" />
            {config.label}
        </motion.div>
    );
};
