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

import { AuthProvider, useAuth } from "@/contexts/AuthContext";

import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
const ForgotPassword = React.lazy(() => import("./pages/ForgotPassword"));
const ResetPassword = React.lazy(() => import("./pages/ResetPassword"));
// Keeping other specialized pages lazy
const Labourers = React.lazy(() => import("./pages/Labourers"));
const LabourLedger = React.lazy(() => import("./pages/LabourLedger"));
const WorkEntries = React.lazy(() => import("./pages/WorkEntries"));
const Payments = React.lazy(() => import("./pages/Payments"));
const Reports = React.lazy(() => import("./pages/Reports"));
const Flagged = React.lazy(() => import("./pages/Flagged"));
const Settings = React.lazy(() => import("./pages/Settings"));
const AuditLog = React.lazy(() => import("./pages/AuditLog"));
const LabourPortal = React.lazy(() => import("./pages/LabourPortal"));
const DailyLogs = React.lazy(() => import("./pages/DailyLogs"));
const WorkDisputes = React.lazy(() => import("./pages/WorkDisputes"));
const GroupWorkEntry = React.lazy(() => import("./pages/GroupWorkEntry"));
const LabourProfile = React.lazy(() => import("./pages/LabourProfile"));
const SupervisorDashboardV2 = React.lazy(() => import("./pages/SupervisorDashboardV2"));
const LabourDashboardV2 = React.lazy(() => import("./pages/LabourDashboardV2"));
const NotFound = React.lazy(() => import("./pages/NotFound"));

import { Chatbot } from "./components/Chatbot";

import { Loader2, Shield } from "lucide-react";

const queryClient = new QueryClient();

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
                    <p className="text-amber-600 text-[10px] uppercase font-bold tracking-widest">Network is slow</p>
                    <div className="flex gap-2">
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
        <div className="fixed bottom-4 left-4 z-[100] bg-black/80 text-white text-[10px] px-2 py-1 rounded-full pointer-events-none opacity-50">
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
        
        const redirectPath = user.role === "labour" ? "/labour-portal" : "/dashboard";
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
                            <Navigate to={user?.role === 'labour' ? '/labour-portal' : '/dashboard'} replace />
                        )
                    ) : (
                        <Login />
                    )
                }
            />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/login" element={<Navigate to="/" replace />} />

            {/* Dashboard Routes (Admin, Supervisor, Accountant) */}
            <Route
                path="/dashboard"
                element={
                    <ProtectedRoute allowedRoles={["supervisor"]}>
                        <Dashboard />
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

            <Route
                path="/flagged"
                element={
                    <ProtectedRoute allowedRoles={["supervisor"]}>
                        <Flagged />
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
                    <AppRoutes />
                    <Chatbot />
                    <DevPortIndicator />
                </AuthProvider>
            </BrowserRouter>
        </TooltipProvider>
    </QueryClientProvider>
);

export default App;
