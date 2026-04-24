import { useState, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { AppLayout } from "@/components/AppLayout";
import { usePayments } from "@/hooks/usePayments";
import { useLabourers } from "@/hooks/useLabourers";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import PaymentButton from "@/components/PaymentButton";
import { useAuth } from "@/hooks/useAuth";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import {
    Search,
    Filter,
    CreditCard,
    CheckCircle,
    Clock,
    Download,
    Banknote,
    Smartphone,
    Building2,
    Loader2,
    MoreVertical,
    Share2,
    Eye,
    XCircle,
    Plus,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

/**
 * Payments page component for managing labourer payments.
 */

const LabourBalanceDisplay = ({ labourId }) => {
    const { getLabourBalance } = useLabourers();
    const [balance, setBalance] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchBalance = async () => {
            setLoading(true);
            try {
                const bal = await getLabourBalance(labourId);
                setBalance(bal);
            } catch (err) {
                if (import.meta.env.DEV) console.error(err);
            } finally {
                setLoading(false);
            }
        };
        if (labourId) fetchBalance();
    }, [labourId, getLabourBalance]);

    if (loading) return <span className="text-muted-foreground text-sm">Checking balance...</span>;
    if (balance === null) return null;

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
};const Payments = () => {
    const { user } = useAuth();
    const { t } = useTranslation();
    const { payments, isLoading, totalPaid, totalPending, createManualPayment } = usePayments();
    const { labourers } = useLabourers();
    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [selectedPayment, setSelectedPayment] = useState(null);
    const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);

    const [formData, setFormData] = useState({
        labourer_id: "",
        amount: "",
        method: "cash",
        payment_type: "advance",
        deduction_reason: "",
        transaction_date: new Date().toISOString().split("T")[0],
    });

    const handleSaveSuccess = () => {
        setIsAddModalOpen(false);
        resetForm();
    };

    const handleManualSave = async () => {
        if (!formData.labourer_id || !formData.amount) return;
        await createManualPayment.mutateAsync(formData);
        handleSaveSuccess();
    };

    const filteredPayments = useMemo(() => {
        return payments.filter((payment) => {
            const labourerName = payment.labourer?.name || "";
            const matchesSearch = labourerName.toLowerCase().includes(search.toLowerCase());
            const matchesStatus = statusFilter === "all" || payment.status === statusFilter;
            return matchesSearch && matchesStatus;
        });
    }, [payments, search, statusFilter]);

    const formatDate = (dateStr) => {
        if (!dateStr) return "";
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-GB', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        });
    };

    const resetForm = () => {
        setFormData({
            labourer_id: "",
            amount: "",
            method: "cash",
            payment_type: "advance",
            deduction_reason: "",
            transaction_date: new Date().toISOString().split("T")[0],
        });
    };

    const handleShare = async (payment) => {
        const receiptText = `ShramFlow Payment Receipt\nLabourer: ${payment.labourer?.name}\nAmount: ₹${Number(payment.amount).toLocaleString()}\nDate: ${formatDate(payment.transaction_date)}\nMethod: ${payment.method.toUpperCase()}\nStatus: ${payment.status.toUpperCase()}`;
        if (navigator.share) {
            try { await navigator.share({ title: 'Payment Receipt', text: receiptText }); } catch (err) { }
        } else {
            navigator.clipboard.writeText(receiptText);
            toast.success("Receipt copied to clipboard!");
        }
    };

    const handleExportCSV = () => {
        const csvContent = [
            ["Labourer", "Amount", "Method", "Date", "Status"].join(","),
            ...payments.map((p) => [p.labourer?.name || "Unknown", p.amount, p.method, p.transaction_date, p.status].join(",")),
        ].join("\n");
        const blob = new Blob([csvContent], { type: "text/csv" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `payments-${new Date().toISOString().split("T")[0]}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    };

    return (
        <AppLayout>
            <div className="space-y-8">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-foreground tracking-tight">Payments</h1>
                        <p className="text-sm text-muted-foreground mt-1">Track wages, advances, and transaction history.</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <Button variant="outline" size="sm" onClick={handleExportCSV} className="rounded-xl h-10 px-4 font-bold border-border">
                            <Download className="h-4 w-4 mr-2" />
                            Export
                        </Button>
                        {user.role === 'supervisor' && (
                            <Button size="sm" className="rounded-xl h-10 px-6 font-bold bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => setIsAddModalOpen(true)}>
                                <Plus className="h-4 w-4 mr-2" />
                                New Payment
                            </Button>
                        )}
                    </div>
                </div>

                {/* Summary Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-white p-5 rounded-2xl border border-border shadow-sm">
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">Total Paid</p>
                        <p className="text-xl font-bold text-emerald-600">₹{totalPaid.toLocaleString()}</p>
                    </div>
                    <div className="bg-white p-5 rounded-2xl border border-border shadow-sm">
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">Pending</p>
                        <p className="text-xl font-bold text-amber-600">₹{totalPending.toLocaleString()}</p>
                    </div>
                    <div className="bg-white p-5 rounded-2xl border border-border shadow-sm">
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">Total Volume</p>
                        <p className="text-xl font-bold text-foreground">₹{(totalPaid + totalPending).toLocaleString()}</p>
                    </div>
                    <div className="bg-white p-5 rounded-2xl border border-border shadow-sm">
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">Transaction Count</p>
                        <p className="text-xl font-bold text-foreground">{payments.length}</p>
                    </div>
                </div>

                {/* Filters */}
                <div className="flex flex-col sm:flex-row gap-4">
                    <div className="relative flex-1 max-w-md">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search labourer..."
                            className="pl-10 h-10 bg-white border-border rounded-xl text-sm"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                        <SelectTrigger className="w-44 h-10 bg-white border-border rounded-xl text-xs font-medium">
                            <SelectValue placeholder="All Status" />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl">
                            <SelectItem value="all">All Status</SelectItem>
                            <SelectItem value="paid">Paid</SelectItem>
                            <SelectItem value="pending">Pending</SelectItem>
                            <SelectItem value="failed">Failed</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                {/* Table */}
                <div className="bg-white rounded-2xl border border-border shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-muted/30">
                                <tr>
                                    <th className="px-6 py-4 text-left text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Labourer</th>
                                    <th className="px-6 py-4 text-left text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Date</th>
                                    <th className="px-6 py-4 text-left text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Method</th>
                                    <th className="px-6 py-4 text-left text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Amount</th>
                                    <th className="px-6 py-4 text-left text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Status</th>
                                    <th className="px-6 py-4 text-right text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border/50">
                                {isLoading ? (
                                    [1, 2, 3, 4, 5].map(i => (
                                        <tr key={i}><td colSpan="6" className="px-6 py-4"><Skeleton className="h-6 w-full rounded" /></td></tr>
                                    ))
                                ) : filteredPayments.length === 0 ? (
                                    <tr><td colSpan="6" className="px-6 py-12 text-center text-muted-foreground font-medium italic">No transactions found</td></tr>
                                ) : (
                                    filteredPayments.map((payment) => (
                                        <tr key={payment.id} className="hover:bg-muted/10 transition-colors">
                                            <td className="px-6 py-4 font-bold text-foreground">
                                                {payment.labourer?.name || "General"}
                                            </td>
                                            <td className="px-6 py-4 text-muted-foreground text-xs font-medium">
                                                {formatDate(payment.transaction_date)}
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="capitalize text-xs font-bold text-muted-foreground bg-muted/50 px-2 py-1 rounded-md">
                                                    {payment.method.replace('_', ' ')}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 font-bold text-foreground">
                                                ₹{Number(payment.amount).toLocaleString()}
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={cn(
                                                    "px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-widest border",
                                                    payment.status === "paid" ? "bg-emerald-50 text-emerald-700 border-emerald-100" :
                                                        payment.status === "failed" ? "bg-red-50 text-red-700 border-red-100" :
                                                            "bg-amber-50 text-amber-700 border-amber-100"
                                                )}>
                                                    {payment.status}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:bg-muted">
                                                            <MoreVertical className="h-4 w-4 text-muted-foreground" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end" className="rounded-xl border-border shadow-xl">
                                                        <DropdownMenuItem onClick={() => { setSelectedPayment(payment); setIsDetailsModalOpen(true); }} className="gap-2 font-bold text-xs py-2">
                                                            <Eye className="h-3.5 w-3.5" /> View Details
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem onClick={() => handleShare(payment)} className="gap-2 font-bold text-xs py-2">
                                                            <Share2 className="h-3.5 w-3.5" /> Share Receipt
                                                        </DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Modals */}
                <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
                    <DialogContent className="sm:max-w-md rounded-2xl border-none shadow-2xl p-0 overflow-hidden">
                        <div className="p-6 border-b border-border bg-white">
                            <DialogTitle className="text-xl font-bold">New Payment</DialogTitle>
                            <DialogDescription className="text-xs font-medium text-muted-foreground mt-1">Record a wage or advance payment.</DialogDescription>
                        </div>
                        <div className="p-6 space-y-6">
                            <div className="grid gap-2">
                                <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Select Labourer</Label>
                                <Select value={formData.labourer_id} onValueChange={(value) => setFormData({ ...formData, labourer_id: value })}>
                                    <SelectTrigger className="h-11 rounded-xl text-sm border-border">
                                        <SelectValue placeholder="Choose labourer" />
                                    </SelectTrigger>
                                    <SelectContent className="rounded-xl">
                                        {labourers?.filter(l => !l.status || l.status === "active").map((labour) => (
                                            <SelectItem key={labour.id} value={labour.id}>
                                                {labour.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="grid gap-2">
                                    <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Amount (₹)</Label>
                                    <Input
                                        type="number"
                                        placeholder="0"
                                        value={formData.amount}
                                        className="h-11 rounded-xl text-sm font-bold border-border"
                                        onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                                    />
                                </div>
                                <div className="grid gap-2">
                                    <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Method</Label>
                                    <Select value={formData.method} onValueChange={(value) => setFormData({ ...formData, method: value })}>
                                        <SelectTrigger className="h-11 rounded-xl text-sm border-border">
                                            <SelectValue placeholder="Select" />
                                        </SelectTrigger>
                                        <SelectContent className="rounded-xl">
                                            <SelectItem value="cash">Cash</SelectItem>
                                            <SelectItem value="manual_upi">UPI</SelectItem>
                                            <SelectItem value="bank">Bank</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        </div>
                        <div className="p-6 bg-muted/20 border-t border-border flex gap-3">
                            <Button variant="ghost" className="flex-1 h-11 rounded-xl font-bold" onClick={() => setIsAddModalOpen(false)}>Cancel</Button>
                            <Button className="flex-1 h-11 rounded-xl font-bold bg-emerald-600 hover:bg-emerald-700 text-white" onClick={handleManualSave}>Save Payment</Button>
                        </div>
                    </DialogContent>
                </Dialog>

                {/* Details Dialog */}
                <Dialog open={isDetailsModalOpen} onOpenChange={setIsDetailsModalOpen}>
                    <DialogContent className="sm:max-w-md rounded-2xl border-none shadow-2xl p-0 overflow-hidden">
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
                                    <p className="font-bold text-foreground capitalize">{selectedPayment?.method.replace('_', ' ')}</p>
                                </div>
                                <div>
                                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">Status</p>
                                    <p className="font-bold text-emerald-600 capitalize">{selectedPayment?.status}</p>
                                </div>
                            </div>
                            <Button variant="outline" className="w-full h-12 rounded-xl font-bold border-emerald-200 text-emerald-700 hover:bg-emerald-50" onClick={() => handleShare(selectedPayment)}>
                                <Share2 className="h-4 w-4 mr-2" /> Share Receipt
                            </Button>
                        </div>
                    </DialogContent>
                </Dialog>
            </div>
        </AppLayout>
    );
};

export default Payments;
