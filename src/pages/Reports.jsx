import { useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Download, Calendar, TrendingUp, Users, Ruler } from "lucide-react";
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
    const { t } = useLanguage();
    const [dateRange, setDateRange] = useState("week");

    // Mock chart data for productivity
    const productivityData = [
        { name: "Mon", meters: 120, hours: 48, amount: 12000 },
        { name: "Tue", meters: 95, hours: 42, amount: 9500 },
        { name: "Wed", meters: 140, hours: 56, amount: 14000 },
        { name: "Thu", meters: 85, hours: 38, amount: 8500 },
        { name: "Fri", meters: 110, hours: 45, amount: 11000 },
        { name: "Sat", meters: 75, hours: 32, amount: 7500 },
        { name: "Sun", meters: 0, hours: 0, amount: 0 },
    ];

    // Mock data for top performing labourers
    const topPerformers = [
        { name: "Ramesh Kumar", meters: 180, amount: 18000 },
        { name: "Mohan Singh", meters: 160, amount: 16000 },
        { name: "Anil Sharma", meters: 145, amount: 14500 },
        { name: "Vijay Patel", meters: 130, amount: 13000 },
        { name: "Prakash Verma", meters: 120, amount: 12000 },
    ];

    // Mock data for task distribution
    const taskDistribution = [
        { name: "Brick Laying", value: 35, color: "hsl(173, 80%, 26%)" },
        { name: "Painting", value: 25, color: "hsl(142, 71%, 45%)" },
        { name: "Electrical", value: 20, color: "hsl(38, 92%, 50%)" },
        { name: "Plumbing", value: 12, color: "hsl(0, 72%, 51%)" },
        { name: "Other", value: 8, color: "hsl(200, 20%, 50%)" },
    ];

    // Calculate totals from productivity data
    const totalMeters = productivityData.reduce((sum, d) => sum + d.meters, 0);
    const totalHours = productivityData.reduce((sum, d) => sum + d.hours, 0);
    const totalAmount = productivityData.reduce((sum, d) => sum + d.amount, 0);

    return (
        <AppLayout>
            <div className="space-y-6">
                {/* Page Header */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-foreground">{t("reports")}</h1>
                        <p className="text-muted-foreground mt-1">Analytics and productivity insights</p>
                    </div>
                    <div className="flex gap-2">
                        <Select value={dateRange} onValueChange={setDateRange}>
                            <SelectTrigger className="w-40">
                                <Calendar className="h-4 w-4 mr-2" />
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="week">This Week</SelectItem>
                                <SelectItem value="month">This Month</SelectItem>
                                <SelectItem value="quarter">This Quarter</SelectItem>
                            </SelectContent>
                        </Select>
                        <Button variant="outline">
                            <Download className="h-4 w-4 mr-2" />
                            {t("exportCSV")}
                        </Button>
                    </div>
                </div>

                {/* Summary Cards */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-card rounded-xl border p-4 shadow-card">
                        <div className="flex items-center gap-2 text-muted-foreground mb-2">
                            <Ruler className="h-4 w-4" />
                            <span className="text-sm">Total Meters</span>
                        </div>
                        <p className="text-2xl font-bold text-primary">{totalMeters}m</p>
                        <p className="text-xs text-success mt-1">↑ 12% from last week</p>
                    </div>
                    <div className="bg-card rounded-xl border p-4 shadow-card">
                        <div className="flex items-center gap-2 text-muted-foreground mb-2">
                            <TrendingUp className="h-4 w-4" />
                            <span className="text-sm">Total Hours</span>
                        </div>
                        <p className="text-2xl font-bold text-foreground">{totalHours}h</p>
                        <p className="text-xs text-success mt-1">↑ 8% from last week</p>
                    </div>
                    <div className="bg-card rounded-xl border p-4 shadow-card">
                        <div className="flex items-center gap-2 text-muted-foreground mb-2">
                            <Users className="h-4 w-4" />
                            <span className="text-sm">Active Labourers</span>
                        </div>
                        <p className="text-2xl font-bold text-foreground">7</p>
                        <p className="text-xs text-muted-foreground mt-1">of 8 total</p>
                    </div>
                    <div className="bg-card rounded-xl border p-4 shadow-card">
                        <div className="flex items-center gap-2 text-muted-foreground mb-2">
                            <span className="text-sm">💰</span>
                            <span className="text-sm">Total Earnings</span>
                        </div>
                        <p className="text-2xl font-bold text-success">₹{totalAmount.toLocaleString()}</p>
                        <p className="text-xs text-success mt-1">↑ 15% from last week</p>
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
