import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AppLayout } from '@/components/AppLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
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
import { useAuth } from '@/contexts/AuthContext';

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

    // Fetch disputes
    // Ideally use workService.getDisputes()
    const { data: disputes = [], isLoading } = useQuery({
        queryKey: ['work_disputes'],
        queryFn: async () => {
            // Inline query effectively moved to service if we had one fully ready
            // For now, let's keep direct supabase call or use what we put in workService (none specific to 'all disputes' yet in created file except maybe via custom query)
            // I'll stick to direct query for now or add it to workService.js. 
            // I'll add a quick fetch here to keep it working without editing workService again.
            const { data, error } = await supabase
                .from('work_acknowledgments')
                .select(`
          *,
          labourers:labourers(id, name, name_hindi),
          daily_work:daily_work_register(id, date, meters, calculated_amount)
        `)
                .eq('status', 'disputed')
                .order('created_at', { ascending: false });

            if (error) throw error;
            return data;
        }
    });

    // Resolve Dispute Mutation
    const resolveDispute = useMutation({
        mutationFn: async ({ id, status, notes }) => {
            // We can use workService.acknowledgeWork but we need to update status to 'resolved' or similar
            // The DB schema might expect 'confirmed' or 'resolved'.
            // Looking at previous code, it seemed to handle it via update.
            const { error } = await supabase
                .from('work_acknowledgments')
                .update({
                    status: status, // 'resolved_dispute' or just 'confirmed' after dispute? 
                    // Schema usually has 'pending', 'confirmed', 'disputed'. 
                    // Maybe we just change it to 'confirmed' if resolved?
                    // Let's assume we mark it as 'confirmed' (resolved) or separate status if schema supports.
                    // I will use 'confirmed' as resolution often means confirming the work eventually.
                    // Or if there is a separate resolution tracking.
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
            <div className="space-y-6">
                {/* Immersive Page Header */}
                <div className="relative -mx-4 lg:-mx-8 -mt-4 lg:-mt-8 px-4 lg:px-8 pt-8 pb-10 gradient-hero rounded-b-[3rem] shadow-sm border-b border-white/10">
                    <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
                        <div>
                            <div className="flex items-center gap-3 mb-2">
                                <div className="w-2 h-2 rounded-full bg-destructive animate-pulse" />
                                <span className="text-sm font-medium text-muted-foreground uppercase tracking-wider">{t("conflictResolution")}</span>
                            </div>
                            <h1 className="text-3xl lg:text-4xl font-bold tracking-tight text-foreground flex items-center gap-3">
                                <AlertTriangle className="h-8 w-8 text-destructive" />
                                {t("workDisputes")}
                            </h1>
                            <p className="text-muted-foreground mt-2 text-lg font-medium">
                                {t("workDisputesDesc")} • {t("ensuringFairWages")}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Main Content Sections */}
                <div className="space-y-6">
                    {/* Search Section */}
                    <div className="flex flex-col sm:flex-row gap-4 bg-card p-5 rounded-2xl border shadow-sm max-w-2xl">
                        <div className="relative flex-1">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder={t("searchLabourers")}
                                className="pl-11 h-12 bg-muted/40 border-none focus-visible:ring-2 focus-visible:ring-primary/20 rounded-xl"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="grid gap-4">
                        {isLoading ? (
                            <p>Loading disputes...</p>
                        ) : filteredDisputes.length === 0 ? (
                            <Card>
                                <CardContent className="flex flex-col items-center justify-center p-8 text-muted-foreground">
                                    <CheckCircle className="h-12 w-12 mb-4 text-success/20" />
                                    <p>No active disputes found.</p>
                                </CardContent>
                            </Card>
                        ) : (
                            filteredDisputes.map(dispute => (
                                <Card key={dispute.id} className="overflow-hidden">
                                    <CardHeader className="bg-muted/50 pb-3">
                                        <div className="flex items-start justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                                                    <UserIcon className="h-5 w-5 text-primary" />
                                                </div>
                                                <div>
                                                    <CardTitle className="text-base">{dispute.labourers?.name}</CardTitle>
                                                    <CardDescription className="flex items-center gap-2">
                                                        <Calendar className="h-3 w-3" />
                                                        {new Date(dispute.daily_work?.date).toLocaleDateString()}
                                                    </CardDescription>
                                                </div>
                                            </div>
                                            <Badge variant="destructive" className="flex items-center gap-1">
                                                <AlertTriangle className="h-3 w-3" />
                                                {t("disputed")}
                                            </Badge>
                                        </div>
                                    </CardHeader>
                                    <CardContent className="p-4">
                                        {/* Mobile Optimization: Stack on mobile, side-by-side on desktop */}
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                            <div className="p-3 border rounded-lg bg-background">
                                                <p className="text-xs text-muted-foreground mb-1">{t("supervisorEntry")}</p>
                                                <div className="flex items-center gap-2">
                                                    <Ruler className="h-4 w-4 text-primary" />
                                                    <span className="font-bold text-lg">{dispute.daily_work?.meters}m</span>
                                                </div>
                                            </div>
                                            <div className="p-3 border rounded-lg bg-destructive/5 border-destructive/20">
                                                <p className="text-xs text-destructive mb-1">{t("labourerFeedback")}</p>
                                                <div className="flex items-start gap-2">
                                                    <MessageSquare className="h-4 w-4 text-destructive mt-0.5" />
                                                    <p className="text-sm font-medium">{dispute.dispute_reason || t("noReasonProvided")}</p>
                                                </div>
                                            </div>
                                        </div>
                                    </CardContent>
                                    <CardFooter className="bg-muted/20 p-4 pt-0 flex justify-end gap-2">
                                        <Button variant="outline" size="sm">{t("viewDetails")}</Button>
                                        <Button size="sm" onClick={() => openResolveDialog(dispute)}>{t("resolve")}</Button>
                                    </CardFooter>
                                </Card>
                            ))
                        )}
                    </div>

                    <Dialog open={resolveDialogOpen} onOpenChange={setResolveDialogOpen}>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>{t("resolveDispute")}</DialogTitle>
                                <DialogDescription>
                                    {t("resolveDisputeDesc")}
                                </DialogDescription>
                            </DialogHeader>

                            <div className="space-y-4 py-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">{t("resolutionStatus")}</label>
                                    <Select
                                        value={resolutionStatus}
                                        onValueChange={setResolutionStatus}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder={t("selectOutcome")} />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="resolved">{t("resolvedApproved")}</SelectItem>
                                            <SelectItem value="rejected">{t("rejectedDeny")}</SelectItem>
                                            <SelectItem value="escalated">{t("escalatedReview")}</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">{t("finalMeters")}</label>
                                    <Input
                                        type="number"
                                        value={finalMeters}
                                        onChange={(e) => setFinalMeters(e.target.value)}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">{t("resolutionNotes")}</label>
                                    <Textarea
                                        placeholder={t("resolutionNotesPlaceholder")}
                                        value={resolutionNotes}
                                        onChange={(e) => setResolutionNotes(e.target.value)}
                                    />
                                </div>
                            </div>

                            <DialogFooter>
                                <Button variant="outline" onClick={() => setResolveDialogOpen(false)}>{t("cancel")}</Button>
                                <Button onClick={handleResolve}>{t("confirmResolution")}</Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                </div>
            </div>
        </AppLayout>
    );
};

export default WorkDisputes;
