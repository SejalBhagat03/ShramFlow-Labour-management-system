import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AppLayout } from '@/components/AppLayout';
import { useWorkEntries } from '@/hooks/useWorkEntries';
import { useLabourers } from '@/hooks/useLabourers';
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
import {
    Search,
    ClipboardPlus,
    CheckCircle,
    LayoutGrid,
    Trash2,
    Users,
    IndianRupee
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';
import { projectService } from '@/services/projectService';
import { useQuery } from '@tanstack/react-query';
import { useFocusProject } from '@/hooks/useFocusProject';
import { WorkEntryModal } from '@/components/modals/WorkEntryModal';

const WorkEntries = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { 
        workEntries, 
        isLoading, 
        createWorkEntry, 
        approveWorkEntry, 
        approveBulkWorkEntries, 
        deleteWorkEntry 
    } = useWorkEntries();
    
    const { labourers } = useLabourers();
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [selectedIds, setSelectedIds] = useState([]);

    const { data: projects = [] } = useQuery({
        queryKey: ['projects'],
        queryFn: () => projectService.getProjects(),
    });

    const { focusProjectId } = useFocusProject();

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
        } catch (err) {
            console.error("Bulk approval failed", err);
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
