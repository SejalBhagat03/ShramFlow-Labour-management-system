import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import { labourerService } from "@/services/labourerService";
import { notificationService } from "@/services/notificationService";
import { ledgerService } from "@/services/ledgerService";
import { workService } from "@/services/workService";
import { useNavigate } from "react-router-dom";
import { NotificationBell } from "@/components/NotificationBell";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { useToast } from "@/hooks/use-toast";
import { LogOut } from "lucide-react";
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

// ─── Section Header ───────────────────────────────────────────────────────────
function SectionHeader({ title }) {
    return (
        <h2 className="text-lg font-bold text-gray-700 mb-3 mt-6 flex items-center gap-2">
            <span className="w-1 h-5 bg-emerald-500 rounded-full inline-block"></span>
            {title}
        </h2>
    );
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────
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
                    // 1. Profile
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

                    // 2. Ledger & Work History (only if we have a valid labourer ID)
                    if (labourerId && labourerId !== 'placeholder') {
                        const [ledgerData, workData] = await Promise.all([
                            ledgerService.getLedger(labourerId),
                            workService.getWorkEntries(labourerId)
                        ]);

                        setLedger(ledgerData || []);
                        setWorkHistory(workData || []);

                        // Calculate Financials
                        const creds = (ledgerData || []).filter(l => l.transaction_type === 'CREDIT');
                        const debs = (ledgerData || []).filter(l => l.transaction_type === 'DEBIT');

                        const totalEarnings = creds.reduce((sum, item) => sum + Number(item.amount), 0);
                        const advanceTaken = debs.reduce((sum, item) => sum + Number(item.amount), 0);
                        const pendingPayment = totalEarnings - advanceTaken;

                        // Simple "Work This Month" calculation
                        const currentMonth = new Date().getMonth();
                        // For "Work This Month" in meters, we need workData
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
        // TODO: Wire up to workService
        setTimeout(() => { setWorkSubmitted(false); setWorkForm({ date: today, type: "", qty: "", photo: null }); }, 3000);
    };

    const handleAdvSubmit = async (e) => {
        e.preventDefault();
        if (!advForm.amount) return;

        // Check if we have a valid labourer PK (UUID) to link the request
        // If we only have the display ID (e.g. LBR-...), we might fallback or fail gracefully
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
        <div className="min-h-screen bg-background font-sans">
            {/* ── Sidebar (desktop) ── */}
            <aside className="hidden md:flex fixed top-0 left-0 h-full w-72 bg-white border-r border-gray-100 flex-col z-20 shadow-sm">
                {/* Brand */}
                <div className="flex items-center gap-3 px-5 py-5 border-b border-gray-100">
                    <div className="w-9 h-9 rounded-xl bg-emerald-500 flex items-center justify-center text-white font-bold text-lg">S</div>
                    <div>
                        <div className="font-bold text-gray-800 text-sm leading-tight">ShramFlow</div>
                        <div className="text-xs text-gray-400">Labour Management</div>
                    </div>
                </div>

                {/* User */}
                <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100">
                    <div className="w-9 h-9 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-700 font-bold text-sm">
                        {labourProfile.name.split(" ").map(w => w[0]).join("")}
                    </div>
                    <div>
                        <div className="font-semibold text-gray-800 text-sm leading-tight">{labourProfile.name}</div>
                        <div className="text-xs text-emerald-500 flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block"></span>
                            {labourProfile.role}
                        </div>
                    </div>
                </div>

                {/* Nav */}
                <nav className="flex-1 px-3 py-4 space-y-1">
                    {[
                        { id: "dashboard", label: t("dashboard"), icon: "⊞" },
                        { id: "work", label: t("addWorkEntry"), icon: "✏" },
                        { id: "advance", label: t("requestAdvance"), icon: "💳" },
                        { id: "history", label: t("workHistory"), icon: "📋" },
                        { id: "payments", label: t("paymentHistory"), icon: "💰" },
                        { id: "profile", label: t("myProfile"), icon: "👤" },
                    ].map(item => (
                        <button
                            key={item.id}
                            onClick={() => setTab(item.id)}
                            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${tab === item.id
                                ? "bg-emerald-50 text-emerald-700 font-semibold"
                                : "text-gray-500 hover:bg-gray-50 hover:text-gray-700"
                                }`}
                        >
                            <span className="text-base w-5 text-center">{item.icon}</span>
                            {item.label}
                            {tab === item.id && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-emerald-500"></span>}
                        </button>
                    ))}
                </nav>

                <div className="px-5 py-4 border-t border-gray-100">
                    <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium text-red-500 hover:bg-red-50 hover:text-red-600 transition-colors"
                    >
                        <LogOut className="h-4.5 w-4.5" strokeWidth={2} />
                        <span>{t("logout")}</span>
                    </button>
                </div>
            </aside>

            {/* ── Mobile Header ── */}
            <header className="md:hidden fixed top-0 left-0 right-0 z-20 bg-white border-b border-gray-100 px-4 py-3 flex items-center justify-between shadow-sm">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center text-white font-bold text-sm">S</div>
                    <span className="font-bold text-gray-800 text-sm">ShramFlow</span>
                </div>
                <div className="flex items-center gap-3">
                    <NotificationBell />
                    <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-700 font-bold text-xs">
                        {labourProfile.name.split(" ").map(w => w[0]).join("")}
                    </div>
                </div>
            </header>

            {/* ── Main Content ── */}
            <main className="md:ml-72 pt-16 md:pt-0 pb-24 md:pb-0 min-h-screen">
                <div className="max-w-7xl mx-auto px-4 md:px-8 py-6">

                    {/* Page Title */}
                    <div className="mb-6 flex items-center justify-between">
                        <div>
                            <div className="flex items-center gap-2 text-xs text-emerald-500 font-medium mb-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block animate-pulse"></span>
                                Live Dashboard
                            </div>
                            <h1 className="text-3xl font-bold text-gray-800">
                                {tab === "dashboard" && t("dashboard")}
                                {tab === "work" && t("addWorkEntry")}
                                {tab === "advance" && t("requestAdvance")}
                                {tab === "history" && t("workHistory")}
                                {tab === "payments" && t("paymentHistory")}
                                {tab === "profile" && t("myProfile")}
                            </h1>
                            <p className="text-gray-400 text-sm mt-1">Welcome back, {labourProfile.name.split(" ")[0]}! Here's your work overview.</p>
                        </div>
                        {/* Desktop Bell */}
                        <div className="hidden md:block">
                            <NotificationBell />
                        </div>
                    </div>



                    {/* ── DASHBOARD TAB ── */}
                    {tab === "dashboard" && (
                        <>
                            {/* Summary Cards */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-2">
                                <SummaryCard label={t("workThisMonth")} value={financials.workThisMonth} icon="🏗" bg="bg-white" iconBg="bg-emerald-50 text-emerald-600" />
                                <SummaryCard label={t("totalEarnings")} value={financials.totalEarnings} icon="💵" bg="bg-emerald-50" iconBg="bg-emerald-100 text-emerald-600" />
                                <SummaryCard label={t("advanceTaken")} value={financials.advanceTaken} icon="⏩" bg="bg-amber-50" iconBg="bg-amber-100 text-amber-600" />
                                <SummaryCard label={t("pendingPayment")} value={financials.pendingPayment} icon="⏳" bg="bg-white" iconBg="bg-blue-50 text-blue-500" />
                            </div>

                            {/* Fraud Transparency Notice */}
                            <div className="mt-4 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-700 flex gap-2 items-start">
                                <span className="text-lg">⚠️</span>
                                <span>Final payment is calculated based on supervisor approval. Your submitted entries may be adjusted after verification.</span>
                            </div>

                            {/* Recent Work Entries */}
                            <SectionHeader title={t("recentWorkEntries")} />
                            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="bg-gray-50 border-b border-gray-100">
                                            <th className="text-left px-4 py-3 text-gray-500 font-semibold">{t("date")}</th>
                                            <th className="text-left px-4 py-3 text-gray-500 font-semibold">{t("type")}</th>
                                            <th className="text-left px-4 py-3 text-gray-500 font-semibold hidden sm:table-cell">{t("qty")}</th>
                                            <th className="text-left px-4 py-3 text-gray-500 font-semibold">{t("status")}</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {workHistory.length === 0 ? (
                                            <tr><td colSpan="4" className="text-center py-4 text-gray-400">No work entries yet</td></tr>
                                        ) : (
                                            workHistory.slice(0, 3).map((row, i) => (
                                                <tr key={i} className="border-b border-gray-50 last:border-0 hover:bg-gray-50 transition-colors">
                                                    <td className="px-4 py-3 text-gray-600">{row.date}</td>
                                                    <td className="px-4 py-3 text-gray-700 font-medium">{row.task_type || row.type}</td>
                                                    <td className="px-4 py-3 text-gray-600 hidden sm:table-cell">{row.meters || row.qty || row.amount}</td>
                                                    <td className="px-4 py-3"><StatusBadge status={row.status} /></td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>

                            {/* Quick Actions */}
                            <SectionHeader title={t("quickActions")} />
                            <div className="grid grid-cols-2 gap-4">
                                <button
                                    onClick={() => setTab("work")}
                                    className="bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl px-5 py-5 text-left transition-colors shadow-sm"
                                >
                                    <div className="text-2xl mb-2">✏️</div>
                                    <div className="font-semibold text-sm">{t("addWorkEntry")}</div>
                                    <div className="text-xs text-emerald-100 mt-0.5">Log today's work</div>
                                </button>
                                <button
                                    onClick={() => setTab("advance")}
                                    className="bg-white hover:bg-gray-50 border border-gray-200 text-gray-700 rounded-2xl px-5 py-5 text-left transition-colors shadow-sm"
                                >
                                    <div className="text-2xl mb-2">💳</div>
                                    <div className="font-semibold text-sm">{t("requestAdvance")}</div>
                                    <div className="text-xs text-gray-400 mt-0.5">Submit advance request</div>
                                </button>
                            </div>
                        </>
                    )}

                    {/* ── ADD WORK ENTRY TAB ── */}
                    {tab === "work" && (
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 max-w-lg">
                            {workSubmitted ? (
                                <div className="text-center py-8">
                                    <div className="text-5xl mb-3">✅</div>
                                    <h3 className="text-lg font-bold text-gray-800 mb-1">Entry Submitted!</h3>
                                    <p className="text-sm text-gray-500">Your work entry is now</p>
                                    <StatusBadge status="Pending" />
                                    <p className="text-xs text-gray-400 mt-3">Supervisor will verify soon.</p>
                                </div>
                            ) : (
                                <form onSubmit={handleWorkSubmit} className="space-y-4">
                                    {/* Date */}
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-1">{t("date")}</label>
                                        <input
                                            type="date"
                                            value={workForm.date}
                                            disabled
                                            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm bg-gray-50 text-gray-400 cursor-not-allowed"
                                        />
                                    </div>

                                    {/* Work Type */}
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-1">Work Type <span className="text-red-400">*</span></label>
                                        <select
                                            value={workForm.type}
                                            onChange={e => setWorkForm({ ...workForm, type: e.target.value })}
                                            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-400"
                                            required
                                        >

                                            <option value="">Select work type...</option>
                                            {LABOUR_WORK_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                                        </select>
                                    </div>

                                    {/* Quantity */}
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-1">Quantity (meters / hours) <span className="text-red-400">*</span></label>
                                        <input
                                            type="number"
                                            min="0"
                                            placeholder="e.g. 10"
                                            value={workForm.qty}
                                            onChange={e => setWorkForm({ ...workForm, qty: e.target.value })}
                                            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
                                            required
                                        />
                                    </div>

                                    {/* Photo Upload */}
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-1">Photo (optional)</label>
                                        <label className="flex items-center gap-3 border border-dashed border-gray-300 rounded-xl px-4 py-3 cursor-pointer hover:border-emerald-400 transition-colors">
                                            <span className="text-xl">📷</span>
                                            <span className="text-sm text-gray-400">{workForm.photo ? workForm.photo.name : "Tap to upload photo"}</span>
                                            <input
                                                type="file"
                                                accept="image/*"
                                                className="hidden"
                                                onChange={e => setWorkForm({ ...workForm, photo: e.target.files[0] })}
                                            />
                                        </label>
                                    </div>

                                    {/* GPS indicator */}
                                    <div className="flex items-center gap-2 bg-blue-50 border border-blue-100 rounded-xl px-4 py-3">
                                        <span className="text-lg">📍</span>
                                        <div>
                                            <div className="text-xs font-semibold text-blue-700">Location</div>
                                            <div className="text-xs text-blue-500">{labourProfile.site} (auto-detected)</div>
                                        </div>
                                    </div>

                                    <button
                                        type="submit"
                                        className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-semibold rounded-xl py-3 transition-colors text-sm mt-2"
                                    >
                                        {t("submitWorkEntry")}
                                    </button>
                                </form>
                            )}
                        </div>
                    )}

                    {/* ── ADD ADVANCE TAB ── */}
                    {tab === "advance" && (
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 max-w-lg">
                            {advSubmitted ? (
                                <div className="text-center py-8">
                                    <div className="text-5xl mb-3">✅</div>
                                    <h3 className="text-lg font-bold text-gray-800 mb-1">Advance Request Sent!</h3>
                                    <StatusBadge status="Pending" />
                                    <p className="text-xs text-gray-400 mt-3">Supervisor will review your request.</p>
                                </div>
                            ) : (
                                <form onSubmit={handleAdvSubmit} className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-1">Date</label>
                                        <input
                                            type="date"
                                            value={advForm.date}
                                            onChange={e => setAdvForm({ ...advForm, date: e.target.value })}
                                            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-1">Amount (₹) <span className="text-red-400">*</span></label>
                                        <input
                                            type="number"
                                            min="1"
                                            placeholder="e.g. 500"
                                            value={advForm.amount}
                                            onChange={e => setAdvForm({ ...advForm, amount: e.target.value })}
                                            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
                                            required
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-1">Note (optional)</label>
                                        <textarea
                                            placeholder="Reason for advance..."
                                            value={advForm.note}
                                            onChange={e => setAdvForm({ ...advForm, note: e.target.value })}
                                            rows={3}
                                            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 resize-none"
                                        />
                                    </div>

                                    <button
                                        type="submit"
                                        className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-semibold rounded-xl py-3 transition-colors text-sm"
                                    >
                                        {t("requestAdvance")}
                                    </button>
                                </form>
                            )}
                        </div>
                    )}

                    {/* ── WORK HISTORY TAB ── */}
                    {tab === "history" && (
                        <>
                            <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-700 flex gap-2 items-start mb-4">
                                <span>📒</span>
                                <span>This is your complete financial ledger. Green is earnings (work), Red is deductions (payments/advances).</span>
                            </div>
                            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-x-auto">
                                <table className="w-full text-sm min-w-[500px]">
                                    <thead>
                                        <tr className="bg-gray-50 border-b border-gray-100">
                                            <th className="text-left px-4 py-3 text-gray-500 font-semibold">{t("date")}</th>
                                            <th className="text-left px-4 py-3 text-gray-500 font-semibold">{t("description")}</th>
                                            <th className="text-left px-4 py-3 text-gray-500 font-semibold">{t("type")}</th>
                                            <th className="text-left px-4 py-3 text-gray-500 font-semibold">{t("amount")}</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {ledger.length === 0 ? (
                                            <tr><td colSpan="4" className="text-center py-4 text-gray-400">No transactions found</td></tr>
                                        ) : (
                                            ledger.map((row, i) => (
                                                <tr key={i} className="border-b border-gray-50 last:border-0 hover:bg-gray-50">
                                                    <td className="px-4 py-3 text-gray-600">{new Date(row.created_at).toLocaleDateString()}</td>
                                                    <td className="px-4 py-3 text-gray-700 font-medium">{row.description}</td>
                                                    <td className="px-4 py-3">
                                                        <span className={`px-2 py-0.5 rounded text-xs font-bold ${row.transaction_type === 'CREDIT' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                                            {row.transaction_type}
                                                        </span>
                                                    </td>
                                                    <td className={`px-4 py-3 font-bold ${row.transaction_type === 'CREDIT' ? 'text-green-600' : 'text-red-600'}`}>
                                                        {row.transaction_type === 'CREDIT' ? '+' : '-'} ₹{Number(row.amount).toLocaleString()}
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </>
                    )}

                    {/* ── PAYMENT HISTORY TAB ── */}
                    {tab === "payments" && (
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-x-auto">
                            <table className="w-full text-sm min-w-[550px]">
                                <thead>
                                    <tr className="bg-gray-50 border-b border-gray-100">
                                        <th className="text-left px-4 py-3 text-gray-500 font-semibold">{t("date")}</th>
                                        <th className="text-left px-4 py-3 text-gray-500 font-semibold">{t("workAmt")}</th>
                                        <th className="text-left px-4 py-3 text-gray-500 font-semibold">{t("advance")}</th>
                                        <th className="text-left px-4 py-3 text-gray-500 font-semibold">{t("paid")}</th>
                                        <th className="text-left px-4 py-3 text-gray-500 font-semibold">{t("balance")}</th>
                                        <th className="text-left px-4 py-3 text-gray-500 font-semibold">{t("status")}</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {ledger.filter(l => l.transaction_type === 'DEBIT').length === 0 ? (
                                        <tr><td colSpan="6" className="text-center py-4 text-gray-400">No payment history found</td></tr>
                                    ) : (
                                        ledger.filter(l => l.transaction_type === 'DEBIT').map((row, i) => (
                                            <tr key={i} className="border-b border-gray-50 last:border-0 hover:bg-gray-50">
                                                <td className="px-4 py-3 text-gray-600">{new Date(row.created_at).toLocaleDateString()}</td>
                                                <td className="px-4 py-3 text-gray-700 font-medium">₹{Number(row.amount).toLocaleString()}</td>
                                                <td className="px-4 py-3 text-amber-600">₹0</td>
                                                <td className="px-4 py-3 text-emerald-600 font-medium">₹{Number(row.amount).toLocaleString()}</td>
                                                <td className="px-4 py-3 text-gray-600">₹0</td>
                                                <td className="px-4 py-3"><StatusBadge status="Paid" /></td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {/* ── PROFILE TAB ── */}
                    {tab === "profile" && (
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 max-w-md">
                            {/* Avatar */}
                            <div className="flex items-center gap-4 mb-6 pb-6 border-b border-gray-100">
                                <div className="w-16 h-16 rounded-2xl bg-emerald-100 flex items-center justify-center text-emerald-700 font-bold text-2xl">
                                    {labourProfile.name.split(" ").map(w => w[0]).join("")}
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold text-gray-800">{labourProfile.name}</h3>
                                    <p className="text-sm text-emerald-500 font-medium">{labourProfile.role}</p>
                                </div>
                            </div>

                            {/* Profile Fields (read-only) */}
                            {[
                                { label: "Labour ID", value: labourProfile.id },
                                { label: "Work Role", value: labourProfile.role },
                                { label: "Assigned Site", value: labourProfile.site },
                                { label: "Supervisor", value: labourProfile.supervisor },
                            ].map((field, i) => (
                                <div key={i} className="mb-4">
                                    <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">{field.label}</label>
                                    <div className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-700 font-medium">
                                        {field.value}
                                    </div>
                                </div>
                            ))}

                            <div className="mt-4 bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 text-xs text-blue-600">
                                🔒 {t("profileReadOnly")}
                            </div>

                            <button
                                onClick={handleLogout}
                                className="md:hidden w-full mt-6 bg-red-50 text-red-600 font-semibold rounded-xl py-3 text-sm flex items-center justify-center gap-2 hover:bg-red-100 transition-colors"
                            >
                                <LogOut className="h-4.5 w-4.5" strokeWidth={2} />
                                <span>{t("logout")}</span>
                            </button>
                        </div>
                    )}
                </div>
            </main>

            {/* ── Mobile Bottom Nav ── */}
            <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 flex z-20 shadow-[0_-2px_12px_rgba(0,0,0,0.06)]">
                {[
                    { id: "dashboard", icon: "⊞", label: t("home") },
                    { id: "work", icon: "✏", label: t("work") },
                    { id: "advance", icon: "💳", label: t("advance") },
                    { id: "history", icon: "📋", label: t("history") },
                    { id: "profile", icon: "👤", label: t("profile") },
                ].map(item => (
                    <button
                        key={item.id}
                        onClick={() => setTab(item.id)}
                        className={`flex-1 flex flex-col items-center gap-0.5 py-3 text-xs font-medium transition-colors ${tab === item.id ? "text-emerald-600" : "text-gray-400"
                            }`}
                    >
                        <span className="text-lg leading-none">{item.icon}</span>
                        <span>{item.label}</span>
                        {tab === item.id && <span className="w-1 h-1 rounded-full bg-emerald-500 mt-0.5"></span>}
                    </button>
                ))}
            </nav>
        </div>
    );
}
