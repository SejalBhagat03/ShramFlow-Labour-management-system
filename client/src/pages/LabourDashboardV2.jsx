import { useTranslation } from 'react-i18next';
import { AppLayout } from '@/layouts/AppLayout';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useLabourAssignments } from '@/features/work/hooks/useLabourAssignments';
import { useUpdateLabourClaim } from '@/features/work/hooks/useUpdateLabourClaim';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, Wallet, TrendingUp, CheckCircle2 } from 'lucide-react';
import { useLabourFinancials } from '@/features/workforce/hooks/useLabourFinancials';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/features/shared/utils/utils';
import { useState, useEffect } from 'react';
/**
 * Labour dashboard v2 allows a labourer to view assigned work,
 * submit labour_claims and see confirmed work/payment.
 */
const LabourDashboardV2 = () => {
    const { t } = useTranslation();
    const { user } = useAuth();
    const { assignments = [], isLoading } = useLabourAssignments({ labourerId: user?.id });
    const { data: financials, isLoading: isFinLoading } = useLabourFinancials();
    const updateClaimMutation = useUpdateLabourClaim();

    // local state for form values per assignment id
    const [claimValues, setClaimValues] = useState({});

    useEffect(() => {
        // when assignments load, ensure we have an entry for each
        const initial = {};
        assignments.forEach(a => {
            initial[a.id] = a.labour_claim || '';
        });
        setClaimValues(initial);
    }, [assignments]);

    const handleChange = (id, value) => {
        // allow only numbers
        const num = (value || '').replace(/[^0-9]/g, '');
        setClaimValues(prev => ({ ...prev, [id]: num }));
    };

    const handleSubmit = (a) => {
        const val = Number(claimValues[a.id] || 0);
        if (val > a.assigned_quantity) {
            alert('Cannot claim more than assigned quantity');
            return;
        }
        updateClaimMutation.mutate({ assignmentId: a.id, claim: val });
    };

    const pending = assignments.filter(a => a.status !== 'confirmed');
    const confirmed = assignments.filter(a => a.status === 'confirmed');

    return (
        <AppLayout>
            <div className="space-y-6 md:space-y-10 pb-12 animate-fade-in">
                {/* 🎯 Premium Hero Header */}
                <div className="relative overflow-hidden rounded-[2.5rem] bg-slate-900 p-8 md:p-12 text-white shadow-2xl">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl -mr-20 -mt-20 animate-pulse-soft" />
                    <div className="absolute bottom-0 left-0 w-48 h-48 bg-blue-500/10 rounded-full blur-3xl -ml-20 -mb-20" />
                    
                    <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                        <div>
                            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-black uppercase tracking-widest mb-4 border border-emerald-500/30 backdrop-blur-md">
                                <span className="relative flex h-2 w-2">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                                </span>
                                Worker Profile: Active
                            </div>
                            <h1 className="text-3xl md:text-5xl font-black tracking-tight leading-none mb-2">
                                {t("yourAssignments", "Work Assignments")}
                            </h1>
                            <p className="text-slate-400 font-medium text-sm md:text-lg max-w-md">
                                {t("trackWorkAndSubmitClaims", "Track your daily performance and submit payment claims.")}
                            </p>
                        </div>
                        
                        <div className="flex gap-4">
                            <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-4 text-center min-w-[100px]">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Status</p>
                                <p className="text-xs font-bold text-emerald-400">Verified</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* 📊 Financial Overview (High Contrast) */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 animate-slide-up">
                    <div className="glass-strong rounded-3xl p-6 border-l-4 border-l-emerald-500 shadow-soft hover-lift">
                        <div className="flex items-center justify-between mb-4">
                            <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-600">
                                <TrendingUp className="h-6 w-6" />
                            </div>
                            <Badge className="bg-emerald-100 text-emerald-700 border-none font-black text-[8px] uppercase">Lifetime</Badge>
                        </div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t("totalEarned", "Total Earned")}</p>
                        <h3 className="text-2xl font-black text-slate-900 mt-1">
                            {isFinLoading ? "..." : `₹${(financials?.totalEarned || 0).toLocaleString()}`}
                        </h3>
                    </div>

                    <div className="glass-strong rounded-3xl p-6 border-l-4 border-l-blue-500 shadow-soft hover-lift">
                        <div className="flex items-center justify-between mb-4">
                            <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600">
                                <CheckCircle2 className="h-6 w-6" />
                            </div>
                            <Badge className="bg-blue-100 text-blue-700 border-none font-black text-[8px] uppercase">Received</Badge>
                        </div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t("totalPaid", "Total Paid")}</p>
                        <h3 className="text-2xl font-black text-slate-900 mt-1">
                            {isFinLoading ? "..." : `₹${(financials?.totalPaid || 0).toLocaleString()}`}
                        </h3>
                    </div>

                    <div className="bg-slate-900 rounded-3xl p-6 shadow-lg hover-lift group">
                        <div className="flex items-center justify-between mb-4">
                            <div className="w-12 h-12 rounded-2xl bg-emerald-500 flex items-center justify-center text-white group-hover:scale-110 transition-transform">
                                <Wallet className="h-6 w-6" />
                            </div>
                            <Badge className="bg-emerald-500 text-white border-none font-black text-[8px] uppercase">Pending</Badge>
                        </div>
                        <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">{t("currentBalance", "Current Balance")}</p>
                        <h3 className="text-2xl font-black text-white mt-1">
                            {isFinLoading ? "..." : `₹${(financials?.balance || 0).toLocaleString()}`}
                        </h3>
                    </div>
                </div>

                {isLoading ? (
                    <div className="py-20 text-center">
                        <Loader2 className="h-10 w-10 animate-spin mx-auto text-emerald-600 mb-4" />
                        <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Loading Assignments...</p>
                    </div>
                ) : assignments.length === 0 ? (
                    <div className="glass-strong rounded-[2.5rem] p-20 text-center animate-slide-up">
                        <Loader2 className="h-12 w-12 text-slate-200 mx-auto mb-4" />
                        <h3 className="text-lg font-bold text-slate-600">No Assignments Yet</h3>
                        <p className="text-xs text-slate-400 mt-1 uppercase font-bold tracking-widest">Your supervisor will assign work shortly.</p>
                    </div>
                ) : (
                    <>
                        {/* pending / claim table */}
                        <div className="space-y-4 animate-slide-up">
                            <div className="flex items-center gap-2 px-2">
                                <TrendingUp className="h-5 w-5 text-emerald-500" />
                                <h2 className="text-sm font-black uppercase tracking-widest text-slate-400">{t("pendingClaimableWork", "Pending Claims")}</h2>
                            </div>
                            
                            <div className="glass-strong rounded-[2.5rem] shadow-soft overflow-hidden">
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left">
                                        <thead className="bg-slate-50/50 border-b border-slate-100">
                                            <tr>
                                                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">{t("workEntry", "Work Type")}</th>
                                                <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">{t("assigned", "Assigned")}</th>
                                                <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">{t("yourClaim", "Your Claim")}</th>
                                                <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">{t("status", "Status")}</th>
                                                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">{t("actions", "Action")}</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-50">
                                            {pending.map(a => (
                                                <tr key={a.id} className="hover:bg-emerald-50/30 transition-colors group">
                                                    <td className="px-8 py-6">
                                                        <div className="font-black text-slate-900 text-sm group-hover:text-emerald-700 transition-colors">
                                                            {a.work_order?.work_type}
                                                        </div>
                                                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-tight mt-1">
                                                            Total: {a.work_order?.total_quantity} {a.work_order?.unit}
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-6">
                                                        <span className="font-black text-slate-700 text-sm">
                                                            {a.assigned_quantity} <span className="text-[10px] font-bold text-slate-400 uppercase">{a.work_order?.unit}</span>
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-6">
                                                        <Input
                                                            className="w-24 h-10 rounded-xl border-slate-200 focus:border-emerald-500 focus:ring-emerald-500/20 font-black text-sm transition-all"
                                                            type="number"
                                                            value={claimValues[a.id] || ''}
                                                            onChange={(e) => handleChange(a.id, e.target.value)}
                                                            placeholder="0"
                                                        />
                                                    </td>
                                                    <td className="px-6 py-6">
                                                        <span className={cn(
                                                            "px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border",
                                                            a.status === 'pending' ? "bg-amber-50 text-amber-600 border-amber-100" : "bg-emerald-50 text-emerald-600 border-emerald-100"
                                                        )}>
                                                            {a.status}
                                                        </span>
                                                    </td>
                                                    <td className="px-8 py-6 text-right">
                                                        <Button
                                                            className="h-10 px-6 rounded-xl font-black uppercase tracking-widest text-[10px] bg-emerald-600 hover:bg-emerald-700 text-white shadow-glow-sm hover:shadow-glow transition-all active:scale-95"
                                                            onClick={() => handleSubmit(a)}
                                                            disabled={updateClaimMutation.isLoading}
                                                        >
                                                            {updateClaimMutation.isLoading ? (
                                                                <Loader2 className="h-4 w-4 animate-spin" />
                                                            ) : (
                                                                t("submit", "Confirm")
                                                            )}
                                                        </Button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>

                        {/* confirmed section */}
                        {confirmed.length > 0 && (
                            <div className="space-y-4 animate-slide-up">
                                <div className="flex items-center gap-2 px-2">
                                    <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                                    <h2 className="text-sm font-black uppercase tracking-widest text-slate-400">{t("confirmedWorkPayment", "Confirmed History")}</h2>
                                </div>
                                
                                <div className="glass-strong rounded-[2.5rem] shadow-soft overflow-hidden">
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left">
                                            <thead className="bg-slate-50/50 border-b border-slate-100">
                                                <tr>
                                                    <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">{t("workEntry", "Work Type")}</th>
                                                    <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">{t("labourerClaimed", "Claimed")}</th>
                                                    <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">{t("unit", "Unit")}</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-50">
                                                {confirmed.map(a => (
                                                    <tr key={a.id} className="hover:bg-slate-50/50 transition-colors group">
                                                        <td className="px-8 py-5">
                                                            <span className="font-bold text-slate-900">{a.work_order?.work_type}</span>
                                                        </td>
                                                        <td className="px-6 py-5">
                                                            <span className="font-black text-slate-700 text-sm">{a.labour_claim}</span>
                                                        </td>
                                                        <td className="px-8 py-5 text-right">
                                                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{a.work_order?.unit}</span>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>
        </AppLayout>
    );
};

export default LabourDashboardV2;
