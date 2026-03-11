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
import { useAuth } from "@/contexts/AuthContext";
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
};

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

    // Form state for creating a new payment
    const [formData, setFormData] = useState({
        labourer_id: "",
        amount: "",
        method: "cash",
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
        }); // e.g. 21 Jan 2024
    };

    const getMethodIcon = (method) => {
        const icons = {
            cash: Banknote,
            upi: Smartphone,
            manual_upi: Smartphone,
            bank: Building2,
            razorpay: CreditCard
        };
        const Icon = icons[method] || Banknote;
        return <Icon className="h-4 w-4" />;
    };

    const resetForm = () => {
        setFormData({
            labourer_id: "",
            amount: "",
            method: "cash",
            transaction_date: new Date().toISOString().split("T")[0],
        });
    };

    const handleShare = async (payment) => {
        const receiptText = `ShramFlow Payment Receipt\nLabourer: ${payment.labourer?.name}\nAmount: ₹${Number(payment.amount).toLocaleString()}\nDate: ${formatDate(payment.transaction_date)}\nMethod: ${payment.method.toUpperCase()}\nStatus: ${payment.status.toUpperCase()}`;

        if (navigator.share) {
            try {
                await navigator.share({
                    title: 'Payment Receipt',
                    text: receiptText,
                });
            } catch (err) {
                if (import.meta.env.DEV) console.error('Share failed:', err);
            }
        } else {
            // Fallback to clipboard
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
            <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 space-y-3 md:space-y-6">
                {/* Immersive Page Header (Matches Dashboard structure) */}
                <div className="relative -mx-3 sm:-mx-4 md:-mx-6 px-3 sm:px-4 md:px-6 pt-6 lg:pt-8 pb-8 gradient-hero rounded-b-3xl border-b border-white/10">
                    <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 md:gap-6">
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse-soft" />
                                <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground/80">Financial Hub</span>
                            </div>
                            <h1 className="text-xl sm:text-2xl md:text-3xl font-semibold tracking-tight text-foreground">{t("payments")}</h1>
                            <p className="text-muted-foreground mt-1 text-xs sm:text-sm md:text-base font-medium">
                                {filteredPayments.length} transactions recorded • Wages & advances
                            </p>
                        </div>
                        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                            <Button variant="outline" size="sm" onClick={handleExportCSV} className="py-2.5 px-4 rounded-xl bg-background/50 backdrop-blur-sm border-2 w-full sm:w-auto text-sm h-auto">
                                <Download className="h-4 w-4 mr-2" />
                                {t("exportCSV")}
                            </Button>
                            {user.role === 'supervisor' && (
                                <Button size="sm" className="py-2.5 px-4 rounded-xl gradient-primary shadow-glow font-bold w-full sm:w-auto text-sm h-auto" onClick={() => setIsAddModalOpen(true)}>
                                    <CreditCard className="h-4 w-4 mr-2" />
                                    {t("createPayment")}
                                </Button>
                            )}
                        </div>
                    </div>
                </div>

                {/* Main Content Sections (Inherit AppLayout's padding and max-w) */}
                <div className="space-y-4 md:space-y-6">
                    {/* Summary Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6">
                        <div className="bg-card rounded-2xl border p-4 md:p-6 shadow-sm hover-lift group">
                            <p className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground/70 mb-2 flex items-center gap-2">
                                <CheckCircle className="h-3 w-3 text-green-500" />
                                Total Paid
                            </p>
                            <p className="text-xl md:text-2xl font-bold text-green-600 tracking-tight">₹{totalPaid.toLocaleString()}</p>
                        </div>
                        <div className="bg-card rounded-2xl border p-4 md:p-6 shadow-sm hover-lift group">
                            <p className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground/70 mb-2 flex items-center gap-2">
                                <Clock className="h-3 w-3 text-amber-500" />
                                Pending
                            </p>
                            <p className="text-xl md:text-2xl font-bold text-amber-500 tracking-tight">₹{totalPending.toLocaleString()}</p>
                        </div>
                        <div className="bg-card rounded-2xl border p-4 md:p-6 shadow-sm hover-lift">
                            <p className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground/70 mb-2">Total Volume</p>
                            <p className="text-xl md:text-2xl font-bold text-foreground tracking-tight">₹{(totalPaid + totalPending).toLocaleString()}</p>
                        </div>
                        <div className="bg-card rounded-2xl border p-4 md:p-6 shadow-sm hover-lift">
                            <p className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground/70 mb-2">Transactions</p>
                            <p className="text-xl md:text-2xl font-bold text-foreground tracking-tight">{payments.length}</p>
                        </div>
                    </div>

                    {/* Filters Section */}
                    <div className="flex flex-col sm:flex-row gap-3 md:gap-6 bg-card p-4 md:p-6 rounded-2xl border shadow-sm">
                        <div className="relative flex-1">
                            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search by labourer name..."
                                className="pl-10 py-2 px-3 h-10 md:h-11 bg-muted/40 border-none focus-visible:ring-2 focus-visible:ring-primary/20 rounded-xl text-sm"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                            />
                        </div>
                        <Select value={statusFilter} onValueChange={setStatusFilter}>
                            <SelectTrigger className="w-full sm:w-44 h-10 md:h-11 bg-muted/40 border-none rounded-xl px-3 md:px-4 text-xs md:text-sm">
                                <div className="flex items-center gap-2">
                                    <Filter className="h-3.5 w-3.5 text-muted-foreground" />
                                    <SelectValue placeholder={t("status")} />
                                </div>
                            </SelectTrigger>
                            <SelectContent className="rounded-xl">
                                <SelectItem value="all">All Transactions</SelectItem>
                                <SelectItem value="paid">{t("paid")}</SelectItem>
                                <SelectItem value="pending">{t("pending")}</SelectItem>
                                <SelectItem value="failed">{t("failed")}</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                {/* Payments List */}
                {isLoading ? (
                    <div className="space-y-4">
                        {Array.from({ length: 5 }).map((_, i) => (
                            <Skeleton key={i} className="h-24 rounded-2xl" />
                        ))}
                    </div>
                ) : (
                    <div className="space-y-3">
                        {filteredPayments.map((payment, index) => (
                            <div
                                key={payment.id}
                                className="group relative bg-card rounded-2xl border p-5 shadow-sm transition-all duration-300 hover:shadow-md hover:border-primary/20 animate-slide-up"
                                style={{ animationDelay: `${index * 50}ms` }}
                            >
                                <div className="flex items-center justify-between gap-4">
                                    <div className="flex items-center gap-4 flex-1 min-w-0">
                                        <div className={cn(
                                            "hidden sm:flex w-12 h-12 rounded-2xl items-center justify-center shrink-0",
                                            payment.status === 'paid' ? "bg-green-100 text-green-600" :
                                                payment.status === 'failed' ? "bg-red-100 text-red-600" : "bg-amber-100 text-amber-600"
                                        )}>
                                            {payment.status === 'paid' ? <CheckCircle className="h-6 w-6" /> :
                                                payment.status === 'failed' ? <XCircle className="h-6 w-6" /> : <Clock className="h-6 w-6" />}
                                        </div>
                                        <div className="min-w-0">
                                            <h3 className="font-bold text-foreground truncate text-lg">
                                                {payment.labourer?.name || "General Payment"}
                                            </h3>
                                            <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                                                <span className="font-medium text-xs bg-muted px-2 py-0.5 rounded-full uppercase">
                                                    {formatDate(payment.transaction_date)}
                                                </span>
                                                <span>•</span>
                                                <div className="flex items-center gap-1">
                                                    {getMethodIcon(payment.method)}
                                                    <span className="capitalize">{payment.method === 'manual_upi' ? 'UPI' : payment.method}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-6">
                                        <div className="text-right">
                                            <p className="text-xl font-extrabold text-foreground tracking-tight">₹{Number(payment.amount).toLocaleString()}</p>
                                            <Badge
                                                className={cn(
                                                    "mt-1 uppercase text-[10px] font-bold tracking-widest",
                                                    payment.status === "paid" ? "bg-green-500/10 text-green-600 hover:bg-green-500/20 border-green-500/20" :
                                                        payment.status === "failed" ? "bg-red-500/10 text-red-600 hover:bg-red-500/20 border-red-500/20" :
                                                            "bg-amber-500/10 text-amber-600 hover:bg-amber-500/20 border-amber-500/20"
                                                )}
                                                variant="outline"
                                            >
                                                {payment.status}
                                            </Badge>
                                        </div>

                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" size="icon" className="h-10 w-10 text-muted-foreground hover:text-foreground rounded-full">
                                                    <MoreVertical className="h-5 w-5" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end" className="w-48 rounded-xl p-1.5 shadow-xl border-muted/50">
                                                <DropdownMenuItem onClick={() => { setSelectedPayment(payment); setIsDetailsModalOpen(true); }} className="rounded-lg gap-2.5 py-2.5 cursor-pointer">
                                                    <Eye className="h-4 w-4" />
                                                    View Details
                                                </DropdownMenuItem>
                                                <DropdownMenuItem onClick={() => handleShare(payment)} className="rounded-lg gap-2.5 py-2.5 cursor-pointer">
                                                    <Share2 className="h-4 w-4" />
                                                    Share Receipt
                                                </DropdownMenuItem>

                                                {payment.status === "pending" && payment.method === "razorpay" && user.role === 'supervisor' && (
                                                    <>
                                                        <div className="h-px bg-muted my-1" />
                                                        <div className="px-1 py-1">
                                                            <PaymentButton
                                                                amount={Number(payment.amount)}
                                                                labourerId={payment.labourer?.id}
                                                                supervisorId={user?.id}
                                                                orderId={payment.razorpay_order_id}
                                                                labourerName={payment.labourer?.name}
                                                                onSuccess={handleSaveSuccess}
                                                                buttonText="Pay Now"
                                                                className="w-full justify-start h-10 text-sm font-semibold rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground"
                                                            />
                                                        </div>
                                                    </>
                                                )}
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {!isLoading && filteredPayments.length === 0 && (
                    <div className="text-center py-20 bg-card rounded-3xl border border-dashed border-muted-foreground/30">
                        <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                            <CreditCard className="h-8 w-8 text-muted-foreground/50" />
                        </div>
                        <h3 className="text-lg font-semibold text-foreground">{t("noData")}</h3>
                        <p className="text-muted-foreground mt-1 max-w-xs mx-auto">No payments found matching your search or filters.</p>
                        {user.role === 'supervisor' && (
                            <Button className="mt-6 h-10 px-6 rounded-full" onClick={() => setIsAddModalOpen(true)}>
                                {t("createPayment")}
                            </Button>
                        )}
                    </div>
                )}

                {/* Create Payment Modal */}
                <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
                    <DialogContent className="sm:max-w-md">
                        <DialogHeader className="p-4 md:px-6 md:pt-6 border-b">
                            <DialogTitle>{t("createPayment")}</DialogTitle>
                            <DialogDescription className="text-xs">Initiate a new wage or advance payment</DialogDescription>
                        </DialogHeader>

                        <div className="overflow-y-auto max-h-[60vh] p-4 md:p-6 space-y-4">
                            <div className="space-y-1.5">
                                <Label className="text-xs font-semibold">Select Labourer</Label>
                                <Select
                                    value={formData.labourer_id}
                                    onValueChange={(value) => setFormData({ ...formData, labourer_id: value })}
                                >
                                    <SelectTrigger className="h-9 text-sm">
                                        <SelectValue placeholder="Choose labourer" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {labourers
                                            .filter((l) => l.status === "active")
                                            .map((labour) => (
                                                <SelectItem key={labour.id} value={labour.id}>
                                                    <div className="flex flex-col">
                                                        <span className="font-semibold">{labour.name}</span>
                                                        <span className="text-[10px] text-muted-foreground">₹{labour.daily_rate}/day</span>
                                                    </div>
                                                </SelectItem>
                                            ))}
                                    </SelectContent>
                                </Select>
                                {formData.labourer_id && <LabourBalanceDisplay labourId={formData.labourer_id} />}
                            </div>

                            <div className="grid grid-cols-2 gap-3 md:gap-4">
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-semibold">{t("amount")} (₹)</Label>
                                    <Input
                                        type="number"
                                        placeholder="0"
                                        value={formData.amount}
                                        className="h-9 text-sm font-semibold"
                                        onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-semibold">{t("method")}</Label>
                                    <Select value={formData.method} onValueChange={(value) => setFormData({ ...formData, method: value })}>
                                        <SelectTrigger className="h-9 text-sm">
                                            <SelectValue placeholder="Select" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="cash">Cash</SelectItem>
                                            <SelectItem value="manual_upi">UPI Manual</SelectItem>
                                            <SelectItem value="bank">Bank</SelectItem>
                                            <SelectItem value="razorpay" className="font-bold text-primary">Razorpay</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <Label className="text-xs font-semibold">Date</Label>
                                <Input
                                    type="date"
                                    value={formData.transaction_date}
                                    className="h-9 text-sm"
                                    onChange={(e) => setFormData({ ...formData, transaction_date: e.target.value })}
                                />
                            </div>
                        </div>

                        <div className="sticky bottom-0 bg-white border-t pt-3 pb-2 px-4 md:px-6 flex gap-3 z-10">
                            <Button variant="outline" size="sm" className="flex-1" onClick={() => setIsAddModalOpen(false)}>
                                {t("cancel")}
                            </Button>
                            {formData.method === "razorpay" ? (
                                <PaymentButton
                                    amount={Number(formData.amount)}
                                    labourerId={formData.labourer_id}
                                    supervisorId={user?.id}
                                    labourerName={labourers.find(l => l.id === formData.labourer_id)?.name}
                                    onBeforeOpen={() => setIsAddModalOpen(false)}
                                    onSuccess={handleSaveSuccess}
                                    className="flex-[1.5] h-9 text-sm"
                                />
                            ) : (
                                <Button
                                    size="sm"
                                    className="flex-[1.5] gradient-primary"
                                    onClick={handleManualSave}
                                    disabled={!formData.labourer_id || !formData.amount || createManualPayment.isPending}
                                >
                                    {createManualPayment.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : t("save")}
                                </Button>
                            )}
                        </div>
                    </DialogContent>
                </Dialog>

                {/* Detailed View Modal */}
                <Dialog open={isDetailsModalOpen} onOpenChange={setIsDetailsModalOpen}>
                    <DialogContent className="sm:max-w-md">
                        <DialogHeader className="p-4 md:px-6 md:pt-6 border-b">
                            <DialogTitle className="text-lg">Transaction Receipt</DialogTitle>
                            <DialogDescription className="text-xs">Digital payment record</DialogDescription>
                        </DialogHeader>

                        <div className="overflow-y-auto max-h-[60vh]">
                            <div className="bg-slate-900 p-6 md:p-8 text-white text-center">
                                <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mb-1">Total Amount</p>
                                <h2 className="text-3xl md:text-4xl font-black mb-3 text-white">₹{Number(selectedPayment?.amount).toLocaleString()}</h2>
                                <Badge className={cn(
                                    "rounded-full px-4 py-1 text-[10px] font-black uppercase tracking-widest",
                                    selectedPayment?.status === 'paid' ? "bg-green-500 text-white" : "bg-amber-500 text-white"
                                )}>
                                    {selectedPayment?.status}
                                </Badge>
                            </div>

                            <div className="p-4 md:p-6 space-y-6">
                                <div className="grid grid-cols-2 gap-y-6 gap-x-4 text-sm">
                                    <div className="bg-muted/30 p-3 rounded-lg border border-border/40">
                                        <p className="text-muted-foreground font-bold text-[10px] uppercase tracking-wider mb-1">Labourer</p>
                                        <p className="font-bold text-foreground truncate">{selectedPayment?.labourer?.name}</p>
                                    </div>
                                    <div className="bg-muted/30 p-3 rounded-lg border border-border/40">
                                        <p className="text-muted-foreground font-bold text-[10px] uppercase tracking-wider mb-1">Date</p>
                                        <p className="font-bold text-foreground">{formatDate(selectedPayment?.transaction_date)}</p>
                                    </div>
                                    <div className="bg-muted/30 p-3 rounded-lg border border-border/40">
                                        <p className="text-muted-foreground font-bold text-[10px] uppercase tracking-wider mb-1">Method</p>
                                        <p className="font-bold text-foreground capitalize">{selectedPayment?.method.replace('_', ' ')}</p>
                                    </div>
                                    <div className="bg-muted/30 p-3 rounded-lg border border-border/40">
                                        <p className="text-muted-foreground font-bold text-[10px] uppercase tracking-wider mb-1">Transaction ID</p>
                                        <p className="font-mono text-[10px] text-foreground truncate" title={selectedPayment?.id}>
                                            #{selectedPayment?.id.slice(0, 8)}
                                        </p>
                                    </div>

                                    {selectedPayment?.razorpay_order_id && (
                                        <div className="col-span-2 bg-muted/30 p-3 rounded-lg border border-border/40">
                                            <p className="text-muted-foreground font-bold text-[10px] uppercase tracking-wider mb-1">Razorpay Order ID</p>
                                            <p className="font-mono text-[11px] text-foreground break-all">{selectedPayment.razorpay_order_id}</p>
                                        </div>
                                    )}
                                    {selectedPayment?.razorpay_payment_id && (
                                        <div className="col-span-2 bg-muted/30 p-3 rounded-lg border border-border/40">
                                            <p className="text-muted-foreground font-bold text-[10px] uppercase tracking-wider mb-1">Razorpay Payment ID</p>
                                            <p className="font-mono text-[11px] text-foreground break-all">{selectedPayment.razorpay_payment_id}</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="sticky bottom-0 bg-white border-t pt-3 pb-2 px-4 md:px-6 z-10">
                            <Button size="sm" variant="outline" className="w-full h-10 rounded-xl font-bold gap-2" onClick={() => handleShare(selectedPayment)}>
                                <Share2 className="h-4 w-4" />
                                Share Receipt
                            </Button>
                        </div>
                    </DialogContent>
                </Dialog>
            </div>
        </AppLayout >
    );
};

export default Payments;
