import { useState } from "react";
import { useTranslation } from "react-i18next";
import { AppLayout } from "@/layouts/AppLayout";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Download, Calendar, TrendingUp, Users, Ruler, Loader2 } from "lucide-react";
import { useDashboardStats } from "@/features/admin/hooks/useDashboardStats";
import { format } from "date-fns";
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    LineChart,
    Line,
    PieChart,
    Pie,
    Cell,
} from "recharts";

/**
 * Reports page component providing analytics and productivity insights.
 * Displays charts for productivity, earnings trends, task distribution, and top performers.
 *
 * @returns {JSX.Element} The Reports page component.
 */
const Reports = () => {
    const { t } = useTranslation();
    const [dateRange, setDateRange] = useState("week");

    const { stats, isLoading } = useDashboardStats(dateRange);

    // Use data from stats or empty defaults
    const productivityData = stats.productivityData || [];
    const topPerformers = stats.topPerformers || [];
    const taskDistribution = stats.taskDistribution || [];

    // Calculate totals from productivity data if hook doesn't provide them directly
    const totalMeters = productivityData.reduce((sum, d) => sum + d.meters, 0);
    const totalHours = productivityData.reduce((sum, d) => sum + d.hours, 0);
    const totalAmount = productivityData.reduce((sum, d) => sum + d.amount, 0);

    if (isLoading) {
        return (
            <AppLayout>
                <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
                    <Loader2 className="h-10 w-10 animate-spin text-primary" />
                    <p className="text-muted-foreground animate-pulse">Gathering analytics...</p>
                </div>
            </AppLayout>
        );
    }

    return (
        <AppLayout>
            <div className="space-y-8 animate-fade-in pb-12">
                {/* 🎯 Premium Header */}
                <div className="premium-header relative">
                    <div>
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 text-indigo-700 text-[10px] font-black uppercase tracking-widest mb-3 border border-indigo-200/50 backdrop-blur-md">
                            <TrendingUp className="h-3 w-3" />
                            Business Intelligence
                        </div>
                        <h1 className="text-4xl font-black text-slate-900 tracking-tight leading-none">
                            System <span className="text-indigo-600">Analytics</span>
                        </h1>
                        <p className="text-slate-500 font-medium mt-3 flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-indigo-500" />
                            Performance and productivity insights for your active projects.
                        </p>
                    </div>
                    <div className="flex items-center gap-2 lg:gap-3">
                        <Select value={dateRange} onValueChange={setDateRange}>
                            <SelectTrigger className="w-32 lg:w-40 h-11 rounded-2xl bg-white border border-slate-200 shadow-sm text-[10px] font-black uppercase tracking-widest">
                                <div className="flex items-center gap-2">
                                    <Calendar className="h-3.5 w-3.5 text-indigo-600" />
                                    <SelectValue />
                                </div>
                            </SelectTrigger>
                            <SelectContent className="rounded-2xl shadow-xl border-slate-100">
                                <SelectItem value="week">This Week</SelectItem>
                                <SelectItem value="month">This Month</SelectItem>
                                <SelectItem value="quarter">This Quarter</SelectItem>
                                <SelectItem value="all">All Time</SelectItem>
                            </SelectContent>
                        </Select>
                        <Button variant="outline" className="h-11 px-4 lg:px-6 rounded-2xl border-slate-200 hover:bg-slate-50 font-black text-[10px] uppercase tracking-widest shadow-sm active:scale-95 transition-all">
                            <Download className="h-4 w-4 lg:mr-2 text-indigo-600" />
                            <span className="hidden lg:inline">{t("exportCSV")}</span>
                        </Button>
                    </div>
                </div>

                {/* Summary Cards */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 animate-slide-up">
                    <div className="glass-strong p-5 rounded-[2rem] shadow-soft border border-white/50">
                        <div className="flex items-center gap-2 text-slate-400 mb-3">
                            <Ruler className="h-4 w-4 text-emerald-500" />
                            <span className="text-[10px] font-black uppercase tracking-widest">Total Meters</span>
                        </div>
                        <p className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">{totalMeters}m</p>
                    </div>
                    <div className="glass-strong p-5 rounded-[2rem] shadow-soft border border-white/50">
                        <div className="flex items-center gap-2 text-slate-400 mb-3">
                            <TrendingUp className="h-4 w-4 text-amber-500" />
                            <span className="text-[10px] font-black uppercase tracking-widest">Total Hours</span>
                        </div>
                        <p className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">{totalHours}h</p>
                    </div>
                    <div className="glass-strong p-5 rounded-[2rem] shadow-soft border border-white/50">
                        <div className="flex items-center gap-2 text-slate-400 mb-3">
                            <Users className="h-4 w-4 text-blue-500" />
                            <span className="text-[10px] font-black uppercase tracking-widest">Labourers</span>
                        </div>
                        <p className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">{stats.activeLabourers}</p>
                    </div>
                    <div className="glass-strong p-5 rounded-[2rem] shadow-soft border border-white/50">
                        <div className="flex items-center gap-2 text-slate-400 mb-3">
                            <span className="text-emerald-500 font-black">₹</span>
                            <span className="text-[10px] font-black uppercase tracking-widest">Earnings</span>
                        </div>
                        <p className="text-2xl md:text-3xl font-black text-emerald-600 tracking-tight">₹{totalAmount.toLocaleString()}</p>
                    </div>
                </div>

                    {/* Charts Grid */}
                    <div className="grid lg:grid-cols-2 gap-6">
                        {/* Productivity Chart */}
                        <div className="bg-card rounded-xl border p-4 shadow-card">
                            <h3 className="font-semibold mb-4">Weekly Productivity</h3>
                            <div className="h-64">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={productivityData}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                                        <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                                        <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                                        <Tooltip
                                            contentStyle={{
                                                backgroundColor: "hsl(var(--card))",
                                                border: "1px solid hsl(var(--border))",
                                                borderRadius: "8px",
                                            }}
                                        />
                                        <Bar dataKey="meters" fill="hsl(173, 80%, 26%)" radius={[4, 4, 0, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* Earnings Trend */}
                        <div className="bg-card rounded-xl border p-4 shadow-card">
                            <h3 className="font-semibold mb-4">Earnings Trend</h3>
                            <div className="h-64">
                                <ResponsiveContainer width="100%" height="100%">
                                    <LineChart data={productivityData}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                                        <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                                        <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                                        <Tooltip
                                            contentStyle={{
                                                backgroundColor: "hsl(var(--card))",
                                                border: "1px solid hsl(var(--border))",
                                                borderRadius: "8px",
                                            }}
                                            formatter={(value) => [`₹${value.toLocaleString()}`, "Amount"]}
                                        />
                                        <Line
                                            type="monotone"
                                            dataKey="amount"
                                            stroke="hsl(142, 71%, 45%)"
                                            strokeWidth={2}
                                            dot={{ fill: "hsl(142, 71%, 45%)" }}
                                        />
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* Task Distribution */}
                        <div className="bg-card rounded-xl border p-4 shadow-card">
                            <h3 className="font-semibold mb-4">Task Distribution</h3>
                            <div className="h-64 flex items-center justify-center">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={taskDistribution}
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={60}
                                            outerRadius={80}
                                            paddingAngle={5}
                                            dataKey="value"
                                        >
                                            {taskDistribution.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={entry.color} />
                                            ))}
                                        </Pie>
                                        <Tooltip
                                            contentStyle={{
                                                backgroundColor: "hsl(var(--card))",
                                                border: "1px solid hsl(var(--border))",
                                                borderRadius: "8px",
                                            }}
                                        />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                            <div className="flex flex-wrap justify-center gap-3 mt-2">
                                {taskDistribution.map((task) => (
                                    <div key={task.name} className="flex items-center gap-2 text-xs">
                                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: task.color }} />
                                        <span className="text-muted-foreground">{task.name}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Top Performers */}
                        <div className="bg-card rounded-xl border p-4 shadow-card">
                            <h3 className="font-semibold mb-4">{t("topPerformers")}</h3>
                            <div className="space-y-3">
                                {topPerformers.map((performer, index) => (
                                    <div
                                        key={performer.name}
                                        className="flex items-center gap-3 p-2 rounded-lg hover:bg-accent/50 transition-colors"
                                    >
                                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">
                                            {index + 1}
                                        </div>
                                        <div className="flex-1">
                                            <p className="font-medium text-foreground">{performer.name}</p>
                                            <p className="text-xs text-muted-foreground">{performer.meters}m completed</p>
                                        </div>
                                        <p className="font-semibold text-success">₹{performer.amount.toLocaleString()}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                </div>
            </div>
        </AppLayout>
    );
};

export default Reports;
