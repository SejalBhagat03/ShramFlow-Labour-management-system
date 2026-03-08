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
import { supabase } from "@/lib/supabase";
import { API_BASE } from "@/lib/api";


const AuditLog = () => {
    const { t } = useTranslation();

    const { data: logs, isLoading } = useQuery({
        queryKey: ['audit_logs'],
        queryFn: async () => {
            const { data: { session } } = await supabase.auth.getSession();
            const token = session?.access_token;

            const response = await fetch(`${API_BASE}/api/audit`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) throw new Error('Failed to fetch audit logs');
            return response.json();
        }
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
            <div className="p-6 max-w-7xl mx-auto space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-3">
                            <History className="h-8 w-8 text-primary" />
                            Activity Audit Logs
                        </h1>
                        <p className="text-muted-foreground mt-1">
                            Track all critical actions performed by supervisors in your organization.
                        </p>
                    </div>
                </div>

                <Card className="shadow-card border-none bg-card/50 backdrop-blur-sm">
                    <CardHeader className="pb-3 border-b">
                        <CardTitle className="text-lg flex items-center gap-2">
                            <Activity className="h-5 w-5 text-primary" />
                            System Activities
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        {isLoading ? (
                            <div className="flex items-center justify-center p-12">
                                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                            </div>
                        ) : logs?.length > 0 ? (
                            <div className="overflow-x-auto">
                                <Table>
                                    <TableHeader className="bg-muted/30">
                                        <TableRow>
                                            <TableHead className="w-[180px]">Timestamp</TableHead>
                                            <TableHead>Supervisor</TableHead>
                                            <TableHead>Action</TableHead>
                                            <TableHead>Entity</TableHead>
                                            <TableHead>Entity ID</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {logs.map((log) => (
                                            <TableRow key={log.id} className="hover:bg-muted/50 transition-colors">
                                                <TableCell className="font-medium text-muted-foreground whitespace-nowrap">
                                                    <div className="flex items-center gap-2">
                                                        <Clock className="h-3 w-3" />
                                                        {new Date(log.created_at).toLocaleString()}
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex items-center gap-2">
                                                        <User className="h-4 w-4 text-muted-foreground" />
                                                        {log.profiles?.full_name || 'System'}
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    {getActionBadge(log.action)}
                                                </TableCell>
                                                <TableCell>
                                                    <span className="font-semibold text-foreground">
                                                        {log.entity_type}
                                                    </span>
                                                </TableCell>
                                                <TableCell className="font-mono text-xs text-muted-foreground">
                                                    #{log.entity_id.substring(0, 8)}...
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center p-12 text-center">
                                <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-4">
                                    <Activity className="h-8 w-8 text-muted-foreground" />
                                </div>
                                <h3 className="text-lg font-semibold">No Logs Found</h3>
                                <p className="text-muted-foreground max-w-sm">
                                    Activity logs will appear here once critical actions are performed.
                                </p>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </AppLayout>
    );
};

export default AuditLog;
