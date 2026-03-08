import { useState } from "react";
import { useTranslation } from "react-i18next";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Download, Calendar, TrendingUp, Users, Ruler, Loader2 } from "lucide-react";
import { useDashboardStats } from "@/hooks/useDashboardStats";
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

    const { stats, isLoading } = useDashboardStats();

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
            <div className="space-y-6">
                {/* Immersive Page Header */}
                <div className="relative -mx-4 lg:-mx-8 -mt-4 lg:-mt-8 px-4 lg:px-8 pt-8 pb-10 gradient-hero rounded-b-[3rem] shadow-sm border-b border-white/10">
                    <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
                        <div>
                            <div className="flex items-center gap-3 mb-2">
                                <div className="w-2 h-2 rounded-full bg-primary animate-pulse-soft" />
                                <span className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Business Intelligence</span>
                            </div>
                            <h1 className="text-3xl lg:text-4xl font-bold tracking-tight text-foreground">{t("reports")}</h1>
                            <p className="text-muted-foreground mt-2 text-lg font-medium">
                                Analytics and productivity insights for your active projects
                            </p>
                        </div>
                        <div className="flex gap-3">
                            <Select value={dateRange} onValueChange={setDateRange}>
                                <SelectTrigger className="w-52 h-11 rounded-xl bg-background/50 border-2 backdrop-blur-sm font-bold">
                                    <div className="flex items-center gap-2">
                                        <Calendar className="h-4 w-4 text-primary" />
                                        <SelectValue />
                                    </div>
                                </SelectTrigger>
                                <SelectContent className="rounded-xl shadow-xl border-none">
                                    <SelectItem value="week">This Week</SelectItem>
                                    <SelectItem value="month">This Month</SelectItem>
                                    <SelectItem value="quarter">This Quarter</SelectItem>
                                </SelectContent>
                            </Select>
                            <Button variant="outline" className="h-11 px-5 rounded-xl bg-background/50 border-2 backdrop-blur-sm font-bold">
                                <Download className="h-4 w-4 mr-2" />
                                {t("exportCSV")}
                            </Button>
                        </div>
                    </div>
                </div>

                {/* Main Content Sections */}
                <div className="space-y-6">
                    {/* Summary Cards */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="bg-card rounded-2xl border p-6 shadow-sm hover-lift">
                            <div className="flex items-center gap-2 text-muted-foreground mb-3">
                                <div className="p-2 bg-primary/10 rounded-lg text-primary">
                                    <Ruler className="h-4 w-4" />
                                </div>
                                <span className="text-xs font-bold uppercase tracking-widest">Total Meters</span>
                            </div>
                            <p className="text-3xl font-black text-foreground tracking-tight">{totalMeters}m</p>
                            <p className="text-xs text-muted-foreground mt-2">Across last 7 days</p>
                        </div>
                        <div className="bg-card rounded-2xl border p-6 shadow-sm hover-lift">
                            <div className="flex items-center gap-2 text-muted-foreground mb-3">
                                <div className="p-2 bg-amber-500/10 rounded-lg text-amber-600">
                                    <TrendingUp className="h-4 w-4" />
                                </div>
                                <span className="text-xs font-bold uppercase tracking-widest">Total Hours</span>
                            </div>
                            <p className="text-3xl font-black text-foreground tracking-tight">{totalHours}h</p>
                            <p className="text-xs text-muted-foreground mt-2">Active logging hours</p>
                        </div>
                        <div className="bg-card rounded-2xl border p-6 shadow-sm hover-lift">
                            <div className="flex items-center gap-2 text-muted-foreground mb-3">
                                <div className="p-2 bg-blue-500/10 rounded-lg text-blue-600">
                                    <Users className="h-4 w-4" />
                                </div>
                                <span className="text-xs font-bold uppercase tracking-widest">Labourers</span>
                            </div>
                            <p className="text-3xl font-black text-foreground tracking-tight">{stats.activeLabourers}</p>
                            <p className="text-xs text-muted-foreground mt-2">of {stats.totalLabourers} total active</p>
                        </div>
                        <div className="bg-card rounded-2xl border p-6 shadow-sm hover-lift">
                            <div className="flex items-center gap-2 text-muted-foreground mb-3">
                                <div className="p-2 bg-green-500/10 rounded-lg text-green-600">
                                    <span className="text-sm">₹</span>
                                </div>
                                <span className="text-xs font-bold uppercase tracking-widest">Earnings</span>
                            </div>
                            <p className="text-3xl font-black text-green-600 tracking-tight">₹{totalAmount.toLocaleString()}</p>
                            <p className="text-xs text-muted-foreground mt-2">Combined work value</p>
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
            </div>
        </AppLayout>
    );
};

export default Reports;
