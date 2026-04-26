import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { AppLayout } from '@/components/AppLayout';
import { useCommandCenter } from '@/hooks/useCommandCenter';
import { ActivityFeed } from '@/components/ActivityFeed';
import { QuickActionsGrid } from '@/components/QuickActionsGrid';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Zap, 
    Plus, 
    Bell, 
    TrendingUp, 
    Users, 
    Briefcase, 
    Clock, 
    UserPlus, 
    ClipboardPlus, 
    Settings, 
    LayoutDashboard,
    Search,
    Filter,
    ArrowUpRight,
    MapPin,
    Calendar,
    Sparkles,
    RotateCcw,
    TrendingDown,
    Settings2,
    Activity,
    CloudOff,
    ShieldAlert,
    AlertCircle,
    ArrowRight,
    Award,
    Target,
    CheckCircle2,
    CreditCard,
    BarChart3,
    Loader2
} from 'lucide-react';
import { workService } from '@/services/workService';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { 
    Tooltip, 
    TooltipContent, 
    TooltipProvider, 
    TooltipTrigger 
} from '@/components/ui/tooltip';
import { API_BASE } from '@/lib/api';

const CommandCenter = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { data, isLoading, error, refetch } = useCommandCenter();
    const [isSettling, setIsSettling] = useState(false);
    const [isUndoing, setIsUndoing] = useState(false);
    const [showUndo, setShowUndo] = useState(false);

    useEffect(() => {
        const triggerSync = async () => {
            const synced = await workService.syncOfflineEntries();
            if (synced) {
                toast.success("Offline entries synced successfully!");
                refetch();
            }
        };
        triggerSync();
        window.addEventListener('online', triggerSync);

        // Real-time Activity & Alert Listener
        const channel = supabase
            .channel('dashboard-realtime')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'activities' },
                () => {
                    refetch();
                }
            )
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'work_entries' },
                () => {
                    refetch();
                }
            )
            .subscribe();

        return () => {
            window.removeEventListener('online', triggerSync);
            supabase.removeChannel(channel);
        };
    }, []);

    if (isLoading) {
        return (
            <AppLayout>
                <div className="space-y-6">
                    <div className="h-10 w-48 bg-muted animate-pulse rounded-lg" />
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                        {Array.from({ length: 4 }).map((_, i) => (
                            <div key={i} className="h-32 bg-muted animate-pulse rounded-2xl" />
                        ))}
                    </div>
                </div>
            </AppLayout>
        );
    }

    const { summary = {}, suggestedAction = null, todayActions = [], alerts = [], projectStatus = [], labourStats = {}, financials = {}, activityFeed = [], weeklySummary = null } = data || {};

    const handleExport = async () => {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const response = await fetch(`${API_BASE}/api/work/export-weekly`, {
                headers: { 'Authorization': `Bearer ${session?.access_token}` }
            });
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `ShramFlow_Report_${new Date().toISOString().split('T')[0]}.csv`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            toast.success("Weekly report downloaded successfully!");
        } catch (err) {
            toast.error("Failed to download report");
        }
    };

    const handleAutoSettle = async () => {
        setIsSettling(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const response = await fetch(`${API_BASE}/api/payment/auto-settle`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session?.access_token}`
                },
                body: JSON.stringify({ global: true })
            });

            if (!response.ok) throw new Error('Settlement failed');
            const result = await response.json();
            
            toast.success(`Successfully settled ₹${financials.pendingTotal?.toLocaleString()}. ${result.settled_count} payments created.`);
            refetch();
        } catch (err) {
            toast.error(err.message);
        } finally {
            setIsSettling(false);
        }
    };

    const handleUndo = async () => {
        setIsUndoing(true);
        try {
            await workService.undoLastEntry();
            toast.success("Last work entry undone successfully");
            refetch();
            setShowUndo(false);
        } catch (err) {
            toast.error(err.message || "Failed to undo. Window may have expired.");
        } finally {
            setIsUndoing(false);
        }
    };

    const quickActions = [
        { icon: UserPlus, label: "Add Labour", onClick: () => navigate('/labourers') },
        { icon: ClipboardPlus, label: "Add Work", onClick: () => navigate('/work-entries') },
        { icon: CreditCard, label: "Make Payment", onClick: () => navigate('/payments') },
        { icon: BarChart3, label: "View Reports", onClick: () => navigate('/reports') },
    ];

    return (
        <TooltipProvider>
            <AppLayout>
                <div className="space-y-8">
                    {/* Header */}
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex flex-col gap-1">
                            <h1 className="text-2xl font-bold text-foreground tracking-tight">Command Center</h1>
                            <p className="text-sm text-muted-foreground font-medium">Real-time overview of your labor operations.</p>
                        </div>
                        
                        <div className="flex items-center gap-3">
                            {(showUndo || (data?.lastEntryAge < 600)) && (
                                <Button 
                                    variant="outline" 
                                    size="sm" 
                                    className="rounded-xl h-10 px-4 font-bold border-red-200 text-red-600 hover:bg-red-50"
                                    onClick={handleUndo}
                                    disabled={isUndoing}
                                >
                                    <RotateCcw className="h-4 w-4 mr-2" strokeWidth={2.5} />
                                    Undo Last Entry
                                </Button>
                            )}
                            <Button variant="outline" size="sm" className="rounded-xl h-10 px-4 font-bold border-border">
                                <Settings2 className="h-4 w-4 mr-2" strokeWidth={2.5} />
                                Settings
                            </Button>
                        </div>
                    </div>

                    {/* Stats Strip */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="bg-white p-5 rounded-2xl border border-border shadow-sm flex items-center gap-4">
                            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                                <Briefcase className="h-5 w-5" strokeWidth={2.5} />
                            </div>
                            <div>
                                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Projects</p>
                                <p className="text-xl font-bold tracking-tight">{summary.activeProjects || 0}</p>
                            </div>
                        </div>
                        <div className="bg-white p-5 rounded-2xl border border-border shadow-sm flex items-center gap-4">
                            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                                <Users className="h-5 w-5" strokeWidth={2.5} />
                            </div>
                            <div>
                                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Workers</p>
                                <p className="text-xl font-bold tracking-tight">{summary.workersToday || 0}</p>
                            </div>
                        </div>
                        <div className="bg-white p-5 rounded-2xl border border-border shadow-sm flex items-center gap-4">
                            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                                <Zap className="h-5 w-5" strokeWidth={2.5} />
                            </div>
                            <div>
                                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Work Today</p>
                                <p className="text-xl font-bold tracking-tight">{summary.totalWorkToday || 0}m</p>
                            </div>
                        </div>
                        <div className="bg-white p-5 rounded-2xl border border-border shadow-sm flex items-center gap-4">
                            <div className="w-10 h-10 rounded-xl bg-red-50 text-red-600 flex items-center justify-center shrink-0">
                                <Bell className="h-5 w-5" strokeWidth={2.5} />
                            </div>
                            <div>
                                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Alerts</p>
                                <p className="text-xl font-bold tracking-tight">{summary.alertsCount || 0}</p>
                            </div>
                        </div>
                    </div>

                    <div className="grid lg:grid-cols-3 gap-8">
                        {/* Main Column */}
                        <div className="lg:col-span-2 space-y-8">
                            {/* AI Suggested Action */}
                            <AnimatePresence>
                                {suggestedAction && (
                                    <motion.div 
                                        initial={{ opacity: 0, y: 10, scale: 0.98 }}
                                        animate={{ opacity: 1, y: 0, scale: 1 }}
                                        exit={{ opacity: 0, scale: 0.95 }}
                                        className={cn(
                                            "p-6 rounded-2xl border flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-sm",
                                            suggestedAction.type === 'critical' ? "bg-red-50 border-red-100" : 
                                            suggestedAction.type === 'warning' ? "bg-amber-50 border-amber-100" :
                                            "bg-emerald-50 border-emerald-100"
                                        )}
                                    >
                                        <div className="flex items-start gap-4">
                                            <div className={cn(
                                                "w-12 h-12 rounded-xl flex items-center justify-center shrink-0 shadow-sm",
                                                suggestedAction.type === 'critical' ? "bg-red-600 text-white" : 
                                                suggestedAction.type === 'warning' ? "bg-amber-500 text-white" :
                                                "bg-emerald-600 text-white"
                                            )}>
                                                <Sparkles className="h-6 w-6" strokeWidth={2.5} />
                                            </div>
                                            <div className="space-y-1">
                                                <div className="flex items-center gap-2">
                                                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-60">AI Smart Suggestion</p>
                                                    <Badge variant="outline" className="text-[8px] h-4 bg-white/50 border-none">BETA</Badge>
                                                </div>
                                                <h4 className="text-base font-bold text-foreground leading-tight tracking-tight">{suggestedAction.message}</h4>
                                            </div>
                                        </div>
                                        <Button 
                                            className={cn(
                                                "h-12 px-8 rounded-xl font-bold text-white shrink-0 shadow-lg active:scale-95 transition-transform",
                                                suggestedAction.type === 'critical' ? "bg-red-600 hover:bg-red-700" : 
                                                suggestedAction.type === 'warning' ? "bg-amber-500 hover:bg-amber-600" :
                                                "bg-emerald-600 hover:bg-emerald-700"
                                            )}
                                            onClick={() => suggestedAction.projectId ? navigate(`/projects/${suggestedAction.projectId}`) : null}
                                        >
                                            {suggestedAction.cta}
                                            <ArrowRight className="h-4 w-4 ml-2" strokeWidth={3} />
                                        </Button>
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            {/* Active Projects */}
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Active Projects</h3>
                                    <Button variant="ghost" size="sm" onClick={() => navigate('/projects')} className="text-emerald-600 hover:bg-emerald-50 font-bold">
                                        View All
                                    </Button>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {projectStatus.map((project) => (
                                        <div key={project.id} className="bg-white p-6 rounded-2xl border border-border shadow-sm hover:border-emerald-200 transition-all group">
                                            <div className="flex justify-between items-start mb-6">
                                                <div className="space-y-1">
                                                    <h4 className="font-bold text-base text-foreground group-hover:text-emerald-700 transition-colors">{project.name}</h4>
                                                    <Badge variant="outline" className="text-[10px] font-bold uppercase border-emerald-100 text-emerald-600 bg-emerald-50/50">
                                                        {project.status}
                                                    </Badge>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Labour</p>
                                                    <p className="text-xl font-bold text-foreground">{project.activeLabour}</p>
                                                </div>
                                            </div>
                                            <div className="space-y-3">
                                                <div className="flex justify-between text-[10px] font-bold text-muted-foreground uppercase">
                                                    <span>Completion</span>
                                                    <span>{project.progress.toFixed(0)}%</span>
                                                </div>
                                                <Progress value={project.progress} className="h-2 bg-muted overflow-hidden rounded-full" />
                                            </div>
                                            <div className="flex items-center justify-between pt-6 mt-6 border-t border-border/50">
                                                <div className="flex items-center gap-2">
                                                    <TrendingUp className="h-4 w-4 text-emerald-500" />
                                                    <span className="text-xs font-bold text-foreground">{project.efficiency} <span className="text-muted-foreground font-medium">units / day</span></span>
                                                </div>
                                                <Button size="sm" variant="ghost" className="h-8 px-3 rounded-lg text-xs font-bold text-emerald-600 hover:bg-emerald-50" onClick={() => navigate(`/projects/${project.id}`)}>
                                                    Manage
                                                </Button>
                                            </div>
                                        </div>
                                    ))}
                                    <button 
                                        className="border-2 border-dashed border-border rounded-2xl flex flex-col items-center justify-center p-8 text-center cursor-pointer hover:border-emerald-300 hover:bg-emerald-50/30 transition-all group min-h-[200px]"
                                        onClick={() => navigate('/projects')}
                                    >
                                        <div className="w-12 h-12 rounded-full bg-muted/50 flex items-center justify-center group-hover:bg-emerald-100 transition-colors mb-3">
                                            <Plus className="h-6 w-6 text-muted-foreground group-hover:text-emerald-600" strokeWidth={2.5} />
                                        </div>
                                        <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest group-hover:text-emerald-700">New Project</p>
                                    </button>
                                </div>
                            </div>

                            {/* Settlement Banner */}
                            <div className="bg-emerald-900 rounded-3xl p-8 text-white relative overflow-hidden shadow-xl">
                                <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-800 rounded-full -mr-32 -mt-32 opacity-20" />
                                <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-8">
                                    <div className="space-y-3">
                                        <p className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest">Financial Settlement</p>
                                        <h3 className="text-4xl font-black tracking-tight">₹{financials.pendingTotal?.toLocaleString() || 0}</h3>
                                        <p className="text-sm text-emerald-100/80 font-medium max-w-md leading-relaxed">
                                            Clear all pending dues across all projects with one click. Automated reconciliation active.
                                        </p>
                                    </div>
                                    <Button 
                                        size="lg" 
                                        className="h-14 px-10 rounded-2xl bg-white text-emerald-900 hover:bg-emerald-50 font-bold shadow-lg transition-transform active:scale-95"
                                        onClick={handleAutoSettle}
                                        disabled={isSettling || !financials.pendingTotal}
                                    >
                                        {isSettling ? (
                                            <><Loader2 className="h-5 w-5 mr-3 animate-spin" /> Settling...</>
                                        ) : (
                                            "Settle All Dues Now"
                                        )}
                                    </Button>
                                </div>
                            </div>
                        </div>

                        {/* Sidebar */}
                        <div className="space-y-8">
                            <section className="space-y-4">
                                <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Quick Actions</h3>
                                <QuickActionsGrid actions={quickActions} />
                            </section>

                            <section className="space-y-4">
                                <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest flex items-center justify-between">
                                    Alerts & Compliance
                                    <Badge className="bg-red-500 text-white border-none rounded-full px-2 py-0.5 text-[10px] font-black">{alerts.length}</Badge>
                                </h3>
                                <div className="space-y-3">
                                    {alerts.map((alert) => (
                                        <div key={alert.id} className="p-4 rounded-xl border border-border bg-white shadow-sm flex gap-4 hover:border-red-200 transition-colors">
                                            <div className={cn(
                                                "w-10 h-10 rounded-xl flex items-center justify-center shrink-0",
                                                alert.severity === 'critical' ? "bg-red-50 text-red-600" : "bg-amber-50 text-amber-600"
                                            )}>
                                                <AlertCircle className="h-5 w-5" strokeWidth={2.5} />
                                            </div>
                                            <div className="min-w-0">
                                                <h4 className="font-bold text-xs text-foreground leading-tight">{alert.title}</h4>
                                                <p className="text-[10px] text-muted-foreground mt-1 line-clamp-2 leading-relaxed">{alert.message}</p>
                                            </div>
                                        </div>
                                    ))}
                                    {alerts.length === 0 && (
                                        <div className="p-6 text-center bg-white rounded-xl border border-dashed border-border">
                                            <CheckCircle2 className="h-6 w-6 text-emerald-500 mx-auto mb-2" />
                                            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">System healthy</p>
                                        </div>
                                    )}
                                </div>
                            </section>

                            <section className="space-y-4">
                                <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Recent Activity</h3>
                                <div className="bg-white rounded-2xl border border-border p-2 min-h-[400px]">
                                    <ActivityFeed 
                                        activities={activityFeed.map(a => ({
                                            ...a,
                                            messageHindi: a.message_hindi || a.message,
                                            timestamp: a.created_at
                                        }))} 
                                    />
                                </div>
                            </section>
                        </div>
                    </div>
                </div>
            </AppLayout>
        </TooltipProvider>
    );
};

export default CommandCenter;
