import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { useTranslation } from "react-i18next";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { HardHat, Mail, Loader2, ArrowLeft, CheckCircle, ShieldCheck } from "lucide-react";
import { motion } from "framer-motion";

const ForgotPassword = () => {
    const { t } = useTranslation();
    const { toast } = useToast();
    const navigate = useNavigate();
    const [email, setEmail] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!email) {
            toast({ title: "Error", description: "Enter your email", variant: "destructive" });
            return;
        }

        setIsSubmitting(true);
        try {
            const { error } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: `${window.location.origin}/reset-password`,
            });

            if (error) {
                toast({ title: "Error", description: error.message, variant: "destructive" });
            } else {
                setIsSuccess(true);
                toast({ title: "Email Sent", description: "Check your inbox" });
            }
        } catch (err) {
            toast({ title: "Error", description: "Failed to send link", variant: "destructive" });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#f8fafc] relative overflow-hidden flex flex-col items-center justify-center p-4">
            {/* Background Elements */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/10 rounded-full blur-[120px] animate-pulse" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-emerald-500/10 rounded-full blur-[120px] animate-pulse" />
            </div>

            {/* Header / Logo */}
            <motion.div 
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="z-10 mb-8 text-center"
            >
                <div className="flex items-center justify-center gap-3 mb-2">
                    <div className="w-12 h-12 rounded-2xl bg-primary flex items-center justify-center shadow-lg shadow-primary/20 cursor-pointer" onClick={() => navigate('/')}>
                        <HardHat className="h-7 w-7 text-white" />
                    </div>
                    <h1 className="text-3xl font-black tracking-tight text-foreground">
                        Shram<span className="text-primary">Flow</span>
                    </h1>
                </div>
                <p className="text-muted-foreground font-medium flex items-center justify-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-primary" />
                    Secure Account Recovery
                </p>
            </motion.div>

            {/* Main Auth Card */}
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="z-10 w-full max-w-[440px]"
            >
                <Card className="glass-strong border-white/40 shadow-2xl overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
                    
                    <CardHeader className="text-center pt-8 pb-4">
                        <CardTitle className="text-2xl font-bold">
                            {isSuccess ? 'Check Your Email' : 'Reset Password'}
                        </CardTitle>
                        <CardDescription>
                            {isSuccess 
                                ? "We've sent reset instructions to your email." 
                                : "Enter your registered email address to receive a recovery link."
                            }
                        </CardDescription>
                    </CardHeader>

                    <CardContent className="px-8 pb-8">
                        {isSuccess ? (
                            <div className="space-y-6 text-center py-4">
                                <motion.div 
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto"
                                >
                                    <CheckCircle className="h-10 w-10 text-primary" />
                                </motion.div>
                                <div className="space-y-2">
                                    <p className="text-foreground font-bold">Email sent to:</p>
                                    <p className="text-primary font-medium">{email}</p>
                                    <p className="text-xs text-muted-foreground leading-relaxed px-4">
                                        Click the link in your email to reset your password. If you don't see it, check your spam folder.
                                    </p>
                                </div>
                                <Button
                                    variant="outline"
                                    className="w-full h-11 border-primary/20 hover:bg-primary/5 rounded-xl font-bold"
                                    onClick={() => {
                                        setIsSuccess(false);
                                        setEmail("");
                                    }}
                                >
                                    Try a different email
                                </Button>
                            </div>
                        ) : (
                            <form onSubmit={handleSubmit} className="space-y-6">
                                <div className="space-y-2">
                                    <Label className="text-xs font-bold uppercase tracking-wider opacity-70">Email Address</Label>
                                    <div className="relative group">
                                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground transition-colors group-focus-within:text-primary" />
                                        <Input
                                            type="email"
                                            placeholder="john@example.com"
                                            className="pl-10 h-11 bg-white/50 border-white/50 focus:bg-white transition-all"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            required
                                        />
                                    </div>
                                </div>
                                
                                <Button
                                    type="submit"
                                    className="w-full h-12 font-bold text-lg rounded-xl gradient-primary shadow-lg shadow-primary/20 hover:shadow-xl transition-all disabled:opacity-70"
                                    disabled={isSubmitting}
                                >
                                    {isSubmitting ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Send Recovery Link'}
                                </Button>

                                <Link
                                    to="/"
                                    className="flex items-center justify-center gap-2 text-sm font-medium text-muted-foreground hover:text-primary transition-colors"
                                >
                                    <ArrowLeft className="h-4 w-4" />
                                    Back to Login
                                </Link>
                            </form>
                        )}
                    </CardContent>

                    <div className="bg-muted/30 px-8 py-4 flex items-center justify-between border-t border-white/40">
                        <LanguageSwitcher />
                        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">SECURE LINK</span>
                    </div>
                </Card>
            </motion.div>
        </div>
    );
};

export default ForgotPassword;
