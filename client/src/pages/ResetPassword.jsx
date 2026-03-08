import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { useTranslation } from "react-i18next";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { HardHat, Lock, Loader2, Eye, EyeOff, CheckCircle, XCircle } from "lucide-react";

/**
 * ResetPassword page component for users to set a new password.
 * Handles password recovery flow with session validation and updates.
 *
 * @returns {JSX.Element} The ResetPassword page component.
 */
const ResetPassword = () => {
    const { t } = useTranslation();
    const { toast } = useToast();
    const navigate = useNavigate();

    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    const [isValidSession, setIsValidSession] = useState(null);

    useEffect(() => {
        /**
         * Checks if we have a valid recovery session in the current context.
         */
        const checkSession = async () => {
            const {
                data: { session },
            } = await supabase.auth.getSession();

            // The recovery flow creates a session with the recovery token
            if (session) {
                setIsValidSession(true);
            } else {
                setIsValidSession(false);
            }
        };

        checkSession();

        // Listen for auth changes (specifically recovery link clicked)
        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange((event) => {
            if (event === "PASSWORD_RECOVERY") {
                setIsValidSession(true);
            }
        });

        return () => subscription.unsubscribe();
    }, []);

    /**
     * Handles the password reset form submission.
     *
     * @param {React.FormEvent} e - The form submission event.
     */
    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!password || !confirmPassword) {
            toast({
                title: "Error",
                description: "Please fill in both password fields",
                variant: "destructive",
            });
            return;
        }

        if (password.length < 6) {
            toast({
                title: "Error",
                description: "Password must be at least 6 characters",
                variant: "destructive",
            });
            return;
        }

        if (password !== confirmPassword) {
            toast({
                title: "Error",
                description: "Passwords do not match",
                variant: "destructive",
            });
            return;
        }

        setIsSubmitting(true);

        try {
            const { error } = await supabase.auth.updateUser({ password });

            if (error) {
                toast({
                    title: "Error",
                    description: error.message,
                    variant: "destructive",
                });
            } else {
                setIsSuccess(true);
                toast({
                    title: "Password Updated",
                    description: "Your password has been reset successfully",
                });

                // Redirect to login after 3 seconds
                setTimeout(() => {
                    navigate("/");
                }, 3000);
            }
        } catch (err) {
            toast({
                title: "Error",
                description: "Something went wrong. Please try again.",
                variant: "destructive",
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    // Loading state while checking session validity
    if (isValidSession === null) {
        return (
            <div className="min-h-screen bg-gradient-accent flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    // Handle invalid or expired recovery sessions
    if (isValidSession === false) {
        return (
            <div className="min-h-screen bg-gradient-accent flex flex-col">
                <header className="p-4 flex justify-between items-center">
                    <div className="flex items-center gap-2">
                        <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center shadow-glow">
                            <HardHat className="h-5 w-5 text-primary-foreground" />
                        </div>
                        <div>
                            <h1 className="font-bold text-xl text-foreground">{t("appName")}</h1>
                            <p className="text-xs text-muted-foreground">{t("tagline")}</p>
                        </div>
                    </div>
                    <LanguageSwitcher />
                </header>

                <main className="flex-1 flex items-center justify-center p-4">
                    <Card className="w-full max-w-md shadow-card border-2">
                        <CardContent className="pt-6">
                            <div className="text-center space-y-4">
                                <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto">
                                    <XCircle className="h-8 w-8 text-destructive" />
                                </div>
                                <div className="space-y-2">
                                    <h2 className="text-xl font-semibold">Link Expired</h2>
                                    <p className="text-sm text-muted-foreground">
                                        This password reset link has expired or is invalid. Please request a new one.
                                    </p>
                                </div>
                                <Button className="w-full" onClick={() => navigate("/forgot-password")}>
                                    Request New Link
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </main>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-accent flex flex-col">
            {/* Header */}
            <header className="p-4 flex justify-between items-center">
                <div className="flex items-center gap-2">
                    <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center shadow-glow">
                        <HardHat className="h-5 w-5 text-primary-foreground" />
                    </div>
                    <div>
                        <h1 className="font-bold text-xl text-foreground">{t("appName")}</h1>
                        <p className="text-xs text-muted-foreground">{t("tagline")}</p>
                    </div>
                </div>
                <LanguageSwitcher />
            </header>

            {/* Main Content */}
            <main className="flex-1 flex items-center justify-center p-4">
                <div className="w-full max-w-md space-y-6 animate-fade-in">
                    <div className="text-center space-y-2">
                        <h2 className="text-3xl font-bold text-foreground">Set New Password</h2>
                        <p className="text-muted-foreground">Enter your new password below</p>
                    </div>

                    <Card className="shadow-card border-2">
                        <CardHeader className="pb-3">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                                    <Lock className="h-6 w-6 text-primary" />
                                </div>
                                <div>
                                    <CardTitle className="text-lg">{isSuccess ? "Password Reset!" : "Create New Password"}</CardTitle>
                                    <CardDescription>{isSuccess ? "Redirecting to login..." : "Choose a strong password"}</CardDescription>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent>
                            {isSuccess ? (
                                <div className="space-y-4 text-center py-4">
                                    <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/20 flex items-center justify-center mx-auto">
                                        <CheckCircle className="h-8 w-8 text-green-600 dark:text-green-400" />
                                    </div>
                                    <div className="space-y-2">
                                        <p className="text-foreground font-medium">Password updated successfully!</p>
                                        <p className="text-sm text-muted-foreground">You will be redirected to the login page...</p>
                                    </div>
                                    <Loader2 className="h-5 w-5 animate-spin text-primary mx-auto" />
                                </div>
                            ) : (
                                <form onSubmit={handleSubmit} className="space-y-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="password">New Password</Label>
                                        <div className="relative">
                                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                            <Input
                                                id="password"
                                                type={showPassword ? "text" : "password"}
                                                placeholder="••••••••"
                                                className="pl-10 pr-10"
                                                value={password}
                                                onChange={(e) => setPassword(e.target.value)}
                                                required
                                                minLength={6}
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowPassword(!showPassword)}
                                                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                                            >
                                                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                            </button>
                                        </div>
                                        <p className="text-xs text-muted-foreground">Minimum 6 characters</p>
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="confirmPassword">Confirm Password</Label>
                                        <div className="relative">
                                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                            <Input
                                                id="confirmPassword"
                                                type={showConfirmPassword ? "text" : "password"}
                                                placeholder="••••••••"
                                                className="pl-10 pr-10"
                                                value={confirmPassword}
                                                onChange={(e) => setConfirmPassword(e.target.value)}
                                                required
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                                            >
                                                {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                            </button>
                                        </div>
                                    </div>

                                    <Button
                                        type="submit"
                                        className="w-full gradient-primary shadow-glow hover:shadow-lg transition-all"
                                        disabled={isSubmitting}
                                    >
                                        {isSubmitting ? (
                                            <>
                                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                                Updating...
                                            </>
                                        ) : (
                                            "Reset Password"
                                        )}
                                    </Button>
                                </form>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </main>

            {/* Footer */}
            <footer className="p-4 text-center text-xs text-muted-foreground">
                <p>© 2024 ShramFlow. All rights reserved.</p>
            </footer>
        </div>
    );
};

export default ResetPassword;
