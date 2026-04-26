import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Loader2, History, User, Activity, Clock, ShieldCheck, Terminal } from "lucide-react";
import { AppLayout } from "@/components/AppLayout";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import { API_BASE } from "@/lib/api";
import { cn } from '@/lib/utils';

const AuditLog = () => {
    const { t } = useTranslation();
    const { user } = useAuth();

    const { data: logs, isLoading } = useQuery({
        queryKey: ['audit_logs', user?.organization_id],
        queryFn: async () => {
            const { data: { session } } = await supabase.auth.getSession();
            const token = session?.access_token;

            try {
                const response = await fetch(`${API_BASE}/api/audit`, {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });

                if (!response.ok) {
                    const errorBody = await response.json().catch(() => ({}));
                    throw new Error(errorBody.message || `Failed to fetch audit logs: ${response.status}`);
                }
                return response.json();
            } catch (error) {
                console.error('[AuditLog] Fetch error:', error);
                throw error;
            }
        },
        enabled: !!user && !!user.organization_id && user.organization_id !== 'null' && user.organization_id !== 'undefined'
    });

    const getActionBadge = (action) => {
        const variants = {
            CREATE: 'bg-emerald-50 text-emerald-700 border-emerald-100',
            CREATE_MANUAL_PAYMENT: 'bg-emerald-50 text-emerald-700 border-emerald-100',
            UPDATE: 'bg-blue-50 text-blue-700 border-blue-100',
            APPROVE: 'bg-emerald-600 text-white border-transparent',
            VERIFY_PAYMENT: 'bg-emerald-600 text-white border-transparent',
            REJECT: 'bg-red-50 text-red-700 border-red-100',
            DELETE: 'bg-red-600 text-white border-transparent',
        };
        
        return (
            <span className={cn(
                "px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border whitespace-nowrap",
                variants[action] || 'bg-slate-50 text-slate-600 border-slate-100'
            )}>
                {action.replace(/_/g, ' ')}
            </span>
        );
    };

    return (
        <AppLayout>
            <div className="space-y-8">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <Terminal className="h-4 w-4 text-emerald-600" />
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">System Governance</span>
                        </div>
                        <h1 className="text-2xl font-black text-slate-900 tracking-tight">Audit Trail</h1>
                        <p className="text-sm text-slate-500 font-medium">Monitoring sensitive operations and administrative changes.</p>
                    </div>
                </div>

                {/* Summary Cards (Simulated/Placeholders for look) */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-600">
                            <History className="h-6 w-6" />
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Logged Events</p>
                            <p className="text-xl font-black text-slate-900">{logs?.length || 0}</p>
                        </div>
                    </div>
                    <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-600">
                            <ShieldCheck className="h-6 w-6" />
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Compliance Status</p>
                            <p className="text-xl font-black text-emerald-600">VERIFIED</p>
                        </div>
                    </div>
                    <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600">
                            <Clock className="h-6 w-6" />
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Retention Period</p>
                            <p className="text-xl font-black text-slate-900">90 DAYS</p>
                        </div>
                    </div>
                </div>

                {/* Table Section */}
                <div className="bg-white rounded-[32px] border border-slate-100 shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        {isLoading ? (
                            <div className="flex flex-col items-center justify-center p-20 gap-4">
                                <Loader2 className="h-10 w-10 animate-spin text-emerald-600" />
                                <p className="text-xs font-black text-slate-400 uppercase tracking-widest animate-pulse">Decrypting Logs...</p>
                            </div>
                        ) : logs?.length > 0 ? (
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-slate-50 border-slate-100 hover:bg-slate-50">
                                        <TableHead className="py-5 pl-8 text-[10px] font-black uppercase tracking-widest text-slate-400">Timestamp</TableHead>
                                        <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-400">Identity</TableHead>
                                        <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-400">Operation</TableHead>
                                        <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-400">Resource Type</TableHead>
                                        <TableHead className="pr-8 text-[10px] font-black uppercase tracking-widest text-slate-400">Target ID</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {logs.map((log) => (
                                        <TableRow key={log.id} className="border-slate-50 hover:bg-slate-50/50 transition-all group">
                                            <TableCell className="pl-8 py-5">
                                                <div className="flex flex-col">
                                                    <span className="font-bold text-slate-900 text-xs">{new Date(log.created_at).toLocaleDateString()}</span>
                                                    <span className="text-[10px] font-medium text-slate-400">{new Date(log.created_at).toLocaleTimeString()}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-2">
                                                    <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center">
                                                        <User className="h-3 w-3 text-slate-500" />
                                                    </div>
                                                    <span className="font-bold text-slate-700 text-xs">
                                                        {log.profiles?.full_name || 'System / Auto'}
                                                    </span>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                {getActionBadge(log.action)}
                                            </TableCell>
                                            <TableCell>
                                                <span className="font-black text-[10px] text-slate-400 uppercase tracking-tighter">
                                                    {log.entity_type}
                                                </span>
                                            </TableCell>
                                            <TableCell className="pr-8">
                                                <span className="font-mono text-[10px] font-bold text-slate-500 group-hover:text-emerald-600 transition-colors">
                                                    {log.entity_id ? `${log.entity_id.substring(0, 8)}...` : 'N/A'}
                                                </span>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        ) : (
                            <div className="flex flex-col items-center justify-center p-20 text-center space-y-4">
                                <div className="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center text-slate-200">
                                    <Activity className="h-8 w-8" />
                                </div>
                                <div>
                                    <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">No Activity Recorded</h3>
                                    <p className="text-xs text-slate-400 font-medium mt-1 max-w-xs mx-auto">
                                        System-wide changes and administrative actions will be indexed here for audit review.
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </AppLayout>
    );
};

export default AuditLog;
