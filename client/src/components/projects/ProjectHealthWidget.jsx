import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
    Activity, 
    Calendar, 
    Users, 
    AlertTriangle, 
    CheckCircle, 
    Clock,
    TrendingUp,
    Info
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { API_BASE } from '@/lib/api';
import { supabase } from '@/lib/supabase';

export const ProjectHealthWidget = ({ projectId }) => {
    const { data: health, isLoading } = useQuery({
        queryKey: ['project_intelligence', projectId],
        queryFn: async () => {
            const { data: { session } } = await supabase.auth.getSession();
            const response = await fetch(`${API_BASE}/api/projects/${projectId}/intelligence`, {
                headers: {
                    'Authorization': `Bearer ${session?.access_token}`
                }
            });
            if (!response.ok) throw new Error('Failed to fetch intelligence');
            return response.json();
        }
    });

    if (isLoading) return <div className="h-64 bg-slate-50 animate-pulse rounded-3xl" />;
    if (!health) return null;

    const { prediction, metrics, recommendation } = health;
    
    const riskColors = {
        low: 'bg-emerald-50 text-emerald-700 border-emerald-100 icon:bg-emerald-100',
        medium: 'bg-amber-50 text-amber-700 border-amber-100 icon:bg-amber-100',
        high: 'bg-rose-50 text-rose-700 border-rose-100 icon:bg-rose-100'
    };

    const statusIcon = {
        low: CheckCircle,
        medium: Clock,
        high: AlertTriangle
    }[prediction.riskLevel];

    const Icon = statusIcon;

    return (
        <div className="space-y-4">
            {/* Compact Header Bar */}
            <div className={cn(
                "p-4 rounded-2xl border flex items-center gap-4 transition-all",
                riskColors[prediction.riskLevel]
            )}>
                <div className="w-10 h-10 rounded-xl bg-white/60 backdrop-blur-sm flex items-center justify-center shrink-0 shadow-sm border border-white/40">
                    <Icon className="h-5 w-5" />
                </div>
                
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-[9px] font-black uppercase tracking-widest opacity-60">Status:</span>
                        <span className="text-sm font-black">{prediction.healthStatus}</span>
                    </div>
                    <p className="text-[11px] font-bold opacity-80 truncate">
                        {recommendation}
                    </p>
                </div>

                <div className="hidden md:flex items-center gap-4 pl-4 border-l border-current/10">
                    <div>
                        <div className="flex items-center gap-1.5 mb-0.5">
                            <Calendar className="h-3 w-3 opacity-60" />
                            <span className="text-[9px] font-black uppercase tracking-widest opacity-60">Est. Completion</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-sm font-black">{new Date(prediction.predictedEndDate).toLocaleDateString()}</span>
                            {prediction.daysDifference > 0 && (
                                <span className="text-[9px] font-bold bg-rose-500 text-white px-1.5 rounded-full">
                                    +{prediction.daysDifference}d
                                </span>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Compact Metrics Row */}
            <div className="grid grid-cols-3 gap-3">
                <div className="bg-white p-3 rounded-xl border border-slate-100 shadow-sm flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center text-slate-500 shrink-0">
                        <TrendingUp className="h-4 w-4" />
                    </div>
                    <div>
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Velocity</p>
                        <p className="text-sm font-black text-slate-900">{metrics.avgDailyVelocity} <span className="text-[10px] opacity-40">u/d</span></p>
                    </div>
                </div>

                <div className="bg-white p-3 rounded-xl border border-slate-100 shadow-sm flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center text-slate-500 shrink-0">
                        <Clock className="h-4 w-4" />
                    </div>
                    <div>
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">ETA</p>
                        <p className="text-sm font-black text-slate-900">{metrics.daysToComplete} <span className="text-[10px] opacity-40">Days</span></p>
                    </div>
                </div>

                <div className="bg-white p-3 rounded-xl border border-slate-100 shadow-sm flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600 shrink-0">
                        <Users className="h-4 w-4" />
                    </div>
                    <div>
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Capability</p>
                        <p className="text-sm font-black text-slate-900">{metrics.avgWorkPerPersonPerDay} <span className="text-[10px] opacity-40">u/p</span></p>
                    </div>
                </div>
            </div>

            {/* Tiny Insight Bar */}
            <div className="bg-slate-900/5 p-2 px-3 rounded-lg flex items-center gap-2 border border-slate-100">
                <Info className="h-3 w-3 text-emerald-600" />
                <p className="text-[9px] font-bold uppercase tracking-widest text-slate-500">
                    AI Insight: {prediction.healthStatus === 'Healthy' 
                        ? 'Trending positively.' 
                        : 'Reallocation advised to stabilize timeline.'}
                </p>
            </div>
        </div>
    );
};
