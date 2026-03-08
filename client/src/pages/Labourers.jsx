import { useState } from 'react';
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

    const filteredLabourers = labourers.filter((labour) => {
        const matchesSearch =
            labour.name.toLowerCase().includes(search.toLowerCase()) ||
            (labour.name_hindi?.includes(search) || false) ||
            (labour.phone?.includes(search) || false);
        const matchesStatus = statusFilter === 'all' || labour.status === statusFilter;
        const matchesLocation = locationFilter === 'all' || labour.location === locationFilter;
        return matchesSearch && matchesStatus && matchesLocation;
    });

    const locations = [...new Set(labourers.map((l) => l.location).filter(Boolean))];

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
            <div className="space-y-6">
                {/* Immersive Page Header */}
                <div className="relative -mx-4 lg:-mx-8 -mt-4 lg:-mt-8 px-4 lg:px-8 pt-8 pb-10 gradient-hero rounded-b-[3rem] shadow-sm border-b border-white/10">
                    <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
                        <div>
                            <div className="flex items-center gap-3 mb-2">
                                <div className="w-2 h-2 rounded-full bg-primary animate-pulse-soft" />
                                <span className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Workforce Management</span>
                            </div>
                            <h1 className="text-3xl lg:text-4xl font-bold tracking-tight text-foreground">{t('labourDirectory')}</h1>
                            <p className="text-muted-foreground mt-2 text-lg font-medium">
                                {filteredLabourers.length} {t('labourers')} currently active in the directory
                            </p>
                        </div>
                        <Button className="h-11 px-6 rounded-xl gradient-primary shadow-glow font-bold" onClick={openAddModal}>
                            <UserPlus className="h-4 w-4 mr-2" />
                            {t('addNewLabour')}
                        </Button>
                    </div>
                </div>

                {/* Main Content Sections */}
                <div className="space-y-6">
                    {/* Filters Section */}
                    <div className="flex flex-col lg:flex-row gap-4 bg-card p-5 rounded-2xl border shadow-sm">
                        <div className="relative flex-1">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder={`${t('search')} by name, phone...`}
                                className="pl-11 h-12 bg-muted/40 border-none focus-visible:ring-2 focus-visible:ring-primary/20 rounded-xl"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                            />
                        </div>
                        <div className="flex flex-col sm:flex-row gap-3">
                            <Select value={statusFilter} onValueChange={setStatusFilter}>
                                <SelectTrigger className="w-full sm:w-48 h-12 bg-muted/40 border-none rounded-xl px-4">
                                    <div className="flex items-center gap-2">
                                        <Filter className="h-4 w-4 text-muted-foreground" />
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
                                <SelectTrigger className="w-full sm:w-56 h-12 bg-muted/40 border-none rounded-xl px-4">
                                    <div className="flex items-center gap-2">
                                        <MapPin className="h-4 w-4 text-muted-foreground" />
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
                        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            {Array.from({ length: 6 }).map((_, i) => (
                                <Skeleton key={i} className="h-48 rounded-xl" />
                            ))}
                        </div>
                    ) : (
                        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
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
                        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
                            <DialogHeader>
                                <DialogTitle>
                                    {selectedLabour ? t('editLabour') : t('addNewLabour')}
                                </DialogTitle>
                                <DialogDescription>
                                    Fill in the details below to {selectedLabour ? 'update' : 'add'} a labour.
                                </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4 py-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="labour_name_input">Labour Name *</Label>
                                        <Input
                                            id="labour_name_input"
                                            name="labour_name_input"
                                            autoComplete="off"
                                            value={formData.name}
                                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                            onBlur={handleAutoTranslateName}
                                            placeholder="Enter Name (e.g. Ramesh)"
                                            required
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="nameHindi">{t('nameInHindi')}</Label>
                                        <Input
                                            id="nameHindi"
                                            value={formData.name_hindi}
                                            onChange={(e) => setFormData({ ...formData, name_hindi: e.target.value })}
                                            placeholder="रमेश कुमार"
                                        />
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="phone">{t('phone')}</Label>
                                        <Input
                                            id="phone"
                                            value={formData.phone}
                                            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                            placeholder="+91 98765 43210"
                                        />
                                    </div>
                                    {/* job role is fixed; every entry is treated simply as a labourer */}
                                    <input type="hidden" value={formData.role} />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="dailyRate">{t('dailyRate')} (₹) *</Label>
                                        <Input
                                            id="dailyRate"
                                            type="number"
                                            value={formData.daily_rate}
                                            onChange={(e) => setFormData({ ...formData, daily_rate: Number(e.target.value) })}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="ratePerMeter">Rate Per Meter (₹)</Label>
                                        <Input
                                            id="ratePerMeter"
                                            type="number"
                                            placeholder="0"
                                            value={formData.rate_per_meter || ''}
                                            onChange={(e) => setFormData({ ...formData, rate_per_meter: Number(e.target.value) })}
                                        />
                                        <p className="text-xs text-muted-foreground">Auto-calculates wage for metered work</p>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="location">{t('location')}</Label>
                                        <Input
                                            id="location"
                                            value={formData.location}
                                            onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                                            placeholder="Site A - Sector 15"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="status">{t('status')}</Label>
                                    <Select
                                        value={formData.status}
                                        onValueChange={(value) => setFormData({ ...formData, status: value })}
                                    >
                                        <SelectTrigger>
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
                                                <Label htmlFor="enableLogin" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                                                    Enable Login Access for this Labourer
                                                </Label>
                                            </div>

                                            {formData.password !== undefined && (
                                                <div className="space-y-4 animate-in slide-in-from-top-2 duration-200">
                                                    <p className="text-xs text-muted-foreground">
                                                        Login will be enabled using their <strong>Phone Number</strong> as the username.
                                                    </p>
                                                    <div className="space-y-2">
                                                        <Label htmlFor="password">Set Login Password</Label>
                                                        <Input
                                                            id="password"
                                                            type="password"
                                                            value={formData.password}
                                                            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                                            placeholder="Create a password (min 6 chars)"
                                                            minLength={6}
                                                        />
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </>
                                )}
                            </div>
                            <div className="flex justify-end gap-3">
                                <Button variant="outline" onClick={() => setIsAddModalOpen(false)}>
                                    {t('cancel')}
                                </Button>
                                <Button
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
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>
                                    {lang === 'hi' && selectedLabour?.name_hindi ? selectedLabour.name_hindi : selectedLabour?.name}
                                </DialogTitle>
                                <DialogDescription>Labour</DialogDescription>
                            </DialogHeader>
                            {selectedLabour && (
                                <div className="space-y-4 py-4">
                                    {/* Balance Section */}
                                    <div className="bg-muted/30 p-4 rounded-lg border space-y-4">
                                        <div className="flex items-center justify-between border-b pb-2">
                                            <p className="text-sm text-muted-foreground">Net Balance</p>
                                            {loadingBalance ? (
                                                <div className="h-6 w-24 bg-muted animate-pulse rounded" />
                                            ) : (
                                                <div className="text-right">
                                                    <span className={cn(
                                                        "text-xl font-bold block",
                                                        balance >= 0 ? "text-green-600" : "text-red-600"
                                                    )}>
                                                        {balance !== null ? (balance >= 0 ? `₹${balance}` : `-₹${Math.abs(balance)}`) : '₹0'}
                                                    </span>
                                                    <Badge variant={balance >= 0 ? "outline" : "destructive"} className="text-[10px] h-5">
                                                        {balance >= 0 ? "Pending Payout" : "Advance Taken"}
                                                    </Badge>
                                                </div>
                                            )}
                                        </div>

                                        {/* Stats Grid */}
                                        <div className="grid grid-cols-2 gap-4 pt-2">
                                            <div>
                                                <p className="text-xs text-muted-foreground">Total Work Done</p>
                                                <p className="font-semibold text-green-700">
                                                    {/* We don't have this yet from RPC, for now placeholder or need another RPC */}
                                                    ₹{(stats?.total_earned || 0).toLocaleString()}
                                                </p>
                                            </div>
                                            <div>
                                                <p className="text-xs text-muted-foreground">Total Paid/Advance</p>
                                                <p className="font-semibold text-red-700">
                                                    ₹{(stats?.total_paid || 0).toLocaleString()}
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4 text-sm">
                                        <div>
                                            <p className="text-muted-foreground">{t('phone')}</p>
                                            <p className="font-medium">{selectedLabour.phone || 'N/A'}</p>
                                        </div>
                                        <div>
                                            <p className="text-muted-foreground">{t('dailyRate')}</p>
                                            <p className="font-medium text-primary">₹{selectedLabour.daily_rate}</p>
                                        </div>
                                        <div>
                                            <p className="text-muted-foreground">{t('location')}</p>
                                            <p className="font-medium">{selectedLabour.location || 'N/A'}</p>
                                        </div>
                                        <div>
                                            <p className="text-muted-foreground">{t('joinDate')}</p>
                                            <p className="font-medium">{selectedLabour.join_date || 'N/A'}</p>
                                        </div>
                                    </div>

                                    {/* Trust Score Section */}
                                    <div className="border-t pt-4">
                                        <p className="text-sm text-muted-foreground mb-2">{t('trustScore')}</p>
                                        <TrustScoreBadge labourerId={selectedLabour.id} showScore showProgress size="md" />
                                    </div>

                                    <div className="flex gap-2 pt-4">
                                        <Button
                                            variant="outline"
                                            className="flex-1"
                                            onClick={() => {
                                                setIsViewModalOpen(false);
                                                handleEdit(selectedLabour);
                                            }}
                                        >
                                            {t('edit')}
                                        </Button>
                                        <Button
                                            variant="outline"
                                            className="flex-1"
                                            onClick={() => navigate(`/labour/${selectedLabour.id}/ledger`)}
                                        >
                                            <BookOpen className="h-4 w-4 mr-2" />
                                            Ledger
                                        </Button>
                                        {selectedLabour.phone && (
                                            <Button
                                                className="flex-1 gradient-primary"
                                                onClick={() => window.open(`tel:${selectedLabour.phone}`)}
                                            >
                                                Call
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            )}
                        </DialogContent>
                    </Dialog>
                </div>
            </div>
        </AppLayout>
    );
};

export default Labourers;
