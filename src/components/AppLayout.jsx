import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { LanguageToggle } from '@/components/LanguageToggle';
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
    Sparkles,
    CalendarDays,
} from 'lucide-react';

/**
 * AppLayout component that provides basic scaffolding for the application.
 * Includes a responsive sidebar, header, and user profile management within the layout.
 *
 * @param {Object} props - Component properties.
 * @param {React.ReactNode} props.children - Child components to be rendered within the layout.
 * @returns {JSX.Element} The AppLayout component.
 */
export const AppLayout = ({ children }) => {
    const { t } = useLanguage();
    const { user, logout } = useAuth();
    const location = useLocation();
    const [sidebarOpen, setSidebarOpen] = useState(false);

    // Navigation items configuration
    const navItems = [
        { path: '/dashboard', icon: LayoutDashboard, label: t('dashboard') },
        { path: '/labourers', icon: Users, label: t('labourers') },
        { path: '/work-entries', icon: ClipboardList, label: t('workEntries') },
        { path: '/payments', icon: CreditCard, label: t('payments') },
        { path: '/daily-logs', icon: CalendarDays, label: t('dailyLogs') },
        { path: '/work-disputes', icon: AlertTriangle, label: t('workDisputes'), badge: null },
        { path: '/reports', icon: BarChart3, label: t('reports') },
        { path: '/flagged', icon: AlertTriangle, label: t('flagged'), badge: 1 },
    ];

    const bottomNavItems = [
        { path: '/role-management', icon: Shield, label: 'Role Management' },
        { path: '/settings', icon: Settings, label: t('settings') },
    ];

    return (
        <div className="min-h-screen bg-background">
            {/* Mobile Header - Fixed at top for small screens */}
            <header className="lg:hidden fixed top-0 left-0 right-0 h-16 glass-strong border-b z-50 px-4 flex items-center justify-between">
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setSidebarOpen(true)}
                    className="hover:bg-primary/10"
                >
                    <Menu className="h-5 w-5" />
                </Button>

                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center shadow-glow-sm">
                        <Sparkles className="h-4 w-4 text-primary-foreground" />
                    </div>
                    <h1 className="font-bold text-lg text-gradient">{t('appName')}</h1>
                </div>

                <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" className="relative hover:bg-primary/10">
                        <Bell className="h-5 w-5" />
                        <span className="absolute top-2 right-2 w-2 h-2 bg-destructive rounded-full animate-pulse-soft" />
                    </Button>
                </div>
            </header>

            {/* Sidebar Overlay - Closes sidebar when clicking outside on mobile */}
            {sidebarOpen && (
                <div
                    className="lg:hidden fixed inset-0 bg-foreground/30 backdrop-blur-sm z-40 transition-opacity duration-300"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            {/* Sidebar Navigation */}
            <aside className={cn(
                'fixed top-0 left-0 h-full w-72 bg-sidebar/95 backdrop-blur-xl z-50 transition-transform duration-300 ease-out',
                'lg:translate-x-0', // Always visible on Desktop
                sidebarOpen ? 'translate-x-0' : '-translate-x-full' // Toggle on Mobile
            )}>
                <div className="flex flex-col h-full">
                    {/* Logo Area */}
                    <div className="h-16 px-5 flex items-center justify-between border-b border-sidebar-border">
                        <div className="flex items-center gap-3">
                            <div className="relative">
                                <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center shadow-glow-sm">
                                    <Sparkles className="h-5 w-5 text-primary-foreground" />
                                </div>
                                <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-success rounded-full border-2 border-sidebar" />
                            </div>
                            <div>
                                <span className="font-bold text-lg text-sidebar-foreground">{t('appName')}</span>
                                <p className="text-xs text-muted-foreground -mt-0.5">Labour Management</p>
                            </div>
                        </div>
                        {/* Close button for mobile */}
                        <Button
                            variant="ghost"
                            size="icon"
                            className="lg:hidden hover:bg-sidebar-accent"
                            onClick={() => setSidebarOpen(false)}
                        >
                            <X className="h-5 w-5" />
                        </Button>
                    </div>

                    {/* User Info Card */}
                    <div className="p-4 mx-3 mt-3 rounded-xl bg-gradient-to-br from-sidebar-accent/80 to-sidebar-accent/40 border border-sidebar-border/50">
                        <div className="flex items-center gap-3">
                            <div className="relative">
                                <div className="w-11 h-11 rounded-xl gradient-primary flex items-center justify-center shadow-md">
                                    <span className="text-primary-foreground font-bold text-sm">
                                        {(user?.name ?? 'User')
                                            .split(' ')
                                            .filter(Boolean)
                                            .map((n) => n[0])
                                            .join('')}
                                    </span>
                                </div>
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold text-sidebar-foreground truncate">{user?.name}</p>
                                <p className="text-xs text-muted-foreground capitalize flex items-center gap-1.5">
                                    <span className="w-1.5 h-1.5 rounded-full bg-success" />
                                    {user?.role}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Main Navigation Links */}
                    <nav className="flex-1 p-3 space-y-1 overflow-y-auto mt-2">
                        {navItems.map((item) => {
                            const isActive = location.pathname === item.path;
                            return (
                                <Link
                                    key={item.path}
                                    to={item.path}
                                    onClick={() => setSidebarOpen(false)}
                                    className={cn(
                                        'group flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200',
                                        isActive
                                            ? 'bg-sidebar-accent text-sidebar-primary shadow-sm'
                                            : 'text-sidebar-foreground hover:bg-sidebar-accent/60'
                                    )}
                                >
                                    <div className={cn(
                                        'p-1.5 rounded-lg transition-all duration-200',
                                        isActive
                                            ? 'bg-primary/15'
                                            : 'group-hover:bg-primary/10'
                                    )}>
                                        <item.icon className={cn(
                                            'h-4.5 w-4.5 transition-colors',
                                            isActive ? 'text-primary' : 'text-muted-foreground group-hover:text-primary'
                                        )} strokeWidth={2} />
                                    </div>
                                    <span className="flex-1">{item.label}</span>
                                    {item.badge && (
                                        <Badge
                                            variant="destructive"
                                            className="h-5 min-w-5 px-1.5 text-xs font-bold animate-pulse-soft"
                                        >
                                            {item.badge}
                                        </Badge>
                                    )}
                                    {isActive && (
                                        <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                                    )}
                                </Link>
                            );
                        })}
                    </nav>

                    {/* Bottom Actions (Language, Settings, Logout) */}
                    <div className="p-3 border-t border-sidebar-border space-y-1">
                        <LanguageToggle />
                        {bottomNavItems.map((item) => {
                            const isActive = location.pathname === item.path;
                            return (
                                <Link
                                    key={item.path}
                                    to={item.path}
                                    onClick={() => setSidebarOpen(false)}
                                    className={cn(
                                        'flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200',
                                        isActive
                                            ? 'bg-sidebar-accent text-sidebar-primary'
                                            : 'text-sidebar-foreground hover:bg-sidebar-accent/60'
                                    )}
                                >
                                    <item.icon className="h-4.5 w-4.5" strokeWidth={2} />
                                    <span>{item.label}</span>
                                </Link>
                            );
                        })}
                        <Button
                            variant="ghost"
                            className="w-full justify-start gap-3 text-destructive hover:text-destructive hover:bg-destructive/10 rounded-xl px-4 py-2.5 h-auto"
                            onClick={logout}
                        >
                            <LogOut className="h-4.5 w-4.5" strokeWidth={2} />
                            <span className="font-medium">{t('logout')}</span>
                        </Button>
                    </div>
                </div>
            </aside>

            {/* Main Content Area */}
            <main className="lg:ml-72 pt-16 lg:pt-0 min-h-screen">
                <div className="p-4 lg:p-8 max-w-7xl mx-auto">
                    {children}
                </div>
            </main>
        </div>
    );
};
