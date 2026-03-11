import { useTranslation } from 'react-i18next';
import { AppLayout } from '@/components/AppLayout';
import { StatCard } from '@/components/StatCard';
import { ActivityFeed } from '@/components/ActivityFeed';
import { QuickActionsGrid } from '@/components/QuickActionsGrid';
import { useDashboardStats } from '@/hooks/useDashboardStats';
import { useActivities } from '@/hooks/useActivities';
import { useNavigate } from 'react-router-dom';
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

    // Transform activities for ActivityFeed component
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
            trend: undefined, // Remove hardcoded demo trend
        },
        {
            title: t('todayAttendance'),
            value: `${stats.todayAttendance}/${stats.activeLabourers}`,
            icon: UserCheck,
            variant: 'success',
        },
        {
            title: t('totalBalance') || "Total Balance",
            value: `₹${stats.pendingAmount.toLocaleString()}`,
            icon: Clock,
            variant: 'warning',
        },
        {
            title: t('highRisk') || "High Risk",
            value: stats.highRiskLabourers,
            icon: AlertTriangle,
            variant: stats.highRiskLabourers > 0 ? 'destructive' : 'default',
        },
        {
            title: "Pending Approvals",
            value: stats.pendingApprovals,
            icon: Clock,
            variant: stats.pendingApprovals > 0 ? 'warning' : 'default',
        },
        {
            title: t('rejectedEntries') || "Rejected Work",
            value: stats.flaggedEntries,
            icon: AlertTriangle,
            variant: stats.flaggedEntries > 0 ? 'destructive' : 'default',
        },
    ];

    const quickActions = [
        {
            icon: UserPlus,
            label: t('addLabour'),
            onClick: () => navigate('/labourers'),
            variant: 'primary',
        },
        {
            icon: ClipboardPlus,
            label: t('addWork'),
            onClick: () => navigate('/work-entries'),
        },
        {
            icon: Users,
            label: t('addGroup'),
            onClick: () => navigate('/work-entries/group'),
            variant: 'primary',
        },
        {
            icon: CreditCard,
            label: t('makePayment'),
            onClick: () => navigate('/payments'),
        },
        {
            icon: BarChart3,
            label: t('viewReports'),
            onClick: () => navigate('/reports'),
        },
    ];

    return (
        <AppLayout>
            <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 space-y-3 md:space-y-6">
                {/* Page Header with gradient background */}
                <div className="relative -mx-3 sm:-mx-4 md:-mx-6 px-3 sm:px-4 md:px-6 pt-6 lg:pt-8 pb-8 gradient-hero rounded-b-3xl">
                    <div className="relative">
                        <div className="flex items-center gap-2 mb-1">
                            <div className="w-1.5 h-1.5 rounded-full bg-success animate-pulse-soft" />
                            <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground/80">Live Dashboard</span>
                        </div>
                        <h1 className="text-xl sm:text-2xl md:text-3xl font-semibold text-foreground tracking-tight">{t('dashboard')}</h1>
                        <p className="text-muted-foreground mt-1 text-xs sm:text-sm md:text-base">Welcome back! Here's your workforce overview.</p>
                    </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6">
                    {statsLoading ? (
                        Array.from({ length: 4 }).map((_, i) => (
                            <div key={i} className="h-32 rounded-2xl bg-card animate-pulse border" />
                        ))
                    ) : (
                        statCards.map((stat, index) => (
                            <StatCard
                                key={index}
                                title={stat.title}
                                value={stat.value}
                                icon={stat.icon}
                                trend={stat.trend}
                                variant={stat.variant}
                            />
                        ))
                    )}
                </div>

                {/* Main Content Grid */}
                <div className="grid lg:grid-cols-3 gap-6 lg:gap-8">
                    {/* Quick Actions */}
                    <div className="lg:col-span-1 space-y-4 md:space-y-6">
                        <div className="space-y-1 flex flex-col">
                            <span className="text-[10px] uppercase tracking-wider text-muted-foreground/70 font-bold">Quick Actions</span>
                            <div className="flex items-center gap-3">
                                <h3 className="text-sm md:text-base font-semibold text-foreground">{t('quickActions')}</h3>
                                <div className="h-px flex-1 bg-gradient-to-r from-border to-transparent" />
                            </div>
                        </div>
                        <QuickActionsGrid actions={quickActions} />

                        {/* Today's Summary */}
                        <div className="bg-card rounded-2xl border p-4 md:p-6 shadow-card space-y-3 hover-lift">
                            <div className="flex items-center justify-between">
                                <h4 className="text-sm md:text-base font-semibold text-foreground">Today's Progress</h4>
                                <div className="w-1.5 h-1.5 rounded-full bg-success animate-pulse-soft" />
                            </div>
                            {statsLoading ? (
                                <div className="space-y-3">
                                    <div className="h-4 w-full bg-muted rounded animate-pulse" />
                                    <div className="h-4 w-full bg-muted rounded animate-pulse" />
                                    <div className="h-4 w-full bg-muted rounded animate-pulse" />
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    <div className="flex justify-between items-center text-xs md:text-sm p-3 rounded-xl bg-primary/5">
                                        <span className="text-muted-foreground font-medium">Approved Meters</span>
                                        <span className="font-bold text-primary text-base md:text-lg">{stats.totalMetersToday}m</span>
                                    </div>
                                    <div className="flex justify-between items-center text-xs md:text-sm p-3 rounded-xl bg-success/5">
                                        <span className="text-muted-foreground font-medium">Approved Hours</span>
                                        <span className="font-bold text-success text-base md:text-lg">{stats.totalHoursToday}h</span>
                                    </div>
                                    <div className="flex justify-between items-center text-xs md:text-sm p-3 rounded-xl bg-warning/5">
                                        <span className="text-muted-foreground font-medium">Waiting Approval</span>
                                        <span className="font-bold text-warning text-base md:text-lg">{stats.pendingApprovals}</span>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Activity Feed */}
                    <div className="lg:col-span-2 space-y-4">
                        <div className="space-y-1 flex flex-col">
                            <span className="text-[10px] uppercase tracking-wider text-muted-foreground/70 font-bold">Recent Activity</span>
                            <div className="flex items-center gap-3">
                                <h3 className="text-sm md:text-base font-semibold text-foreground">{t('activityFeed')}</h3>
                                <div className="h-px flex-1 bg-gradient-to-r from-border to-transparent" />
                            </div>
                        </div>
                        {activitiesLoading ? (
                            <div className="space-y-4">
                                <div className="h-6 w-32 bg-muted rounded animate-pulse" />
                                {Array.from({ length: 5 }).map((_, i) => (
                                    <div key={i} className="h-20 rounded-2xl bg-card animate-pulse border" />
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
