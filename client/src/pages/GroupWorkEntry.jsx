import { useState, useMemo, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/hooks/useAuth';
import { AppLayout } from '@/components/AppLayout';
import { useLabourers } from '@/hooks/useLabourers';
import { useProjects } from '@/hooks/useProjects';
import { useFocusProject } from '@/hooks/useFocusProject';
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
import { generateWhatsAppLink, whatsappTemplates } from '@/utils/whatsapp';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { CheckCircle, ExternalLink, Sparkles, Target } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';


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
    const { projects } = useProjects();
    const { focusProjectId } = useFocusProject();

    const [projectId, setProjectId] = useState(focusProjectId || '');
    const [step, setStep] = useState(1); // 1: Setup, 2: Finalize meters
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [location, setLocation] = useState('');
    const [taskType, setTaskType] = useState('');
    const [totalArea, setTotalArea] = useState(0);
    const [selectedLabours, setSelectedLabours] = useState([]);
    const [labourMeters, setLabourMeters] = useState({}); // { labourId: meters }
    const [tempRates, setTempRates] = useState({}); // { labourId: rate }
    const [isEditMode, setIsEditMode] = useState(false);
    const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);
    const [savedWorkers, setSavedWorkers] = useState([]); 
    const [cloneLoading, setCloneLoading] = useState(false);
    const [yesterdayFound, setYesterdayFound] = useState(false);

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

    // --- SMART UX: Auto-Fill project details ---
    const activeProject = useMemo(() => projects.find(p => p.id === projectId), [projects, projectId]);
    
    useEffect(() => {
        if (activeProject) {
            setTaskType(activeProject.work_type || '');
            setLocation(activeProject.site_location || '');
        }
    }, [activeProject]);

    // --- SMART UX: Clone Yesterday ---
    const handleCloneYesterday = async () => {
        if (!projectId) return;
        setCloneLoading(true);
        try {
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);
            const dateStr = yesterday.toISOString().split('T')[0];

            const { data, error } = await workService.getProjectEntriesByDate(projectId, dateStr);
            if (error) throw error;
            
            if (data && data.length > 0) {
                const workerIds = [...new Set(data.map(e => e.labourer_id))];
                setSelectedLabours(workerIds);
                toast.success(`Cloned ${workerIds.length} workers from yesterday!`);
            } else {
                toast.info("No work entries found for yesterday at this site.");
            }
        } catch (err) {
            toast.error("Failed to clone list: " + err.message);
        } finally {
            setCloneLoading(false);
        }
    };

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
                project_id: projectId || null,
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

            // Prepare workers list for WhatsApp confirmation
            const workersForWhatsApp = bulkEntries.map(entry => {
                const labour = labourers.find(l => l.id === entry.labourer_id);
                return {
                    id: entry.labourer_id,
                    name: labour?.name || 'Labourer',
                    phone: labour?.phone || '',
                    date: entry.date,
                    location: entry.location || 'Site'
                };
            });

            setSavedWorkers(workersForWhatsApp);
            setIsSuccessModalOpen(true);
            
            toast.success(`Successfully saved ${bulkEntries.length} work entries!`);
            // navigate('/work-entries'); // Removed immediate navigation
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
                                        <Label>Project (Site) *</Label>
                                        <Select value={projectId} onValueChange={setProjectId}>
                                            <SelectTrigger className="h-12 text-lg">
                                                <SelectValue placeholder="Select Project Site" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {projects.map(p => (
                                                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        
                                        {/* Suggestion Bar */}
                                        {projectId && (
                                            <motion.div 
                                                initial={{ height: 0, opacity: 0 }}
                                                animate={{ height: 'auto', opacity: 1 }}
                                                className="mt-3 p-3 bg-primary/5 rounded-2xl border border-primary/20 flex items-center justify-between"
                                            >
                                                <div className="flex items-center gap-2">
                                                    <Sparkles className="h-4 w-4 text-primary animate-pulse" />
                                                    <span className="text-[10px] font-bold uppercase tracking-widest text-primary">Smart Suggestion</span>
                                                </div>
                                                <Button 
                                                    variant="ghost" 
                                                    size="sm" 
                                                    className="h-8 text-xs font-bold text-primary hover:bg-primary/10"
                                                    onClick={handleCloneYesterday}
                                                    disabled={cloneLoading}
                                                >
                                                    {cloneLoading ? 'Analyzing...' : 'Clone Yesterday\'s List'}
                                                </Button>
                                            </motion.div>
                                        )}
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
                                disabled={!date || !projectId || !location || !taskType || totalArea <= 0 || selectedLabours.length === 0}
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
            <Dialog open={isSuccessModalOpen} onOpenChange={setIsSuccessModalOpen}>
                <DialogContent className="sm:max-w-lg">
                    <div className="text-center py-4">
                        <div className="mx-auto w-12 h-12 bg-success/10 rounded-full flex items-center justify-center mb-3">
                            <CheckCircle className="h-8 w-8 text-success" />
                        </div>
                        <DialogHeader>
                            <DialogTitle className="text-xl text-center">Group Entries Saved! ✅</DialogTitle>
                            <DialogDescription className="text-center">
                                Successfully recorded work for {savedWorkers.length} labourers.
                            </DialogDescription>
                        </DialogHeader>
                    </div>

                    <ScrollArea className="max-h-[300px] pr-4">
                        <div className="space-y-3">
                            {savedWorkers.map((worker, idx) => (
                                <div key={`${worker.id}-${idx}`} className="flex items-center justify-between p-3 rounded-xl bg-muted/30 border">
                                    <div className="min-w-0">
                                        <p className="font-semibold text-sm truncate">{worker.name}</p>
                                        <p className="text-[10px] text-muted-foreground">{worker.phone || 'No phone'}</p>
                                    </div>
                                    {worker.phone && (
                                        <Button
                                            size="sm"
                                            className="bg-[#25D366] hover:bg-[#20bd5c] text-white h-8 px-3 rounded-lg text-xs font-bold shrink-0"
                                            onClick={() => window.open(generateWhatsAppLink(
                                                worker.phone,
                                                whatsappTemplates.bookingConfirmation(worker.name, worker.date, worker.location)
                                            ), '_blank')}
                                        >
                                            <WhatsAppIcon className="h-3.5 w-3.5 mr-1.5" />
                                            Notify
                                        </Button>
                                    )}
                                </div>
                            ))}
                        </div>
                    </ScrollArea>

                    <div className="pt-4 flex flex-col gap-2">
                        <Button
                            className="w-full gradient-primary h-11 rounded-xl font-bold"
                            onClick={() => {
                                setIsSuccessModalOpen(false);
                                navigate('/work-entries');
                            }}
                        >
                            Back to Work Entries
                        </Button>
                        <p className="text-[10px] text-center text-muted-foreground">
                            Click 'Notify' to send individual WhatsApp confirmations.
                        </p>
                    </div>
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
};

export default GroupWorkEntry;
