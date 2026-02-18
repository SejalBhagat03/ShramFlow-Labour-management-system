import { useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { AppLayout } from "@/components/AppLayout";
import { usePayments } from "@/hooks/usePayments";
import { useLabourers } from "@/hooks/useLabourers";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
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
} from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Payments page component for managing labourer payments.
 * Allows supervisors to create, view, and mark payments as paid.
 *
 * @returns {JSX.Element} The Payments page component.
 */
/**
 * Component to display labourer's current balance
 */
const LabourBalanceDisplay = ({ labourId }) => {
    const { getLabourBalance } = useLabourers();
    const [balance, setBalance] = useState(null);
    const [loading, setLoading] = useState(true);

    useState(() => {
        const fetchBalance = async () => {
            setLoading(true);
            try {
                const bal = await getLabourBalance(labourId);
                setBalance(bal);
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        if (labourId) fetchBalance();
    }, [labourId]);

    if (loading) return <span className="text-muted-foreground">Checking balance...</span>;
    if (balance === null) return null;

    const isPending = balance >= 0;
    return (
        <div className={cn("p-2 rounded border flex justify-between items-center",
            isPending ? "bg-green-500/10 border-green-500/20" : "bg-red-500/10 border-red-500/20"
        )}>
            <span className="text-muted-foreground">Current Status:</span>
            <span className={cn("font-bold", isPending ? "text-green-600" : "text-red-600")}>
                {isPending ? `Pending Wage: ₹${balance}` : `Advance Taken: ₹${Math.abs(balance)}`}
            </span>
        </div>
    );
};

const Payments = () => {
    const { t } = useLanguage();
    const { payments, isLoading, createPayment, markAsPaid, totalPaid, totalPending } = usePayments();
    const { labourers } = useLabourers();
    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);

    // Form state for creating a new payment
    const [formData, setFormData] = useState({
        labourer_id: "",
        amount: 0,
        method: "cash",
        date: new Date().toISOString().split("T")[0],
        status: "paid",
    });

    // Filter payments based on search term and status filter
    const filteredPayments = payments.filter((payment) => {
        const labourerName = payment.labourer?.name || "";
        const matchesSearch = labourerName.toLowerCase().includes(search.toLowerCase());
        const matchesStatus = statusFilter === "all" || payment.status === statusFilter;
        return matchesSearch && matchesStatus;
    });

    /**
     * Returns the icon associated with a payment method.
     *
     * @param {string} method - The payment method ('cash', 'upi', 'bank').
     * @returns {React.ElementType} The lucide-react icon component.
     */
    const getMethodIcon = (method) => {
        const icons = {
            cash: Banknote,
            upi: Smartphone,
            bank: Building2,
        };
        return icons[method] || Banknote;
    };

    /**
     * Handles marking a payment as paid.
     *
     * @param {Object} payment - The payment object to update.
     */
    const handleMarkPaid = (payment) => {
        markAsPaid.mutate(payment.id);
    };

    /**
     * Handles saving a new payment.
     */
    const handleSave = async () => {
        if (!formData.labourer_id || !formData.amount) return;
        await createPayment.mutateAsync(formData);
        setIsAddModalOpen(false);
        resetForm();
    };

    /**
     * Resets the payment creation form.
     */
    const resetForm = () => {
        setFormData({
            labourer_id: "",
            amount: 0,
            method: "cash",
            date: new Date().toISOString().split("T")[0],
            status: "paid",
        });
    };

    /**
     * Exports the payment list as a CSV file.
     */
    const handleExportCSV = () => {
        const csvContent = [
            ["Labourer", "Amount", "Method", "Date", "Status"].join(","),
            ...payments.map((p) => [p.labourer?.name || "Unknown", p.amount, p.method, p.date, p.status].join(",")),
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
            <div className="space-y-6">
                {/* Page Header */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-foreground">{t("payments")}</h1>
                        <p className="text-muted-foreground mt-1">
                            {filteredPayments.length} payments • ₹{totalPending.toLocaleString()} pending
                        </p>
                    </div>
                    <div className="flex gap-2">
                        <Button variant="outline" onClick={handleExportCSV}>
                            <Download className="h-4 w-4 mr-2" />
                            {t("exportCSV")}
                        </Button>
                        <Button className="gradient-primary shadow-glow" onClick={() => setIsAddModalOpen(true)}>
                            <CreditCard className="h-4 w-4 mr-2" />
                            {t("createPayment")}
                        </Button>
                    </div>
                </div>

                {/* Summary Cards */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-card rounded-xl border p-4 shadow-card">
                        <p className="text-sm text-muted-foreground">Total Paid</p>
                        <p className="text-2xl font-bold text-success">₹{totalPaid.toLocaleString()}</p>
                    </div>
                    <div className="bg-card rounded-xl border p-4 shadow-card">
                        <p className="text-sm text-muted-foreground">Pending</p>
                        <p className="text-2xl font-bold text-warning">₹{totalPending.toLocaleString()}</p>
                    </div>
                    <div className="bg-card rounded-xl border p-4 shadow-card">
                        <p className="text-sm text-muted-foreground">This Month</p>
                        <p className="text-2xl font-bold text-foreground">₹{(totalPaid + totalPending).toLocaleString()}</p>
                    </div>
                    <div className="bg-card rounded-xl border p-4 shadow-card">
                        <p className="text-sm text-muted-foreground">Transactions</p>
                        <p className="text-2xl font-bold text-foreground">{payments.length}</p>
                    </div>
                </div>

                {/* Filters */}
                <div className="flex flex-col sm:flex-row gap-3">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder={`${t("search")} by name...`}
                            className="pl-10"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                        <SelectTrigger className="w-full sm:w-40">
                            <Filter className="h-4 w-4 mr-2" />
                            <SelectValue placeholder={t("status")} />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Status</SelectItem>
                            <SelectItem value="paid">{t("paid")}</SelectItem>
                            <SelectItem value="unpaid">{t("unpaid")}</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                {/* Payments List */}
                {isLoading ? (
                    <div className="space-y-3">
                        {Array.from({ length: 5 }).map((_, i) => (
                            <Skeleton key={i} className="h-20 rounded-xl" />
                        ))}
                    </div>
                ) : (
                    <div className="space-y-3">
                        {filteredPayments.map((payment, index) => {
                            const MethodIcon = getMethodIcon(payment.method);
                            return (
                                <div
                                    key={payment.id}
                                    className="bg-card rounded-xl border p-4 shadow-card transition-all duration-200 hover:shadow-lg animate-slide-up"
                                    style={{ animationDelay: `${index * 50}ms` }}
                                >
                                    <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-3">
                                                <div
                                                    className={cn(
                                                        "w-10 h-10 rounded-full flex items-center justify-center",
                                                        payment.status === "paid" ? "bg-success/10" : "bg-warning/10",
                                                    )}
                                                >
                                                    {payment.status === "paid" ? (
                                                        <CheckCircle className="h-5 w-5 text-success" />
                                                    ) : (
                                                        <Clock className="h-5 w-5 text-warning" />
                                                    )}
                                                </div>
                                                <div>
                                                    <h3 className="font-semibold text-foreground">{payment.labourer?.name || "Unknown"}</h3>
                                                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                                        <MethodIcon className="h-3.5 w-3.5" />
                                                        <span className="capitalize">{payment.method}</span>
                                                        <span>•</span>
                                                        <span>{payment.date}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-4">
                                            <div className="text-right">
                                                <p className="text-xl font-bold text-foreground">₹{Number(payment.amount).toLocaleString()}</p>
                                                <Badge
                                                    variant={payment.status === "paid" ? "default" : "outline"}
                                                    className={cn(
                                                        payment.status === "paid"
                                                            ? "bg-success/10 text-success border-success/20"
                                                            : "bg-warning/10 text-warning border-warning/20",
                                                    )}
                                                >
                                                    {payment.status === "paid" ? t("paid") : t("unpaid")}
                                                </Badge>
                                            </div>
                                            {payment.status === "unpaid" && (
                                                <Button size="sm" onClick={() => handleMarkPaid(payment)} disabled={markAsPaid.isPending}>
                                                    {markAsPaid.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : t("markAsPaid")}
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

                {!isLoading && filteredPayments.length === 0 && (
                    <div className="text-center py-12">
                        <p className="text-muted-foreground">{t("noData")}</p>
                        <Button className="mt-4" onClick={() => setIsAddModalOpen(true)}>
                            <CreditCard className="h-4 w-4 mr-2" />
                            Create your first payment
                        </Button>
                    </div>
                )}

                {/* Create Payment Modal */}
                <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
                    <DialogContent className="sm:max-w-lg">
                        <DialogHeader>
                            <DialogTitle>{t("createPayment")}</DialogTitle>
                            <DialogDescription>Create a new payment for a labourer.</DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                            <div className="space-y-2">
                                <Label>Select Labourer *</Label>
                                <Select
                                    value={formData.labourer_id}
                                    onValueChange={(value) => setFormData({ ...formData, labourer_id: value })}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Choose labourer" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {labourers
                                            .filter((l) => l.status === "active")
                                            .map((labour) => (
                                                <SelectItem key={labour.id} value={labour.id}>
                                                    {labour.name} - ₹{labour.daily_rate}/day
                                                </SelectItem>
                                            ))}
                                    </SelectContent>
                                </Select>
                                {formData.labourer_id && (
                                    <div className="mt-2 text-sm">
                                        <LabourBalanceDisplay labourId={formData.labourer_id} />
                                    </div>
                                )}
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>{t("amount")} (₹) *</Label>
                                    <Input
                                        type="number"
                                        placeholder="0"
                                        value={formData.amount || ""}
                                        onChange={(e) => setFormData({ ...formData, amount: Number(e.target.value) })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>{t("method")} *</Label>
                                    <Select value={formData.method} onValueChange={(value) => setFormData({ ...formData, method: value })}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select method" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="cash">
                                                <div className="flex items-center gap-2">
                                                    <Banknote className="h-4 w-4" />
                                                    Cash
                                                </div>
                                            </SelectItem>
                                            <SelectItem value="upi">
                                                <div className="flex items-center gap-2">
                                                    <Smartphone className="h-4 w-4" />
                                                    UPI
                                                </div>
                                            </SelectItem>
                                            <SelectItem value="bank">
                                                <div className="flex items-center gap-2">
                                                    <Building2 className="h-4 w-4" />
                                                    Bank Transfer
                                                </div>
                                            </SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label>{t("paymentDate")}</Label>
                                <Input
                                    type="date"
                                    value={formData.date}
                                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label>{t("status")}</Label>
                                <Select value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value })}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="paid">{t("paid")}</SelectItem>
                                        <SelectItem value="unpaid">{t("unpaid")}</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <div className="flex justify-end gap-3">
                            <Button variant="outline" onClick={() => setIsAddModalOpen(false)}>
                                {t("cancel")}
                            </Button>
                            <Button
                                className="gradient-primary"
                                onClick={handleSave}
                                disabled={!formData.labourer_id || !formData.amount || createPayment.isPending}
                            >
                                {createPayment.isPending ? (
                                    <>
                                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                        Creating...
                                    </>
                                ) : (
                                    t("save")
                                )}
                            </Button>
                        </div>
                    </DialogContent>
                </Dialog>
            </div>
        </AppLayout >
    );
};

export default Payments;
