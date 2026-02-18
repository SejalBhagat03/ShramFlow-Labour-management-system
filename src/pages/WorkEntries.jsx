import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
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
    const { t } = useLanguage();
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
            pending: 'bg-warning/10 text-warning border-warning/20',
            flagged: 'bg-destructive/10 text-destructive border-destructive/20',
        };
        const icons = {
            approved: CheckCircle,
            pending: Clock,
            flagged: AlertTriangle,
        };
        const Icon = icons[status];
        return (
            <Badge variant="outline" className={cn('gap-1', styles[status])}>
                <Icon className="h-3 w-3" />
                {status.charAt(0).toUpperCase() + status.slice(1)}
            </Badge>
        );
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
            <div className="space-y-6">
                {/* Page Header */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-foreground">{t('workEntries')}</h1>
                        <p className="text-muted-foreground mt-1">
                            {filteredEntries.length} entries found
                        </p>
                    </div>
                    <div className="flex gap-3">
                        <Button
                            variant="outline"
                            className="border-2 hover:bg-accent"
                            onClick={() => setIsAddModalOpen(true)}
                        >
                            <ClipboardPlus className="h-4 w-4 mr-2" />
                            {t('singleLabour')}
                        </Button>
                        <Button
                            className="gradient-primary shadow-glow"
                            onClick={() => navigate('/work-entries/group')}
                        >
                            <Users className="h-4 w-4 mr-2" />
                            {t('groupEntryMultiLabour')}
                        </Button>
                    </div>
                </div>

                {/* Filters */}
                <div className="flex flex-col sm:flex-row gap-3">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder={`${t('search')} by name, task...`}
                            className="pl-10"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                        <SelectTrigger className="w-full sm:w-40">
                            <Filter className="h-4 w-4 mr-2" />
                            <SelectValue placeholder={t('status')} />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Status</SelectItem>
                            <SelectItem value="approved">Approved</SelectItem>
                            <SelectItem value="pending">Pending</SelectItem>
                            <SelectItem value="flagged">Flagged</SelectItem>
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
                                                {getStatusBadge(mainEntry.status)}
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
                                            {mainEntry.status === 'pending' && (
                                                <div className="flex gap-2">
                                                    <Button
                                                        size="sm"
                                                        onClick={() => approveBulkWorkEntries.mutate(entries.map(e => e.id))}
                                                        disabled={approveBulkWorkEntries.isPending}
                                                    >
                                                        {approveBulkWorkEntries.isPending ? (
                                                            <>
                                                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                                                Approving...
                                                            </>
                                                        ) : (
                                                            'Approve All'
                                                        )}
                                                    </Button>
                                                </div>
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
                    <DialogContent className="sm:max-w-lg">
                        <DialogHeader>
                            <DialogTitle>{t('addWorkEntry')}</DialogTitle>
                            <DialogDescription>Record a new work entry for a labourer.</DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                            <div className="space-y-2">
                                <Label>{t('assignTo')} *</Label>
                                <Select
                                    value={formData.labourer_id}
                                    onValueChange={(value) => setFormData({ ...formData, labourer_id: value })}
                                >
                                    <SelectTrigger>
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

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>{t('date')} *</Label>
                                    <Input
                                        type="date"
                                        value={formData.date}
                                        onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>{t('taskType')} *</Label>
                                    <Select
                                        value={formData.task_type}
                                        onValueChange={(value) => setFormData({ ...formData, task_type: value })}
                                    >
                                        <SelectTrigger>
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

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>{t('meters')} (optional)</Label>
                                    <Input
                                        type="number"
                                        placeholder="0"
                                        value={formData.meters || ''}
                                        onChange={(e) => setFormData({ ...formData, meters: e.target.value ? Number(e.target.value) : undefined })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>{t('hours')} (optional)</Label>
                                    <Input
                                        type="number"
                                        placeholder="0"
                                        value={formData.hours || ''}
                                        onChange={(e) => setFormData({ ...formData, hours: e.target.value ? Number(e.target.value) : undefined })}
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label>{t('location')}</Label>
                                <div className="flex gap-2">
                                    <Input
                                        placeholder="Site A - Block 3"
                                        value={formData.location}
                                        onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                                    />
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="icon"
                                        onClick={() => {
                                            if (navigator.geolocation) {
                                                navigator.geolocation.getCurrentPosition(
                                                    (position) => {
                                                        const { latitude, longitude } = position.coords;
                                                        // Update formData with lat/long and potentially autofill location text with reverse geocoding if we had an API
                                                        // For now just store lat/long in state
                                                        setFormData(prev => ({
                                                            ...prev,
                                                            latitude,
                                                            longitude,
                                                            location: prev.location || `${latitude.toFixed(4)}, ${longitude.toFixed(4)}` // Auto-fill if empty
                                                        }));
                                                        alert("Location captured!");
                                                    },
                                                    (error) => {
                                                        console.error("Error capturing location:", error);
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

                            <div className="space-y-2">
                                <Label>{t('description')}</Label>
                                <Textarea
                                    placeholder="Describe the work done..."
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label>{t('totalAmount')} (₹) *</Label>
                                <Input
                                    type="number"
                                    placeholder="0"
                                    value={formData.amount || ''}
                                    onChange={(e) => setFormData({ ...formData, amount: Number(e.target.value) })}
                                />
                                <p className="text-xs text-muted-foreground">
                                    Suggested: ₹{calculateAmount().toLocaleString()}
                                </p>
                            </div>
                        </div>
                        <div className="flex justify-end gap-3">
                            <Button variant="outline" onClick={() => setIsAddModalOpen(false)}>
                                {t('cancel')}
                            </Button>
                            <Button
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
        </AppLayout>
    );
};

export default WorkEntries;
