import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AppLayout } from '@/layouts/AppLayout';
import { useWorkEntries } from '@/features/work/hooks/useWorkEntries';
import { useLabourers } from '@/features/workforce/hooks/useLabourers';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from 'sonner';
import {
    Search,
    ClipboardPlus,
    CheckCircle,
    LayoutGrid,
    Trash2,
    Users,
    IndianRupee,
    ShieldCheck,
    ShieldAlert,
    Zap
} from 'lucide-react';
import { cn } from '@/features/shared/utils/utils';
import { useNavigate } from 'react-router-dom';
import { projectService } from '@/features/projects/services/projectService';
import { useQuery } from '@tanstack/react-query';
import { useFocusProject } from '@/features/projects/hooks/useFocusProject';
import { WorkEntryModal } from '@/features/work/components/WorkEntryModal';
import { Pagination } from '@/features/shared/components/Pagination';

const WorkEntries = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();

    const [page, setPage] = useState(1);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [selectedIds, setSelectedIds] = useState([]);

    const { 
        workEntries, 
        pagination,
        isLoading, 
        createWorkEntry, 
        approveWorkEntry, 
        approveBulkWorkEntries, 
        deleteWorkEntry 
    } = useWorkEntries(undefined, { 
        page, 
        status: statusFilter !== 'all' ? statusFilter : undefined,
        search
    });

    const handleSearch = (e) => {
        setSearch(e.target.value);
        setPage(1);
    };

    const handleStatusFilter = (val) => {
        setStatusFilter(val);
        setPage(1);
    };
    
    const { labourers } = useLabourers();

    const { data: projects = [] } = useQuery({
        queryKey: ['projects'],
        queryFn: () => projectService.getProjects(),
    });

    const { focusProjectId } = useFocusProject();

    const stats = {
        totalAmount: (workEntries || []).reduce((sum, e) => sum + Number(e.amount), 0),
        pendingCount: (workEntries || []).filter(e => e.status === 'submitted' || e.status === 'pending').length,
        totalEntries: pagination?.total || (workEntries?.length || 0)
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
        if (selectedIds.length === workEntries.length) {
            setSelectedIds([]);
        } else {
            setSelectedIds(workEntries.map(e => e.id));
        }
    };

    const handleBulkApprove = async (idsToApprove) => {
        const ids = idsToApprove || selectedIds;
        if (ids.length === 0) return;
        try {
            await approveBulkWorkEntries.mutateAsync(ids);
            setSelectedIds([]);
        } catch (err) {
            console.error("Bulk approval failed", err);
            const errorMessage = err.response?.data?.message || err.message || "Failed to approve work entries";
            const errorDetails = err.response?.data?.details || "";
            toast.error(`${errorMessage} ${errorDetails}`);
        }
    };

    const handleApproveVerified = async () => {
        const cleanIds = workEntries
            .filter(e => (e.status === 'submitted' || e.status === 'pending') && !e.is_anomaly)
            .map(e => e.id);
        
        if (cleanIds.length === 0) {
            toast.info("No verified pending entries found.");
            return;
        }

        if (window.confirm(`This will approve ${cleanIds.length} verified work entries. Continue?`)) {
            await handleBulkApprove(cleanIds);
            toast.success(`Successfully approved ${cleanIds.length} verified entries.`);
        }
    };

    const handleSave = async (formData) => {
        await createWorkEntry.mutateAsync(formData);
        setIsAddModalOpen(false);
    };

    const handleDelete = (entry) => {
        if (window.confirm(`Are you sure you want to delete this work entry?`)) {
            deleteWorkEntry.mutate(entry.id);
        }
    };

    return (
        <AppLayout>
            <div className="space-y-8 pb-12 animate-fade-in">
                {/* 🎯 Premium Header */}
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 relative">
                    <div className="relative z-10">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 text-blue-700 text-[10px] font-black uppercase tracking-widest mb-3 border border-blue-200/50 backdrop-blur-md animate-slide-down">
                            <LayoutGrid className="h-3 w-3" />
                            Work Intelligence System
                        </div>
                        <h1 className="text-4xl font-black text-slate-900 tracking-tight leading-none">
                            Work <span className="text-blue-600">Records</span>
                        </h1>
                        <p className="text-slate-500 font-medium mt-3 flex items-center gap-2">
                            <ClipboardPlus className="h-4 w-4 text-blue-500" />
                            {pagination.total || 0} Total Activities Logged • All Sites
                        </p>
                    </div>
                    
                    <div className="flex items-center gap-3 animate-slide-up">
                        <Button
                            variant="ghost"
                            className="hidden lg:flex rounded-2xl h-11 px-4 font-black text-[10px] uppercase tracking-widest text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700 transition-all border border-emerald-100"
                            onClick={handleApproveVerified}
                            disabled={approveBulkWorkEntries.isPending || !workEntries.some(e => (e.status === 'submitted' || e.status === 'pending') && !e.is_anomaly)}
                        >
                            <ShieldCheck className="h-4 w-4 mr-2" />
                            Approve Verified
                        </Button>
                        <Button
                            variant="outline"
                            className="rounded-2xl h-11 px-6 font-black text-[10px] uppercase tracking-widest border-slate-200 hover:bg-slate-50 shadow-sm active:scale-95 transition-all"
                            onClick={() => setIsAddModalOpen(true)}
                        >
                            <ClipboardPlus className="h-4 w-4 mr-2 text-blue-600" />
                            Single Entry
                        </Button>
                        <Button
                            className="bg-slate-900 hover:bg-slate-800 text-white font-black h-11 px-6 rounded-2xl shadow-lg active:scale-95 transition-all text-[10px] uppercase tracking-widest"
                            onClick={() => navigate('/work-entries/group')}
                        >
                            <Users className="h-4 w-4 mr-2" />
                            Group Entry
                        </Button>
                    </div>
                </div>

                {/* Filters and Stats */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 animate-slide-up">
                    <div className="md:col-span-3 flex flex-col md:flex-row gap-4">
                        <div className="relative flex-1 group">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-blue-600 transition-colors" />
                            <Input
                                placeholder="Search by name or task..."
                                className="pl-12 h-12 bg-white border-slate-100 rounded-[1.25rem] text-sm font-medium shadow-soft focus:border-blue-500 focus:ring-blue-500/10 transition-all"
                                value={search}
                                onChange={handleSearch}
                            />
                        </div>
                        <Select value={statusFilter} onValueChange={handleStatusFilter}>
                            <SelectTrigger className="w-full md:w-56 h-12 bg-white border-slate-100 rounded-[1.25rem] text-[11px] font-black uppercase tracking-widest shadow-soft">
                                <SelectValue placeholder="Status Filter" />
                            </SelectTrigger>
                            <SelectContent className="rounded-2xl border-slate-100 shadow-xl">
                                <SelectItem value="all" className="text-[10px] font-black uppercase tracking-widest">All Records</SelectItem>
                                <SelectItem value="submitted" className="text-[10px] font-black uppercase tracking-widest text-blue-600">Submitted</SelectItem>
                                <SelectItem value="approved" className="text-[10px] font-black uppercase tracking-widest text-emerald-600">Approved</SelectItem>
                                <SelectItem value="rejected" className="text-[10px] font-black uppercase tracking-widest text-rose-600">Rejected</SelectItem>
                                <SelectItem value="paid" className="text-[10px] font-black uppercase tracking-widest text-indigo-600">Paid</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="glass-strong p-6 rounded-[1.5rem] border-l-4 border-l-emerald-500 flex items-center gap-4 shadow-soft">
                        <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-600 shrink-0">
                            <IndianRupee className="h-6 w-6" />
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Page Value</p>
                            <p className="text-xl font-black text-slate-900 tracking-tight">₹{stats.totalAmount.toLocaleString()}</p>
                        </div>
                    </div>
                </div>

                {/* Bulk Actions */}
                {selectedIds.length > 0 && (
                    <div className="bg-emerald-600 p-4 rounded-2xl shadow-lg text-white flex items-center justify-between animate-in slide-in-from-top-5 duration-300">
                        <div className="flex items-center gap-4">
                            <Checkbox 
                                checked={selectedIds.length === workEntries.length} 
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
                                        checked={selectedIds.length === workEntries.length && workEntries.length > 0} 
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
                            ) : workEntries.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="py-20 text-center">
                                        <LayoutGrid className="h-10 w-10 text-muted-foreground mx-auto mb-4 opacity-20" />
                                        <h3 className="text-sm font-bold text-foreground">No entries found</h3>
                                        <p className="text-xs text-muted-foreground mt-1">Start by recording a new work entry.</p>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                workEntries.map((entry) => (
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
                                            <div className="flex items-center gap-2">
                                                <StatusPill status={entry.status} />
                                                {entry.is_anomaly ? (
                                                    <div className="flex items-center gap-1 text-rose-500 animate-pulse" title={entry.anomaly_reason}>
                                                        <ShieldAlert className="h-4 w-4" />
                                                        <span className="text-[8px] font-black uppercase tracking-tighter">Flagged</span>
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center gap-1 text-emerald-500/50" title="Verified by AI Engine">
                                                        <ShieldCheck className="h-3 w-3" />
                                                    </div>
                                                )}
                                            </div>
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

                <Pagination 
                    currentPage={pagination.page}
                    totalPages={pagination.totalPages}
                    onPageChange={setPage}
                    isLoading={isLoading}
                />

                <WorkEntryModal 
                    isOpen={isAddModalOpen} 
                    onClose={() => setIsAddModalOpen(false)} 
                    labourers={labourers} 
                    projects={projects}
                    onSave={handleSave}
                    isSaving={createWorkEntry.isPending}
                />
            </div>
        </AppLayout>
    );
};

export default WorkEntries;
