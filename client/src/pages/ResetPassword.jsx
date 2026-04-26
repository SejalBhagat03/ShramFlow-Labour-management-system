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
import { HardHat, Lock, Loader2, Eye, EyeOff, CheckCircle, XCircle, ShieldCheck } from "lucide-react";
import { motion } from "framer-motion";

const ResetPassword = () => {
    const { t } = useTranslation();
    const { toast } = useToast();
    const navigate = useNavigate();

    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    const [isValidSession, setIsValidSession] = useState(null);

    useEffect(() => {
        const checkSession = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            setIsValidSession(!!session);
        };
        checkSession();

        const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
            if (event === "PASSWORD_RECOVERY") setIsValidSession(true);
        });

        return () => subscription.unsubscribe();
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!password || !confirmPassword) {
            toast({ title: "Error", description: "Fill all fields", variant: "destructive" });
            return;
        }

        if (password.length < 6) {
            toast({ title: "Error", description: "Min 6 characters", variant: "destructive" });
            return;
        }

        if (password !== confirmPassword) {
            toast({ title: "Error", description: "Passwords mismatch", variant: "destructive" });
            return;
        }

        setIsSubmitting(true);
        try {
            const { error } = await supabase.auth.updateUser({ password });
            if (error) {
                toast({ title: "Error", description: error.message, variant: "destructive" });
            } else {
                setIsSuccess(true);
                toast({ title: "Success", description: "Password updated" });
                setTimeout(() => navigate("/"), 2500);
            }
        } catch (err) {
            toast({ title: "Error", description: "Failed to update", variant: "destructive" });
        } finally {
            setIsSubmitting(false);
        }
    };

    if (isValidSession === null) {
        return (
            <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center">
                <Loader2 className="h-10 w-10 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#f8fafc] relative overflow-hidden flex flex-col items-center justify-center p-4">
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/10 rounded-full blur-[120px] animate-pulse" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-emerald-500/10 rounded-full blur-[120px] animate-pulse" />
            </div>

            <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="z-10 mb-8 text-center">
                <div className="flex items-center justify-center gap-3 mb-2">
                    <div className="w-12 h-12 rounded-2xl bg-primary flex items-center justify-center shadow-lg">
                        <HardHat className="h-7 w-7 text-white" />
                    </div>
                    <h1 className="text-3xl font-black tracking-tight text-foreground">Shram<span className="text-primary">Flow</span></h1>
                </div>
                <p className="text-muted-foreground font-medium flex items-center justify-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-primary" />
                    Password Reset Security
                </p>
            </motion.div>

            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="z-10 w-full max-w-[440px]">
                <Card className="glass-strong border-white/40 shadow-2xl overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
                    
                    {isValidSession === false ? (
                        <CardContent className="pt-12 pb-12 text-center space-y-6">
                            <div className="w-20 h-20 rounded-full bg-destructive/10 flex items-center justify-center mx-auto">
                                <XCircle className="h-10 w-10 text-destructive" />
                            </div>
                            <div className="space-y-2">
                                <h2 className="text-2xl font-bold">Link Expired</h2>
                                <p className="text-muted-foreground px-8">
                                    This security link has expired. For your protection, please request a new password reset link.
                                </p>
                            </div>
                            <Button className="w-full max-w-[240px] h-12 rounded-xl font-bold" onClick={() => navigate("/forgot-password")}>
                                Request New Link
                            </Button>
                        </CardContent>
                    ) : (
                        <>
                            <CardHeader className="text-center pt-8 pb-4">
                                <CardTitle className="text-2xl font-bold">{isSuccess ? "Success!" : "New Password"}</CardTitle>
                                <CardDescription>
                                    {isSuccess ? "Your account is secure now." : "Choose a strong password to protect your account."}
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="px-8 pb-8">
                                {isSuccess ? (
                                    <div className="space-y-6 text-center py-4">
                                        <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                                            <CheckCircle className="h-10 w-10 text-primary" />
                                        </div>
                                        <p className="text-foreground font-medium">Redirecting to login portal...</p>
                                        <Loader2 className="h-6 w-6 animate-spin text-primary mx-auto" />
                                    </div>
                                ) : (
                                    <form onSubmit={handleSubmit} className="space-y-6">
                                        <div className="space-y-2">
                                            <Label className="text-xs font-bold uppercase tracking-wider opacity-70">New Password</Label>
                                            <div className="relative group">
                                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground transition-colors group-focus-within:text-primary" />
                                                <Input
                                                    type={showPassword ? "text" : "password"}
                                                    placeholder="••••••••"
                                                    className="pl-10 h-11 bg-white/50 border-white/50 focus:bg-white transition-all"
                                                    value={password}
                                                    onChange={(e) => setPassword(e.target.value)}
                                                    required
                                                />
                                                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                                                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                                </button>
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <Label className="text-xs font-bold uppercase tracking-wider opacity-70">Confirm Password</Label>
                                            <div className="relative group">
                                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                                <Input
                                                    type="password"
                                                    placeholder="••••••••"
                                                    className="pl-10 h-11 bg-white/50 border-white/50 focus:bg-white transition-all"
                                                    value={confirmPassword}
                                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                                    required
                                                />
                                            </div>
                                        </div>
                                        
                                        <Button
                                            type="submit"
                                            className="w-full h-12 font-bold text-lg rounded-xl gradient-primary shadow-lg"
                                            disabled={isSubmitting}
                                        >
                                            {isSubmitting ? <Loader2 className="h-5 w-5 animate-spin" /> : "Update Password"}
                                        </Button>
                                    </form>
                                )}
                            </CardContent>
                        </>
                    )}

                    <div className="bg-muted/30 px-8 py-4 flex items-center justify-between border-t border-white/40">
                        <LanguageSwitcher />
                        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">v1.1.0-secure</span>
                    </div>
                </Card>
            </motion.div>
        </div>
    );
};

export default ResetPassword;
