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
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import Dashboard from "./pages/Dashboard";
import Labourers from "./pages/Labourers";
import LabourLedger from "./pages/LabourLedger";
import WorkEntries from "./pages/WorkEntries";
import Payments from "./pages/Payments";
import Reports from "./pages/Reports";
import Flagged from "./pages/Flagged";
import Settings from "./pages/Settings";
import AuditLog from "./pages/AuditLog";
import LabourPortal from "./pages/LabourPortal";
import DailyLogs from "./pages/DailyLogs";
import WorkDisputes from "./pages/WorkDisputes";
import GroupWorkEntry from "./pages/GroupWorkEntry";
import LabourProfile from "./pages/LabourProfile";
import SupervisorDashboardV2 from "./pages/SupervisorDashboardV2";
import LabourDashboardV2 from "./pages/LabourDashboardV2";
import NotFound from "./pages/NotFound";
import { Chatbot } from "./components/Chatbot";

import { Loader2, Shield } from "lucide-react";

const queryClient = new QueryClient();

/* ---------------------------------- */
/* Loading Screen */
/* ---------------------------------- */
const LoadingScreen = () => {
    const [showReload, setShowReload] = React.useState(false);

    React.useEffect(() => {
        const timer = setTimeout(() => setShowReload(true), 5000);
        return () => clearTimeout(timer);
    }, []);

    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4 text-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
            {showReload && (
                <div className="animate-fade-in">
                    <p className="text-muted-foreground mb-4">Taking longer than expected...</p>
                    <Button
                        onClick={() => window.location.reload()}
                        variant="outline"
                        size="sm"
                    >
                        Reload Page
                    </Button>
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
        <Routes>
            {/* Public Routes */}
            <Route
                path="/"
                element={
                    isAuthenticated ? (
                        <Navigate to={user?.role === 'labour' ? '/labour-portal' : '/dashboard'} replace />
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
