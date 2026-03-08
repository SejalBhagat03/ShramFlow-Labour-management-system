import { useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { useTranslation } from "react-i18next";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { HardHat, Mail, Loader2, ArrowLeft, CheckCircle } from "lucide-react";

const ForgotPassword = () => {
    const { t } = useTranslation();
    const { toast } = useToast();
    const [email, setEmail] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!email) {
            toast({
                title: "Error",
                description: "Please enter your email address",
                variant: "destructive",
            });
            return;
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            toast({
                title: "Error",
                description: "Please enter a valid email address",
                variant: "destructive",
            });
            return;
        }

        setIsSubmitting(true);

        try {
            const { error } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: `${window.location.origin}/reset-password`,
            });

            if (error) {
                toast({
                    title: "Error",
                    description: error.message,
                    variant: "destructive",
                });
            } else {
                setIsSuccess(true);
                toast({
                    title: "Email Sent",
                    description: "Check your inbox for password reset instructions",
                });
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
                    <Link
                        to="/"
                        className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                        <ArrowLeft className="h-4 w-4" />
                        Back to Login
                    </Link>

                    <div className="text-center space-y-2">
                        <h2 className="text-3xl font-bold text-foreground">Reset Password</h2>
                        <p className="text-muted-foreground">Enter your email to receive reset instructions</p>
                    </div>

                    <Card className="shadow-card border-2">
                        <CardHeader className="pb-3">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                                    <Mail className="h-6 w-6 text-primary" />
                                </div>
                                <div>
                                    <CardTitle className="text-lg">{isSuccess ? "Check Your Email" : "Forgot Password"}</CardTitle>
                                    <CardDescription>
                                        {isSuccess ? "We sent you reset instructions" : "We'll send you a reset link"}
                                    </CardDescription>
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
                                        <p className="text-foreground font-medium">Email sent to {email}</p>
                                        <p className="text-sm text-muted-foreground">
                                            Click the link in your email to reset your password. If you don't see it, check your spam folder.
                                        </p>
                                    </div>
                                    <Button
                                        variant="outline"
                                        className="w-full mt-4"
                                        onClick={() => {
                                            setIsSuccess(false);
                                            setEmail("");
                                        }}
                                    >
                                        Send to a different email
                                    </Button>
                                </div>
                            ) : (
                                <form onSubmit={handleSubmit} className="space-y-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="email">Email Address</Label>
                                        <div className="relative">
                                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                            <Input
                                                id="email"
                                                type="email"
                                                placeholder="your@email.com"
                                                className="pl-10"
                                                value={email}
                                                onChange={(e) => setEmail(e.target.value)}
                                                required
                                            />
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
                                                Sending...
                                            </>
                                        ) : (
                                            "Send Reset Link"
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

export default ForgotPassword;
