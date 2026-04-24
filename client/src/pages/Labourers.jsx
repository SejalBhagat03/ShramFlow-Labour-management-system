import { useState, useMemo, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/hooks/useAuth';
import { AppLayout } from '@/components/AppLayout';
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
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { 
    Search, 
    Filter, 
    UserPlus, 
    Phone, 
    MapPin, 
    Loader2, 
    BookOpen, 
    User, 
    Activity, 
    Percent, 
    Languages, 
    IndianRupee, 
    Sparkles,
    Eye,
    Pencil,
    Trash2,
    CheckCircle2,
    Calendar,
    ChevronRight,
    ExternalLink,
    Plus,
    FileText,
    PieChart,
    MessageCircle,
    ArrowUpDown,
    Download,
    ClipboardCheck,
    Wallet,
    Users
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { TrustScoreBadge } from '@/components/TrustScoreBadge';
import { translationService } from '@/services/translationService';
import { generateWhatsAppLink, whatsappTemplates } from '@/utils/whatsapp';

// New Modular Components
import { StatsCard } from '@/components/workforce/StatsCard';
import { LabourCard } from '@/components/workforce/LabourCard';
import { FilterBar } from '@/components/workforce/FilterBar';

const Labourers = () => {
    const { t, i18n } = useTranslation();
    const lang = i18n.language;
    const { user } = useAuth();
    const navigate = useNavigate();
    const {
        labourers,
        isLoading,
        createLabourer,
        updateLabourer,
        deleteLabourer,
    } = useLabourers();
    
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [locationFilter, setLocationFilter] = useState('all');
    const [sortOption, setSortOption] = useState('recent');
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [selectedLabour, setSelectedLabour] = useState(null);

    const [formData, setFormData] = useState({
        name: '',
        name_hindi: '',
        phone: '',
        role: 'Labour',
        daily_rate: 500,
        rate_per_meter: 0,
        status: 'active',
        location: '',
        password: undefined
    });

    const filteredLabourers = useMemo(() => {
        return labourers.filter((labour) => {
            const matchesSearch =
                labour.name.toLowerCase().includes(search.toLowerCase()) ||
                (labour.name_hindi?.includes(search) || false) ||
                (labour.phone?.includes(search) || false);
            const matchesStatus = statusFilter === 'all' || labour.status === statusFilter;
            const matchesLocation = locationFilter === 'all' || labour.location === locationFilter;
            return matchesSearch && matchesStatus && matchesLocation;
        });
    }, [labourers, search, statusFilter, locationFilter]);

    const sortedLabourers = useMemo(() => {
        return [...filteredLabourers].sort((a, b) => {
            if (sortOption === 'rating') return (b.trust_score || 0) - (a.trust_score || 0);
            if (sortOption === 'rate') return b.daily_rate - a.daily_rate;
            if (sortOption === 'recent') return new Date(b.created_at) - new Date(a.created_at);
            return 0;
        });
    }, [filteredLabourers, sortOption]);

    const stats = useMemo(() => {
        const active = labourers.filter(l => l.status === 'active');
        return {
            total: labourers.length,
            activeCount: active.length,
            dailyCost: active.reduce((acc, l) => acc + (l.daily_rate || 0), 0)
        };
    }, [labourers]);

    const locations = useMemo(() => {
        return [...new Set(labourers.map((l) => l.location).filter(Boolean))];
    }, [labourers]);

    const handleEdit = (labour) => {
        setSelectedLabour(labour);
        setFormData({
            name: labour.name,
            name_hindi: labour.name_hindi || '',
            phone: labour.phone || '',
            role: 'Labour',
            daily_rate: labour.daily_rate,
            rate_per_meter: labour.rate_per_meter || 0,
            status: labour.status,
            location: labour.location || ''
        });
        setIsAddModalOpen(true);
    };

    const handleDelete = (labour) => {
        if (confirm(`Are you sure you want to remove ${labour.name}?`)) {
            deleteLabourer.mutate(labour.id);
        }
    };

    const handleSave = async () => {
        try {
            if (selectedLabour) {
                await updateLabourer.mutateAsync({ id: selectedLabour.id, ...formData });
            } else {
                await createLabourer.mutateAsync(formData);
            }
            setIsAddModalOpen(false);
            setSelectedLabour(null);
            resetForm();
        } catch (err) {
            console.error('Save failed:', err);
        }
    };

    const handleAutoTranslateName = async () => {
        if (!formData.name || formData.name_hindi) return;
        try {
            const hindiName = await translationService.translateText(formData.name, 'hi');
            if (hindiName) {
                setFormData(prev => ({ ...prev, name_hindi: hindiName }));
            }
        } catch (error) {
            console.error("Auto-translation failed:", error);
        }
    };

    const resetForm = () => {
        setFormData({
            name: '',
            name_hindi: '',
            phone: '',
            role: 'Helper',
            daily_rate: 500,
            rate_per_meter: 0,
            status: 'active',
            location: '',
            password: undefined
        });
    };

    const openAddModal = () => {
        setSelectedLabour(null);
        resetForm();
        setIsAddModalOpen(true);
    };

    return (
        <AppLayout>
            <div className="space-y-8">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-foreground tracking-tight">Workforce</h1>
                        <p className="text-sm text-muted-foreground mt-1">Manage and monitor your registered labourers.</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <Button variant="outline" size="sm" className="rounded-xl h-10 px-4 font-bold">
                            <Download className="h-4 w-4 mr-2" />
                            Export
                        </Button>
                        <Button onClick={openAddModal} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-10 px-6 rounded-xl">
                            <Plus className="h-4 w-4 mr-2" />
                            Add Labourer
                        </Button>
                    </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <StatsCard icon={Users} label="Total Registered" value={stats.total} />
                    <StatsCard icon={Activity} label="Active Count" value={stats.activeCount} />
                    <StatsCard icon={Wallet} label="Total Daily Cost" value={`₹${stats.dailyCost}`} />
                </div>

                {/* Filters */}
                <FilterBar 
                    search={search} setSearch={setSearch}
                    statusFilter={statusFilter} setStatusFilter={setStatusFilter}
                    locationFilter={locationFilter} setLocationFilter={setLocationFilter}
                    sortOption={sortOption} setSortOption={setSortOption}
                    locations={locations}
                />

                {/* Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {isLoading ? (
                        [1, 2, 3].map(i => <div key={i} className="h-64 bg-white border border-border animate-pulse rounded-2xl" />)
                    ) : sortedLabourers.length === 0 ? (
                        <div className="col-span-full py-20 text-center bg-white border-2 border-dashed border-border rounded-2xl">
                            <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-20" />
                            <h3 className="text-lg font-bold text-foreground">No workers found</h3>
                            <p className="text-sm text-muted-foreground mt-1">Try adjusting your search or filters.</p>
                        </div>
                    ) : (
                        sortedLabourers.map((labour) => (
                            <LabourCard 
                                key={labour.id}
                                labour={labour} lang={lang} 
                                onEdit={handleEdit} onDelete={handleDelete}
                            />
                        ))
                    )}
                </div>

                {/* Modal */}
                <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
                    <DialogContent className="sm:max-w-[600px] p-0 overflow-hidden border-none shadow-2xl rounded-2xl">
                        <div className="p-6 border-b border-border bg-white">
                            <DialogTitle className="text-xl font-bold">{selectedLabour ? 'Edit Profile' : 'New Labourer'}</DialogTitle>
                            <DialogDescription className="text-xs font-medium text-muted-foreground mt-1">
                                Register a new worker or update existing staff credentials.
                            </DialogDescription>
                        </div>
                        
                        <div className="p-6 space-y-6">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="grid gap-2">
                                    <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Full Name</Label>
                                    <Input
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        onBlur={handleAutoTranslateName}
                                        placeholder="Ramesh Kumar"
                                        className="h-11 rounded-xl text-sm border-border"
                                    />
                                </div>
                                <div className="grid gap-2">
                                    <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Name (Hindi)</Label>
                                    <Input
                                        value={formData.name_hindi}
                                        onChange={(e) => setFormData({ ...formData, name_hindi: e.target.value })}
                                        placeholder="रमेश कुमार"
                                        className="h-11 rounded-xl text-sm border-border"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="grid gap-2">
                                    <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Phone</Label>
                                    <Input
                                        value={formData.phone}
                                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                        placeholder="10-digit number"
                                        className="h-11 rounded-xl text-sm border-border"
                                    />
                                </div>
                                <div className="grid gap-2">
                                    <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Site Location</Label>
                                    <Input
                                        value={formData.location}
                                        onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                                        placeholder="Sector 62..."
                                        className="h-11 rounded-xl text-sm border-border"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="grid gap-2">
                                    <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Daily Wage (₹)</Label>
                                    <Input
                                        type="number"
                                        value={formData.daily_rate}
                                        onChange={(e) => setFormData({ ...formData, daily_rate: Number(e.target.value) })}
                                        className="h-11 rounded-xl text-sm font-bold border-border"
                                    />
                                </div>
                                <div className="grid gap-2">
                                    <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Status</Label>
                                    <Select value={formData.status} onValueChange={(v) => setFormData({...formData, status: v})}>
                                        <SelectTrigger className="h-11 rounded-xl text-sm border-border">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent className="rounded-xl">
                                            <SelectItem value="active">Active</SelectItem>
                                            <SelectItem value="inactive">Inactive</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        </div>

                        <div className="p-6 bg-muted/20 border-t border-border flex justify-end gap-3">
                            <Button variant="ghost" className="h-11 px-6 rounded-xl font-bold" onClick={() => setIsAddModalOpen(false)}>Cancel</Button>
                            <Button 
                                className="bg-emerald-600 hover:bg-emerald-700 text-white h-11 px-8 rounded-xl font-bold"
                                onClick={handleSave}
                                disabled={createLabourer.isPending || updateLabourer.isPending}
                            >
                                {selectedLabour ? 'Save Changes' : 'Confirm Registration'}
                            </Button>
                        </div>
                    </DialogContent>
                </Dialog>
            </div>
        </AppLayout>
    );
};

export default Labourers;
