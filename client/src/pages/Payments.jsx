import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { AppLayout } from "@/layouts/AppLayout";
import { usePayments } from "@/features/payments/hooks/usePayments";
import { useLabourers } from "@/features/workforce/hooks/useLabourers";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    Search,
    Download,
    MoreVertical,
    Share2,
    Eye,
    Plus,
    Wallet,
    Activity,
    ArrowUpRight,
    ShieldCheck,
    Zap
} from "lucide-react";
import { cn } from "@/features/shared/utils/utils";
import { toast } from "sonner";
import { PaymentModal } from "@/features/payments/components/PaymentModal";

/**
 * Payments page component for managing labourer payments.
 */
const Payments = () => {
    const { user } = useAuth();
    const { t } = useTranslation();
    const { payments, isLoading, totalPaid, totalPending, createManualPayment } = usePayments();
    const { labourers } = useLabourers();
    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [selectedPayment, setSelectedPayment] = useState(null);
    const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
    const { autoSettle } = usePayments();

    const handleAutoSettle = async () => {
        if (window.confirm("Run intelligent auto-settlement? This will pay all approved work entries using Cash method (up to ₹15k per person safety limit).")) {
            await autoSettle.mutateAsync({ global: true, method: 'cash' });
        }
    };

    const handleSaveSuccess = () => {
        setIsAddModalOpen(false);
    };

    const handleManualSave = async (formData) => {
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

    const handleShare = async (payment) => {
        const receiptText = `ShramFlow Payment Receipt\nLabourer: ${payment.labourer?.name}\nAmount: ₹${Number(payment.amount).toLocaleString()}\nDate: ${formatDate(payment.transaction_date)}\nMethod: ${payment.method.toUpperCase()}\nStatus: ${payment.status.toUpperCase()}`;
        if (navigator.share) {
            try { await navigator.share({ title: 'Payment Receipt', text: receiptText }); } catch (err) { console.error("Share failed", err); }
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
            <div className="space-y-8 animate-fade-in pb-12">
                {/* 🎯 Premium Header */}
                <div className="premium-header relative">
                    <div>
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 text-blue-700 text-[10px] font-black uppercase tracking-widest mb-3 border border-blue-200/50 backdrop-blur-md">
                            <Wallet className="h-3 w-3" />
                            Financial Ledger
                        </div>
                        <h1 className="text-4xl font-black text-slate-900 tracking-tight leading-none">
                            Wage <span className="text-blue-600">Tracking</span>
                        </h1>
                        <p className="text-slate-500 font-medium mt-3 flex items-center gap-2">
                            <Activity className="h-4 w-4 text-blue-500" />
                            Manage payments, advances, and transaction history.
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        <Button 
                            variant="ghost" 
                            className="hidden lg:flex rounded-2xl h-11 px-4 font-black text-[10px] uppercase tracking-widest text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700 transition-all border border-emerald-100"
                            onClick={handleAutoSettle}
                            disabled={autoSettle.isPending}
                        >
                            <Zap className="h-4 w-4 mr-2" />
                            Smart Auto-Settle
                        </Button>
                        <Button variant="outline" size="sm" onClick={handleExportCSV} className="rounded-2xl h-11 px-6 font-black text-[10px] uppercase tracking-widest border-slate-200 hover:bg-slate-50 shadow-sm active:scale-95 transition-all">
                            <Download className="h-4 w-4 mr-2 text-blue-600" />
                            Export
                        </Button>
                        {user.role === 'supervisor' && (
                            <Button className="bg-slate-900 hover:bg-slate-800 text-white font-black h-11 px-6 rounded-2xl shadow-lg active:scale-95 transition-all text-[10px] uppercase tracking-widest" onClick={() => setIsAddModalOpen(true)}>
                                <Plus className="h-4 w-4 mr-2" />
                                New Payment
                            </Button>
                        )}
                    </div>
                </div>

                {/* Summary Cards */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 animate-slide-up">
                    <div className="glass-strong p-5 rounded-[2rem] shadow-soft border border-white/50">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Total Paid</p>
                        <p className="text-2xl font-black text-emerald-600">₹{totalPaid.toLocaleString()}</p>
                    </div>
                    <div className="glass-strong p-5 rounded-[2rem] shadow-soft border border-white/50">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Pending</p>
                        <p className="text-2xl font-black text-amber-600">₹{totalPending.toLocaleString()}</p>
                    </div>
                    <div className="glass-strong p-5 rounded-[2rem] shadow-soft border border-white/50">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Total Volume</p>
                        <p className="text-2xl font-black text-slate-900">₹{(totalPaid + totalPending).toLocaleString()}</p>
                    </div>
                    <div className="glass-strong p-5 rounded-[2rem] shadow-soft border border-white/50 hidden md:block relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                            <ShieldCheck className="h-12 w-12 text-emerald-600" />
                        </div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Safety Status</p>
                        <div className="flex items-center gap-2 text-emerald-600">
                            <ShieldCheck className="h-4 w-4" />
                            <span className="text-xs font-black uppercase tracking-tighter">Guardrails Active</span>
                        </div>
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
                <div className="glass-strong rounded-[2rem] shadow-soft overflow-hidden border border-white/40">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-slate-50/50">
                                <tr>
                                    <th className="px-6 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Labourer</th>
                                    <th className="hidden md:table-cell px-6 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Date</th>
                                    <th className="hidden lg:table-cell px-6 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Method</th>
                                    <th className="px-6 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Amount</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Status</th>
                                    <th className="px-6 py-4 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {isLoading ? (
                                    [1, 2, 3, 4, 5].map(i => (
                                        <tr key={i}><td colSpan="6" className="px-6 py-4"><Skeleton className="h-6 w-full rounded-xl" /></td></tr>
                                    ))
                                ) : filteredPayments.length === 0 ? (
                                    <tr><td colSpan="6" className="px-6 py-20 text-center text-slate-400 font-black uppercase tracking-widest opacity-30 italic">No transactions found</td></tr>
                                ) : (
                                    filteredPayments.map((payment) => (
                                        <tr key={payment.id} className="hover:bg-slate-50/50 transition-colors group">
                                            <td className="px-6 py-4">
                                                <p className="font-black text-slate-900">{payment.labourer?.name || "General"}</p>
                                                <p className="md:hidden text-[10px] font-bold text-slate-400">{formatDate(payment.transaction_date)}</p>
                                            </td>
                                            <td className="hidden md:table-cell px-6 py-4 text-slate-500 font-bold text-xs">
                                                {formatDate(payment.transaction_date)}
                                            </td>
                                            <td className="hidden lg:table-cell px-6 py-4">
                                                <span className="capitalize text-[10px] font-black text-slate-400 bg-slate-100 px-2.5 py-1 rounded-lg">
                                                    {payment.method?.replace('_', ' ') || 'N/A'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 font-black text-slate-900">
                                                ₹{Number(payment.amount).toLocaleString()}
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <span className={cn(
                                                    "px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest border",
                                                    payment.status === "paid" ? "bg-emerald-500/10 text-emerald-600 border-emerald-200" :
                                                        payment.status === "failed" ? "bg-rose-500/10 text-rose-600 border-rose-200" :
                                                            "bg-amber-500/10 text-amber-600 border-amber-200"
                                                )}>
                                                    {payment.status}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl hover:bg-slate-100">
                                                            <MoreVertical className="h-4 w-4 text-slate-400" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end" className="rounded-2xl border-slate-100 shadow-xl p-2 w-48">
                                                        <DropdownMenuItem onClick={() => { setSelectedPayment(payment); setIsDetailsModalOpen(true); }} className="rounded-xl focus:bg-slate-50 gap-2 font-black text-[10px] uppercase tracking-widest p-3">
                                                            <Eye className="h-3.5 w-3.5 text-blue-600" /> View Details
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem onClick={() => handleShare(payment)} className="rounded-xl focus:bg-slate-50 gap-2 font-black text-[10px] uppercase tracking-widest p-3">
                                                            <Share2 className="h-3.5 w-3.5 text-emerald-600" /> Share Receipt
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
                <PaymentModal 
                    isOpen={isAddModalOpen} 
                    onClose={() => setIsAddModalOpen(false)} 
                    labourers={labourers} 
                    onSave={handleManualSave}
                    isSaving={createManualPayment.isPending}
                />

                <PaymentModal 
                    isOpen={isDetailsModalOpen} 
                    onClose={() => setIsDetailsModalOpen(false)} 
                    mode="view"
                    selectedPayment={selectedPayment}
                    onShare={handleShare}
                    formatDate={formatDate}
                />
            </div>
        </AppLayout>
    );
};

export default Payments;
