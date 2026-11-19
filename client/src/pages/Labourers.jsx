import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { AppLayout } from '@/layouts/AppLayout';
import { useLabourers } from '@/features/workforce/hooks/useLabourers';
import { Button } from '@/components/ui/button';
import { 
    Activity, 
    Plus,
    Wallet,
    Users,
    Download
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

// New Modular Components
import { StatsCard } from '@/features/workforce/components/StatsCard';
import { LabourCard } from '@/features/workforce/components/LabourCard';
import { FilterBar } from '@/features/workforce/components/FilterBar';
import { LabourerModal } from '@/features/workforce/components/LabourerModal';
import { Pagination } from '@/features/shared/components/Pagination';

const Labourers = () => {
    const { t, i18n } = useTranslation();
    const lang = i18n.language;
    const { user } = useAuth();
    const navigate = useNavigate();

    const [page, setPage] = useState(1);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [locationFilter, setLocationFilter] = useState('all');
    const [sortOption, setSortOption] = useState('recent');
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [selectedLabour, setSelectedLabour] = useState(null);

    const {
        labourers,
        pagination,
        isLoading,
        createLabourer,
        updateLabourer,
        deleteLabourer,
    } = useLabourers({ 
        page, 
        search, 
        status: statusFilter !== 'all' ? statusFilter : undefined 
    });

    const handleSearch = (val) => {
        setSearch(val);
        setPage(1); // Reset to page 1 on search
    };

    const handleStatusFilter = (val) => {
        setStatusFilter(val);
        setPage(1);
    };

    // Note: Local sorting/filtering on the current page subset
    const processedLabourers = useMemo(() => {
        let result = [...labourers];
        
        // Secondary filtering (for fields not yet handled by backend)
        if (locationFilter !== 'all') {
            result = result.filter(l => l.location === locationFilter);
        }

        // Local Sort
        return result.sort((a, b) => {
            if (sortOption === 'rating') return (b.trust_score || 0) - (a.trust_score || 0);
            if (sortOption === 'rate') return b.daily_rate - a.daily_rate;
            if (sortOption === 'recent') return new Date(b.created_at) - new Date(a.created_at);
            return 0;
        });
    }, [labourers, locationFilter, sortOption]);

    const stats = useMemo(() => {
        const active = labourers.filter(l => l.status === 'active');
        return {
            total: pagination.total || labourers.length,
            activeCount: active.length, // This is only for the current page, ideally we'd get this from backend
            dailyCost: active.reduce((acc, l) => acc + (l.daily_rate || 0), 0)
        };
    }, [labourers, pagination]);

    const locations = useMemo(() => {
        return [...new Set(labourers.map((l) => l.location).filter(Boolean))];
    }, [labourers]);

    const handleEdit = (labour) => {
        setSelectedLabour(labour);
        setIsAddModalOpen(true);
    };

    const handleDelete = (labour) => {
        if (confirm(`Are you sure you want to remove ${labour.name}?`)) {
            deleteLabourer.mutate(labour.id);
        }
    };

    const handleSave = async (formData) => {
        try {
            if (selectedLabour) {
                await updateLabourer.mutateAsync({ id: selectedLabour.id, ...formData });
            } else {
                await createLabourer.mutateAsync(formData);
            }
            setIsAddModalOpen(false);
            setSelectedLabour(null);
        } catch (err) {
            console.error('Save failed:', err);
        }
    };

    const openAddModal = () => {
        setSelectedLabour(null);
        setIsAddModalOpen(true);
    };

    return (
        <AppLayout>
            <div className="space-y-8 animate-fade-in pb-12">
                {/* 🎯 Premium Header */}
                <div className="premium-header relative">
                    <div className="relative z-10">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-700 text-[10px] font-black uppercase tracking-widest mb-3 border border-emerald-200/50 backdrop-blur-md animate-slide-down">
                            <Users className="h-3 w-3" />
                            Workforce Management
                        </div>
                        <h1 className="text-4xl font-black text-slate-900 tracking-tight leading-none">
                            Our <span className="text-emerald-600">Labourers</span>
                        </h1>
                        <p className="text-slate-500 font-medium mt-3 flex items-center gap-2">
                            <Activity className="h-4 w-4 text-emerald-500" />
                            {pagination.total || 0} Registered Personnel • {stats.activeCount} Currently Active
                        </p>
                    </div>
                    
                    <div className="flex items-center gap-3 animate-slide-up">
                        <Button variant="outline" className="rounded-2xl h-11 px-6 font-black text-[10px] uppercase tracking-widest border-slate-200 hover:bg-slate-50 shadow-sm active:scale-95 transition-all">
                            <Download className="h-4 w-4 mr-2 text-emerald-600" />
                            Export
                        </Button>
                        <Button onClick={openAddModal} className="bg-slate-900 hover:bg-slate-800 text-white font-black h-11 px-6 rounded-2xl shadow-lg active:scale-95 transition-all text-[10px] uppercase tracking-widest">
                            <Plus className="h-4 w-4 mr-2" />
                            Add Labourer
                        </Button>
                    </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 animate-slide-up">
                    <StatsCard icon={Users} label="Total Registered" value={stats.total} />
                    <StatsCard icon={Activity} label="Active Count" value={stats.activeCount} />
                    <div className="sm:col-span-2 lg:col-span-1">
                        <StatsCard icon={Wallet} label="Total Daily Cost" value={`₹${stats.dailyCost}`} />
                    </div>
                </div>

                {/* Filters */}
                <FilterBar 
                    search={search} setSearch={handleSearch}
                    statusFilter={statusFilter} setStatusFilter={handleStatusFilter}
                    locationFilter={locationFilter} setLocationFilter={setLocationFilter}
                    sortOption={sortOption} setSortOption={setSortOption}
                    locations={locations}
                />

                {/* Grid */}
                <div className="responsive-grid">
                    {isLoading ? (
                        [1, 2, 3].map(i => <div key={i} className="h-64 glass-strong animate-pulse rounded-2xl" />)
                    ) : processedLabourers.length === 0 ? (
                        <div className="col-span-full py-20 text-center glass-strong border-2 border-dashed border-slate-200 rounded-[2rem]">
                            <Users className="h-12 w-12 text-slate-300 mx-auto mb-4 opacity-50" />
                            <h3 className="text-xl font-black text-slate-900 uppercase tracking-widest">No workers found</h3>
                            <p className="text-sm text-slate-400 font-medium mt-2">Try adjusting your search or filters.</p>
                        </div>
                    ) : (
                        processedLabourers.map((labour) => (
                            <LabourCard 
                                key={labour.id}
                                labour={labour} lang={lang} 
                                onEdit={handleEdit} onDelete={handleDelete}
                            />
                        ))
                    )}
                </div>

                {/* Pagination Control */}
                <Pagination 
                    currentPage={pagination.page}
                    totalPages={pagination.totalPages}
                    onPageChange={setPage}
                    isLoading={isLoading}
                />

                <LabourerModal 
                    isOpen={isAddModalOpen} 
                    onClose={() => setIsAddModalOpen(false)} 
                    selectedLabour={selectedLabour} 
                    onSave={handleSave} 
                    isSaving={createLabourer.isPending || updateLabourer.isPending} 
                />
            </div>
        </AppLayout>
    );
};

export default Labourers;
