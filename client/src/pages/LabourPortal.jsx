import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/hooks/useAuth";
import { labourerService } from "@/services/labourerService";
import { notificationService } from "@/services/notificationService";
import { ledgerService } from "@/services/ledgerService";
import { workService } from "@/services/workService";
import { useNavigate } from "react-router-dom";
import { NotificationBell } from "@/components/NotificationBell";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { useToast } from "@/hooks/use-toast";
import { 
    LogOut, 
    HardHat, 
    LayoutDashboard, 
    ClipboardPlus, 
    CreditCard, 
    History, 
    User, 
    Plus, 
    ArrowRight, 
    CheckCircle2, 
    ShieldAlert 
} from "lucide-react";
// Remove mock data imports
const LABOUR_WORK_TYPES = ["Masonry", "Plastering", "Brick Work", "Excavation", "Painting", "Carpentry", "Other"];

// ─── Status Badge ─────────────────────────────────────────────────────────────
function StatusBadge({ status }) {
    const map = {
        Approved: "bg-green-100 text-green-700 border-green-200",
        Pending: "bg-yellow-100 text-yellow-700 border-yellow-200",
        Flagged: "bg-red-100 text-red-600 border-red-200",
        Rejected: "bg-red-100 text-red-600 border-red-200",
        Paid: "bg-green-100 text-green-700 border-green-200",
    };
    const icon = { Approved: "✓", Pending: "⏳", Flagged: "⚠", Rejected: "✗", Paid: "✓" };
    return (
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border ${map[status] || "bg-gray-100 text-gray-600"}`}>
            {icon[status]} {status}
        </span>
    );
}

// ─── Summary Card ─────────────────────────────────────────────────────────────
function SummaryCard({ label, value, icon, bg, iconBg }) {
    return (
        <div className={`rounded-2xl p-5 flex justify-between items-start ${bg} shadow-sm`}>
            <div>
                <p className="text-sm text-gray-500 font-medium mb-1">{label}</p>
                <p className="text-3xl font-bold text-gray-800">{value}</p>
            </div>
            <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-xl ${iconBg}`}>
                {icon}
            </div>
        </div>
    );
}

export default function LabourPortal() {
    const { t } = useTranslation();
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const { toast } = useToast();
    const today = new Date().toISOString().split("T")[0];

    // State
    const [labourProfile, setLabourProfile] = useState({
        id: "",
        name: user?.name || "Labourer",
        role: "Labour",
        site: "Not Assigned",
        supervisor: "Not Assigned"
    });
    const [loading, setLoading] = useState(true);
    const [ledger, setLedger] = useState([]);
    const [financials, setFinancials] = useState({
        workThisMonth: "0 m",
        totalEarnings: "₹0",
        advanceTaken: "₹0",
        pendingPayment: "₹0"
    });
    const [workHistory, setWorkHistory] = useState([]);

    // Work Entry Form State
    const [workForm, setWorkForm] = useState({ date: today, type: "", qty: "", photo: null });
    const [workSubmitted, setWorkSubmitted] = useState(false);

    // Advance Entry Form State
    const [advForm, setAdvForm] = useState({ date: today, amount: "", note: "" });
    const [advSubmitted, setAdvSubmitted] = useState(false);

    // Active nav tab
    const [tab, setTab] = useState("dashboard");

    // Fetch Real Profile & Data
    useEffect(() => {
        const fetchData = async () => {
            if (user?.id) {
                try {
                    const profileData = await labourerService.getLabourerByUserId(user.id);
                    let labourerId = null;

                    if (profileData) {
                        labourerId = profileData.id;
                        setLabourProfile(prev => ({
                            ...prev,
                            id: profileData.id || prev.id,
                            labourer_pk: profileData.id,
                            name: profileData.name || user.name || prev.name,
                            role: profileData.role || "Labour",
                        }));
                    }

                    if (labourerId && labourerId !== 'placeholder') {
                        const [ledgerData, workData] = await Promise.all([
                            ledgerService.getLedger(labourerId),
                            workService.getWorkEntries(labourerId)
                        ]);

                        setLedger(ledgerData || []);
                        setWorkHistory(workData || []);

                        const creds = (ledgerData || []).filter(l => l.transaction_type === 'CREDIT');
                        const debs = (ledgerData || []).filter(l => l.transaction_type === 'DEBIT');

                        const totalEarnings = creds.reduce((sum, item) => sum + Number(item.amount), 0);
                        const advanceTaken = debs.reduce((sum, item) => sum + Number(item.amount), 0);
                        const pendingPayment = totalEarnings - advanceTaken;

                        const currentMonth = new Date().getMonth();
                        const metersThisMonth = (workData || [])
                            .filter(w => new Date(w.date).getMonth() === currentMonth)
                            .reduce((sum, item) => sum + (Number(item.qty) || Number(item.meters) || 0), 0);

                        setFinancials({
                            workThisMonth: `${metersThisMonth} m`,
                            totalEarnings: `₹${totalEarnings.toLocaleString()}`,
                            advanceTaken: `₹${advanceTaken.toLocaleString()}`,
                            pendingPayment: `₹${pendingPayment.toLocaleString()}`
                        });
                    }
                } catch (error) {
                    console.error("Failed to load labour data", error);
                } finally {
                    setLoading(false);
                }
            }
        };
        fetchData();
    }, [user]);

    const handleLogout = async () => {
        try {
            await logout();
            navigate('/', { replace: true });
        } catch (error) {
            console.error("Logout failed", error);
        }
    };

    const handleWorkSubmit = (e) => {
        e.preventDefault();
        if (!workForm.type || !workForm.qty) return;
        setWorkSubmitted(true);
        setTimeout(() => { setWorkSubmitted(false); setWorkForm({ date: today, type: "", qty: "", photo: null }); }, 3000);
    };

    const handleAdvSubmit = async (e) => {
        e.preventDefault();
        if (!advForm.amount) return;
        const labourerId = labourProfile.labourer_pk;
        if (!labourerId) {
            toast({ title: "Error", description: "Could not identify labourer record. Please contact supervisor.", variant: "destructive" });
            return;
        }
        try {
            await notificationService.requestAdvance(labourerId, advForm.amount, advForm.note);
            setAdvSubmitted(true);
            setTimeout(() => { setAdvSubmitted(false); setAdvForm({ date: today, amount: "", note: "" }); }, 3000);
        } catch (error) {
            console.error("Advance Request Failed", error);
            toast({ title: "Request Failed", description: "Could not send advance request. " + error.message, variant: "destructive" });
        }
    };

    return (
        <div className="min-h-screen bg-background">
            {/* Sidebar */}
            <aside className="hidden lg:flex fixed top-0 left-0 h-full w-64 bg-white border-r border-border flex-col z-20">
                {/* Brand */}
                <div className="h-16 px-6 flex items-center gap-3 border-b border-border">
                    <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center">
                        <HardHat className="h-5 w-5 text-primary-foreground" />
                    </div>
                    <div>
                        <span className="font-bold text-base tracking-tight text-foreground">ShramFlow</span>
                        <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-widest leading-none mt-1">Labour Portal</p>
                    </div>
                </div>

                {/* Profile */}
                <div className="px-6 py-6 border-b border-border">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm">
                            {labourProfile.name.split(" ").map(w => w[0]).join("")}
                        </div>
                        <div className="min-w-0">
                            <p className="text-sm font-semibold text-foreground truncate">{labourProfile.name}</p>
                            <p className="text-xs text-emerald-600 font-medium">{labourProfile.role}</p>
                        </div>
                    </div>
                </div>

                {/* Nav */}
                <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
                    {[
                        { id: "dashboard", label: t("dashboard"), icon: LayoutDashboard },
                        { id: "work", label: t("addWorkEntry"), icon: ClipboardPlus },
                        { id: "advance", label: t("requestAdvance"), icon: CreditCard },
                        { id: "history", label: t("workHistory"), icon: History },
                        { id: "profile", label: t("myProfile"), icon: User },
                    ].map(item => (
                        <button
                            key={item.id}
                            onClick={() => setTab(item.id)}
                            className={cn(
                                "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all",
                                tab === item.id
                                    ? "bg-primary/10 text-primary"
                                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                            )}
                        >
                            <item.icon className="h-4 w-4" />
                            {item.label}
                        </button>
                    ))}
                </nav>

                {/* Logout */}
                <div className="p-4 border-t border-border">
                    <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium text-red-500 hover:bg-red-50 transition-colors"
                    >
                        <LogOut className="h-4 w-4" />
                        <span>{t("logout")}</span>
                    </button>
                </div>
            </aside>

            {/* Mobile Header */}
            <header className="lg:hidden fixed top-0 left-0 right-0 h-14 bg-white/80 backdrop-blur-md border-b border-border z-40 px-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                        <HardHat className="h-4 w-4 text-primary-foreground" />
                    </div>
                    <span className="font-bold text-sm">ShramFlow</span>
                </div>
                <div className="flex items-center gap-3">
                    <NotificationBell />
                    <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-[10px]">
                        {labourProfile.name.split(" ").map(w => w[0]).join("")}
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="lg:ml-64 pt-14 lg:pt-0 min-h-screen">
                <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-8">
                    {/* Header */}
                    <div>
                        <p className="text-xs font-bold text-emerald-600 uppercase tracking-widest">
                            {tab === "dashboard" ? "Overview" : tab}
                        </p>
                        <h1 className="text-2xl font-bold text-foreground tracking-tight mt-1">
                            {tab === "dashboard" && "Welcome back, " + labourProfile.name.split(" ")[0]}
                            {tab === "work" && t("addWorkEntry")}
                            {tab === "advance" && t("requestAdvance")}
                            {tab === "history" && "Transaction History"}
                            {tab === "profile" && "Your Profile"}
                        </h1>
                    </div>

                    {tab === "dashboard" && (
                        <div className="space-y-8">
                            {/* Summary Cards */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <div className="bg-white p-5 rounded-2xl border border-border shadow-sm">
                                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">{t("workThisMonth")}</p>
                                    <p className="text-xl font-bold text-foreground">{financials.workThisMonth}</p>
                                </div>
                                <div className="bg-white p-5 rounded-2xl border border-border shadow-sm">
                                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">{t("totalEarnings")}</p>
                                    <p className="text-xl font-bold text-foreground">{financials.totalEarnings}</p>
                                </div>
                                <div className="bg-white p-5 rounded-2xl border border-border shadow-sm">
                                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">{t("advanceTaken")}</p>
                                    <p className="text-xl font-bold text-foreground text-red-600">{financials.advanceTaken}</p>
                                </div>
                                <div className="bg-white p-5 rounded-2xl border border-border shadow-sm">
                                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">{t("pendingPayment")}</p>
                                    <p className="text-xl font-bold text-emerald-600">{financials.pendingPayment}</p>
                                </div>
                            </div>

                            <div className="grid md:grid-cols-3 gap-8">
                                <div className="md:col-span-2 space-y-6">
                                    <div className="bg-white rounded-2xl border border-border shadow-sm overflow-hidden">
                                        <div className="px-6 py-4 border-b border-border flex items-center justify-between">
                                            <h3 className="font-bold text-sm uppercase tracking-wider text-muted-foreground">{t("recentWorkEntries")}</h3>
                                            <button onClick={() => setTab("history")} className="text-xs font-bold text-primary hover:underline">View All</button>
                                        </div>
                                        <div className="overflow-x-auto">
                                            <table className="w-full text-sm">
                                                <thead className="bg-muted/50">
                                                    <tr>
                                                        <th className="text-left px-6 py-3 text-muted-foreground font-semibold">Date</th>
                                                        <th className="text-left px-6 py-3 text-muted-foreground font-semibold">Type</th>
                                                        <th className="text-left px-6 py-3 text-muted-foreground font-semibold">Quantity</th>
                                                        <th className="text-left px-6 py-3 text-muted-foreground font-semibold">Status</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-border/50">
                                                    {workHistory.length === 0 ? (
                                                        <tr><td colSpan="4" className="text-center py-8 text-muted-foreground">No work entries yet</td></tr>
                                                    ) : (
                                                        workHistory.slice(0, 5).map((row, i) => (
                                                            <tr key={i} className="hover:bg-muted/30 transition-colors">
                                                                <td className="px-6 py-3 text-muted-foreground">{row.date}</td>
                                                                <td className="px-6 py-3 font-medium">{row.task_type || row.type}</td>
                                                                <td className="px-6 py-3 font-semibold">{row.meters || row.qty || row.amount}m</td>
                                                                <td className="px-6 py-3">
                                                                    <Badge variant={row.status === 'Approved' ? 'success' : row.status === 'Pending' ? 'secondary' : 'destructive'} className="text-[10px] h-5">
                                                                        {row.status}
                                                                    </Badge>
                                                                </td>
                                                            </tr>
                                                        ))
                                                    )}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-6">
                                    <div className="bg-white p-6 rounded-2xl border border-border shadow-sm">
                                        <h3 className="font-bold text-sm mb-4 uppercase tracking-wider text-muted-foreground">{t("quickActions")}</h3>
                                        <div className="space-y-3">
                                            <button
                                                onClick={() => setTab("work")}
                                                className="w-full flex items-center justify-between p-4 rounded-xl border border-border hover:border-primary/50 hover:bg-primary/5 transition-all group"
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                                                        <Plus className="h-5 w-5" />
                                                    </div>
                                                    <div className="text-left">
                                                        <p className="text-sm font-bold text-foreground">{t("addWorkEntry")}</p>
                                                        <p className="text-[10px] text-muted-foreground font-medium">Log your progress</p>
                                                    </div>
                                                </div>
                                                <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary" />
                                            </button>
                                            <button
                                                onClick={() => setTab("advance")}
                                                className="w-full flex items-center justify-between p-4 rounded-xl border border-border hover:border-emerald-500/50 hover:bg-emerald-50/30 transition-all group"
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
                                                        <CreditCard className="h-5 w-5" />
                                                    </div>
                                                    <div className="text-left">
                                                        <p className="text-sm font-bold text-foreground">{t("requestAdvance")}</p>
                                                        <p className="text-[10px] text-muted-foreground font-medium">Financial support</p>
                                                    </div>
                                                </div>
                                                <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-emerald-600" />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Work Entry Form */}
                    {tab === "work" && (
                        <div className="bg-white rounded-2xl border border-border shadow-sm p-8 max-w-lg">
                            {workSubmitted ? (
                                <div className="text-center py-8">
                                    <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-4">
                                        <CheckCircle2 className="h-8 w-8" />
                                    </div>
                                    <h3 className="text-xl font-bold text-foreground mb-2">Entry Submitted!</h3>
                                    <p className="text-sm text-muted-foreground">Your work entry is now pending supervisor approval.</p>
                                </div>
                            ) : (
                                <form onSubmit={handleWorkSubmit} className="space-y-6">
                                    <div className="grid gap-2">
                                        <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Date</label>
                                        <input
                                            type="date"
                                            value={workForm.date}
                                            disabled
                                            className="w-full bg-muted/50 border border-border rounded-xl px-4 py-3 text-sm text-muted-foreground cursor-not-allowed"
                                        />
                                    </div>
                                    <div className="grid gap-2">
                                        <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Work Type *</label>
                                        <select
                                            value={workForm.type}
                                            onChange={e => setWorkForm({ ...workForm, type: e.target.value })}
                                            className="w-full bg-white border border-border rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20"
                                            required
                                        >
                                            <option value="">Select work type...</option>
                                            {LABOUR_WORK_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                                        </select>
                                    </div>
                                    <div className="grid gap-2">
                                        <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Quantity (meters) *</label>
                                        <input
                                            type="number"
                                            placeholder="e.g. 10"
                                            value={workForm.qty}
                                            onChange={e => setWorkForm({ ...workForm, qty: e.target.value })}
                                            className="w-full bg-white border border-border rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20"
                                            required
                                        />
                                    </div>
                                    <Button type="submit" className="w-full h-12 rounded-xl font-bold">
                                        Submit Entry
                                    </Button>
                                </form>
                            )}
                        </div>
                    )}

                    {/* Advance Request Form */}
                    {tab === "advance" && (
                        <div className="bg-white rounded-2xl border border-border shadow-sm p-8 max-w-lg">
                            {advSubmitted ? (
                                <div className="text-center py-8">
                                    <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-4">
                                        <CheckCircle2 className="h-8 w-8" />
                                    </div>
                                    <h3 className="text-xl font-bold text-foreground mb-2">Request Sent!</h3>
                                    <p className="text-sm text-muted-foreground">Your advance request has been notified to the supervisor.</p>
                                </div>
                            ) : (
                                <form onSubmit={handleAdvSubmit} className="space-y-6">
                                    <div className="grid gap-2">
                                        <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Amount (₹) *</label>
                                        <input
                                            type="number"
                                            placeholder="e.g. 500"
                                            value={advForm.amount}
                                            onChange={e => setAdvForm({ ...advForm, amount: e.target.value })}
                                            className="w-full bg-white border border-border rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20"
                                            required
                                        />
                                    </div>
                                    <div className="grid gap-2">
                                        <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Note (optional)</label>
                                        <textarea
                                            placeholder="Reason for advance..."
                                            value={advForm.note}
                                            onChange={e => setAdvForm({ ...advForm, note: e.target.value })}
                                            rows={3}
                                            className="w-full bg-white border border-border rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 resize-none"
                                        />
                                    </div>
                                    <Button type="submit" className="w-full h-12 rounded-xl font-bold bg-emerald-600 hover:bg-emerald-700">
                                        Request Advance
                                    </Button>
                                </form>
                            )}
                        </div>
                    )}

                    {/* History */}
                    {tab === "history" && (
                        <div className="bg-white rounded-2xl border border-border shadow-sm overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead className="bg-muted/50">
                                        <tr>
                                            <th className="text-left px-6 py-4 text-muted-foreground font-semibold">Date</th>
                                            <th className="text-left px-6 py-4 text-muted-foreground font-semibold">Description</th>
                                            <th className="text-left px-6 py-4 text-muted-foreground font-semibold">Type</th>
                                            <th className="text-left px-6 py-4 text-muted-foreground font-semibold">Amount</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border/50">
                                        {ledger.length === 0 ? (
                                            <tr><td colSpan="4" className="text-center py-8 text-muted-foreground">No transactions found</td></tr>
                                        ) : (
                                            ledger.map((row, i) => (
                                                <tr key={i} className="hover:bg-muted/30 transition-colors">
                                                    <td className="px-6 py-4 text-muted-foreground">{new Date(row.created_at).toLocaleDateString()}</td>
                                                    <td className="px-6 py-4 font-medium">{row.description}</td>
                                                    <td className="px-6 py-4">
                                                        <Badge variant={row.transaction_type === 'CREDIT' ? 'success' : 'destructive'} className="text-[10px]">
                                                            {row.transaction_type}
                                                        </Badge>
                                                    </td>
                                                    <td className={cn(
                                                        "px-6 py-4 font-bold text-base",
                                                        row.transaction_type === 'CREDIT' ? "text-emerald-600" : "text-red-600"
                                                    )}>
                                                        {row.transaction_type === 'CREDIT' ? '+' : '-'} ₹{Number(row.amount).toLocaleString()}
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* Profile */}
                    {tab === "profile" && (
                        <div className="bg-white rounded-2xl border border-border shadow-sm p-8 max-w-md">
                            <div className="flex flex-col items-center text-center mb-8">
                                <div className="w-20 h-20 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-3xl mb-4">
                                    {labourProfile.name.split(" ").map(w => w[0]).join("")}
                                </div>
                                <h3 className="text-2xl font-bold text-foreground">{labourProfile.name}</h3>
                                <p className="text-emerald-600 font-medium">{labourProfile.role}</p>
                            </div>

                            <div className="space-y-4">
                                {[
                                    { label: "Labour ID", value: labourProfile.id },
                                    { label: "Assigned Site", value: labourProfile.site },
                                    { label: "Supervisor", value: labourProfile.supervisor },
                                ].map((field, i) => (
                                    <div key={i}>
                                        <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block mb-1">{field.label}</label>
                                        <div className="bg-muted/30 border border-border rounded-xl px-4 py-3 text-sm font-medium">
                                            {field.value}
                                        </div>
                                    </div>
                                ))}
                            </div>
                            
                            <div className="mt-8 p-4 bg-emerald-50 rounded-xl border border-emerald-100 flex gap-3 items-start">
                                <ShieldAlert className="h-4 w-4 text-emerald-600 mt-0.5" />
                                <p className="text-xs text-emerald-700 leading-relaxed">
                                    Profile information is verified and can only be updated by your supervisor for security reasons.
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            </main>

            {/* Mobile Bottom Nav */}
            <nav className="lg:hidden fixed bottom-0 left-0 right-0 h-16 bg-white border-t border-border flex items-center justify-around px-2 z-50 shadow-lg">
                {[
                    { id: "dashboard", icon: LayoutDashboard, label: "Home" },
                    { id: "work", icon: ClipboardPlus, label: "Work" },
                    { id: "advance", icon: CreditCard, label: "Cash" },
                    { id: "history", icon: History, label: "Log" },
                    { id: "profile", icon: User, label: "Me" },
                ].map(item => (
                    <button
                        key={item.id}
                        onClick={() => setTab(item.id)}
                        className={cn(
                            "flex flex-col items-center justify-center gap-1 w-14",
                            tab === item.id ? "text-primary" : "text-muted-foreground"
                        )}
                    >
                        <item.icon className="h-5 w-5" />
                        <span className="text-[9px] font-bold uppercase tracking-tighter">{item.label}</span>
                        {tab === item.id && <div className="w-1 h-1 rounded-full bg-primary" />}
                    </button>
                ))}
            </nav>
        </div>
    );
}

