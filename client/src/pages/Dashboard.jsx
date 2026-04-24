import { useTranslation } from 'react-i18next';
import { AppLayout } from '@/components/AppLayout';
import { StatCard } from '@/components/StatCard';
import { ActivityFeed } from '@/components/ActivityFeed';
import { QuickActionsGrid } from '@/components/QuickActionsGrid';
import { useDashboardStats } from '@/hooks/useDashboardStats';
import { useActivities } from '@/hooks/useActivities';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
    Users,
    UserCheck,
    Clock,
    AlertTriangle,
    UserPlus,
    ClipboardPlus,
    CreditCard,
    BarChart3,
} from 'lucide-react';

/**
 * Dashboard page component providing a high-level overview of the application.
 * Displays key statistics, quick actions, and a feed of recent activities.
 *
 * @returns {JSX.Element} The Dashboard page component.
 */
const Dashboard = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { stats, isLoading: statsLoading } = useDashboardStats();
    const { activities, isLoading: activitiesLoading } = useActivities(10);

    const transformedActivities = activities.map(activity => ({
        id: activity.id,
        type: activity.type,
        message: activity.message,
        messageHindi: activity.message_hindi || activity.message,
        timestamp: activity.created_at,
        icon: activity.icon
    }));

    const statCards = [
        {
            title: t('totalLabourers'),
            value: stats.totalLabourers,
            icon: Users,
        },
        {
            title: t('todayAttendance'),
            value: `${stats.todayAttendance}/${stats.activeLabourers}`,
            icon: UserCheck,
        },
        {
            title: "Pending Amount",
            value: `₹${stats.pendingAmount.toLocaleString()}`,
            icon: Clock,
        },
        {
            title: "Pending Approvals",
            value: stats.pendingApprovals,
            icon: BarChart3,
        },
    ];

    const quickActions = [
        {
            icon: UserPlus,
            label: "Add Labour",
            onClick: () => navigate('/labourers'),
        },
        {
            icon: ClipboardPlus,
            label: "Add Work",
            onClick: () => navigate('/work-entries'),
        },
        {
            icon: Users,
            label: "Group Entry",
            onClick: () => navigate('/work-entries/group'),
        },
        {
            icon: CreditCard,
            label: "Payment",
            onClick: () => navigate('/payments'),
        },
    ];

    return (
        <AppLayout>
            <div className="space-y-8">
                {/* Header */}
                <div className="flex flex-col gap-1">
                    <h1 className="text-2xl font-bold text-foreground tracking-tight">Overview</h1>
                    <p className="text-sm text-muted-foreground font-medium">Welcome back! Monitoring your workforce performance.</p>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {statsLoading ? (
                        Array.from({ length: 4 }).map((_, i) => (
                            <Skeleton key={i} className="h-32 rounded-2xl" />
                        ))
                    ) : (
                        statCards.map((stat, index) => (
                            <StatCard
                                key={index}
                                title={stat.title}
                                value={stat.value}
                                icon={stat.icon}
                            />
                        ))
                    )}
                </div>

                {/* Main Content */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Left Column: Quick Actions & Summary */}
                    <div className="lg:col-span-1 space-y-8">
                        <section className="space-y-4">
                            <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Quick Actions</h3>
                            <QuickActionsGrid actions={quickActions} />
                        </section>

                        <section className="space-y-4">
                            <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Today's Summary</h3>
                            <div className="bg-white rounded-2xl border border-border p-6 space-y-4 shadow-sm">
                                <div className="flex items-center justify-between p-3 rounded-xl bg-emerald-50/50 border border-emerald-100">
                                    <span className="text-xs font-bold text-emerald-800">Approved Meters</span>
                                    <span className="text-lg font-black text-emerald-900">{stats.totalMetersToday}m</span>
                                </div>
                                <div className="flex items-center justify-between p-3 rounded-xl bg-emerald-50/50 border border-emerald-100">
                                    <span className="text-xs font-bold text-emerald-800">Approved Hours</span>
                                    <span className="text-lg font-black text-emerald-900">{stats.totalHoursToday}h</span>
                                </div>
                                <div className="flex items-center justify-between p-3 rounded-xl bg-amber-50/50 border border-amber-100">
                                    <span className="text-xs font-bold text-amber-800">Pending Approval</span>
                                    <span className="text-lg font-black text-amber-900">{stats.pendingApprovals}</span>
                                </div>
                            </div>
                        </section>
                    </div>

                    {/* Right Column: Activity Feed */}
                    <div className="lg:col-span-2 space-y-4">
                        <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Recent Activity</h3>
                        {activitiesLoading ? (
                            <div className="space-y-3">
                                {Array.from({ length: 5 }).map((_, i) => (
                                    <Skeleton key={i} className="h-20 rounded-xl" />
                                ))}
                            </div>
                        ) : (
                            <ActivityFeed activities={transformedActivities} />
                        )}
                    </div>
                </div>
            </div>
        </AppLayout>
    );
};

export default Dashboard;
