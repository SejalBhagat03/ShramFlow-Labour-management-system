import React from 'react';
import { useTranslation } from 'react-i18next';
import { AppLayout } from '@/components/AppLayout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
    Loader2, 
    Plus, 
    Users, 
    Wallet,
    AlertTriangle,
    ArrowRight,
    ClipboardPlus,
    UserPlus,
    Banknote,
    TrendingUp,
    ShieldAlert,
    CheckCircle2,
    Calendar
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useDashboardInsights } from '@/hooks/useDashboardInsights';
import { useNavigate } from 'react-router-dom';
import { StatsCard } from '@/components/workforce/StatsCard';

const SupervisorDashboardV2 = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { data: insights, isLoading } = useDashboardInsights();

    if (isLoading) {
        return (
            <AppLayout>
                <div className="flex items-center justify-center min-h-[60vh]">
                    <div className="text-center space-y-4">
                        <Loader2 className="h-10 w-10 animate-spin mx-auto text-emerald-600" />
                        <p className="text-sm font-bold text-slate-500 uppercase tracking-widest">Optimizing Dashboard...</p>
                    </div>
                </div>
            </AppLayout>
        );
    }

    const summary = insights?.summary || { workersToday: 0, totalWorkToday: 0, alertsCount: 0 };
    const financials = insights?.financials || { pendingTotal: 0 };
    const displayEntries = insights?.todayEntries || [];
    const pendingLabourersCount = insights?.labourStats?.topDebts?.length || 0;

    return (
        <AppLayout>
            <div className="max-w-7xl mx-auto space-y-8 pb-12">
                {/* 🎯 Interview-Ready Header */}
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                    <div>
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-black uppercase tracking-widest mb-3 border border-emerald-100">
                            <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                            </span>
                            Live Site Intelligence
                        </div>
                        <h1 className="text-3xl font-black text-slate-900 tracking-tight">
                            Today's Overview
                        </h1>
                        <p className="text-slate-500 font-medium mt-1">
                            Focus on today's work & payments • {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'short' })}
                        </p>
                    </div>
                    
                    <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-slate-50 px-4 py-2 rounded-xl border border-slate-100">
                        <Calendar className="h-3 w-3" />
                        Shift: Daytime
                    </div>
                </div>

                {/* 🔝 1. Summary Cards (Meaningful Metrics) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <StatsCard 
                        icon={Users} 
                        label="Workers Today" 
                        value={summary.workersToday || 0} 
                        className="border-b-4 border-b-blue-500"
                    />
                    <StatsCard 
                        icon={TrendingUp} 
                        label="Work Done Today" 
                        value={`${summary.totalWorkToday || 0} Units`} 
                        className="border-b-4 border-b-emerald-500"
                        trendData={insights?.weeklySummary?.weeklyTrend}
                    />
                    <StatsCard 
                        icon={Wallet} 
                        label="Pending Payments" 
                        value={`${pendingLabourersCount} Labourers`} 
                        className="border-b-4 border-b-amber-500"
                    />
                    <StatsCard 
                        icon={ShieldAlert} 
                        label="Active Alerts" 
                        value={summary.alertsCount || 0} 
                        className={cn("border-b-4", (summary.alertsCount > 0) ? "border-b-rose-500" : "border-b-slate-200")}
                    />
                </div>

                {/* ⚡ 2. ONLY 3 Quick Actions (Simplified Labels) */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <Button 
                        onClick={() => navigate('/work-entries')}
                        className="group relative h-24 bg-white hover:bg-emerald-50 border-2 border-slate-100 hover:border-emerald-200 rounded-2xl flex flex-col items-center justify-center gap-2 transition-all overflow-hidden shadow-sm active:scale-95"
                    >
                        <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-20 transition-opacity">
                            <ClipboardPlus className="h-12 w-12 text-emerald-600" />
                        </div>
                        <div className="p-2 bg-emerald-100 rounded-lg text-emerald-600 group-hover:scale-110 transition-transform">
                            <Plus className="h-5 w-5" />
                        </div>
                        <span className="font-black text-slate-900 uppercase tracking-widest text-[10px]">+ Add Work</span>
                    </Button>

                    <Button 
                        onClick={() => navigate('/labourers')}
                        className="group relative h-24 bg-white hover:bg-blue-50 border-2 border-slate-100 hover:border-blue-200 rounded-2xl flex flex-col items-center justify-center gap-2 transition-all overflow-hidden shadow-sm active:scale-95"
                    >
                        <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-20 transition-opacity">
                            <UserPlus className="h-12 w-12 text-blue-600" />
                        </div>
                        <div className="p-2 bg-blue-100 rounded-lg text-blue-600 group-hover:scale-110 transition-transform">
                            <Users className="h-5 w-5" />
                        </div>
                        <span className="font-black text-slate-900 uppercase tracking-widest text-[10px]">👷 Add Labour</span>
                    </Button>

                    <Button 
                        onClick={() => navigate('/payments')}
                        className="group relative h-24 bg-white hover:bg-amber-50 border-2 border-slate-100 hover:border-amber-200 rounded-2xl flex flex-col items-center justify-center gap-2 transition-all overflow-hidden shadow-sm active:scale-95"
                    >
                        <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-20 transition-opacity">
                            <Banknote className="h-12 w-12 text-amber-600" />
                        </div>
                        <div className="p-2 bg-amber-100 rounded-lg text-amber-600 group-hover:scale-110 transition-transform">
                            <Wallet className="h-5 w-5" />
                        </div>
                        <span className="font-black text-slate-900 uppercase tracking-widest text-[10px]">💰 Pay Labour</span>
                    </Button>
                </div>

                <div className="grid lg:grid-cols-3 gap-8">
                    {/* 📋 3. TODAY’S WORK (Action-Driven Empty State) */}
                    <div className="lg:col-span-2 space-y-4">
                        <div className="flex items-center justify-between px-2">
                            <div className="flex items-center gap-2">
                                <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                                <h2 className="text-sm font-black uppercase tracking-widest text-slate-400">Today's Activity</h2>
                            </div>
                            <Button variant="ghost" size="sm" onClick={() => navigate('/work-entries')} className="text-[10px] font-bold text-emerald-600 hover:text-emerald-700 uppercase tracking-widest">
                                View All <ArrowRight className="h-3 w-3 ml-1" />
                            </Button>
                        </div>
                        
                        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead className="bg-slate-50/50 border-b border-slate-100">
                                        <tr>
                                            <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Labourer</th>
                                            <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Task</th>
                                            <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Volume</th>
                                            <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Earned</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50">
                                        {displayEntries.length === 0 ? (
                                            <tr>
                                                <td colSpan="4" className="px-6 py-16 text-center">
                                                    <div className="max-w-xs mx-auto space-y-3">
                                                        <p className="text-sm font-bold text-slate-400">No work added yet today</p>
                                                        <p className="text-[10px] font-medium text-slate-400 uppercase tracking-wider leading-relaxed">
                                                            👉 Click <span className="text-emerald-600 font-black">"+ Add Work"</span> above to start tracking
                                                        </p>
                                                    </div>
                                                </td>
                                            </tr>
                                        ) : (
                                            displayEntries.slice(0, 5).map((entry, idx) => (
                                                <tr key={idx} className="hover:bg-slate-50/50 transition-colors group">
                                                    <td className="px-6 py-4">
                                                        <span className="font-bold text-slate-900 group-hover:text-emerald-600 transition-colors">{entry.labourer?.name || 'Worker'}</span>
                                                    </td>
                                                    <td className="px-6 py-4 text-xs font-medium text-slate-500">{entry.task_type || 'General'}</td>
                                                    <td className="px-6 py-4">
                                                        <Badge variant="secondary" className="rounded-lg font-bold text-[10px]">
                                                            {entry.meters || 0} m
                                                        </Badge>
                                                    </td>
                                                    <td className="px-6 py-4 text-right font-black text-slate-900">
                                                        ₹{(entry.amount || 0).toLocaleString()}
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>

                    {/* 💰 4. Pending Payments (Focused List - Top 3) */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between px-2">
                            <div className="flex items-center gap-2">
                                <AlertTriangle className="h-5 w-5 text-amber-500" />
                                <h2 className="text-sm font-black uppercase tracking-widest text-slate-400">Attention Required</h2>
                            </div>
                        </div>

                        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 space-y-6">
                            {/* Payout Summary */}
                            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Total Outstanding</p>
                                <div className="flex items-end gap-2">
                                    <span className="text-2xl font-black text-slate-900">₹{financials.pendingTotal?.toLocaleString() || 0}</span>
                                    <span className="text-[10px] font-bold text-amber-600 pb-1 uppercase tracking-tighter">Needs Payout</span>
                                </div>
                            </div>

                            {/* Top Debts */}
                            <div className="space-y-4">
                                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-50 pb-2">Highest Pending</h3>
                                {insights?.labourStats?.topDebts?.length > 0 ? (
                                    insights.labourStats.topDebts.slice(0, 3).map((debt, idx) => (
                                        <div key={idx} className="flex items-center justify-between group">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center font-bold text-xs text-slate-500">
                                                    {debt.name[0]}
                                                </div>
                                                <div>
                                                    <p className="text-xs font-bold text-slate-900">{debt.name}</p>
                                                    <p className="text-[10px] font-medium text-slate-400">Balance: ₹{debt.balance.toLocaleString()}</p>
                                                </div>
                                            </div>
                                            <Button 
                                                variant="ghost" 
                                                size="sm" 
                                                className="h-8 w-8 p-0 rounded-full hover:bg-emerald-50 hover:text-emerald-600 transition-colors"
                                                onClick={() => navigate('/payments')}
                                            >
                                                <ArrowRight className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    ))
                                ) : (
                                    <p className="text-[10px] font-bold text-slate-300 italic py-4">No critical pending payments.</p>
                                )}
                            </div>

                            <Button 
                                variant="outline" 
                                className="w-full h-11 rounded-xl font-black uppercase tracking-widest text-[10px] border-slate-100 hover:bg-slate-50"
                                onClick={() => navigate('/payments')}
                            >
                                Manage All Payouts
                            </Button>
                        </div>
                    </div>
                </div>

                {/* 🚨 5. Smart Alerts (Lightweight) */}
                {insights?.alerts?.length > 0 && (
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 px-2">
                            <ShieldAlert className="h-5 w-5 text-rose-500" />
                            <h2 className="text-sm font-black uppercase tracking-widest text-slate-400">Critical Alerts</h2>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {insights.alerts.slice(0, 3).map((alert, idx) => (
                                <div 
                                    key={idx} 
                                    className={cn(
                                        "p-4 rounded-2xl border-l-4 flex gap-4 transition-all hover:scale-[1.02]",
                                        alert.severity === 'critical' ? "bg-rose-50 border-rose-500 border-y border-r border-rose-100" :
                                        alert.severity === 'warning' ? "bg-amber-50 border-amber-500 border-y border-r border-amber-100" :
                                        "bg-blue-50 border-blue-500 border-y border-r border-blue-100"
                                    )}
                                >
                                    <div className={cn(
                                        "p-2 rounded-xl shrink-0 h-10 w-10 flex items-center justify-center",
                                        alert.severity === 'critical' ? "bg-rose-100 text-rose-600" :
                                        alert.severity === 'warning' ? "bg-amber-100 text-amber-600" :
                                        "bg-blue-100 text-blue-600"
                                    )}>
                                        <AlertTriangle className="h-5 w-5" />
                                    </div>
                                    <div>
                                        <h4 className="text-xs font-black uppercase tracking-widest text-slate-900">{alert.title}</h4>
                                        <p className="text-xs font-medium text-slate-600 mt-1 leading-relaxed">{alert.message}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </AppLayout>
    );
};

export default SupervisorDashboardV2;
