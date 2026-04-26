import React, { useState, useEffect } from 'react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    ClipboardPlus,
    Clock,
    Ruler,
    Loader2,
    Users,
    Zap,
    IndianRupee,
    CheckCircle
} from 'lucide-react';
import { generateWhatsAppLink, whatsappTemplates } from '@/utils/whatsapp';

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

const taskTypes = [
    'Brick Laying',
    'Wall Painting',
    'Wiring',
    'Pipe Fitting',
    'Material Transport',
    'Carpentry',
    'Plastering',
    'Flooring',
    'Roofing',
    'Other',
];

export const WorkEntryModal = ({
    isOpen,
    onClose,
    labourers,
    projects,
    onSave,
    isSaving
}) => {
    const [formData, setFormData] = useState({
        labourer_id: '',
        project_id: '',
        date: new Date().toISOString().split('T')[0],
        task_type: '',
        meters: undefined,
        hours: undefined,
        amount: 0,
        location: '',
        description: ''
    });

    const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);
    const [successData, setSuccessData] = useState(null);
    const [redirectTimer, setRedirectTimer] = useState(null);

    useEffect(() => {
        if (!isOpen) {
            setFormData({
                labourer_id: '',
                project_id: '',
                date: new Date().toISOString().split('T')[0],
                task_type: '',
                meters: undefined,
                hours: undefined,
                amount: 0,
                location: '',
                description: ''
            });
        }
    }, [isOpen]);

    const calculateAmount = () => {
        const labourer = labourers.find(l => l.id === formData.labourer_id);
        if (!labourer) return 0;
        if (formData.hours) return (labourer.daily_rate / 8) * formData.hours;
        if (formData.meters) return formData.meters * (labourer.rate_per_meter || 0);
        return labourer.daily_rate;
    };

    useEffect(() => {
        if (formData.labourer_id) {
            const amount = calculateAmount();
            if (amount > 0) setFormData(prev => ({ ...prev, amount }));
        }
    }, [formData.labourer_id, formData.hours, formData.meters]);

    const handleSave = async () => {
        if (!formData.labourer_id || !formData.task_type || !formData.project_id) {
            return;
        }
        try {
            await onSave(formData);
            
            const labourer = labourers.find(l => l.id === formData.labourer_id);
            const project = projects.find(p => p.id === formData.project_id);
            
            setSuccessData({
                name: labourer?.name || 'Labourer',
                phone: labourer?.phone || '',
                date: formData.date,
                location: formData.location || project?.name || 'Site',
            });
            
            setIsSuccessModalOpen(true);
            
            if (labourer?.phone) {
                const link = generateWhatsAppLink(labourer.phone, whatsappTemplates.bookingConfirmation(labourer.name, formData.date, formData.location || project?.name || 'Site'));
                const timer = setTimeout(() => window.open(link, '_blank'), 2000);
                setRedirectTimer(timer);
            }
        } catch (error) {
            console.error("Save failed:", error);
        }
    };

    return (
        <>
            <Dialog open={isOpen} onOpenChange={onClose}>
                <DialogContent className="sm:max-w-[550px] p-0 overflow-hidden border-none shadow-2xl rounded-3xl max-h-[90vh] flex flex-col">
                    <div className="bg-emerald-600 px-8 py-10 text-white relative overflow-hidden flex-shrink-0">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-2xl" />
                        <div className="relative z-10 flex items-center gap-4">
                            <div className="p-3 bg-white/20 rounded-2xl backdrop-blur-md">
                                <ClipboardPlus className="h-6 w-6 text-white" />
                            </div>
                            <div>
                                <DialogTitle className="text-2xl font-black tracking-tight">Log Productivity</DialogTitle>
                                <DialogDescription className="text-emerald-100 font-medium text-sm mt-0.5">
                                    Record specialized work units for site reconciliation.
                                </DialogDescription>
                            </div>
                        </div>
                    </div>

                    <div className="p-8 space-y-6 bg-white flex-grow overflow-y-auto custom-scrollbar">
                        <div className="space-y-4">
                            <div className="flex items-center gap-2 mb-2">
                                <Users className="h-4 w-4 text-emerald-500" />
                                <h3 className="text-xs font-black uppercase tracking-widest text-slate-400">Attribution</h3>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="grid gap-2">
                                    <Label className="text-[10px] font-black text-slate-500 uppercase tracking-tighter">Assigned Labourer</Label>
                                    <Select value={formData.labourer_id} onValueChange={(v) => setFormData({ ...formData, labourer_id: v })}>
                                        <SelectTrigger className="h-12 rounded-xl bg-slate-50 border-none focus:ring-emerald-500 font-bold text-slate-900 shadow-sm">
                                            <SelectValue placeholder="Select staff" />
                                        </SelectTrigger>
                                        <SelectContent className="rounded-2xl border-none shadow-xl">
                                            {labourers.filter(l => l.status === 'active').map(l => (
                                                <SelectItem key={l.id} value={l.id} className="rounded-lg font-bold">{l.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="grid gap-2">
                                    <div className="flex justify-between items-center">
                                        <Label className="text-[10px] font-black text-slate-500 uppercase tracking-tighter">Active Project Site</Label>
                                        <span className="text-[8px] font-black bg-rose-50 text-rose-600 px-1.5 py-0.5 rounded-full uppercase tracking-widest border border-rose-100">Required</span>
                                    </div>
                                    <Select value={formData.project_id} onValueChange={(v) => setFormData({ ...formData, project_id: v })}>
                                        <SelectTrigger className="h-12 rounded-xl bg-emerald-50/30 border-2 border-emerald-100 focus:ring-emerald-500 font-bold text-slate-900 shadow-sm">
                                            <SelectValue placeholder="Select site" />
                                        </SelectTrigger>
                                        <SelectContent className="rounded-2xl border-none shadow-xl">
                                            {projects.map(p => (
                                                <SelectItem key={p.id} value={p.id} className="rounded-lg font-bold">{p.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-4 pt-4 border-t border-slate-50">
                            <div className="flex items-center gap-2 mb-2">
                                <Zap className="h-4 w-4 text-emerald-500" />
                                <h3 className="text-xs font-black uppercase tracking-widest text-slate-400">Operation Details</h3>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="grid gap-2">
                                    <Label className="text-[10px] font-black text-slate-500 uppercase tracking-tighter">Operation Date</Label>
                                    <Input type="date" value={formData.date} onChange={e => setFormData({ ...formData, date: e.target.value })} className="h-12 rounded-xl bg-slate-50 border-none focus-visible:ring-emerald-500 transition-all font-bold text-slate-900 shadow-sm" />
                                </div>
                                <div className="grid gap-2">
                                    <Label className="text-[10px] font-black text-slate-500 uppercase tracking-tighter">Task Category</Label>
                                    <Select value={formData.task_type} onValueChange={v => setFormData({ ...formData, task_type: v })}>
                                        <SelectTrigger className="h-12 rounded-xl bg-slate-50 border-none focus:ring-emerald-500 font-bold text-slate-900 shadow-sm">
                                            <SelectValue placeholder="Select type" />
                                        </SelectTrigger>
                                        <SelectContent className="rounded-2xl border-none shadow-xl">
                                            {taskTypes.map(t => <SelectItem key={t} value={t} className="rounded-lg font-bold">{t}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="grid gap-2">
                                    <Label className="text-[10px] font-black text-slate-500 uppercase tracking-tighter">Volume (Meters)</Label>
                                    <div className="relative">
                                        <Ruler className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                        <Input type="number" placeholder="0" value={formData.meters || ''} onChange={e => setFormData({ ...formData, meters: Number(e.target.value) })} className="pl-10 h-12 rounded-xl bg-slate-50 border-none focus-visible:ring-emerald-500 transition-all font-bold text-slate-900 shadow-sm" />
                                    </div>
                                </div>
                                <div className="grid gap-2">
                                    <Label className="text-[10px] font-black text-slate-500 uppercase tracking-tighter">Duration (Hours)</Label>
                                    <div className="relative">
                                        <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                        <Input type="number" placeholder="0" value={formData.hours || ''} onChange={e => setFormData({ ...formData, hours: Number(e.target.value) })} className="pl-10 h-12 rounded-xl bg-slate-50 border-none focus-visible:ring-emerald-500 transition-all font-bold text-slate-900 shadow-sm" />
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-4 pt-4 border-t border-slate-50 pb-2">
                            <div className="flex items-center gap-2 mb-2">
                                <IndianRupee className="h-4 w-4 text-emerald-500" />
                                <h3 className="text-xs font-black uppercase tracking-widest text-slate-400">Financial Valuation</h3>
                            </div>
                            <div className="grid gap-2">
                                <Label className="text-[10px] font-black text-slate-500 uppercase tracking-tighter">Calculated Payout (₹)</Label>
                                <Input 
                                    type="number" 
                                    value={formData.amount} 
                                    onChange={e => setFormData({ ...formData, amount: Number(e.target.value) })} 
                                    className="h-12 rounded-xl bg-emerald-50/50 border-none focus-visible:ring-emerald-500 transition-all font-black text-emerald-900 text-lg shadow-sm" 
                                />
                                <div className="flex justify-between items-center px-1">
                                    <p className="text-[10px] font-black text-emerald-600/60 uppercase tracking-widest italic">Algo-Suggested Value: ₹{calculateAmount().toLocaleString()}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="p-8 bg-slate-50/50 border-t border-slate-100 flex items-center justify-between flex-shrink-0">
                        <Button 
                            variant="ghost" 
                            className="h-12 px-6 rounded-xl font-black text-slate-400 hover:text-slate-900 uppercase tracking-widest text-[10px]" 
                            onClick={onClose}
                        >
                            Discard Log
                        </Button>
                        <Button
                            className="bg-emerald-600 hover:bg-emerald-700 text-white h-14 px-10 rounded-2xl font-black shadow-xl shadow-emerald-600/20 active:scale-95 transition-all text-sm tracking-tight"
                            onClick={handleSave}
                            disabled={isSaving}
                        >
                            {isSaving ? (
                                <Loader2 className="h-5 w-5 animate-spin" />
                            ) : (
                                "Confirm Log"
                            )}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            <Dialog open={isSuccessModalOpen} onOpenChange={(open) => {
                if (!open && redirectTimer) clearTimeout(redirectTimer);
                setIsSuccessModalOpen(open);
            }}>
                <DialogContent className="sm:max-w-md text-center py-8">
                    <DialogHeader>
                        <div className="mx-auto w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mb-4">
                            <CheckCircle className="h-10 w-10 text-emerald-600" />
                        </div>
                        <DialogTitle className="text-xl text-center">Work Entry Saved! ✅</DialogTitle>
                        <DialogDescription className="text-center pt-2">
                            The record for <strong>{successData?.name}</strong> has been successfully added.
                        </DialogDescription>
                    </DialogHeader>
                    
                    <div className="bg-slate-50 p-4 rounded-xl text-sm space-y-2 my-4">
                        <div className="flex justify-between">
                            <span className="text-slate-500 font-bold uppercase text-[10px] tracking-widest">Date</span>
                            <span className="font-bold text-slate-900">{successData?.date}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-slate-500 font-bold uppercase text-[10px] tracking-widest">Location</span>
                            <span className="font-bold text-slate-900">{successData?.location}</span>
                        </div>
                    </div>
                    
                    <div className="space-y-3">
                        {successData?.phone && (
                            <p className="text-xs text-slate-400 font-bold animate-pulse">
                                Redirecting to WhatsApp in 2 seconds...
                            </p>
                        )}
                        
                        <div className="flex flex-col gap-2">
                            {successData?.phone && (
                                <Button 
                                    className="w-full bg-[#25D366] hover:bg-[#20bd5c] text-white font-black h-12 rounded-xl border-none shadow-lg shadow-emerald-500/20"
                                    onClick={() => {
                                        if (redirectTimer) clearTimeout(redirectTimer);
                                        window.open(generateWhatsAppLink(
                                            successData.phone,
                                            whatsappTemplates.bookingConfirmation(
                                                successData.name,
                                                successData.date,
                                                successData.location
                                            )
                                        ), '_blank');
                                    }}
                                >
                                    <WhatsAppIcon className="h-5 w-5 mr-2" />
                                    Send WhatsApp Now
                                </Button>
                            )}
                            <Button 
                                variant="ghost" 
                                className="w-full h-11 rounded-xl font-bold text-slate-400 hover:text-slate-900"
                                onClick={() => {
                                    if (redirectTimer) clearTimeout(redirectTimer);
                                    setIsSuccessModalOpen(false);
                                }}
                            >
                                Done / Close
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
};
