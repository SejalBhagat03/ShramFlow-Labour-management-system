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
import { useToast } from '@/hooks/use-toast';
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
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
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
    Trash2,
    Paintbrush,
    Hammer,
    Zap,
    LayoutGrid,
    Truck,
    Construction,
    Home,
    Droplets,
    HardHat,
    Users,
    ExternalLink,
    IndianRupee
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';
import { translationService } from '@/services/translationService';
import { projectService } from '@/services/projectService';
import { useQuery } from '@tanstack/react-query';
import { useFocusProject } from '@/hooks/useFocusProject';
import { generateWhatsAppLink, whatsappTemplates } from '@/utils/whatsapp';

const WhatsAppIcon = ({ className }) => (
    <svg 
        viewBox="0 0 24 24" 
        fill="currentColor" 
        className={className}
        xmlns="http://www.w3.org/2000/svg"
    >
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
    </svg>
);

const taskIconMap = {
    'Brick Laying': Construction,
    'Wall Painting': Paintbrush,
    'Wiring': Zap,
    'Pipe Fitting': Droplets,
    'Material Transport': Truck,
    'Carpentry': Hammer,
    'Plastering': LayoutGrid,
    'Flooring': LayoutGrid,
    'Roofing': Home,
    'Other': HardHat,
};

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

const WorkEntries = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { toast } = useToast();
    const { 
        workEntries, 
        isLoading, 
        createWorkEntry, 
        approveWorkEntry, 
        approveBulkWorkEntries, 
        flagWorkEntry, 
        deleteWorkEntry 
    } = useWorkEntries();
    
    const { labourers } = useLabourers();
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [successData, setSuccessData] = useState(null);
    const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);
    const [redirectTimer, setRedirectTimer] = useState(null);
    
    const [selectedIds, setSelectedIds] = useState([]);

    const { data: projects = [] } = useQuery({
        queryKey: ['projects'],
        queryFn: () => projectService.getProjects(),
    });

    const { focusProjectId } = useFocusProject();

    const [formData, setFormData] = useState({
        labourer_id: '',
        project_id: '',
        date: new Date().toISOString().split('T')[0],
        task_type: '',
        meters: undefined,
        hours: undefined,
        amount: 0,
        location: '',
        description: ''
    });

    const filteredEntries = workEntries.filter((entry) => {
        const labourerName = entry.getLabourerName().toLowerCase();
        const matchesSearch =
            labourerName.includes(search.toLowerCase()) ||
            entry.task_type.toLowerCase().includes(search.toLowerCase());
        const matchesStatus = statusFilter === 'all' || entry.status === statusFilter;
        return matchesSearch && matchesStatus;
    });

    const stats = {
        totalAmount: filteredEntries.reduce((sum, e) => sum + Number(e.amount), 0),
        pendingCount: filteredEntries.filter(e => e.status === 'submitted' || e.status === 'pending').length,
        totalEntries: filteredEntries.length
    };

    const StatusPill = ({ status }) => {
        const variants = {
            approved: 'bg-emerald-50 text-emerald-700 border-emerald-100',
            submitted: 'bg-blue-50 text-blue-700 border-blue-100',
            pending: 'bg-amber-50 text-amber-700 border-amber-100',
            rejected: 'bg-red-50 text-red-700 border-red-100',
            paid: 'bg-indigo-50 text-indigo-700 border-indigo-100',
            draft: 'bg-slate-50 text-slate-700 border-slate-100',
        };
        
        return (
            <span className={cn(
                "px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border",
                variants[status] || variants.pending
            )}>
                {status}
            </span>
        );
    };

    const toggleSelect = (id) => {
        setSelectedIds(prev => 
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    };

    const toggleSelectAll = () => {
        if (selectedIds.length === filteredEntries.length) {
            setSelectedIds([]);
        } else {
            setSelectedIds(filteredEntries.map(e => e.id));
        }
    };

    const handleBulkApprove = async () => {
        if (selectedIds.length === 0) return;
        try {
            await approveBulkWorkEntries.mutateAsync(selectedIds);
            setSelectedIds([]);
            toast({
                title: "Success",
                description: `${selectedIds.length} entries approved.`
            });
        } catch (err) {
            console.error("Bulk approval failed", err);
        }
    };

    const handleAutoTranslateDescription = async () => {
        if (!formData.description) return;
        try {
            const hindiDesc = await translationService.translateText(formData.description, 'hi');
            if (hindiDesc && hindiDesc !== formData.description) {
                setFormData(prev => ({ ...prev, description: `${formData.description}\n\n[Hindi: ${hindiDesc}]` }));
            }
        } catch (error) {
            console.error("Auto-translation failed:", error);
        }
    };

    const handleSave = async () => {
        if (!formData.labourer_id || !formData.task_type) return;
        try {
            const result = await createWorkEntry.mutateAsync(formData);
            setIsAddModalOpen(false);
            const labourer = labourers.find(l => l.id === formData.labourer_id);
            const project = projects.find(p => p.id === formData.project_id);
            setSuccessData({
                name: labourer?.name || 'Labourer',
                phone: labourer?.phone || '',
                date: formData.date,
                location: formData.location || project?.name || 'Site',
            });
            setIsSuccessModalOpen(true);
            if (labourer?.phone) {
                const link = generateWhatsAppLink(labourer.phone, whatsappTemplates.bookingConfirmation(labourer.name, formData.date, formData.location || project?.name || 'Site'));
                const timer = setTimeout(() => window.open(link, '_blank'), 2000);
                setRedirectTimer(timer);
            }
            resetForm();
        } catch (error) {
            console.error("Save failed:", error);
        }
    };

    const resetForm = () => setFormData({ labourer_id: '', project_id: '', date: new Date().toISOString().split('T')[0], task_type: '', meters: undefined, hours: undefined, amount: 0, location: '', description: '' });

    const calculateAmount = () => {
        const labourer = labourers.find(l => l.id === formData.labourer_id);
        if (!labourer) return 0;
        if (formData.hours) return (labourer.daily_rate / 8) * formData.hours;
        if (formData.meters) return formData.meters * (labourer.rate_per_meter || 0);
        return labourer.daily_rate;
    };

    React.useEffect(() => {
        if (formData.labourer_id) {
            const amount = calculateAmount();
            if (amount > 0) setFormData(prev => ({ ...prev, amount }));
        }
    }, [formData.labourer_id, formData.hours, formData.meters]);

    const handleDelete = (entry) => {
        if (window.confirm(`Are you sure you want to delete this work entry?`)) {
            deleteWorkEntry.mutate(entry.id);
        }
    };

    return (
        <AppLayout>
            <div className="space-y-8">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-foreground tracking-tight">Work Entries</h1>
                        <p className="text-sm text-muted-foreground mt-1">Record and approve labour activities across sites.</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <Button
                            variant="outline"
                            className="rounded-xl h-10 px-4 font-bold border-border hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200"
                            onClick={() => setIsAddModalOpen(true)}
                        >
                            <ClipboardPlus className="h-4 w-4 mr-2" />
                            Single Entry
                        </Button>
                        <Button
                            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-10 px-6 rounded-xl"
                            onClick={() => navigate('/work-entries/group')}
                        >
                            <Users className="h-4 w-4 mr-2" />
                            Group Entry
                        </Button>
                    </div>
                </div>

                {/* Filters and Stats */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="md:col-span-3 flex flex-col md:flex-row gap-4">
                        <div className="relative flex-1">
                            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search by name or task..."
                                className="pl-10 h-10 bg-white border-border rounded-xl text-sm"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                            />
                        </div>
                        <Select value={statusFilter} onValueChange={setStatusFilter}>
                            <SelectTrigger className="w-full md:w-48 h-10 bg-white border-border rounded-xl text-xs font-medium">
                                <SelectValue placeholder="All Status" />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl">
                                <SelectItem value="all">All Status</SelectItem>
                                <SelectItem value="submitted">Submitted</SelectItem>
                                <SelectItem value="approved">Approved</SelectItem>
                                <SelectItem value="rejected">Rejected</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="bg-white p-4 rounded-xl border border-border flex items-center gap-3 shadow-sm">
                        <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600 shrink-0">
                            <IndianRupee className="h-5 w-5" />
                        </div>
                        <div>
                            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Total Value</p>
                            <p className="text-sm font-bold text-foreground">₹{stats.totalAmount.toLocaleString()}</p>
                        </div>
                    </div>
                </div>

                {/* Bulk Actions */}
                {selectedIds.length > 0 && (
                    <div className="bg-emerald-600 p-4 rounded-2xl shadow-lg text-white flex items-center justify-between animate-in slide-in-from-top-5 duration-300">
                        <div className="flex items-center gap-4">
                            <Checkbox 
                                checked={selectedIds.length === filteredEntries.length} 
                                onCheckedChange={toggleSelectAll}
                                className="border-white data-[state=checked]:bg-white data-[state=checked]:text-emerald-600"
                            />
                            <span className="text-sm font-bold">{selectedIds.length} entries selected</span>
                        </div>
                        <div className="flex gap-2">
                            <Button 
                                variant="ghost" 
                                className="h-9 px-4 text-white hover:bg-white/10 font-bold text-xs"
                                onClick={() => setSelectedIds([])}
                            >
                                Cancel
                            </Button>
                            <Button 
                                className="bg-white text-emerald-600 hover:bg-white/90 font-bold h-9 px-6 rounded-xl text-xs"
                                onClick={handleBulkApprove}
                                disabled={approveBulkWorkEntries.isPending}
                            >
                                Approve Selected
                            </Button>
                        </div>
                    </div>
                )}

                {/* Table */}
                <div className="bg-white rounded-2xl border border-border shadow-sm overflow-hidden">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-muted/30 border-border hover:bg-muted/30">
                                <TableHead className="w-12 pl-6">
                                    <Checkbox 
                                        checked={selectedIds.length === filteredEntries.length && filteredEntries.length > 0} 
                                        onCheckedChange={toggleSelectAll}
                                        className="border-muted-foreground/30"
                                    />
                                </TableHead>
                                <TableHead className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground py-4">Labourer</TableHead>
                                <TableHead className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Work Details</TableHead>
                                <TableHead className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Amount</TableHead>
                                <TableHead className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Status</TableHead>
                                <TableHead className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground pr-6 text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                [1, 2, 3].map(i => (
                                    <TableRow key={i}><TableCell colSpan={6}><Skeleton className="h-12 w-full rounded-lg" /></TableCell></TableRow>
                                ))
                            ) : filteredEntries.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="py-20 text-center">
                                        <LayoutGrid className="h-10 w-10 text-muted-foreground mx-auto mb-4 opacity-20" />
                                        <h3 className="text-sm font-bold text-foreground">No entries found</h3>
                                        <p className="text-xs text-muted-foreground mt-1">Start by recording a new work entry.</p>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filteredEntries.map((entry) => (
                                    <TableRow key={entry.id} className="border-border hover:bg-muted/10">
                                        <TableCell className="pl-6">
                                            <Checkbox 
                                                checked={selectedIds.includes(entry.id)} 
                                                onCheckedChange={() => toggleSelect(entry.id)}
                                                className="border-muted-foreground/30"
                                            />
                                        </TableCell>
                                        <TableCell>
                                            <div>
                                                <p className="font-bold text-foreground text-sm">{entry.getLabourerName()}</p>
                                                <p className="text-[10px] text-muted-foreground">{entry.getProjectName()}</p>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div>
                                                <p className="font-bold text-foreground text-xs">{entry.task_type}</p>
                                                <p className="text-[10px] text-muted-foreground">{entry.date} • {entry.meters ? `${entry.meters}m` : (entry.hours ? `${entry.hours}h` : 'Full Day')}</p>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <span className="font-bold text-sm text-foreground">₹{entry.amount.toLocaleString()}</span>
                                        </TableCell>
                                        <TableCell>
                                            <StatusPill status={entry.status} />
                                        </TableCell>
                                        <TableCell className="pr-6 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                {(entry.status === 'submitted' || entry.status === 'pending') && (
                                                    <Button
                                                        size="icon"
                                                        variant="ghost"
                                                        className="h-8 w-8 text-emerald-600 hover:bg-emerald-50"
                                                        onClick={() => approveWorkEntry.mutate(entry.id)}
                                                    >
                                                        <CheckCircle className="h-4 w-4" />
                                                    </Button>
                                                )}
                                                <Button
                                                    size="icon"
                                                    variant="ghost"
                                                    className="h-8 w-8 text-red-600 hover:bg-red-50"
                                                    onClick={() => handleDelete(entry)}
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>

                {/* Modal */}
                <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
                    <DialogContent className="sm:max-w-[500px] p-0 overflow-hidden border-none shadow-2xl rounded-2xl">
                        <div className="p-6 border-b border-border bg-white">
                            <DialogTitle className="text-xl font-bold">New Work Entry</DialogTitle>
                            <DialogDescription className="text-xs font-medium text-muted-foreground mt-1">
                                Record work details for a labourer at a project site.
                            </DialogDescription>
                        </div>

                        <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
                            <div className="grid gap-2">
                                <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Assign Labourer</Label>
                                <Select value={formData.labourer_id} onValueChange={(v) => setFormData({ ...formData, labourer_id: v })}>
                                    <SelectTrigger className="h-11 rounded-xl text-sm border-border">
                                        <SelectValue placeholder="Select labourer" />
                                    </SelectTrigger>
                                    <SelectContent className="rounded-xl">
                                        {labourers.filter(l => l.status === 'active').map(l => (
                                            <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="grid gap-2">
                                <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Project Site</Label>
                                <Select value={formData.project_id} onValueChange={(v) => setFormData({ ...formData, project_id: v })}>
                                    <SelectTrigger className="h-11 rounded-xl text-sm border-border">
                                        <SelectValue placeholder="Select site" />
                                    </SelectTrigger>
                                    <SelectContent className="rounded-xl">
                                        {projects.map(p => (
                                            <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="grid gap-2">
                                    <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Date</Label>
                                    <Input type="date" value={formData.date} onChange={e => setFormData({ ...formData, date: e.target.value })} className="h-11 rounded-xl text-sm border-border" />
                                </div>
                                <div className="grid gap-2">
                                    <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Task Type</Label>
                                    <Select value={formData.task_type} onValueChange={v => setFormData({ ...formData, task_type: v })}>
                                        <SelectTrigger className="h-11 rounded-xl text-sm border-border">
                                            <SelectValue placeholder="Select task" />
                                        </SelectTrigger>
                                        <SelectContent className="rounded-xl">
                                            {taskTypes.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="grid gap-2">
                                    <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Meters / Units</Label>
                                    <Input type="number" placeholder="0" value={formData.meters || ''} onChange={e => setFormData({ ...formData, meters: Number(e.target.value) })} className="h-11 rounded-xl text-sm border-border" />
                                </div>
                                <div className="grid gap-2">
                                    <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Hours</Label>
                                    <Input type="number" placeholder="0" value={formData.hours || ''} onChange={e => setFormData({ ...formData, hours: Number(e.target.value) })} className="h-11 rounded-xl text-sm border-border" />
                                </div>
                            </div>

                            <div className="grid gap-2">
                                <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Amount (₹)</Label>
                                <Input type="number" value={formData.amount} onChange={e => setFormData({ ...formData, amount: Number(e.target.value) })} className="h-11 rounded-xl text-sm font-bold border-border" />
                                <p className="text-[10px] text-muted-foreground">Suggested: ₹{calculateAmount().toLocaleString()}</p>
                            </div>
                        </div>

                        <div className="p-6 bg-muted/20 border-t border-border flex justify-end gap-3">
                            <Button variant="ghost" className="h-11 px-6 rounded-xl font-bold" onClick={() => setIsAddModalOpen(false)}>Cancel</Button>
                            <Button
                                className="bg-emerald-600 hover:bg-emerald-700 text-white h-11 px-8 rounded-xl font-bold"
                                onClick={handleSave}
                                disabled={createWorkEntry.isPending}
                            >
                                {createWorkEntry.isPending ? "Saving..." : "Save Entry"}
                            </Button>
                        </div>
                    </DialogContent>
                </Dialog>

                {/* Success Modal */}
                <Dialog open={isSuccessModalOpen} onOpenChange={(open) => {
                    if (!open && redirectTimer) clearTimeout(redirectTimer);
                    setIsSuccessModalOpen(open);
                }}>
                    <DialogContent className="sm:max-w-md text-center py-8">
                        <div className="mx-auto w-16 h-16 bg-success/10 rounded-full flex items-center justify-center mb-4">
                            <CheckCircle className="h-10 w-10 text-success" />
                        </div>
                        <DialogHeader>
                            <DialogTitle className="text-xl text-center">Work Entry Saved! ✅</DialogTitle>
                            <DialogDescription className="text-center pt-2">
                                The record for <strong>{successData?.name}</strong> has been successfully added.
                            </DialogDescription>
                        </DialogHeader>
                        
                        <div className="bg-muted/30 p-4 rounded-xl text-sm space-y-2 my-4">
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Date:</span>
                                <span className="font-medium">{successData?.date}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Location:</span>
                                <span className="font-medium">{successData?.location}</span>
                            </div>
                        </div>
                        
                        <div className="space-y-3">
                            {successData?.phone && (
                                <p className="text-xs text-muted-foreground animate-pulse">
                                    Redirecting to WhatsApp in 2 seconds...
                                </p>
                            )}
                            
                            <div className="flex flex-col gap-2">
                                {successData?.phone && (
                                    <Button 
                                        className="w-full bg-[#25D366] hover:bg-[#20bd5c] text-white font-bold h-12 rounded-xl border-none"
                                        onClick={() => {
                                            if (redirectTimer) clearTimeout(redirectTimer);
                                            window.open(generateWhatsAppLink(
                                                successData.phone,
                                                whatsappTemplates.bookingConfirmation(
                                                    successData.name,
                                                    successData.date,
                                                    successData.location
                                                )
                                            ), '_blank');
                                        }}
                                    >
                                        <WhatsAppIcon className="h-5 w-5 mr-2" />
                                        Send WhatsApp Now
                                    </Button>
                                )}
                                <Button 
                                    variant="ghost" 
                                    className="w-full h-11 rounded-xl"
                                    onClick={() => {
                                        if (redirectTimer) clearTimeout(redirectTimer);
                                        setIsSuccessModalOpen(false);
                                    }}
                                >
                                    Done / Cancel Redirect
                                </Button>
                            </div>
                        </div>
                    </DialogContent>
                </Dialog>
            </div>
        </AppLayout>
    );
};

export default WorkEntries;
