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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, History, User, Activity, Clock } from "lucide-react";
import { AppLayout } from "@/components/AppLayout";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import { API_BASE } from "@/lib/api";


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
        switch (action) {
            case 'CREATE':
            case 'CREATE_MANUAL_PAYMENT':
                return <Badge className="bg-success/10 text-success border-success/20">CREATE</Badge>;
            case 'UPDATE':
                return <Badge className="bg-info/10 text-info border-info/20">UPDATE</Badge>;
            case 'APPROVE':
            case 'VERIFY_PAYMENT':
                return <Badge className="bg-success text-white">APPROVE</Badge>;
            case 'REJECT':
                return <Badge variant="destructive">REJECT</Badge>;
            case 'DELETE':
                return <Badge variant="destructive">DELETE</Badge>;
            default:
                return <Badge variant="outline">{action}</Badge>;
        }
    };

    return (
        <AppLayout>
            <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 space-y-3 md:space-y-6">
                <div className="relative -mx-3 sm:-mx-4 md:-mx-6 px-3 sm:px-4 md:px-6 pt-6 lg:pt-8 pb-8 gradient-hero rounded-b-3xl border-white/10 border-b">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse-soft" />
                            <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground/80">System Activity</span>
                        </div>
                        <h1 className="text-xl sm:text-2xl md:text-3xl font-semibold tracking-tight text-foreground">Audit Logs</h1>
                        <p className="text-muted-foreground mt-1 text-xs sm:text-sm md:text-base font-medium">
                            Review system changes and user actions
                        </p>
                    </div>
                </div>

                <div className="bg-card rounded-2xl border shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        {isLoading ? (
                            <div className="flex items-center justify-center p-12">
                                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                            </div>
                        ) : logs?.length > 0 ? (
                            <Table>
                                <TableHeader className="bg-muted/40">
                                    <TableRow>
                                        <TableHead className="text-[10px] uppercase font-bold tracking-wider">Time</TableHead>
                                        <TableHead className="text-[10px] uppercase font-bold tracking-wider">User</TableHead>
                                        <TableHead className="text-[10px] uppercase font-bold tracking-wider">Action</TableHead>
                                        <TableHead className="text-[10px] uppercase font-bold tracking-wider">Resource</TableHead>
                                        <TableHead className="text-[10px] uppercase font-bold tracking-wider">Details</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {logs.map((log) => (
                                        <TableRow key={log.id} className="hover:bg-muted/30 transition-colors">
                                            <TableCell className="text-xs font-medium whitespace-nowrap">
                                                {new Date(log.created_at).toLocaleString()}
                                            </TableCell>
                                            <TableCell className="text-xs font-semibold">
                                                {log.profiles?.full_name || 'System'}
                                            </TableCell>
                                            <TableCell>
                                                {getActionBadge(log.action)}
                                            </TableCell>
                                            <TableCell className="text-xs text-muted-foreground whitespace-nowrap">{log.entity_type}</TableCell>
                                            <TableCell className="text-xs max-w-xs truncate" title={JSON.stringify(log.details)}>
                                                {log.entity_id ? `#${log.entity_id.substring(0, 8)}...` : JSON.stringify(log.details)}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        ) : (
                            <div className="flex flex-col items-center justify-center p-12 text-center">
                                <Activity className="h-8 w-8 text-muted-foreground mb-4" />
                                <h3 className="text-lg font-semibold">No Logs Found</h3>
                                <p className="text-muted-foreground max-w-sm text-sm">
                                    Activity logs will appear here once critical actions are performed.
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </AppLayout>
    );
};

export default AuditLog;
