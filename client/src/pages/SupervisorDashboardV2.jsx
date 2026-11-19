import React from 'react';
import { useTranslation } from 'react-i18next';
import { AppLayout } from '@/layouts/AppLayout';
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
import { cn } from '@/features/shared/utils/utils';
import { useDashboardInsights } from '@/features/admin/hooks/useDashboardInsights';
import { useNavigate } from 'react-router-dom';
import { StatsCard } from '@/features/workforce/components/StatsCard';

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
            <div className="space-y-8 pb-12 animate-fade-in">
                {/* 🎯 Premium Header */}
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 relative">
                    <div className="relative z-10">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-700 text-[10px] font-black uppercase tracking-widest mb-3 border border-emerald-200/50 backdrop-blur-md animate-slide-down">
                            <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                            </span>
                            Live Site Intelligence
                        </div>
                        <h1 className="text-4xl font-black text-slate-900 tracking-tight leading-none">
                            Today's <span className="text-emerald-600">Overview</span>
                        </h1>
                        <p className="text-slate-500 font-medium mt-3 flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-emerald-500" />
                            {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'short' })} • Shift: Daytime
                        </p>
                    </div>
                    
                    <div className="flex items-center gap-3 animate-slide-up">
                        <div className="hidden md:flex flex-col items-end mr-4">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">System Status</span>
                            <span className="text-xs font-bold text-emerald-600">All Nodes Operational</span>
                        </div>
                        <Button 
                            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-11 px-6 rounded-2xl shadow-glow hover:shadow-glow-sm transition-all"
                            onClick={() => navigate('/work-entries')}
                        >
                            <Plus className="h-4 w-4 mr-2" />
                            New Record
                        </Button>
                    </div>
                </div>

                {/* 🔝 1. Summary Cards (Meaningful Metrics) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <StatsCard 
                        icon={Users} 
                        label="Workers Today" 
                        value={summary.workersToday || 0} 
                        className="glass-strong border-b-4 border-b-blue-500 hover-lift"
                    />
                    <StatsCard 
                        icon={TrendingUp} 
                        label="Work Done Today" 
                        value={`${summary.totalWorkToday || 0} Units`} 
                        className="glass-strong border-b-4 border-b-emerald-500 hover-lift"
                        trendData={insights?.weeklySummary?.weeklyTrend}
                    />
                    <StatsCard 
                        icon={Wallet} 
                        label="Pending Payments" 
                        value={`${pendingLabourersCount} Labourers`} 
                        className="glass-strong border-b-4 border-b-amber-500 hover-lift"
                    />
                    <StatsCard 
                        icon={ShieldAlert} 
                        label="Active Alerts" 
                        value={summary.alertsCount || 0} 
                        className={cn("glass-strong border-b-4 hover-lift", (summary.alertsCount > 0) ? "border-b-rose-500 shadow-rose-100" : "border-b-slate-200")}
                    />
                </div>

                {/* ⚡ 2. Action Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <Button 
                        onClick={() => navigate('/work-entries')}
                        className="group relative h-28 bg-white hover:bg-emerald-50/50 border border-slate-100 hover:border-emerald-200 rounded-[2rem] flex flex-col items-center justify-center gap-2 transition-all overflow-hidden shadow-soft hover:shadow-md active:scale-95"
                    >
                        <div className="absolute -top-4 -right-4 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                            <ClipboardPlus className="h-24 w-24 text-emerald-600" />
                        </div>
                        <div className="p-3 bg-emerald-100/50 rounded-2xl text-emerald-600 group-hover:scale-110 group-hover:bg-emerald-600 group-hover:text-white transition-all duration-300">
                            <ClipboardPlus className="h-6 w-6" />
                        </div>
                        <span className="font-black text-slate-900 uppercase tracking-widest text-[11px]">Log Daily Work</span>
                    </Button>

                    <Button 
                        onClick={() => navigate('/labourers')}
                        className="group relative h-28 bg-white hover:bg-blue-50/50 border border-slate-100 hover:border-blue-200 rounded-[2rem] flex flex-col items-center justify-center gap-2 transition-all overflow-hidden shadow-soft hover:shadow-md active:scale-95"
                    >
                        <div className="absolute -top-4 -right-4 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                            <Users className="h-24 w-24 text-blue-600" />
                        </div>
                        <div className="p-3 bg-blue-100/50 rounded-2xl text-blue-600 group-hover:scale-110 group-hover:bg-blue-600 group-hover:text-white transition-all duration-300">
                            <UserPlus className="h-6 w-6" />
                        </div>
                        <span className="font-black text-slate-900 uppercase tracking-widest text-[11px]">Manage Workforce</span>
                    </Button>

                    <Button 
                        onClick={() => navigate('/payments')}
                        className="group relative h-28 bg-white hover:bg-amber-50/50 border border-slate-100 hover:border-amber-200 rounded-[2rem] flex flex-col items-center justify-center gap-2 transition-all overflow-hidden shadow-soft hover:shadow-md active:scale-95"
                    >
                        <div className="absolute -top-4 -right-4 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                            <Banknote className="h-24 w-24 text-amber-600" />
                        </div>
                        <div className="p-3 bg-amber-100/50 rounded-2xl text-amber-600 group-hover:scale-110 group-hover:bg-amber-600 group-hover:text-white transition-all duration-300">
                            <Wallet className="h-6 w-6" />
                        </div>
                        <span className="font-black text-slate-900 uppercase tracking-widest text-[11px]">Payout Gateway</span>
                    </Button>
                </div>

                <div className="grid lg:grid-cols-3 gap-8">
                    {/* 📋 3. TODAY’S ACTIVITY */}
                    <div className="lg:col-span-2 space-y-4">
                        <div className="flex items-center justify-between px-2">
                            <div className="flex items-center gap-2">
                                <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                                <h2 className="text-sm font-black uppercase tracking-widest text-slate-400">Live Activity Log</h2>
                            </div>
                            <Button variant="ghost" size="sm" onClick={() => navigate('/work-entries')} className="text-[10px] font-black text-emerald-600 hover:bg-emerald-50 uppercase tracking-widest px-4 rounded-xl transition-all">
                                View Full History <ArrowRight className="h-3 w-3 ml-2" />
                            </Button>
                        </div>
                        
                        <div className="glass-strong rounded-[2.5rem] shadow-soft overflow-hidden animate-slide-up">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead className="bg-slate-50/50 border-b border-slate-100">
                                        <tr>
                                            <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Labourer</th>
                                            <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Task Detail</th>
                                            <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Volume</th>
                                            <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Earned</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50">
                                        {displayEntries.length === 0 ? (
                                            <tr>
                                                <td colSpan="4" className="px-6 py-20 text-center">
                                                    <div className="max-w-xs mx-auto space-y-4">
                                                        <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto">
                                                            <ClipboardPlus className="h-8 w-8 text-slate-300" />
                                                        </div>
                                                        <div>
                                                            <p className="text-sm font-bold text-slate-600">Silence on Site</p>
                                                            <p className="text-[10px] font-medium text-slate-400 uppercase tracking-wider leading-relaxed mt-1">
                                                                No work logs recorded yet for today.
                                                            </p>
                                                        </div>
                                                        <Button 
                                                            size="sm" 
                                                            variant="outline" 
                                                            className="rounded-xl font-bold text-[10px] uppercase tracking-widest h-9 border-slate-100 hover:bg-slate-50"
                                                            onClick={() => navigate('/work-entries')}
                                                        >
                                                            Start Logging
                                                        </Button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ) : (
                                            displayEntries.slice(0, 5).map((entry, idx) => (
                                                <tr key={idx} className="hover:bg-emerald-50/30 transition-colors group">
                                                    <td className="px-8 py-5">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center font-bold text-[10px] text-slate-500 group-hover:bg-emerald-100 group-hover:text-emerald-600 transition-colors">
                                                                {(entry.labourer?.name || 'W')[0]}
                                                            </div>
                                                            <span className="font-bold text-slate-900 group-hover:text-emerald-700 transition-colors">{entry.labourer?.name || 'Worker'}</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-5">
                                                        <span className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-600 text-[10px] font-bold uppercase tracking-tight group-hover:bg-emerald-100/50 group-hover:text-emerald-600 transition-colors">
                                                            {entry.task_type || 'General'}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-5">
                                                        <span className="font-black text-slate-700 text-xs">
                                                            {entry.meters || 0} <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">m</span>
                                                        </span>
                                                    </td>
                                                    <td className="px-8 py-5 text-right font-black text-slate-900">
                                                        <div className="flex items-center justify-end gap-1">
                                                            <span className="text-[10px] text-slate-400 font-bold">₹</span>
                                                            {(entry.amount || 0).toLocaleString()}
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>

                    {/* 💰 4. PAYOUT GATEWAY */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between px-2">
                            <div className="flex items-center gap-2">
                                <AlertTriangle className="h-5 w-5 text-amber-500" />
                                <h2 className="text-sm font-black uppercase tracking-widest text-slate-400">Payout Hub</h2>
                            </div>
                        </div>

                        <div className="glass-strong rounded-[2.5rem] shadow-soft p-8 space-y-8 animate-slide-up">
                            {/* Payout Summary */}
                            <div className="relative overflow-hidden bg-slate-900 rounded-3xl p-6 text-white shadow-lg">
                                <div className="absolute -top-10 -right-10 w-32 h-32 bg-emerald-500/20 rounded-full blur-3xl" />
                                <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest mb-1">Total Outstanding</p>
                                <div className="flex items-baseline gap-2">
                                    <span className="text-3xl font-black tracking-tighter">₹{financials.pendingTotal?.toLocaleString() || 0}</span>
                                    <Badge className="bg-emerald-500/20 text-emerald-400 border-none text-[8px] font-black uppercase py-0 px-2">Ready</Badge>
                                </div>
                                <p className="text-[10px] font-bold text-slate-400 mt-4 leading-none">Net liability across all projects</p>
                            </div>

                            {/* Top Debts */}
                            <div className="space-y-5">
                                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-50 pb-2">Priority Payouts</h3>
                                {insights?.labourStats?.topDebts?.length > 0 ? (
                                    insights.labourStats.topDebts.slice(0, 3).map((debt, idx) => (
                                        <div key={idx} className="flex items-center justify-between group hover:translate-x-1 transition-transform">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-2xl bg-amber-50 flex items-center justify-center font-black text-xs text-amber-600 group-hover:bg-amber-600 group-hover:text-white transition-all duration-300">
                                                    {debt.name[0]}
                                                </div>
                                                <div>
                                                    <p className="text-xs font-black text-slate-900">{debt.name}</p>
                                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">₹{debt.balance.toLocaleString()} Pending</p>
                                                </div>
                                            </div>
                                            <Button 
                                                variant="ghost" 
                                                size="sm" 
                                                className="h-9 w-9 p-0 rounded-xl hover:bg-emerald-50 hover:text-emerald-600 transition-colors"
                                                onClick={() => navigate('/payments')}
                                            >
                                                <ArrowRight className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    ))
                                ) : (
                                    <div className="py-6 text-center">
                                        <CheckCircle2 className="h-8 w-8 text-emerald-100 mx-auto mb-2" />
                                        <p className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">Accounts Cleared</p>
                                    </div>
                                )}
                            </div>

                            <Button 
                                className="w-full h-12 rounded-2xl font-black uppercase tracking-widest text-[10px] bg-slate-900 hover:bg-slate-800 text-white shadow-md active:scale-[0.98] transition-all"
                                onClick={() => navigate('/payments')}
                            >
                                Process All Payouts
                            </Button>
                        </div>
                    </div>
                </div>

                {/* 🚨 5. SMART ALERTS */}
                {insights?.alerts?.length > 0 && (
                    <div className="space-y-4 animate-slide-up">
                        <div className="flex items-center gap-2 px-2">
                            <ShieldAlert className="h-5 w-5 text-rose-500" />
                            <h2 className="text-sm font-black uppercase tracking-widest text-slate-400">Critical Intelligence</h2>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {insights.alerts.slice(0, 3).map((alert, idx) => (
                                <div 
                                    key={idx} 
                                    className={cn(
                                        "p-6 rounded-[2rem] border transition-all hover:scale-[1.02] shadow-soft",
                                        alert.severity === 'critical' ? "bg-rose-50/50 border-rose-100" :
                                        alert.severity === 'warning' ? "bg-amber-50/50 border-amber-100" :
                                        "bg-blue-50/50 border-blue-100"
                                    )}
                                >
                                    <div className="flex items-start gap-4">
                                        <div className={cn(
                                            "p-3 rounded-2xl shrink-0 h-12 w-12 flex items-center justify-center shadow-sm",
                                            alert.severity === 'critical' ? "bg-rose-100 text-rose-600" :
                                            alert.severity === 'warning' ? "bg-amber-100 text-amber-600" :
                                            "bg-blue-100 text-blue-600"
                                        )}>
                                            <AlertTriangle className="h-6 w-6" />
                                        </div>
                                        <div>
                                            <h4 className="text-[11px] font-black uppercase tracking-widest text-slate-900 leading-tight">{alert.title}</h4>
                                            <p className="text-xs font-medium text-slate-600 mt-2 leading-relaxed">{alert.message}</p>
                                        </div>
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
