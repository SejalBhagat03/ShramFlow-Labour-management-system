import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AppLayout } from '@/components/AppLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import {
    AlertTriangle,
    CheckCircle,
    XCircle,
    Search,
    MessageSquare,
    Ruler,
    Calendar,
    User as UserIcon,
    ArrowRight
} from 'lucide-react';
import { supabase } from '@/lib/supabase'; // Can move to service later if fully refactored
import { workService } from '@/services/workService'; // Assuming we create methods for disputes here
import { useAuth } from '@/hooks/useAuth';

/**
 * WorkDisputes Page
 * Allows supervisors to view and resolve work disputes raised by labourers.
 */
const WorkDisputes = () => {
    const { t } = useTranslation();
    const { user } = useAuth();
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedDispute, setSelectedDispute] = useState(null);
    const [resolveDialogOpen, setResolveDialogOpen] = useState(false);
    const [resolutionNotes, setResolutionNotes] = useState('');
    const [finalMeters, setFinalMeters] = useState('');
    const [resolutionStatus, setResolutionStatus] = useState('resolved');

    const { data: disputes = [], isLoading } = useQuery({
        queryKey: ['work_disputes', user?.organization_id],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('work_acknowledgments')
                .select('*,labourers:labourers!inner(id,name,name_hindi),daily_work:work_entries(id,date,meters,amount)')
                .eq('status', 'disputed')
                .order('created_at', { ascending: false });

            if (error) throw error;
            return data;
        }
    });

    const resolveDispute = useMutation({
        mutationFn: async ({ id, status, notes }) => {
            const { error } = await supabase
                .from('work_acknowledgments')
                .update({
                    status: status,
                    notes: notes,
                    responded_at: new Date().toISOString()
                })
                .eq('id', id);

            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['work_disputes'] });
            toast({
                title: 'Dispute Resolved',
                description: 'The dispute has been processed successfully.',
            });
            setResolveDialogOpen(false);
            setSelectedDispute(null);
        },
        onError: (error) => {
            toast({
                title: 'Error',
                description: error.message,
                variant: 'destructive',
            });
        }
    });

    const handleResolve = () => {
        if (!selectedDispute) return;
        resolveDispute.mutate({
            id: selectedDispute.id,
            status: resolutionStatus,
            notes: resolutionNotes
        });
    };

    const filteredDisputes = disputes.filter(dispute =>
        dispute.labourers?.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const openResolveDialog = (dispute) => {
        setSelectedDispute(dispute);
        setResolutionNotes('');
        setFinalMeters(dispute.daily_work?.meters?.toString() || '');
        setResolveDialogOpen(true);
    };

    return (
        <AppLayout>
            <div className="space-y-8">
                {/* Header */}
                <div>
                    <h1 className="text-2xl font-bold text-foreground tracking-tight flex items-center gap-2">
                        {t("workDisputes")}
                    </h1>
                    <p className="text-sm text-muted-foreground mt-1">
                        {t("workDisputesDesc")} • Resolving issues fairly.
                    </p>
                </div>

                {/* Search & Actions */}
                <div className="flex items-center gap-4">
                    <div className="relative flex-1 max-w-md">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder={t("searchLabourers")}
                            className="pl-10 h-10 bg-white border-border rounded-xl text-sm"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>

                <div className="grid gap-4">
                    {isLoading ? (
                        <div className="space-y-4">
                            {[1, 2, 3].map(i => <div key={i} className="h-32 bg-white border border-border animate-pulse rounded-2xl" />)}
                        </div>
                    ) : filteredDisputes.length === 0 ? (
                        <div className="bg-white border-2 border-dashed border-border rounded-2xl p-12 text-center">
                            <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-4">
                                <CheckCircle className="h-8 w-8" />
                            </div>
                            <h3 className="text-lg font-bold text-foreground">All clear!</h3>
                            <p className="text-sm text-muted-foreground mt-1">No active disputes found at this time.</p>
                        </div>
                    ) : (
                        filteredDisputes.map(dispute => (
                            <div key={dispute.id} className="bg-white border border-border rounded-2xl shadow-sm overflow-hidden flex flex-col md:flex-row md:items-center">
                                <div className="p-6 flex-1 flex items-center gap-4 border-b md:border-b-0 md:border-r border-border">
                                    <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                                        {dispute.labourers?.name?.[0]}
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-foreground">{dispute.labourers?.name}</h3>
                                        <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground font-medium">
                                            <span className="flex items-center gap-1">
                                                <Calendar className="h-3 w-3" />
                                                {new Date(dispute.daily_work?.date).toLocaleDateString()}
                                            </span>
                                            <span className="flex items-center gap-1">
                                                <Ruler className="h-3 w-3" />
                                                {dispute.daily_work?.meters}m
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <div className="p-6 flex-[2] bg-red-50/30">
                                    <div className="flex items-start gap-3">
                                        <div className="w-6 h-6 rounded-full bg-red-100 text-red-600 flex items-center justify-center shrink-0 mt-0.5">
                                            <MessageSquare className="h-3 w-3" />
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-bold text-red-600 uppercase tracking-widest mb-1">Labourer's Reason</p>
                                            <p className="text-sm text-foreground font-medium italic leading-relaxed">
                                                "{dispute.dispute_reason || "I believe the measurements recorded are incorrect."}"
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div className="p-6 shrink-0 flex gap-2 justify-end bg-muted/20 md:bg-transparent">
                                    <Button variant="outline" className="rounded-xl font-bold h-10 px-6">Details</Button>
                                    <Button className="rounded-xl font-bold h-10 px-6" onClick={() => openResolveDialog(dispute)}>{t("resolve")}</Button>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                <Dialog open={resolveDialogOpen} onOpenChange={setResolveDialogOpen}>
                    <DialogContent className="sm:max-w-md rounded-2xl border-none p-0 overflow-hidden shadow-2xl">
                        <div className="p-6 border-b border-border">
                            <DialogTitle className="text-xl font-bold">{t("resolveDispute")}</DialogTitle>
                            <DialogDescription className="text-xs font-medium text-muted-foreground mt-1">
                                Carefully review the measurement and set the final approved quantity.
                            </DialogDescription>
                        </div>

                        <div className="p-6 space-y-6">
                            <div className="grid gap-2">
                                <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{t("resolutionStatus")}</Label>
                                <Select value={resolutionStatus} onValueChange={setResolutionStatus}>
                                    <SelectTrigger className="h-11 rounded-xl text-sm font-medium border-border">
                                        <SelectValue placeholder={t("selectOutcome")} />
                                    </SelectTrigger>
                                    <SelectContent className="rounded-xl">
                                        <SelectItem value="resolved">{t("resolvedApproved")}</SelectItem>
                                        <SelectItem value="rejected">{t("rejectedDeny")}</SelectItem>
                                        <SelectItem value="escalated">{t("escalatedReview")}</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="grid gap-2">
                                <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{t("finalMeters")}</Label>
                                <Input
                                    type="number"
                                    value={finalMeters}
                                    onChange={(e) => setFinalMeters(e.target.value)}
                                    className="h-11 rounded-xl text-sm font-medium border-border"
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{t("resolutionNotes")}</Label>
                                <Textarea
                                    placeholder="Briefly explain the resolution for the worker..."
                                    value={resolutionNotes}
                                    onChange={(e) => setResolutionNotes(e.target.value)}
                                    className="min-h-[100px] rounded-xl text-sm font-medium border-border resize-none"
                                />
                            </div>
                        </div>

                        <div className="p-6 bg-muted/20 flex justify-end gap-3 border-t border-border">
                            <Button variant="ghost" className="rounded-xl font-bold h-11 px-6" onClick={() => setResolveDialogOpen(false)}>{t("cancel")}</Button>
                            <Button className="rounded-xl font-bold h-11 px-8" onClick={handleResolve}>{t("confirmResolution")}</Button>
                        </div>
                    </DialogContent>
                </Dialog>
            </div>
        </AppLayout>
    );
};

export default WorkDisputes;
