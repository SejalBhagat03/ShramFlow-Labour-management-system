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
    UserPlus,
    User,
    Phone,
    MapPin,
    ShieldCheck,
    Loader2
} from 'lucide-react';
import { translationService } from '@/services/translationService';

export const LabourerModal = ({
    isOpen,
    onClose,
    selectedLabour,
    onSave,
    isSaving
}) => {
    const [formData, setFormData] = useState({
        name: '',
        name_hindi: '',
        phone: '',
        role: 'Labour',
        daily_rate: 500,
        rate_per_meter: 0,
        status: 'active',
        location: '',
        password: ''
    });

    useEffect(() => {
        if (selectedLabour) {
            setFormData({
                name: selectedLabour.name,
                name_hindi: selectedLabour.name_hindi || '',
                phone: selectedLabour.phone || '',
                role: 'Labour',
                daily_rate: selectedLabour.daily_rate,
                rate_per_meter: selectedLabour.rate_per_meter || 0,
                status: selectedLabour.status,
                location: selectedLabour.location || '',
                password: ''
            });
        } else {
            setFormData({
                name: '',
                name_hindi: '',
                phone: '',
                role: 'Labour',
                daily_rate: 500,
                rate_per_meter: 0,
                status: 'active',
                location: '',
                password: ''
            });
        }
    }, [selectedLabour, isOpen]);

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

    const handleSave = async () => {
        if (!formData.name) return;
        await onSave(formData);
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[600px] p-0 overflow-hidden border-none shadow-2xl rounded-3xl max-h-[95vh] flex flex-col gap-0">
                <div className="bg-emerald-600 px-8 py-8 text-white relative overflow-hidden flex-shrink-0">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-2xl" />
                    <div className="relative z-10 flex items-center gap-4">
                        <div className="p-3 bg-white/20 rounded-2xl backdrop-blur-md">
                            <UserPlus className="h-6 w-6 text-white" />
                        </div>
                        <div>
                            <DialogTitle className="text-2xl font-black tracking-tight">{selectedLabour ? 'Edit Staff Profile' : 'Register New Labourer'}</DialogTitle>
                            <DialogDescription className="text-emerald-100 font-medium text-sm mt-0.5">
                                Securely manage workforce credentials and logistics.
                            </DialogDescription>
                        </div>
                    </div>
                </div>
                
                <div className="p-8 space-y-8 bg-white flex-1 overflow-y-auto custom-scrollbar min-h-0">
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 mb-2">
                            <User className="h-4 w-4 text-emerald-500" />
                            <h3 className="text-xs font-black uppercase tracking-widest text-slate-400">Personal Information</h3>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <Label className="text-[10px] font-black text-slate-500 uppercase tracking-tighter">Full Name (English)</Label>
                                <Input
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    onBlur={handleAutoTranslateName}
                                    placeholder="e.g. Ramesh Kumar"
                                    className="h-12 rounded-xl bg-slate-50 border-none focus-visible:ring-emerald-500 transition-all font-bold text-slate-900 shadow-sm"
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label className="text-[10px] font-black text-slate-500 uppercase tracking-tighter">Name (Hindi Script)</Label>
                                <Input
                                    value={formData.name_hindi}
                                    onChange={(e) => setFormData({ ...formData, name_hindi: e.target.value })}
                                    placeholder="रमेश कुमार"
                                    className="h-12 rounded-xl bg-slate-50 border-none focus-visible:ring-emerald-500 transition-all font-bold text-slate-900 shadow-sm"
                                />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <Label className="text-[10px] font-black text-slate-500 uppercase tracking-tighter">Mobile Number</Label>
                                <div className="relative">
                                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                    <Input
                                        value={formData.phone}
                                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                        placeholder="98xxxxxx56"
                                        className="pl-10 h-12 rounded-xl bg-slate-50 border-none focus-visible:ring-emerald-500 transition-all font-bold text-slate-900 shadow-sm"
                                    />
                                </div>
                            </div>
                            <div className="grid gap-2">
                                <Label className="text-[10px] font-black text-slate-500 uppercase tracking-tighter">Assigned Site</Label>
                                <div className="relative">
                                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                    <Input
                                        value={formData.location}
                                        onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                                        placeholder="Location / Sector"
                                        className="pl-10 h-12 rounded-xl bg-slate-50 border-none focus-visible:ring-emerald-500 transition-all font-bold text-slate-900 shadow-sm"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-4 pt-4 border-t border-slate-50">
                        <div className="flex items-center gap-2 mb-2">
                            <ShieldCheck className="h-4 w-4 text-emerald-500" />
                            <h3 className="text-xs font-black uppercase tracking-widest text-slate-400">Financials & Security</h3>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <Label className="text-[10px] font-black text-slate-500 uppercase tracking-tighter">Standard Daily Wage (₹)</Label>
                                <Input
                                    type="number"
                                    value={formData.daily_rate}
                                    onChange={(e) => setFormData({ ...formData, daily_rate: Number(e.target.value) })}
                                    className="h-12 rounded-xl bg-emerald-50/50 border-none focus-visible:ring-emerald-500 transition-all font-black text-emerald-900 text-lg shadow-sm"
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label className="text-[10px] font-black text-slate-500 uppercase tracking-tighter">Portal Password</Label>
                                <Input
                                    type="password"
                                    value={formData.password || ''}
                                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                    placeholder="••••••••"
                                    className="h-12 rounded-xl bg-slate-50 border-none focus-visible:ring-emerald-500 transition-all font-bold shadow-sm"
                                />
                            </div>
                        </div>

                        <div className="grid gap-2">
                            <Label className="text-[10px] font-black text-slate-500 uppercase tracking-tighter">Employment Status</Label>
                            <Select value={formData.status} onValueChange={(v) => setFormData({...formData, status: v})}>
                                <SelectTrigger className="h-12 rounded-xl bg-slate-50 border-none focus:ring-emerald-500 font-bold text-slate-900 shadow-sm">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="rounded-2xl border-none shadow-xl">
                                    <SelectItem value="active" className="rounded-lg font-bold text-emerald-600">Active Duty</SelectItem>
                                    <SelectItem value="inactive" className="rounded-lg font-bold text-slate-400">Inactive / On Leave</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </div>

                <div className="p-8 bg-slate-50 border-t border-slate-100 flex items-center justify-between flex-shrink-0 z-20">
                    <Button 
                        variant="ghost" 
                        className="h-12 px-6 rounded-xl font-black text-slate-400 hover:text-slate-900 uppercase tracking-widest text-[10px]" 
                        onClick={onClose}
                    >
                        Discard
                    </Button>
                    <Button 
                        className="bg-emerald-600 hover:bg-emerald-700 text-white h-14 px-10 rounded-2xl font-black shadow-xl shadow-emerald-600/20 active:scale-95 transition-all text-sm tracking-tight"
                        onClick={handleSave}
                        disabled={isSaving}
                    >
                        {isSaving ? (
                            <Loader2 className="h-5 w-5 animate-spin" />
                        ) : (
                            selectedLabour ? 'Apply Changes' : 'Confirm Registration'
                        )}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
};
