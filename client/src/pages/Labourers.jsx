import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/hooks/useAuth';
import { AppLayout } from '@/components/AppLayout';
import { useLabourers } from '@/hooks/useLabourers';
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
import { StatsCard } from '@/components/workforce/StatsCard';
import { LabourCard } from '@/components/workforce/LabourCard';
import { FilterBar } from '@/components/workforce/FilterBar';
import { LabourerModal } from '@/components/modals/LabourerModal';

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
