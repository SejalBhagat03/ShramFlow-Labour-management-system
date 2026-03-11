import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';
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
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Search, Filter, UserPlus, Phone, MapPin, Loader2, BookOpen } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { TrustScoreBadge } from '@/components/TrustScoreBadge';

/**
 * Labourers page component for managing the labour directory.
 * Allows supervisors to search, filter, add, edit, and remove labour records.
 *
 * @returns {JSX.Element} The Labourers page component.
 */
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
        getLabourBalance,
        getLabourStats
    } = useLabourers();
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [locationFilter, setLocationFilter] = useState('all');
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [selectedLabour, setSelectedLabour] = useState(null);
    const [isViewModalOpen, setIsViewModalOpen] = useState(false);

    // Form state (role fixed to "Labour")
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

    const [balance, setBalance] = useState(null);
    const [stats, setStats] = useState({ total_earned: 0, total_paid: 0 });
    const [loadingBalance, setLoadingBalance] = useState(false);

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

    const locations = useMemo(() => {
        return [...new Set(labourers.map((l) => l.location).filter(Boolean))];
    }, [labourers]);

    const handleView = async (labour) => {
        setSelectedLabour(labour);
        setIsViewModalOpen(true);
        setBalance(null);
        setStats({ total_earned: 0, total_paid: 0 });
        setLoadingBalance(true);
        try {
            const [bal, st] = await Promise.all([
                getLabourBalance(labour.id),
                getLabourStats(labour.id)
            ]);
            setBalance(bal);
            setStats(st);
        } catch (error) {
            console.error("Failed to fetch balance", error);
        } finally {
            setLoadingBalance(false);
        }
    };

    const handleEdit = (labour) => {
        setSelectedLabour(labour);
        setFormData({
            name: labour.name,
            name_hindi: labour.name_hindi || '',
            phone: labour.phone || '',
            role: 'Labour', // role fixed
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

            // success – close modal and reset
            setIsAddModalOpen(false);
            setSelectedLabour(null);
            resetForm();
        } catch (err) {
            // mutation onError toast already fired; just log and keep form open
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
            location: '',
            // Email is now auto-generated from phone if password is set
            // Password undefined means "Login Disabled"
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
            <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 space-y-3 md:space-y-6">
                {/* Immersive Page Header */}
                <div className="relative -mx-3 sm:-mx-4 md:-mx-6 px-3 sm:px-4 md:px-6 pt-6 lg:pt-8 pb-8 gradient-hero rounded-b-3xl border-b border-white/10">
                    <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 md:gap-6">
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse-soft" />
                                <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground/80">Workforce Management</span>
                            </div>
                            <h1 className="text-xl sm:text-2xl md:text-3xl font-semibold tracking-tight text-foreground">{t('labourDirectory')}</h1>
                            <p className="text-muted-foreground mt-1 text-xs sm:text-sm md:text-base font-medium">
                                {filteredLabourers.length} {t('labourers')} currently active
                            </p>
                        </div>
                        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                            <Button className="py-2.5 px-4 rounded-xl gradient-primary shadow-glow font-bold w-full sm:w-auto text-sm md:text-base h-auto" onClick={openAddModal}>
                                <UserPlus className="h-4 w-4 mr-2" />
                                {t('addNewLabour')}
                            </Button>
                        </div>
                    </div>
                </div>

                {/* Main Content Sections */}
                <div className="space-y-4 md:space-y-6">
                    {/* Filters Section */}
                    <div className="flex flex-col sm:flex-row gap-3 md:gap-6 bg-card p-4 md:p-6 rounded-2xl border shadow-sm">
                        <div className="relative flex-1">
                            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder={`${t('search')} by name...`}
                                className="pl-10 py-2 px-3 h-10 md:h-11 bg-muted/40 border-none focus-visible:ring-2 focus-visible:ring-primary/20 rounded-xl text-sm"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                            />
                        </div>
                        <div className="flex flex-col sm:flex-row gap-2 md:gap-3">
                            <Select value={statusFilter} onValueChange={setStatusFilter}>
                                <SelectTrigger className="w-full sm:w-40 h-10 md:h-11 bg-muted/40 border-none rounded-xl px-3 md:px-4 text-sm">
                                    <div className="flex items-center gap-2">
                                        <Filter className="h-3.5 w-3.5 text-muted-foreground" />
                                        <SelectValue placeholder={t('status')} />
                                    </div>
                                </SelectTrigger>
                                <SelectContent className="rounded-xl">
                                    <SelectItem value="all">All Status</SelectItem>
                                    <SelectItem value="active">{t('active')}</SelectItem>
                                    <SelectItem value="inactive">{t('inactive')}</SelectItem>
                                </SelectContent>
                            </Select>
                            <Select value={locationFilter} onValueChange={setLocationFilter}>
                                <SelectTrigger className="w-full sm:w-48 h-10 md:h-11 bg-muted/40 border-none rounded-xl px-3 md:px-4 text-sm">
                                    <div className="flex items-center gap-2">
                                        <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                                        <SelectValue placeholder={t('location')} />
                                    </div>
                                </SelectTrigger>
                                <SelectContent className="rounded-xl">
                                    <SelectItem value="all">All Locations</SelectItem>
                                    {locations.map((loc) => (
                                        <SelectItem key={loc} value={loc}>
                                            {loc}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    {/* Labour Grid */}
                    {isLoading ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                            {Array.from({ length: 6 }).map((_, i) => (
                                <Skeleton key={i} className="h-48 rounded-xl" />
                            ))}
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                            {filteredLabourers.map((labour) => (
                                <div
                                    key={labour.id}
                                    className="bg-card rounded-xl border p-4 shadow-card transition-all duration-200 hover:shadow-lg"
                                >
                                    <div className="flex items-start gap-3">
                                        <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                                            <span className="text-primary font-bold text-lg">
                                                {labour.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                                            </span>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center justify-between gap-2">
                                                <h3 className="font-semibold text-foreground truncate">
                                                    {lang === 'hi' && labour.name_hindi ? labour.name_hindi : labour.name}
                                                </h3>
                                                <Badge
                                                    variant="outline"
                                                    className={cn(
                                                        labour.status === 'active'
                                                            ? 'bg-success/10 text-success border-success/20'
                                                            : 'bg-muted text-muted-foreground'
                                                    )}
                                                >
                                                    {labour.status}
                                                </Badge>
                                            </div>
                                            <p className="text-sm text-primary font-medium">Labour</p>
                                            <div className="flex items-center gap-2 mt-1">
                                                <p className="text-sm text-muted-foreground">₹{labour.daily_rate}/day</p>
                                                <TrustScoreBadge labourerId={labour.id} size="sm" />
                                            </div>

                                            <div className="mt-2 space-y-1 text-xs text-muted-foreground">
                                                {labour.phone && (
                                                    <div className="flex items-center gap-1">
                                                        <Phone className="h-3 w-3" />
                                                        {labour.phone}
                                                    </div>
                                                )}
                                                {labour.location && (
                                                    <div className="flex items-center gap-1">
                                                        <MapPin className="h-3 w-3" />
                                                        {labour.location}
                                                    </div>
                                                )}
                                            </div>

                                            <div className="flex gap-2 mt-3">
                                                <Button size="sm" variant="outline" onClick={() => handleView(labour)}>
                                                    View
                                                </Button>
                                                <Button size="sm" variant="outline" onClick={() => handleEdit(labour)}>
                                                    Edit
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    className="text-destructive"
                                                    onClick={() => handleDelete(labour)}
                                                >
                                                    Delete
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {!isLoading && filteredLabourers.length === 0 && (
                        <div className="text-center py-12">
                            <p className="text-muted-foreground">{t('noData')}</p>
                            <Button className="mt-4" onClick={openAddModal}>
                                <UserPlus className="h-4 w-4 mr-2" />
                                {t('addNewLabour')}
                            </Button>
                        </div>
                    )}

                    {/* Add/Edit Modal */}
                    <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
                        <DialogContent className="sm:max-w-md">
                            <DialogHeader className="p-4 md:px-6 md:pt-6 border-b">
                                <DialogTitle>
                                    {selectedLabour ? t('editLabour') : t('addNewLabour')}
                                </DialogTitle>
                                <DialogDescription className="text-xs">
                                    Fill in the details below to {selectedLabour ? 'update' : 'add'} a labour.
                                </DialogDescription>
                            </DialogHeader>

                            <div className="overflow-y-auto max-h-[60vh] p-4 md:p-6 space-y-4">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
                                    <div className="space-y-1.5">
                                        <Label htmlFor="labour_name_input" className="text-xs font-semibold">Labour Name *</Label>
                                        <Input
                                            id="labour_name_input"
                                            name="labour_name_input"
                                            autoComplete="off"
                                            value={formData.name}
                                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                            onBlur={handleAutoTranslateName}
                                            placeholder="Enter Name (e.g. Ramesh)"
                                            className="h-9 text-sm"
                                            required
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label htmlFor="nameHindi" className="text-xs font-semibold">{t('nameInHindi')}</Label>
                                        <Input
                                            id="nameHindi"
                                            value={formData.name_hindi}
                                            onChange={(e) => setFormData({ ...formData, name_hindi: e.target.value })}
                                            placeholder="रमेश कुमार"
                                            className="h-9 text-sm"
                                        />
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
                                    <div className="space-y-1.5">
                                        <Label htmlFor="phone" className="text-xs font-semibold">{t('phone')}</Label>
                                        <Input
                                            id="phone"
                                            value={formData.phone}
                                            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                            placeholder="+91 98765 43210"
                                            className="h-9 text-sm"
                                        />
                                    </div>
                                    <input type="hidden" value={formData.role} />
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
                                    <div className="space-y-1.5">
                                        <Label htmlFor="dailyRate" className="text-xs font-semibold">{t('dailyRate')} (₹) *</Label>
                                        <Input
                                            id="dailyRate"
                                            type="number"
                                            value={formData.daily_rate}
                                            onChange={(e) => setFormData({ ...formData, daily_rate: Number(e.target.value) })}
                                            className="h-9 text-sm"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label htmlFor="ratePerMeter" className="text-xs font-semibold">Rate Per Meter (₹)</Label>
                                        <Input
                                            id="ratePerMeter"
                                            type="number"
                                            placeholder="0"
                                            value={formData.rate_per_meter || ''}
                                            onChange={(e) => setFormData({ ...formData, rate_per_meter: Number(e.target.value) })}
                                            className="h-9 text-sm"
                                        />
                                        <p className="text-[10px] text-muted-foreground font-medium">Auto-calculates wage for metered work</p>
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
                                    <div className="space-y-1.5">
                                        <Label htmlFor="location" className="text-xs font-semibold">{t('location')}</Label>
                                        <Input
                                            id="location"
                                            value={formData.location}
                                            onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                                            placeholder="Site A - Sector 15"
                                            className="h-9 text-sm"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-1.5">
                                    <Label htmlFor="status" className="text-xs font-semibold">{t('status')}</Label>
                                    <Select
                                        value={formData.status}
                                        onValueChange={(value) => setFormData({ ...formData, status: value })}
                                    >
                                        <SelectTrigger className="h-9 text-sm">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="active">{t('active')}</SelectItem>
                                            <SelectItem value="inactive">{t('inactive')}</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                {!selectedLabour && (
                                    <>
                                        <div className="border-t pt-4">
                                            <div className="flex items-center space-x-2 mb-4">
                                                <input
                                                    type="checkbox"
                                                    id="enableLogin"
                                                    className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                                                    checked={!!formData.password}
                                                    onChange={(e) => {
                                                        if (e.target.checked) {
                                                            setFormData({ ...formData, password: '' });
                                                        } else {
                                                            setFormData({ ...formData, password: '', email: '' });
                                                        }
                                                    }}
                                                />
                                                <Label htmlFor="enableLogin" className="peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-xs font-semibold">
                                                    Enable Login Access for this Labourer
                                                </Label>
                                            </div>

                                            {formData.password !== undefined && (
                                                <div className="space-y-4 animate-in slide-in-from-top-2 duration-200">
                                                    <p className="text-[10px] text-muted-foreground font-medium">
                                                        Login will be enabled using their <strong>Phone Number</strong> as the username.
                                                    </p>
                                                    <div className="space-y-1.5">
                                                        <Label htmlFor="password" title="Set Login Password" className="text-xs font-semibold">Set Login Password</Label>
                                                        <Input
                                                            id="password"
                                                            type="password"
                                                            value={formData.password}
                                                            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                                            placeholder="Create a password (min 6 chars)"
                                                            minLength={6}
                                                            className="h-9 text-sm"
                                                        />
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </>
                                )}
                            </div>

                            <div className="sticky bottom-0 bg-white border-t pt-3 pb-2 px-4 md:px-6 flex justify-end gap-3 z-10">
                                <Button variant="outline" size="sm" onClick={() => setIsAddModalOpen(false)}>
                                    {t('cancel')}
                                </Button>
                                <Button
                                    size="sm"
                                    className="gradient-primary"
                                    onClick={handleSave}
                                    disabled={!formData.name || createLabourer.isPending || updateLabourer.isPending}
                                >
                                    {(createLabourer.isPending || updateLabourer.isPending) ? (
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

                    {/* View Modal */}
                    <Dialog open={isViewModalOpen} onOpenChange={setIsViewModalOpen}>
                        <DialogContent className="sm:max-w-md">
                            <DialogHeader className="p-4 md:px-6 md:pt-6 border-b">
                                <DialogTitle>
                                    {lang === 'hi' && selectedLabour?.name_hindi ? selectedLabour.name_hindi : selectedLabour?.name}
                                </DialogTitle>
                                <DialogDescription className="text-xs">Labour Profile</DialogDescription>
                            </DialogHeader>

                            {selectedLabour && (
                                <>
                                    <div className="overflow-y-auto max-h-[60vh] p-4 md:p-6 space-y-4">
                                        {/* Balance Section */}
                                        <div className="bg-muted/30 p-4 rounded-xl border border-white/40 shadow-sm space-y-4">
                                            <div className="flex items-center justify-between border-b border-white/40 pb-3">
                                                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground/80">Net Balance</p>
                                                {loadingBalance ? (
                                                    <div className="h-6 w-24 bg-muted animate-pulse rounded" />
                                                ) : (
                                                    <div className="text-right">
                                                        <span className={cn(
                                                            "text-xl font-bold block leading-none mb-1",
                                                            balance >= 0 ? "text-green-600" : "text-red-600"
                                                        )}>
                                                            {balance !== null ? (balance >= 0 ? `₹${balance}` : `-₹${Math.abs(balance)}`) : '₹0'}
                                                        </span>
                                                        <Badge variant={balance >= 0 ? "outline" : "destructive"} className="text-[10px] h-5 px-2 bg-white/50">
                                                            {balance >= 0 ? "Pending Payout" : "Advance Taken"}
                                                        </Badge>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Stats Grid */}
                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="bg-white/40 p-2.5 rounded-lg border border-white/60">
                                                    <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/80 mb-1">Total Earned</p>
                                                    <p className="font-bold text-green-700 text-sm">
                                                        ₹{(stats?.total_earned || 0).toLocaleString()}
                                                    </p>
                                                </div>
                                                <div className="bg-white/40 p-2.5 rounded-lg border border-white/60">
                                                    <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/80 mb-1">Total Paid</p>
                                                    <p className="font-bold text-red-700 text-sm">
                                                        ₹{(stats?.total_paid || 0).toLocaleString()}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-3 md:gap-4">
                                            <div className="bg-muted/20 p-3 rounded-lg border border-border/40">
                                                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60 mb-0.5">{t('phone')}</p>
                                                <p className="font-semibold text-sm">{selectedLabour.phone || 'N/A'}</p>
                                            </div>
                                            <div className="bg-muted/20 p-3 rounded-lg border border-border/40">
                                                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60 mb-0.5">{t('dailyRate')}</p>
                                                <p className="font-semibold text-sm text-primary">₹{selectedLabour.daily_rate}</p>
                                            </div>
                                            <div className="bg-muted/20 p-3 rounded-lg border border-border/40">
                                                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60 mb-0.5">{t('location')}</p>
                                                <p className="font-semibold text-sm truncate">{selectedLabour.location || 'N/A'}</p>
                                            </div>
                                            <div className="bg-muted/20 p-3 rounded-lg border border-border/40">
                                                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60 mb-0.5">{t('joinDate')}</p>
                                                <p className="font-semibold text-sm">{selectedLabour.join_date || 'N/A'}</p>
                                            </div>
                                        </div>

                                        {/* Trust Score Section */}
                                        <div className="border-t border-border/40 pt-4">
                                            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60 mb-3">{t('trustScore')}</p>
                                            <div className="bg-muted/20 p-4 rounded-xl border border-border/40">
                                                <TrustScoreBadge labourerId={selectedLabour.id} showScore showProgress size="md" />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="sticky bottom-0 bg-white border-t pt-3 pb-2 px-4 md:px-6 flex gap-2 z-10">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="flex-1 rounded-xl h-10"
                                            onClick={() => {
                                                setIsViewModalOpen(false);
                                                handleEdit(selectedLabour);
                                            }}
                                        >
                                            {t('edit')}
                                        </Button>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="flex-1 rounded-xl h-10"
                                            onClick={() => navigate(`/labour/${selectedLabour.id}/ledger`)}
                                        >
                                            <BookOpen className="h-4 w-4 mr-2" />
                                            Ledger
                                        </Button>
                                        {selectedLabour.phone && (
                                            <Button
                                                size="sm"
                                                className="flex-1 gradient-primary rounded-xl h-10 font-bold"
                                                onClick={() => window.open(`tel:${selectedLabour.phone}`)}
                                            >
                                                Call Now
                                            </Button>
                                        )}
                                    </div>
                                </>
                            )}
                        </DialogContent>
                    </Dialog>
                </div>
            </div>
        </AppLayout>
    );
};

export default Labourers;
