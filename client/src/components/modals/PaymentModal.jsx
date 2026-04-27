import { useState, useEffect } from "react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Banknote,
    Calendar,
    Loader2,
    Share2,
    Eye,
    FileText,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useLabourers } from "@/hooks/useLabourers";
import { generatePaymentReceipt } from "@/utils/pdfGenerator";

const LabourBalanceDisplay = ({ labourId }) => {
    const { getLabourBalance } = useLabourers();
    const balanceQuery = getLabourBalance(labourId);
    
    const balance = balanceQuery.data;
    const loading = balanceQuery.isLoading;

    if (loading) return <span className="text-muted-foreground text-sm">Checking balance...</span>;
    if (balance === undefined || balance === null) return null;

    const isPending = balance >= 0;
    return (
        <div className={cn("p-2 rounded border flex justify-between items-center text-sm",
            isPending ? "bg-green-500/10 border-green-500/20" : "bg-red-500/10 border-red-500/20"
        )}>
            <span className="text-muted-foreground">{isPending ? "Pending Wage:" : "Advance Taken:"}</span>
            <span className={cn("font-bold", isPending ? "text-green-600" : "text-red-600")}>
                ₹{Math.abs(balance).toLocaleString()}
            </span>
        </div>
    );
};

export const PaymentModal = ({ 
    isOpen, 
    onClose, 
    labourers, 
    onSave, 
    isSaving,
    mode = 'add', // 'add' or 'view'
    selectedPayment = null,
    onShare = null,
    formatDate = (d) => d
}) => {
    const [formData, setFormData] = useState({
        labourer_id: "",
        amount: "",
        method: "cash",
        payment_type: "advance",
        deduction_reason: "",
        transaction_date: new Date().toISOString().split("T")[0],
    });

    useEffect(() => {
        if (!isOpen && mode === 'add') {
            setFormData({
                labourer_id: "",
                amount: "",
                method: "cash",
                payment_type: "advance",
                deduction_reason: "",
                transaction_date: new Date().toISOString().split("T")[0],
            });
        }
    }, [isOpen, mode]);

    const handleSave = () => {
        if (!formData.labourer_id || !formData.amount) return;
        onSave(formData);
    };

    if (mode === 'view' && selectedPayment) {
        return (
            <Dialog open={isOpen} onOpenChange={onClose}>
                <DialogContent className="sm:max-w-md rounded-2xl border-none shadow-2xl p-0 overflow-hidden">
                    <DialogTitle className="sr-only">Transaction Details</DialogTitle>
                    <DialogDescription className="sr-only">Detailed view of the selected payment transaction.</DialogDescription>
                    <div className="p-8 bg-emerald-600 text-white text-center">
                        <p className="text-[10px] font-bold uppercase tracking-widest opacity-80 mb-2">Transaction Amount</p>
                        <h2 className="text-4xl font-black">₹{Number(selectedPayment?.amount).toLocaleString()}</h2>
                    </div>
                    <div className="p-8 space-y-6 bg-white">
                        <div className="grid grid-cols-2 gap-y-6 text-sm">
                            <div>
                                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">Labourer</p>
                                <p className="font-bold text-foreground">{selectedPayment?.labourer?.name}</p>
                            </div>
                            <div>
                                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">Date</p>
                                <p className="font-bold text-foreground">{formatDate(selectedPayment?.transaction_date)}</p>
                            </div>
                            <div>
                                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">Method</p>
                                <p className="font-bold text-foreground capitalize">{selectedPayment?.method?.replace('_', ' ') || 'N/A'}</p>
                            </div>
                            <div>
                                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">Status</p>
                                <p className="font-bold text-emerald-600 capitalize">{selectedPayment?.status}</p>
                            </div>
                        </div>
                        <div className="flex flex-col gap-2">
                            {onShare && (
                                <Button variant="outline" className="w-full h-12 rounded-xl font-bold border-emerald-200 text-emerald-700 hover:bg-emerald-50" onClick={() => onShare(selectedPayment)}>
                                    <Share2 className="h-4 w-4 mr-2" /> Share Receipt
                                </Button>
                            )}
                            <Button 
                                variant="outline" 
                                className="w-full h-12 rounded-xl font-bold border-slate-200 text-slate-700 hover:bg-slate-50" 
                                onClick={() => generatePaymentReceipt(selectedPayment, { name: selectedPayment?.labourer?.name })}
                            >
                                <FileText className="h-4 w-4 mr-2" /> Download PDF
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        );
    }

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-md p-0 overflow-hidden border-none shadow-2xl rounded-3xl max-h-[90vh] flex flex-col">
                {/* Premium Header Banner */}
                <div className="bg-emerald-600 px-8 py-10 text-white relative overflow-hidden flex-shrink-0">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-2xl" />
                    <div className="relative z-10 flex items-center gap-4">
                        <div className="p-3 bg-white/20 rounded-2xl backdrop-blur-md">
                            <Banknote className="h-6 w-6 text-white" />
                        </div>
                        <div>
                            <DialogTitle className="text-2xl font-black tracking-tight">Disburse Payment</DialogTitle>
                            <DialogDescription className="text-emerald-100 font-medium text-sm mt-0.5">
                                Record wages, settlements, or advance credits.
                            </DialogDescription>
                        </div>
                    </div>
                </div>

                <div className="p-8 space-y-6 bg-white flex-grow overflow-y-auto custom-scrollbar">
                    {/* Entity Selection */}
                    <div className="grid gap-2">
                        <Label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Select Beneficiary</Label>
                        <Select value={formData.labourer_id} onValueChange={(value) => setFormData({ ...formData, labourer_id: value })}>
                            <SelectTrigger className="h-12 rounded-xl bg-slate-50 border-none focus:ring-emerald-500 font-bold text-slate-900 shadow-sm">
                                <SelectValue placeholder="Choose staff member" />
                            </SelectTrigger>
                            <SelectContent className="rounded-2xl border-none shadow-xl">
                                {labourers?.filter(l => !l.status || l.status === "active").map((labour) => (
                                    <SelectItem key={labour.id} value={labour.id} className="rounded-lg font-bold">
                                        {labour.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Live Balance Context */}
                    {formData.labourer_id && (
                        <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                            <LabourBalanceDisplay labourId={formData.labourer_id} />
                        </div>
                    )}

                    {/* Financial Details Group */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2">
                            <Label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Amount (₹)</Label>
                            <Input
                                type="number"
                                placeholder="0"
                                value={formData.amount}
                                className="h-12 rounded-xl bg-emerald-50/50 border-none focus-visible:ring-emerald-500 transition-all font-black text-emerald-900 text-lg shadow-sm"
                                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Channel</Label>
                            <Select value={formData.method} onValueChange={(value) => setFormData({ ...formData, method: value })}>
                                <SelectTrigger className="h-12 rounded-xl bg-slate-50 border-none focus:ring-emerald-500 font-bold text-slate-900 shadow-sm">
                                    <SelectValue placeholder="Select" />
                                </SelectTrigger>
                                <SelectContent className="rounded-2xl border-none shadow-xl font-bold">
                                    <SelectItem value="cash">Direct Cash</SelectItem>
                                    <SelectItem value="manual_upi">UPI Transfer</SelectItem>
                                    <SelectItem value="bank">Bank Deposit</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="grid gap-2">
                        <Label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Transaction Date</Label>
                        <div className="relative">
                            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                            <Input
                                type="date"
                                value={formData.transaction_date}
                                onChange={(e) => setFormData({ ...formData, transaction_date: e.target.value })}
                                className="pl-10 h-12 rounded-xl bg-slate-50 border-none focus-visible:ring-emerald-500 transition-all font-bold text-slate-900 shadow-sm"
                            />
                        </div>
                    </div>
                </div>

                <div className="p-8 bg-slate-50/50 border-t border-slate-100 flex items-center justify-between flex-shrink-0">
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
                            "Confirm Payout"
                        )}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
};
