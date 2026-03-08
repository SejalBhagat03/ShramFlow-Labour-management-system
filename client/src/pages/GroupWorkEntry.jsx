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
            <div className="max-w-4xl mx-auto space-y-6 pb-20">
                {/* Header */}
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <div className="flex-1">
                        <h1 className="text-2xl font-bold">{t('groupWorkEntry')}</h1>
                        <p className="text-muted-foreground">
                            {step === 1 ? 'Step 1: Setup group and select labourers' : 'Step 2: Finalize work meters after completion'}
                        </p>
                    </div>
                    {step === 2 && (
                        <Badge variant="outline" className="bg-success/10 text-success border-success/20">
                            Group Created
                        </Badge>
                    )}
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
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
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
                            <CardHeader className="bg-primary/5">
                                <div className="flex items-center justify-between">
                                    <CardTitle className="flex items-center gap-2">
                                        <Edit className="h-5 w-5 text-primary" />
                                        Assign Actual Work Done ({selectedLabours.length} labourers)
                                    </CardTitle>
                                    <div className="flex items-center gap-3">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={handleAddMoreLabour}
                                        >
                                            <UserPlus className="h-4 w-4 mr-2" />
                                            Add More Labour
                                        </Button>
                                        <div className={`text-right ${isOverLimit ? 'text-destructive' : 'text-primary'}`}>
                                            <p className="text-sm font-normal text-muted-foreground">{t('remainingMeters')}</p>
                                            <p className="text-2xl font-black">{remainingMeters}m</p>
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

                                <div className="space-y-4">
                                    {selectedLabours.map(id => {
                                        const labour = labourers.find(l => l.id === id);
                                        return (
                                            <div key={id} className="grid grid-cols-2 items-center gap-4 p-4 rounded-xl bg-accent/30 border">
                                                <div className="flex-1">
                                                    <p className="font-bold text-lg leading-none mb-1">{labour?.name}</p>
                                                    <p className="text-xs text-muted-foreground">Actual meters completed</p>
                                                </div>
                                                <div className="flex items-center gap-4">
                                                    <div className="space-y-1">
                                                        <Label className="text-[10px] uppercase text-muted-foreground px-1">Rate (₹/m)</Label>
                                                        <Input
                                                            type="number"
                                                            placeholder="0"
                                                            className="w-20 h-10 text-center font-bold border-primary/30"
                                                            value={tempRates[id] || ''}
                                                            onChange={(e) => handleRateChange(id, e.target.value)}
                                                        />
                                                    </div>
                                                    <div className="space-y-1">
                                                        <Label className="text-[10px] uppercase text-muted-foreground px-1">Meters (m)</Label>
                                                        <div className="relative">
                                                            <Input
                                                                type="number"
                                                                placeholder="Auto"
                                                                className="w-32 h-10 text-right pr-6 font-bold"
                                                                value={labourMeters[id] || ''}
                                                                onChange={(e) => handleMeterChange(id, e.target.value)}
                                                            />
                                                            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-bold text-muted-foreground">m</span>
                                                        </div>
                                                    </div>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="text-destructive hover:bg-destructive/10 h-10 w-10 mt-5"
                                                        onClick={() => toggleLabour(id)}
                                                    >
                                                        ✕
                                                    </Button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>

                                <div className="pt-6 border-t flex flex-col sm:flex-row gap-4 items-center justify-between bg-accent/10 -mx-6 -mb-6 p-6">
                                    <div className="text-center sm:text-left">
                                        <p className="text-muted-foreground">{t('totalAmount')}</p>
                                        <p className="text-3xl font-black text-foreground">
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
                                        <p className="text-sm text-muted-foreground mt-1">
                                            {sumIndividualMeters > 0 ? `${sumIndividualMeters}m assigned` : `${totalArea}m to be auto-divided`}
                                        </p>
                                    </div>
                                    <Button
                                        className="w-full sm:w-auto h-16 px-10 text-xl font-bold gradient-primary shadow-glow flex gap-2"
                                        onClick={handleSaveWork}
                                        disabled={isOverLimit || selectedLabours.length === 0}
                                    >
                                        <Save className="h-6 w-6" />
                                        Save Final Work Entry
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
