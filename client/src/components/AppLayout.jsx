import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/hooks/useAuth';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { NotificationBell } from '@/components/NotificationBell';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    LayoutDashboard,
    Users,
    ClipboardList,
    CreditCard,
    BarChart3,
    AlertTriangle,
    Settings,
    LogOut,
    Menu,
    X,
    Bell,
    Shield,
    CalendarDays,
    History,
    User,
    ChevronDown,
    HardHat,
    Trash2,
    Zap,
} from 'lucide-react';
import { WifiOff } from 'lucide-react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useEffect } from 'react';
import { offlineSyncService } from '@/services/offlineSyncService';
import { Briefcase } from 'lucide-react';

const OfflineIndicator = () => {
    const [isOffline, setIsOffline] = useState(!navigator.onLine);
    const [pendingCount, setPendingCount] = useState(0);

    useEffect(() => {
        const updateCount = async () => {
            const count = await offlineSyncService.getPendingCount();
            setPendingCount(count);
        };

        const handleSync = (e) => {
            setPendingCount(e.detail.remaining || 0);
        };

        const handleOnline = () => setIsOffline(false);
        const handleOffline = () => setIsOffline(true);

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);
        window.addEventListener('offline-sync-complete', handleSync);
        
        updateCount();
        const interval = setInterval(updateCount, 10000); // Poll every 10s

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
            window.removeEventListener('offline-sync-complete', handleSync);
            clearInterval(interval);
        };
    }, []);

    if (!isOffline && pendingCount === 0) return null;

    return (
        <div className={cn(
            "flex items-center gap-1.5 px-3 py-1.5 rounded-full border shadow-sm animate-pulse-soft transition-all",
            isOffline ? "bg-amber-500/10 text-amber-600 border-amber-500/20" : "bg-primary/10 text-primary border-primary/20"
        )}>
            {isOffline ? <WifiOff className="h-3.5 w-3.5" /> : <ClipboardList className="h-3.5 w-3.5" />}
            <span className="text-[10px] font-bold uppercase tracking-wider whitespace-nowrap">
                {isOffline ? "Offline" : "Syncing"}
                {pendingCount > 0 && ` (${pendingCount})`}
            </span>
        </div>
    );
};

/**
 * AppLayout component that provides basic scaffolding for the application.
 * Includes a responsive sidebar, header, and user profile management within the layout.
 */
export const AppLayout = ({ children }) => {
    const { t } = useTranslation();
    const { user, logout } = useAuth();
    const location = useLocation();
    const [sidebarOpen, setSidebarOpen] = useState(false);

    // Get current date formatted
    const currentDate = new Intl.DateTimeFormat('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric'
    }).format(new Date());

    const navGroups = [
        {
            title: 'MAIN',
            items: [
                { path: '/command-center', icon: Zap, label: 'Command Center' },
            ]
        },
        {
            title: 'OPERATIONS',
            items: [
                { path: '/projects', icon: Briefcase, label: 'Projects' },
                { path: '/labourers', icon: Users, label: t('labourers') },
                { path: '/work-entries', icon: ClipboardList, label: t('workEntries') },
                { path: '/daily-logs', icon: CalendarDays, label: t('dailyLogs') },
                { path: '/work-disputes', icon: AlertTriangle, label: t('workDisputes') },
            ]
        },
        {
            title: 'FINANCE & REPORTS',
            items: [
                { path: '/payments', icon: CreditCard, label: t('payments') },
                { path: '/reports', icon: BarChart3, label: t('reports') },
                ...(user?.role === 'supervisor' ? [
                    { path: '/audit-logs', icon: History, label: 'Audit Logs' },
                    { path: '/recycle-bin', icon: Trash2, label: 'Recycle Bin' }
                ] : [])
            ]
        }
    ];

    const bottomNavItems = [
        { path: '/settings', icon: Settings, label: t('settings') },
    ];

    return (
        <div className="min-h-screen bg-gradient-to-br from-[#E6F9F0] to-[#ECFDF5] font-inter">
            {/* Main Header */}
            <header className="fixed top-0 left-0 right-0 h-14 md:h-16 bg-white/70 backdrop-blur-md border-b border-border z-40">
                <div className={cn("h-full px-4 md:px-8 flex items-center justify-between ml-0 transition-all duration-300", "lg:ml-64")}>
                    {/* Left: Branding */}
                    <div className="flex items-center gap-2">
                        <div className="flex items-center gap-2 lg:hidden">
                            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                                <HardHat className="h-4 w-4 text-primary-foreground" />
                            </div>
                            <h1 className="font-bold text-sm text-foreground">{t('appName')}</h1>
                        </div>

                        <div className="hidden lg:block">
                            <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{t('dashboard')}</h2>
                        </div>
                    </div>

                    {/* Right Side */}
                    <div className="flex items-center gap-3 sm:gap-4">
                        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted/50 text-muted-foreground">
                            <CalendarDays className="h-3.5 w-3.5" />
                            <span className="text-xs font-medium">{currentDate}</span>
                        </div>

                        <OfflineIndicator />
                        <LanguageSwitcher />
                        <NotificationBell />

                        <div className="h-6 w-[1px] bg-border hidden sm:block" />

                        {/* Profile */}
                        <Button asChild variant="ghost" className="h-9 px-2 hover:bg-muted rounded-full">
                            <Link to="/settings" className="flex items-center gap-2">
                                <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center">
                                    <span className="text-primary-foreground font-bold text-[10px]">
                                        {(user?.name ?? 'U')[0]}
                                    </span>
                                </div>
                                <span className="hidden sm:block text-xs font-semibold">{user?.name}</span>
                            </Link>
                        </Button>

                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setSidebarOpen(true)}
                            className="lg:hidden"
                        >
                            <Menu className="h-5 w-5" />
                        </Button>
                    </div>
                </div>
            </header>

            {/* Sidebar Overlay */}
            {sidebarOpen && (
                <div className="lg:hidden fixed inset-0 bg-black/20 backdrop-blur-sm z-40" onClick={() => setSidebarOpen(false)} />
            )}

            {/* Sidebar */}
            <aside className={cn(
                'fixed top-0 left-0 h-full w-64 bg-sidebar backdrop-blur-xl z-50 transition-transform duration-300 ease-out border-r border-border',
                'lg:translate-x-0',
                sidebarOpen ? 'translate-x-0' : '-translate-x-full'
            )}>
                <div className="flex flex-col h-full">
                    {/* Brand */}
                    <div className="h-16 px-6 flex items-center gap-3 border-b border-border">
                        <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center">
                            <HardHat className="h-5 w-5 text-primary-foreground" />
                        </div>
                        <div>
                            <span className="font-bold text-base tracking-tight text-foreground">{t('appName')}</span>
                            <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-widest leading-none mt-1">Labour System</p>
                        </div>
                    </div>

                    {/* Nav */}
                    <nav className="flex-1 px-4 py-6 space-y-7 overflow-y-auto scrollbar-hide">
                        {navGroups.map((group, idx) => (
                            <div key={idx} className="space-y-2">
                                <h3 className="text-[10px] font-bold text-muted-foreground/60 tracking-widest px-3 uppercase">
                                    {group.title}
                                </h3>
                                <div className="space-y-1">
                                    {group.items.map((item) => {
                                        const isActive = location.pathname === item.path;
                                        return (
                                            <Link
                                                key={item.path}
                                                to={item.path}
                                                onClick={() => setSidebarOpen(false)}
                                                className={cn(
                                                    'flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-all duration-200',
                                                    isActive
                                                        ? 'bg-primary/10 text-primary'
                                                        : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                                                )}
                                            >
                                                <item.icon className="h-4 w-4" />
                                                <span>{item.label}</span>
                                            </Link>
                                        );
                                    })}
                                </div>
                            </div>
                        ))}
                    </nav>

                    {/* Bottom */}
                    <div className="p-4 border-t border-border space-y-1">
                        {bottomNavItems.map((item) => {
                            const isActive = location.pathname === item.path;
                            return (
                                <Link
                                    key={item.path}
                                    to={item.path}
                                    className={cn(
                                        'flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-all',
                                        isActive ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted'
                                    )}
                                >
                                    <item.icon className="h-4 w-4" />
                                    <span>{item.label}</span>
                                </Link>
                            );
                        })}
                        <button
                            onClick={logout}
                            className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium text-red-500 hover:bg-red-50 transition-colors"
                        >
                            <LogOut className="h-4 w-4" />
                            <span>{t('logout')}</span>
                        </button>
                    </div>
                </div>
            </aside>

            {/* Main */}
            <main className="lg:ml-64 pt-14 md:pt-16 min-h-screen">
                <div className="p-4 md:p-8">
                    {children}
                </div>
            </main>
        </div>
    );
};
