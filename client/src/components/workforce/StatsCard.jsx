import React from 'react';
import { cn } from "@/lib/utils";

const COLOR_MAP = {
    indigo: {
        bg: 'bg-indigo-50',
        icon: 'text-indigo-600',
        border: 'border-indigo-100',
    },
    emerald: {
        bg: 'bg-emerald-50',
        icon: 'text-emerald-600',
        border: 'border-emerald-100',
    },
    rose: {
        bg: 'bg-rose-50',
        icon: 'text-rose-600',
        border: 'border-rose-100',
    },
    amber: {
        bg: 'bg-amber-50',
        icon: 'text-amber-600',
        border: 'border-amber-100',
    }
};

import { LineChart, Line, ResponsiveContainer } from 'recharts';

export const StatsCard = ({ icon: Icon, label, value, className, trendData }) => {
    return (
        <div className={cn(
            "bg-white p-6 rounded-2xl border border-border shadow-sm flex items-center justify-between gap-4 hover:border-emerald-200 transition-all group overflow-hidden",
            className
        )}>
            <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600 shrink-0">
                    <Icon className="h-5 w-5" />
                </div>
                <div>
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">{label}</p>
                    <p className="text-xl font-bold text-foreground tracking-tight">{value}</p>
                </div>
            </div>

            {trendData && trendData.length > 0 && (
                <div className="h-10 w-20 shrink-0 opacity-50 group-hover:opacity-100 transition-opacity">
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={trendData}>
                            <Line 
                                type="monotone" 
                                dataKey="work" 
                                stroke="#10b981" 
                                strokeWidth={2} 
                                dot={false} 
                                animationDuration={1000}
                            />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            )}
        </div>
    );
};
