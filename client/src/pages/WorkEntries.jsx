import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AppLayout } from '@/components/AppLayout';
import { useWorkEntries } from '@/hooks/useWorkEntries';
import { useLabourers } from '@/hooks/useLabourers';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
    Search,
    Filter,
    ClipboardPlus,
    CheckCircle,
    Clock,
    AlertTriangle,
    Calendar,
    MapPin,
    Ruler,
    Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';
import { Users } from 'lucide-react';
import { TrustScoreBadge } from '@/components/TrustScoreBadge';
import { translationService } from '@/services/translationService';


const taskTypes = [
    'Brick Laying',
    'Wall Painting',
    'Wiring',
    'Pipe Fitting',
    'Material Transport',
    'Carpentry',
    'Plastering',
    'Flooring',
    'Roofing',
    'Other',
];

/**
 * WorkEntries page component for tracking and managing individual work records.
 * Allows supervisors to record work done by labourers, approve entries, or flag them for review.
 *
 * @returns {JSX.Element} The WorkEntries page component.
 */
const WorkEntries = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { workEntries, isLoading, createWorkEntry, approveWorkEntry, approveBulkWorkEntries, flagWorkEntry } = useWorkEntries();
    const { labourers } = useLabourers();
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);

    // Form state
    const [formData, setFormData] = useState({
        labourer_id: '',
        date: new Date().toISOString().split('T')[0],
        task_type: '',
        meters: undefined,
        hours: undefined,
        amount: 0,
        location: '',
        description: ''
    });

    const filteredEntries = workEntries.filter((entry) => {
        const labourerName = entry.labourer?.name || '';
        const matchesSearch =
            labourerName.toLowerCase().includes(search.toLowerCase()) ||
            entry.task_type.toLowerCase().includes(search.toLowerCase());
        const matchesStatus = statusFilter === 'all' || entry.status === statusFilter;
        return matchesSearch && matchesStatus;
    });

    const getStatusBadge = (status) => {
        const styles = {
            approved: 'bg-success/10 text-success border-success/20',
            submitted: 'bg-info/10 text-info border-info/20',
            pending: 'bg-warning/10 text-warning border-warning/20',
            rejected: 'bg-destructive/10 text-destructive border-destructive/20',
            flagged: 'bg-destructive/10 text-destructive border-destructive/20',
            paid: 'bg-primary/10 text-primary border-primary/20',
            draft: 'bg-muted text-muted-foreground border-muted',
        };
        const icons = {
            approved: CheckCircle,
            submitted: Clock,
            pending: Clock,
            rejected: AlertTriangle,
            flagged: AlertTriangle,
            paid: CheckCircle,
            draft: Clock,
        };
        const Icon = icons[status] || Clock;
        const colorClass = styles[status] || styles.pending;

        return (
            <Badge variant="outline" className={cn('gap-1', colorClass)}>
                <Icon className="h-3 w-3" />
                {status.charAt(0).toUpperCase() + status.slice(1)}
            </Badge>
        );
    };

    const getTrustIndicator = (entry) => {
        // Since we don't store score directly in work_entries yet (it's in logs), 
        // we can infer it or just show the labourer's overall reliability if we want.
        // But the user wanted entry-level trust. 
        // For now, I'll show the labourer's trust score as a hint.
        return <TrustScoreBadge labourerId={entry.labourer_id} size="sm" />;
    };


    const handleSave = async () => {
        if (!formData.labourer_id || !formData.task_type) return;
        await createWorkEntry.mutateAsync(formData);
        setIsAddModalOpen(false);
        resetForm();
    };

    const resetForm = () => {
        setFormData({
            labourer_id: '',
            date: new Date().toISOString().split('T')[0],
            task_type: '',
            meters: undefined,
            hours: undefined,
            amount: 0,
            location: '',
            description: ''
        });
    };

    const handleAutoTranslateDescription = async () => {
        if (!formData.description) return;
        try {
            const hindiDesc = await translationService.translateText(formData.description, 'hi');
            if (hindiDesc && hindiDesc !== formData.description) {
                setFormData(prev => ({ ...prev, description: `${formData.description}\n\n[Hindi: ${hindiDesc}]` }));
            }
        } catch (error) {
            if (import.meta.env.DEV) console.error("Auto-translation failed:", error);
        }
    };

    const handleApprove = (entry) => {
        approveWorkEntry.mutate(entry.id);
    };

    const handleFlag = (entry) => {
        const reason = prompt('Enter reason for flagging:');
        if (reason) {
            flagWorkEntry.mutate({ id: entry.id, reason });
        }
    };

    // Calculate amount based on labourer daily rate and hours/meters
    const calculateAmount = () => {
        const labourer = labourers.find(l => l.id === formData.labourer_id);
        if (!labourer) return 0;

        if (formData.hours) {
            return (labourer.daily_rate / 8) * formData.hours;
        }
        if (formData.meters) {
            const rate = labourer.rate_per_meter || 0; // Use rate_per_meter from labourer
            return formData.meters * rate;
        }
        return labourer.daily_rate;
    };

    return (
        <AppLayout>
            <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 space-y-3 md:space-y-6">
                {/* Immersive Page Header */}
                <div className="relative -mx-3 sm:-mx-4 md:-mx-6 px-3 sm:px-4 md:px-6 pt-6 lg:pt-8 pb-8 gradient-hero rounded-b-3xl border-b border-white/10">
                    <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 md:gap-6">
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse-soft" />
                                <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground/80">Project Tracking</span>
                            </div>
                            <h1 className="text-xl sm:text-2xl md:text-3xl font-semibold tracking-tight text-foreground">{t('workEntries')}</h1>
                            <p className="text-muted-foreground mt-1 text-xs sm:text-sm md:text-base font-medium">
                                {filteredEntries.length} entries recorded • Track progress & approve work
                            </p>
                        </div>
                        <div className="flex items-center gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                className="py-2.5 px-3 rounded-xl bg-background/50 backdrop-blur-sm border text-xs font-bold h-auto"
                                onClick={() => setIsAddModalOpen(true)}
                            >
                                <ClipboardPlus className="h-3.5 w-3.5 sm:mr-2" />
                                <span className="hidden sm:inline">{t('singleLabour')}</span>
                            </Button>
                            <Button
                                size="sm"
                                className="py-2.5 px-4 rounded-xl gradient-primary shadow-glow text-xs font-bold h-auto"
                                onClick={() => navigate('/work-entries/group')}
                            >
                                <Users className="h-3.5 w-3.5 sm:mr-2" />
                                <span className="hidden sm:inline">{t('groupEntryMultiLabour')}</span>
                                <span className="sm:hidden">Group</span>
                            </Button>
                        </div>
                    </div>
                </div>

                {/* Main Content Sections */}
                <div className="space-y-6">
                    {/* Filters Section */}
                    <div className="flex flex-col sm:flex-row gap-3 md:gap-6 bg-card p-4 md:p-6 rounded-2xl border shadow-sm">
                        <div className="relative flex-1">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder={`${t('search')} by name, task...`}
                                className="pl-11 py-2 px-3 h-10 md:h-11 bg-muted/40 border-none focus-visible:ring-1 focus-visible:ring-primary/20 rounded-xl text-xs sm:text-sm"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                            />
                        </div>
                        <Select value={statusFilter} onValueChange={setStatusFilter}>
                            <SelectTrigger className="w-full sm:w-48 h-10 md:h-11 bg-muted/40 border-none rounded-xl px-4 text-xs">
                                <div className="flex items-center gap-2">
                                    <Filter className="h-3.5 w-3.5 text-muted-foreground" />
                                    <SelectValue placeholder={t('status')} />
                                </div>
                            </SelectTrigger>
                            <SelectContent className="rounded-xl">
                                <SelectItem value="all">All Status</SelectItem>
                                <SelectItem value="submitted">Submitted</SelectItem>
                                <SelectItem value="approved">Approved</SelectItem>
                                <SelectItem value="rejected">Rejected</SelectItem>
                                <SelectItem value="paid">Paid</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Entries List */}
                    {isLoading ? (
                        <div className="space-y-3">
                            {Array.from({ length: 5 }).map((_, i) => (
                                <Skeleton key={i} className="h-32 rounded-xl" />
                            ))}
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {Object.entries(
                                filteredEntries.reduce((groups, entry) => {
                                    const key = entry.group_id || `single-${entry.id}`;
                                    if (!groups[key]) groups[key] = [];
                                    groups[key].push(entry);
                                    return groups;
                                }, {})
                            ).map(([groupId, entries], index) => {
                                const isGroup = entries.length > 1;
                                // If it's a group, use the first entry for common details
                                const mainEntry = entries[0];
                                const totalAmount = entries.reduce((sum, e) => sum + Number(e.amount), 0);
                                const totalMeters = entries.reduce((sum, e) => sum + (Number(e.meters) || 0), 0);

                                return (
                                    <div
                                        key={groupId}
                                        className={cn(
                                            'bg-card rounded-xl border p-4 shadow-card transition-all duration-200 hover:shadow-lg animate-slide-up',
                                            mainEntry.status === 'flagged' && 'border-destructive/30 bg-destructive/5'
                                        )}
                                        style={{ animationDelay: `${index * 50}ms` }}
                                    >
                                        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                                            <div className="flex-1 space-y-2">
                                                <div className="flex items-start justify-between gap-2">
                                                    <div>
                                                        <h3 className="font-semibold text-foreground flex items-center gap-2">
                                                            {isGroup ? (
                                                                <>
                                                                    <Users className="h-4 w-4 text-primary" />
                                                                    <span>Group Work ({entries.length} Labourers)</span>
                                                                </>
                                                            ) : (
                                                                mainEntry.labourer?.name || 'Unknown'
                                                            )}
                                                        </h3>
                                                        <p className="text-sm text-primary font-medium">{mainEntry.task_type}</p>
                                                    </div>
                                                    <div className="flex flex-col items-end gap-2">
                                                        {getStatusBadge(mainEntry.status)}
                                                        {getTrustIndicator(mainEntry)}
                                                    </div>
                                                </div>


                                                {mainEntry.description && (
                                                    <p className="text-sm text-muted-foreground">{mainEntry.description}</p>
                                                )}

                                                <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                                                    <div className="flex items-center gap-1">
                                                        <Calendar className="h-3.5 w-3.5" />
                                                        {mainEntry.date}
                                                    </div>
                                                    {mainEntry.location && (
                                                        <div className="flex items-center gap-1">
                                                            <MapPin className="h-3.5 w-3.5" />
                                                            {mainEntry.location}
                                                        </div>
                                                    )}
                                                    {totalMeters > 0 && (
                                                        <div className="flex items-center gap-1">
                                                            <Ruler className="h-3.5 w-3.5" />
                                                            {totalMeters}m
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Expandable details for group members would go here, maybe a simple list for now */}
                                                {isGroup && (
                                                    <div className="pt-2 text-xs text-muted-foreground">
                                                        <p>Members: {entries.map(e => e.labourer?.name).join(', ')}</p>
                                                    </div>
                                                )}
                                            </div>

                                            <div className="flex flex-col items-end gap-2">
                                                <p className="text-xl font-bold text-foreground">₹{totalAmount.toLocaleString()}</p>

                                                {/* Actions for the whole group or individual */}
                                                {(mainEntry.status === 'submitted' || mainEntry.status === 'pending') && (
                                                    <div className="flex gap-2">
                                                        <Button
                                                            size="sm"
                                                            className="bg-success hover:bg-success/90 text-white"
                                                            onClick={() => approveBulkWorkEntries.mutate(entries.map(e => e.id))}
                                                            disabled={approveBulkWorkEntries.isPending}
                                                        >
                                                            {approveBulkWorkEntries.isPending ? (
                                                                <Loader2 className="h-4 w-4 animate-spin" />
                                                            ) : (
                                                                'Approve'
                                                            )}
                                                        </Button>
                                                        <Button
                                                            size="sm"
                                                            variant="destructive"
                                                            onClick={() => handleFlag(mainEntry)} // Reject logic
                                                        >
                                                            Reject
                                                        </Button>
                                                    </div>
                                                )}
                                                {mainEntry.status === 'rejected' && (
                                                    <p className="text-xs text-destructive italic mt-1">Reason: {mainEntry.rejected_reason}</p>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {!isLoading && filteredEntries.length === 0 && (
                        <div className="text-center py-12">
                            <p className="text-muted-foreground">{t('noData')}</p>
                            <Button className="mt-4" onClick={() => setIsAddModalOpen(true)}>
                                <ClipboardPlus className="h-4 w-4 mr-2" />
                                Add your first work entry
                            </Button>
                        </div>
                    )}

                    {/* Add Work Entry Modal */}
                    <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
                        <DialogContent className="sm:max-w-md">
                            <DialogHeader className="p-4 md:px-6 md:pt-6 border-b">
                                <DialogTitle>{t('addWorkEntry')}</DialogTitle>
                                <DialogDescription className="text-xs">Record a new work entry for a labourer.</DialogDescription>
                            </DialogHeader>

                            <div className="overflow-y-auto max-h-[60vh] p-4 md:p-6 space-y-4">
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-semibold">{t('assignTo')} *</Label>
                                    <Select
                                        value={formData.labourer_id}
                                        onValueChange={(value) => setFormData({ ...formData, labourer_id: value })}
                                    >
                                        <SelectTrigger className="h-9 text-sm">
                                            <SelectValue placeholder="Select labourer" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {labourers
                                                .filter((l) => l.status === 'active')
                                                .map((labour) => (
                                                    <SelectItem key={labour.id} value={labour.id}>
                                                        {labour.name} - ₹{labour.daily_rate}/day
                                                    </SelectItem>
                                                ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="grid grid-cols-2 gap-3 md:gap-4">
                                    <div className="space-y-1.5">
                                        <Label className="text-xs font-semibold">{t('date')} *</Label>
                                        <Input
                                            type="date"
                                            value={formData.date}
                                            onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                                            className="h-9 text-sm"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label className="text-xs font-semibold">{t('taskType')} *</Label>
                                        <Select
                                            value={formData.task_type}
                                            onValueChange={(value) => setFormData({ ...formData, task_type: value })}
                                        >
                                            <SelectTrigger className="h-9 text-sm">
                                                <SelectValue placeholder="Select task" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {taskTypes.map((type) => (
                                                    <SelectItem key={type} value={type}>
                                                        {type}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-3 md:gap-4">
                                    <div className="space-y-1.5">
                                        <Label className="text-xs font-semibold">{t('meters')} (optional)</Label>
                                        <Input
                                            type="number"
                                            placeholder="0"
                                            value={formData.meters || ''}
                                            onChange={(e) => setFormData({ ...formData, meters: e.target.value ? Number(e.target.value) : undefined })}
                                            className="h-9 text-sm"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label className="text-xs font-semibold">{t('hours')} (optional)</Label>
                                        <Input
                                            type="number"
                                            placeholder="0"
                                            value={formData.hours || ''}
                                            onChange={(e) => setFormData({ ...formData, hours: e.target.value ? Number(e.target.value) : undefined })}
                                            className="h-9 text-sm"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-1.5">
                                    <Label className="text-xs font-semibold">{t('location')}</Label>
                                    <div className="flex gap-2">
                                        <Input
                                            placeholder="Site A - Block 3"
                                            value={formData.location}
                                            onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                                            className="h-9 text-sm"
                                        />
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="icon"
                                            className="h-9 w-9 shrink-0"
                                            onClick={() => {
                                                if (navigator.geolocation) {
                                                    navigator.geolocation.getCurrentPosition(
                                                        (position) => {
                                                            const { latitude, longitude } = position.coords;
                                                            setFormData(prev => ({
                                                                ...prev,
                                                                latitude,
                                                                longitude,
                                                                location: prev.location || `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`
                                                            }));
                                                            alert("Location captured!");
                                                        },
                                                        (error) => {
                                                            if (import.meta.env.DEV) console.error("Error capturing location:", error);
                                                            alert("Could not capture location.");
                                                        }
                                                    );
                                                } else {
                                                    alert("Geolocation is not supported by this browser.");
                                                }
                                            }}
                                            title="Capture Current Location"
                                        >
                                            <MapPin className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>

                                <div className="space-y-1.5">
                                    <Label className="text-xs font-semibold">{t('description')}</Label>
                                    <Textarea
                                        placeholder="Describe the work done..."
                                        value={formData.description}
                                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                        onBlur={handleAutoTranslateDescription}
                                        className="min-h-[80px] text-sm resize-none"
                                    />
                                </div>

                                <div className="space-y-1.5">
                                    <Label className="text-xs font-semibold">{t('totalAmount')} (₹) *</Label>
                                    <Input
                                        type="number"
                                        placeholder="0"
                                        value={formData.amount || ''}
                                        onChange={(e) => setFormData({ ...formData, amount: Number(e.target.value) })}
                                        className="h-9 text-sm font-semibold"
                                    />
                                    <p className="text-[10px] text-muted-foreground font-medium">
                                        Suggested: ₹{calculateAmount().toLocaleString()}
                                    </p>
                                </div>
                            </div>

                            <div className="sticky bottom-0 bg-white border-t pt-3 pb-2 px-4 md:px-6 flex justify-end gap-3 z-10">
                                <Button variant="outline" size="sm" onClick={() => setIsAddModalOpen(false)}>
                                    {t('cancel')}
                                </Button>
                                <Button
                                    size="sm"
                                    className="gradient-primary"
                                    onClick={handleSave}
                                    disabled={!formData.labourer_id || !formData.task_type || !formData.amount || createWorkEntry.isPending}
                                >
                                    {createWorkEntry.isPending ? (
                                        <>
                                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                            Saving...
                                        </>
                                    ) : (
                                        t('save')
                                    )}
                                </Button>
                            </div>
                        </DialogContent>
                    </Dialog>
                </div>
            </div>
        </AppLayout>
    );
};

export default WorkEntries;
