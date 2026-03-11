import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';
import { AppLayout } from '@/components/AppLayout';
import { useLabourers } from '@/hooks/useLabourers';
import { workService } from '@/services/workService';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AlertCircle, Users, MapPin, Ruler, Save, Plus, ArrowLeft, Edit, UserPlus } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';


const taskKeys = [
    'taskDiggingHole',
    'taskPoleInstallation',
    'taskCableLaying',
    'taskMaintenance',
    'taskRepairWork',
    'taskCustomTask',
];

const areaKeys = [
    'areaSadar', 'areaCivilLines', 'areaDharampeth', 'areaRamdaspeth', 'areaShankarNagar',
    'areaPratapNagar', 'areaTrimurtiNagar', 'areaManishNagar', 'areaWardhaRoad', 'areaNarendraNagar',
    'areaBesa', 'areaBeltarodi', 'areaMIHAN', 'areaHingna', 'areaPardi', 'areaItwari',
    'areaMahal', 'areaManewada', 'areaSomalwada', 'areaKoradiRoad', 'areaZingabaiTakli'
];

const GroupWorkEntry = () => {
    const { t } = useTranslation();
    const { user } = useAuth();
    const navigate = useNavigate();
    const { labourers, isLoading: isLoadingLabourers } = useLabourers();

    const [step, setStep] = useState(1); // 1: Setup, 2: Finalize meters
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [location, setLocation] = useState('');
    const [taskType, setTaskType] = useState('');
    const [totalArea, setTotalArea] = useState(0);
    const [selectedLabours, setSelectedLabours] = useState([]);
    const [labourMeters, setLabourMeters] = useState({}); // { labourId: meters }
    const [tempRates, setTempRates] = useState({}); // { labourId: rate }
    const [isEditMode, setIsEditMode] = useState(false);

    // Multi-select logic
    const toggleLabour = (labourId) => {
        setSelectedLabours(prev => {
            if (prev.includes(labourId)) {
                const newSelected = prev.filter(id => id !== labourId);
                const newMeters = { ...labourMeters };
                delete newMeters[labourId];
                setLabourMeters(newMeters);
                return newSelected;
            } else {
                return [...prev, labourId];
            }
        });
    };

    const handleMeterChange = (labourId, meters) => {
        setLabourMeters(prev => ({
            ...prev,
            [labourId]: Number(meters) || 0
        }));
    };

    const sumIndividualMeters = useMemo(() => {
        return Object.values(labourMeters).reduce((sum, val) => sum + val, 0);
    }, [labourMeters]);

    const remainingMeters = totalArea - sumIndividualMeters;
    const isOverLimit = sumIndividualMeters > totalArea;

    const handleRateChange = (labourId, rate) => {
        setTempRates(prev => ({
            ...prev,
            [labourId]: Number(rate) || 0
        }));
    };

    const handleCreateGroup = () => {
        if (!date || !location || !taskType || totalArea <= 0 || selectedLabours.length === 0) {
            toast.error("Please fill all required fields and select at least one labour");
            return;
        }

        // Initialize temp rates from labourers list
        const initialRates = {};
        selectedLabours.forEach(id => {
            const l = labourers.find(x => x.id === id);
            initialRates[id] = l?.rate_per_meter || 0;
        });
        setTempRates(initialRates);

        // Move to step 2 - finalize meters
        setStep(2);
        toast.success("Group created! Now assign meters and verify rates.");
    };

    const handleSaveWork = async () => {
        if (isOverLimit) {
            toast.error(t('validateMetersError'));
            return;
        }

        // Check if meters are assigned
        const hasAnyMeters = Object.values(labourMeters).some(m => m > 0);

        let distribution;

        if (!hasAnyMeters || sumIndividualMeters === 0) {
            // Auto-divide equally among all selected labourers
            const metersPerLabour = totalArea / selectedLabours.length;
            distribution = selectedLabours.map(id => {
                const labour = labourers.find(l => l.id === id);
                // Use labour's rate_per_meter if available, otherwise fallback or error
                const rate = labour?.rate_per_meter || 0;
                return {
                    labourId: id,
                    meters: metersPerLabour,
                    payment: metersPerLabour * rate,
                    autoAssigned: true,
                    rateUsed: rate
                };
            });
            toast.info(`Work divided equally: ${metersPerLabour.toFixed(1)}m per labour`);
        } else {
            // Use manually assigned meters
            const unassignedLabours = selectedLabours.filter(id => !labourMeters[id] || labourMeters[id] === 0);

            if (unassignedLabours.length > 0 && remainingMeters > 0) {
                const metersPerUnassigned = remainingMeters / unassignedLabours.length;
                unassignedLabours.forEach(id => {
                    labourMeters[id] = metersPerUnassigned;
                });
                toast.info(`Remaining ${remainingMeters.toFixed(1)}m divided among ${unassignedLabours.length} unassigned labourers`);
            }

            distribution = selectedLabours.map(id => {
                const rate = tempRates[id] || 0;
                return {
                    labourId: id,
                    meters: labourMeters[id] || 0,
                    payment: (labourMeters[id] || 0) * rate,
                    autoAssigned: !labourMeters[id] || labourMeters[id] === 0,
                    rateUsed: rate
                };
            });
        }

        // Validate if any labour has 0 rate -> Error if we have meters
        const hasRateIssue = distribution.some(d => d.rateUsed === 0 && d.meters > 0);
        if (hasRateIssue) {
            toast.error("One or more labourers have a Rate of 0 but have work assigned. Please set their rates in the Labourers page first.");
            return;
        }

        if (distribution.some(d => d.rateUsed === 0)) {
            toast.warning("Some labourers have a Rate of 0. Payment will be 0.");
        }

        // Generate a unique Group ID
        const groupId = crypto.randomUUID();

        // Prepare bulk data for Supabase
        const bulkEntries = distribution
            .filter(item => item.labourId && item.labourId !== 'undefined')
            .map(item => ({
                group_id: groupId,
                labourer_id: item.labourId,
                supervisor_id: user?.id,
                date: date,
                task_type: taskType,
                meters: item.meters,
                amount: item.payment,
                location: location,
                description: `Group Work: ${taskType} - Total Area: ${totalArea}m ${item.autoAssigned ? '(Auto-split)' : ''}`,
                status: 'pending'
            }));

        try {
            if (import.meta.env.DEV) console.log("Saving Bulk Entries:", bulkEntries);

            // 1. Update any changed rates in the database first
            const rateUpdatePromises = distribution.map(item => {
                const l = labourers.find(x => x.id === item.labourId);
                if (item.rateUsed > 0 && item.rateUsed !== l?.rate_per_meter) {
                    return workService.updateLabourerRate(item.labourId, item.rateUsed);
                }
                return Promise.resolve();
            });
            await Promise.all(rateUpdatePromises);

            // 2. Save work entries
            await workService.createBulkWorkEntries(bulkEntries);

            toast.success(`Successfully saved ${bulkEntries.length} work entries!`);
            navigate('/work-entries');
        } catch (error) {
            if (import.meta.env.DEV) console.error("Failed to save group work:", error);
            toast.error("Failed to save work entries: " + error.message);
        }
    };

    const handleAddMoreLabour = () => {
        setIsEditMode(true);
        toast.info("You can now add more labourers to this group");
    };

    return (
        <AppLayout>
            <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 space-y-3 md:space-y-6">
                <div className="relative -mx-3 sm:-mx-4 md:-mx-6 px-3 sm:px-4 md:px-6 pt-6 lg:pt-8 pb-8 gradient-hero rounded-b-3xl border-white/10 border-b">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={() => navigate(-1)}>
                                <ArrowLeft className="h-4 w-4" />
                            </Button>
                            <div>
                                <h1 className="text-xl sm:text-2xl md:text-3xl font-semibold tracking-tight text-foreground">{t('groupWorkEntry')}</h1>
                                <p className="text-muted-foreground mt-1 text-xs sm:text-sm font-medium">
                                    {step === 1 ? 'Step 1: Setup group and select labourers' : 'Step 2: Finalize work meters after completion'}
                                </p>
                            </div>
                        </div>
                        {step === 2 && (
                            <Badge variant="outline" className="bg-success/10 text-success border-success/20 w-fit">
                                Group Created
                            </Badge>
                        )}
                    </div>
                </div>

                {step === 1 ? (
                    // STEP 1: Setup Group
                    <>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Group Details */}
                            <Card className="shadow-card">
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <MapPin className="h-5 w-5 text-primary" />
                                        {t('groupDetails')}
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="space-y-2">
                                        <Label>{t('date')} *</Label>
                                        <Input
                                            type="date"
                                            value={date}
                                            onChange={(e) => setDate(e.target.value)}
                                            className="h-12 text-lg"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>{t('location')} (Nagpur Areas) *</Label>
                                        <Select value={location} onValueChange={setLocation}>
                                            <SelectTrigger className="h-12 text-lg">
                                                <SelectValue placeholder="Select Area" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {areaKeys.map(key => (
                                                    <SelectItem key={key} value={t(key)}>{t(key)}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>{t('taskType')} *</Label>
                                        <Select value={taskType} onValueChange={setTaskType}>
                                            <SelectTrigger className="h-12 text-lg">
                                                <SelectValue placeholder="Select Task" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {taskKeys.map(key => (
                                                    <SelectItem key={key} value={t(key)}>{t(key)}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>{t('totalWorkArea')} (Estimated) *</Label>
                                        <div className="relative">
                                            <Ruler className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                                            <Input
                                                type="number"
                                                placeholder="0"
                                                className="pl-10 h-12 text-xl font-bold"
                                                value={totalArea || ''}
                                                onChange={(e) => setTotalArea(Number(e.target.value))}
                                            />
                                        </div>
                                        <p className="text-xs text-muted-foreground">You can adjust this later based on actual work</p>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Select Labours */}
                            <Card className="shadow-card overflow-hidden">
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <Users className="h-5 w-5 text-primary" />
                                        {t('selectLabours')} ({selectedLabours.length})
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="p-0">
                                    <ScrollArea className="h-[400px] px-6">
                                        <div className="space-y-2 py-4">
                                            {isLoadingLabourers ? (
                                                <p>Loading labourers...</p>
                                            ) : (
                                                labourers.map(labour => (
                                                    <div
                                                        key={labour.id}
                                                        className={`flex items-center space-x-3 p-3 rounded-lg border transition-colors cursor-pointer ${selectedLabours.includes(labour.id) ? 'bg-primary/5 border-primary shadow-sm' : 'hover:bg-accent'}`}
                                                        onClick={() => toggleLabour(labour.id)}
                                                    >
                                                        <Checkbox checked={selectedLabours.includes(labour.id)} onCheckedChange={() => toggleLabour(labour.id)} />
                                                        <div className="flex-1">
                                                            <p className="font-medium">{labour.name}</p>
                                                            <p className="text-xs text-muted-foreground">{labour.phone}</p>
                                                            <p className="text-xs font-semibold text-primary/80">
                                                                Rate: ₹{labour.rate_per_meter || 0}/m
                                                            </p>
                                                        </div>
                                                        {selectedLabours.includes(labour.id) && (
                                                            <Badge className="bg-success">Selected</Badge>
                                                        )}
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    </ScrollArea>
                                </CardContent>
                            </Card>
                        </div>

                        <div className="flex justify-end">
                            <Button
                                className="h-14 px-8 text-lg font-bold gradient-primary shadow-glow"
                                onClick={handleCreateGroup}
                                disabled={!date || !location || !taskType || totalArea <= 0 || selectedLabours.length === 0}
                            >
                                <Plus className="h-5 w-5 mr-2" />
                                Create Group & Continue
                            </Button>
                        </div>
                    </>
                ) : (
                    // STEP 2: Finalize Meters
                    <>
                        {/* Summary Card */}
                        <Card className="shadow-card border-2 border-primary/20">
                            <CardContent className="pt-6">
                                <div className="grid gap-3 md:gap-6 grid-cols-2 md:grid-cols-4 text-center">
                                    <div>
                                        <p className="text-sm text-muted-foreground">Date</p>
                                        <p className="font-bold">{new Date(date).toLocaleDateString()}</p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-muted-foreground">Location</p>
                                        <p className="font-bold">{location}</p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-muted-foreground">Task</p>
                                        <p className="font-bold">{taskType}</p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-muted-foreground">Total Area</p>
                                        <p className="font-bold text-primary">{totalArea}m</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Add More Labour Option */}
                        {isEditMode && (
                            <Card className="shadow-card border-2 border-warning/20 bg-warning/5">
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2 text-warning">
                                        <UserPlus className="h-5 w-5" />
                                        Add More Labourers (Mid-Work)
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <ScrollArea className="h-[200px]">
                                        <div className="space-y-2">
                                            {labourers.filter(l => !selectedLabours.includes(l.id)).map(labour => (
                                                <div
                                                    key={labour.id}
                                                    className="flex items-center space-x-3 p-3 rounded-lg border hover:bg-accent cursor-pointer"
                                                    onClick={() => toggleLabour(labour.id)}
                                                >
                                                    <Checkbox checked={false} onCheckedChange={() => toggleLabour(labour.id)} />
                                                    <div className="flex-1">
                                                        <p className="font-medium">{labour.name}</p>
                                                        <p className="text-xs text-muted-foreground">{labour.phone}</p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </ScrollArea>
                                    <Button
                                        variant="outline"
                                        className="w-full mt-4"
                                        onClick={() => setIsEditMode(false)}
                                    >
                                        Done Adding
                                    </Button>
                                </CardContent>
                            </Card>
                        )}

                        {/* Work Distribution */}
                        <Card className="shadow-card border-2 border-primary/20">
                            <CardHeader className="bg-primary/5 p-4 md:p-6">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                    <CardTitle className="flex items-center gap-2 text-lg md:text-xl">
                                        <Edit className="h-5 w-5 text-primary" />
                                        <span>{t('assignWorkDone')} ({selectedLabours.length})</span>
                                    </CardTitle>
                                    <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={handleAddMoreLabour}
                                            className="w-full sm:w-auto h-9 text-xs"
                                        >
                                            <UserPlus className="h-4 w-4 mr-2" />
                                            {t('addMoreLabour')}
                                        </Button>
                                        <div className={`flex items-center gap-3 px-3 py-1.5 rounded-lg bg-background border ${isOverLimit ? 'text-destructive border-destructive/20' : 'text-primary border-primary/20'} w-full sm:w-auto justify-between`}>
                                            <span className="text-xs font-medium text-muted-foreground">{t('remaining')}</span>
                                            <span className="text-lg font-black">{remainingMeters}m</span>
                                        </div>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-4 pt-6">
                                {isOverLimit && (
                                    <Alert variant="destructive">
                                        <AlertCircle className="h-4 w-4" />
                                        <AlertTitle>Warning</AlertTitle>
                                        <AlertDescription>{t('validateMetersError')}</AlertDescription>
                                    </Alert>
                                )}

                                <Alert>
                                    <AlertCircle className="h-4 w-4" />
                                    <AlertTitle>Auto-Division Feature</AlertTitle>
                                    <AlertDescription>
                                        You can save without assigning individual meters. The total work area will be divided equally among all selected labourers. Or assign specific meters to some/all labourers.
                                    </AlertDescription>
                                </Alert>

                                <div className="space-y-3">
                                    {selectedLabours.map(id => {
                                        const labour = labourers.find(l => l.id === id);
                                        return (
                                            <div key={id} className="flex flex-col lg:flex-row lg:items-center gap-4 p-4 md:p-5 rounded-xl bg-accent/30 border transition-all hover:border-primary/30">
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center justify-between lg:block mb-1">
                                                        <p className="font-bold text-base md:text-lg truncate">{labour?.name}</p>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="lg:hidden text-destructive hover:bg-destructive/10 h-8 w-8"
                                                            onClick={() => toggleLabour(id)}
                                                        >
                                                            ✕
                                                        </Button>
                                                    </div>
                                                    <p className="text-xs text-muted-foreground hidden lg:block">Actual meters completed</p>
                                                </div>
                                                
                                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full lg:w-auto">
                                                    <div className="space-y-1.5">
                                                        <Label className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground/80 px-1">{t('rate')} (₹/m)</Label>
                                                        <Input
                                                            type="number"
                                                            placeholder="0"
                                                            className="w-full lg:w-24 h-9 text-center font-bold border-primary/20 bg-background text-sm"
                                                            value={tempRates[id] || ''}
                                                            onChange={(e) => handleRateChange(id, e.target.value)}
                                                        />
                                                    </div>
                                                    <div className="space-y-1.5 flex-1">
                                                        <Label className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground/80 px-1">{t('meters')} (m)</Label>
                                                        <div className="relative">
                                                            <Input
                                                                type="number"
                                                                placeholder="Auto"
                                                                className="w-full lg:w-32 h-9 text-right pr-7 font-bold text-sm bg-background"
                                                                value={labourMeters[id] || ''}
                                                                onChange={(e) => handleMeterChange(id, e.target.value)}
                                                            />
                                                            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-bold text-muted-foreground">m</span>
                                                        </div>
                                                    </div>
                                                    <div className="hidden lg:flex items-end pb-0.5">
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="text-destructive hover:bg-destructive/10 h-9 w-9"
                                                            onClick={() => toggleLabour(id)}
                                                        >
                                                            ✕
                                                        </Button>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>

                                <div className="pt-6 border-t flex flex-col md:flex-row gap-6 items-center justify-between bg-accent/10 -mx-4 md:-mx-6 -mb-6 p-4 md:p-6 mt-4">
                                    <div className="text-center md:text-left w-full md:w-auto">
                                        <p className="text-xs uppercase tracking-wider font-bold text-muted-foreground mb-1">{t('totalAmount')}</p>
                                        <div className="flex flex-col gap-0.5">
                                            <p className="text-3xl md:text-4xl font-black text-foreground">
                                                ₹{(() => {
                                                    // Calculate total projected amount
                                                    let total = 0;
                                                    const hasManualMeters = sumIndividualMeters > 0;

                                                    if (hasManualMeters) {
                                                        // Sum of (manual meters * rate)
                                                        selectedLabours.forEach(id => {
                                                            const m = labourMeters[id] || 0;
                                                            const r = tempRates[id] || 0;
                                                            total += m * r;
                                                        });
                                                    } else {
                                                        // Auto-split: (Total Area / N) * Rate for each
                                                        const perLabour = totalArea / selectedLabours.length;
                                                        selectedLabours.forEach(id => {
                                                            const r = tempRates[id] || 0;
                                                            total += perLabour * r;
                                                        });
                                                    }
                                                    return total.toLocaleString();
                                                })()}
                                            </p>
                                            <Badge variant="outline" className="w-fit mx-auto md:mx-0 bg-primary/5 text-primary border-primary/20 text-[10px] font-bold py-0 h-5">
                                                {sumIndividualMeters > 0 ? `${sumIndividualMeters}m ${t('assigned')}` : `${totalArea}m ${t('autoDivide')}`}
                                            </Badge>
                                        </div>
                                    </div>
                                    <Button
                                        className="w-full md:w-auto h-14 md:h-16 px-8 text-lg font-bold gradient-primary shadow-glow flex gap-3"
                                        onClick={handleSaveWork}
                                        disabled={isOverLimit || selectedLabours.length === 0}
                                    >
                                        <Save className="h-5 w-5 md:h-6 md:w-6" />
                                        {t('saveFinalEntry')}
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    </>
                )}
            </div>
        </AppLayout>
    );
};

export default GroupWorkEntry;
