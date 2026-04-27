/**
 * @file App.jsx
 * @description Root component of the ShramFlow application.
 * Handles routing, authentication protection, and global providers.
 */

import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Button } from "@/components/ui/button";

import { AuthProvider } from "@/contexts/AuthProvider";
import { useAuth } from "@/hooks/useAuth";

const Login = React.lazy(() => import("./pages/Login"));
const ForgotPassword = React.lazy(() => import("./pages/ForgotPassword"));
const ResetPassword = React.lazy(() => import("./pages/ResetPassword"));
const RecycleBin = React.lazy(() => import("./pages/RecycleBin"));
// Keeping other specialized pages lazy
const Labourers = React.lazy(() => import("./pages/Labourers"));
const LabourLedger = React.lazy(() => import("./pages/LabourLedger"));
const WorkEntries = React.lazy(() => import("./pages/WorkEntries"));
const Payments = React.lazy(() => import("./pages/Payments"));
const Reports = React.lazy(() => import("./pages/Reports"));
const Settings = React.lazy(() => import("./pages/Settings"));
const AuditLog = React.lazy(() => import("./pages/AuditLog"));
const LabourPortal = React.lazy(() => import("./pages/LabourPortal"));
const DailyLogs = React.lazy(() => import("./pages/DailyLogs"));
const WorkDisputes = React.lazy(() => import("./pages/WorkDisputes"));
const GroupWorkEntry = React.lazy(() => import("./pages/GroupWorkEntry"));
const LabourProfile = React.lazy(() => import("./pages/LabourProfile"));
const SupervisorDashboardV2 = React.lazy(() => import("./pages/SupervisorDashboardV2"));
const LabourDashboardV2 = React.lazy(() => import("./pages/LabourDashboardV2"));
const Projects = React.lazy(() => import("./pages/Projects"));
const ProjectDetails = React.lazy(() => import("./pages/ProjectDetails"));
const CommandCenter = React.lazy(() => import("./pages/CommandCenter"));
const NotFound = React.lazy(() => import("./pages/NotFound"));

import { Chatbot } from "./components/Chatbot";
import { OfflineIndicator } from "./components/OfflineIndicator";
import Commander from "./components/Commander";

import { Loader2, Shield, WifiOff } from "lucide-react";

const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            staleTime: 1000 * 60 * 5, // 5 minutes
            gcTime: 1000 * 60 * 30, // 30 minutes
            retry: (failureCount, error) => {
                if (error?.status === 404) return false;
                if (failureCount < 2) return true;
                return false;
            },
            refetchOnWindowFocus: false,
        },
    },
});

/* ---------------------------------- */
/* Loading Screen */
/* ---------------------------------- */
const LoadingScreen = () => {
    const [showReload, setShowReload] = React.useState(false);

    React.useEffect(() => {
        const timer = setTimeout(() => setShowReload(true), 8000);
        return () => clearTimeout(timer);
    }, []);

    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4 text-center">
            <div className="mb-8 relative">
                <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full scale-150 animate-pulse-soft" />
                <Loader2 className="h-10 w-10 animate-spin text-primary relative z-10" />
            </div>
            <h2 className="text-xl font-semibold mb-2">Connecting to ShramFlow</h2>
            <p className="text-muted-foreground text-sm max-w-[250px]">
                Checking secure session and preparing your workspace...
            </p>
            {showReload && (
                <div className="animate-fade-in mt-8 space-y-4">
                    {!navigator.onLine && (
                        <div className="flex items-center justify-center gap-2 text-amber-600 bg-amber-50 px-3 py-1.5 rounded-full border border-amber-100 animate-pulse-soft mb-2 mx-auto w-fit">
                             <WifiOff className="h-3 w-3" />
                             <span className="text-[10px] font-bold uppercase tracking-wider">Offline Mode</span>
                        </div>
                    )}
                    <p className="text-amber-600 text-[10px] uppercase font-bold tracking-widest">
                        {navigator.onLine ? "Network is slow" : "No Internet Connection"}
                    </p>
                    <div className="flex gap-2 justify-center">
                        <Button
                            onClick={() => window.location.reload()}
                            variant="outline"
                            size="sm"
                        >
                            Retry Now
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
};

const DevPortIndicator = () => {
    if (import.meta.env.PROD) return null;
    return (
        <div className="fixed bottom-4 left-4 z-[100] bg-black/60 text-white text-[8px] sm:text-[10px] px-2 py-0.5 sm:py-1 rounded-full pointer-events-none opacity-40 hover:opacity-100 transition-opacity">
            Dev Server: Port 8081
        </div>
    );
};

/* ---------------------------------- */
/* Protected Route */
/* ---------------------------------- */
const ProtectedRoute = ({ children, allowedRoles }) => {
    const { isAuthenticated, user, isLoading, logout } = useAuth();

    if (isLoading) return <LoadingScreen />;

    if (!isAuthenticated) {
        return <Navigate to="/" replace />;
    }

    // Logged in but RECOVERY MODE
    // We allow access but the dashboard will show limited data.
    if (user?.email === 'system@recovery.mode') {
        // Pass through, but maybe we can trigger a toast in the Dashboard component instead.
        // For now, just let them in so they see the UI.
    }

    // Logged in but role missing
    if (allowedRoles && !user?.role) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center p-4 text-center">
                <Shield className="h-12 w-12 text-muted-foreground mb-4" />
                <h1 className="text-xl font-bold">Role Not Assigned</h1>
                <p className="text-muted-foreground mt-2 max-w-md">
                    Your account is active, but no role is assigned yet.
                    Please contact an administrator.
                </p>
                <div className="flex gap-4 mt-6">
                    <Button onClick={() => window.location.reload()} variant="outline">
                        Retry
                    </Button>
                    <Button onClick={logout} variant="destructive">
                        Logout
                    </Button>
                </div>
            </div>
        );
    }

    // Role not allowed
    if (allowedRoles && user && !allowedRoles.includes(user.role)) {
        // If it's just a fallback role from metadata, wait before redirecting
        // This prevents the flickering on refresh when DB is slow
        if (user.isFallback) {
            return <LoadingScreen />;
        }
        
        
        const redirectPath = user.role === "labour" ? "/labour-portal" : "/command-center";
        return <Navigate to={redirectPath} replace />;
    }

    return children;
};

/* ---------------------------------- */
/* App Routes */
/* ---------------------------------- */
const AppRoutes = () => {
    const { isAuthenticated, user, isLoading } = useAuth();

    if (isLoading) return <LoadingScreen />;

    return (
        <React.Suspense fallback={<LoadingScreen />}>
            <Routes>
            {/* Public Routes */}
            <Route
                path="/"
                element={
                    isAuthenticated ? (
                        user?.isFallback ? (
                            <LoadingScreen />
                        ) : (
                        <Navigate to={user?.role === 'labour' ? '/labour-portal' : '/command-center'} replace />
                        )
                    ) : (
                        <Login />
                    )
                }
            />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/login" element={<Navigate to="/" replace />} />

            <Route
                path="/command-center"
                element={
                    <ProtectedRoute allowedRoles={["supervisor"]}>
                        <SupervisorDashboardV2 />
                    </ProtectedRoute>
                }
            />

            <Route
                path="/dashboard"
                element={
                    <Navigate to="/command-center" replace />
                }
            />

            <Route
                path="/projects"
                element={
                    <ProtectedRoute allowedRoles={["supervisor"]}>
                        <Projects />
                    </ProtectedRoute>
                }
            />
            <Route
                path="/projects/:id"
                element={
                    <ProtectedRoute allowedRoles={["supervisor"]}>
                        <ProjectDetails />
                    </ProtectedRoute>
                }
            />

            <Route
                path="/labourers"
                element={
                    <ProtectedRoute allowedRoles={["supervisor"]}>
                        <Labourers />
                    </ProtectedRoute>
                }
            />

            <Route
                path="/labourers/:id"
                element={
                    <ProtectedRoute allowedRoles={["supervisor"]}>
                        <LabourProfile />
                    </ProtectedRoute>
                }
            />

            <Route
                path="/work-entries"
                element={
                    <ProtectedRoute allowedRoles={["supervisor"]}>
                        <WorkEntries />
                    </ProtectedRoute>
                }
            />

            <Route
                path="/work-entries/group"
                element={
                    <ProtectedRoute allowedRoles={["supervisor"]}>
                        <GroupWorkEntry />
                    </ProtectedRoute>
                }
            />
            <Route
                path="/audit-logs"
                element={
                    <ProtectedRoute allowedRoles={['supervisor']}>
                        <AuditLog />
                    </ProtectedRoute>
                }
            />

            <Route
                path="/payments"
                element={
                    <ProtectedRoute allowedRoles={["supervisor"]}>
                        <Payments />
                    </ProtectedRoute>
                }
            />

            <Route
                path="/recycle-bin"
                element={
                    <ProtectedRoute allowedRoles={["supervisor"]}>
                        <RecycleBin />
                    </ProtectedRoute>
                }
            />

            <Route
                path="/labour/:id/ledger"
                element={
                    <ProtectedRoute allowedRoles={['supervisor', 'labour']}>
                        <LabourLedger />
                    </ProtectedRoute>
                }
            />
            <Route
                path="/reports"
                element={
                    <ProtectedRoute allowedRoles={["supervisor"]}>
                        <Reports />
                    </ProtectedRoute>
                }
            />


            {/* Shared Routes */}
            <Route
                path="/settings"
                element={
                    <ProtectedRoute>
                        <Settings />
                    </ProtectedRoute>
                }
            />

            <Route
                path="/daily-logs"
                element={
                    <ProtectedRoute>
                        <DailyLogs />
                    </ProtectedRoute>
                }
            />

            <Route
                path="/work-disputes"
                element={
                    <ProtectedRoute allowedRoles={["supervisor"]}>
                        <WorkDisputes />
                    </ProtectedRoute>
                }
            />

            {/* Labour Portal */}
            <Route
                path="/labour-portal"
                element={
                    <ProtectedRoute allowedRoles={["labour"]}>
                        <LabourPortal />
                    </ProtectedRoute>
                }
            />

            {/* V2 Dashboards */}
            <Route
                path="/supervisor-v2"
                element={
                    <ProtectedRoute allowedRoles={["supervisor"]}>
                        <SupervisorDashboardV2 />
                    </ProtectedRoute>
                }
            />
            <Route
                path="/labour-v2"
                element={
                    <ProtectedRoute allowedRoles={["labour"]}>
                        <LabourDashboardV2 />
                    </ProtectedRoute>
                }
            />

            {/* Fallback */}
            <Route path="*" element={<NotFound />} />
        </Routes>
        </React.Suspense>
    );
};

import ErrorBoundary from "./components/ErrorBoundary";

/* ---------------------------------- */
/* App Wrapper */
/* ---------------------------------- */
const App = () => (
    <QueryClientProvider client={queryClient}>
        <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
                <AuthProvider>
                    <ErrorBoundary>
                        <AppRoutes />
                    </ErrorBoundary>
                    <Chatbot />
                    <Commander />
                    <OfflineIndicator />
                    <DevPortIndicator />
                </AuthProvider>
            </BrowserRouter>
        </TooltipProvider>
    </QueryClientProvider>
);

export default App;
