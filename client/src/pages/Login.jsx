import { useTranslation } from 'react-i18next';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate, Link } from 'react-router-dom';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useState, useRef, useEffect } from 'react';
import { HardHat, UserCircle, Phone, Lock, Mail, User, Loader2, Eye, EyeOff, ShieldCheck, Sparkles, ArrowRight } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { authService } from '@/services/authService';
import { labourerService } from '@/services/labourerService';
import { supabase } from '@/lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * Login page component handling authentication for both supervisors and labourers.
 * Features a premium SaaS design with tabbed interface and smooth animations.
 */
const Login = () => {
    const { t } = useTranslation();
    const { login, signup, isLoading: authLoading, isAuthenticated, user } = useAuth();
    const navigate = useNavigate();
    const { toast } = useToast();

    // Navigation Effect
    useEffect(() => {
        if (authLoading) return;
        if (isAuthenticated) {
            if (user?.role === 'labour') {
                navigate('/labour-portal', { replace: true });
            } else {
                navigate('/dashboard', { replace: true });
            }
        }
    }, [authLoading, isAuthenticated, user, navigate]);

    // Role state (supervisor or labour)
    const [activeRole, setActiveRole] = useState('supervisor');
    
    // Supervisor mode (login or signup)
    const [isSignupMode, setIsSignupMode] = useState(false);
    const [rememberMe, setRememberMe] = useState(false);

    // Form States
    const [supervisorIdentifier, setSupervisorIdentifier] = useState('');
    const [supervisorPassword, setSupervisorPassword] = useState('');
    const [signupName, setSignupName] = useState('');
    const [signupIdentifier, setSignupIdentifier] = useState('');
    const [signupPassword, setSignupPassword] = useState('');
    const [labourPhone, setLabourPhone] = useState('');
    const [labourPassword, setLabourPassword] = useState('');

    // Loading states
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    // Password visibility
    const [showPassword, setShowPassword] = useState(false);

    const submittingRef = useRef(false);

    // Load remembered identifier
    useEffect(() => {
        const savedId = localStorage.getItem('shramflow_remembered_id');
        if (savedId) {
            setSupervisorIdentifier(savedId);
            setRememberMe(true);
        }
    }, []);

    const handleSupervisorLogin = async (e) => {
        e.preventDefault();
        if (submittingRef.current) return;
        if (!supervisorIdentifier || !supervisorPassword) {
            toast({ title: 'Error', description: 'Enter credentials', variant: 'destructive' });
            return;
        }

        submittingRef.current = true;
        setIsSubmitting(true);

        // Remember ID logic
        if (rememberMe) {
            localStorage.setItem('shramflow_remembered_id', supervisorIdentifier);
        } else {
            localStorage.removeItem('shramflow_remembered_id');
        }

        let loginEmail = supervisorIdentifier;
        const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(supervisorIdentifier);
        if (!isEmail) {
            const cleanPhone = supervisorIdentifier.replace(/\D/g, '');
            if (cleanPhone.length >= 10) loginEmail = `${cleanPhone}@shramflow.com`;
        }

        try {
            const { data, error } = await login(loginEmail, supervisorPassword);
            if (error) {
                let msg = error.message;
                if (msg.includes('Invalid login credentials')) {
                    msg = 'Incorrect email or password. Please check and try again.';
                } else if (msg.includes('Email not confirmed')) {
                    msg = 'Please verify your email before logging in.';
                }
                toast({ title: 'Login Failed', description: msg, variant: 'destructive' });
                setIsSubmitting(false);
                submittingRef.current = false;
            } else {
                // Success path
                try {
                    const sessionUser = await Promise.race([
                        authService.getUserProfile(data.user.id, data.user),
                        new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 15000))
                    ]).catch(() => ({ role: 'supervisor' }));

                    if (sessionUser.role === 'labour') {
                        toast({ title: 'Access Denied', description: 'This account requires worker login.', variant: 'destructive' });
                        await supabase.auth.signOut();
                        setIsSubmitting(false);
                        submittingRef.current = false;
                        return;
                    }
                    toast({ title: 'Success', description: 'Welcome back to ShramFlow!' });
                    navigate('/dashboard', { replace: true });
                } catch (e) {
                    navigate('/dashboard', { replace: true });
                }
            }
        } catch (err) {
            setIsSubmitting(false);
            submittingRef.current = false;
        }
    };

    const handleSupervisorSignup = async (e) => {
        e.preventDefault();
        if (!signupIdentifier || !signupPassword || !signupName) {
            toast({ title: 'Error', description: 'Fill all fields', variant: 'destructive' });
            return;
        }

        let emailToRegister = signupIdentifier;
        let phoneToRegister = '';
        const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(signupIdentifier);

        if (!isEmail) {
            const cleanPhone = signupIdentifier.replace(/\D/g, '');
            if (cleanPhone.length < 10) {
                toast({ title: 'Error', description: 'Invalid phone number', variant: 'destructive' });
                return;
            }
            emailToRegister = `${cleanPhone}@shramflow.com`;
            phoneToRegister = signupIdentifier;
        }

        setIsSubmitting(true);
        try {
            const { error } = await signup(emailToRegister, signupPassword, signupName, phoneToRegister, 'supervisor');
            if (error) {
                toast({ title: 'Signup Failed', description: error.message, variant: 'destructive' });
            } else {
                toast({ title: 'Success', description: 'Account created! Please login.' });
                setIsSignupMode(false);
                setSupervisorIdentifier(signupIdentifier);
                setSupervisorPassword(signupPassword);
            }
        } catch (err) {
            toast({ title: 'Error', description: 'Signup failed', variant: 'destructive' });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleLabourLogin = async (e) => {
        e.preventDefault();
        if (!labourPhone || !labourPassword) {
            toast({ title: 'Error', description: 'Enter credentials', variant: 'destructive' });
            return;
        }

        setIsSubmitting(true);
        const cleanPhone = labourPhone.replace(/\D/g, '');
        const emailToLogin = `${cleanPhone}@shramflow.com`;

        const { data, error } = await login(emailToLogin, labourPassword);
        
        if (error) {
            toast({ title: 'Login Failed', description: error.message, variant: 'destructive' });
            setIsSubmitting(false);
        } else {
            try {
                const sessionUser = await Promise.race([
                    authService.getUserProfile(data.user.id, data.user),
                    new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 15000))
                ]).catch(() => ({ role: 'labour' }));

                if (sessionUser.role !== 'labour') {
                    toast({ title: 'Denied', description: 'Not a worker account', variant: 'destructive' });
                    await supabase.auth.signOut();
                    setIsSubmitting(false);
                    return;
                }
                navigate('/labour-portal', { replace: true });
            } catch (e) {
                navigate('/labour-portal', { replace: true });
            }
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
                    <div className="w-12 h-12 rounded-2xl bg-primary flex items-center justify-center shadow-lg shadow-primary/20">
                        <HardHat className="h-7 w-7 text-white" />
                    </div>
                    <h1 className="text-3xl font-black tracking-tight text-foreground bg-clip-text">
                        Shram<span className="text-primary">Flow</span>
                    </h1>
                </div>
                <p className="text-muted-foreground font-medium flex items-center justify-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-primary" />
                    Secure Workforce Management
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
                        <div className="flex justify-center mb-6">
                            <Tabs value={activeRole} onValueChange={setActiveRole} className="w-full">
                                <TabsList className="grid w-full grid-cols-2 h-12 p-1 bg-muted/50 rounded-xl">
                                    <TabsTrigger value="supervisor" className="rounded-lg font-bold">Supervisor</TabsTrigger>
                                    <TabsTrigger value="labour" className="rounded-lg font-bold">Worker</TabsTrigger>
                                </TabsList>
                            </Tabs>
                        </div>
                        <CardTitle className="text-2xl font-bold">
                            {activeRole === 'supervisor' 
                                ? (isSignupMode ? 'Join ShramFlow' : 'Welcome Back')
                                : 'Worker Portal'
                            }
                        </CardTitle>
                        <CardDescription>
                            {activeRole === 'supervisor'
                                ? (isSignupMode ? 'Create a supervisor account to manage projects' : 'Login to your supervisor dashboard')
                                : 'Access your work logs and payment history'
                            }
                        </CardDescription>
                    </CardHeader>

                    <CardContent className="px-8 pb-8">
                        <AnimatePresence mode="wait">
                            {activeRole === 'supervisor' ? (
                                <motion.div
                                    key="supervisor-form"
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: 20 }}
                                    className="space-y-4"
                                >
                                    <>
                                        {isSignupMode ? (
                                            <form onSubmit={handleSupervisorSignup} className="space-y-4">
                                                <div className="space-y-2">
                                                    <Label className="text-xs font-bold uppercase tracking-wider opacity-70">Full Name</Label>
                                                    <div className="relative group">
                                                        <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground transition-colors group-focus-within:text-primary" />
                                                        <Input
                                                            placeholder="John Doe"
                                                            className="pl-10 h-11 bg-white/50 border-white/50 focus:bg-white transition-all rounded-xl"
                                                            value={signupName}
                                                            onChange={(e) => setSignupName(e.target.value)}
                                                            required
                                                        />
                                                    </div>
                                                </div>
                                                
                                                <div className="space-y-2">
                                                    <Label className="text-xs font-bold uppercase tracking-wider opacity-70">Email or Phone</Label>
                                                    <div className="relative group">
                                                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground transition-colors group-focus-within:text-primary" />
                                                        <Input
                                                            placeholder="name@company.com"
                                                            className="pl-10 h-11 bg-white/50 border-white/50 focus:bg-white transition-all rounded-xl"
                                                            value={signupIdentifier}
                                                            onChange={(e) => setSignupIdentifier(e.target.value)}
                                                            required
                                                        />
                                                    </div>
                                                </div>

                                                <div className="space-y-2">
                                                    <Label className="text-xs font-bold uppercase tracking-wider opacity-70">Password</Label>
                                                    <div className="relative group">
                                                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground transition-colors group-focus-within:text-primary" />
                                                        <Input
                                                            type={showPassword ? "text" : "password"}
                                                            placeholder="••••••••"
                                                            className="pl-10 pr-10 h-11 bg-white/50 border-white/50 focus:bg-white transition-all rounded-xl"
                                                            value={signupPassword}
                                                            onChange={(e) => setSignupPassword(e.target.value)}
                                                            required
                                                        />
                                                        <button
                                                            type="button"
                                                            onClick={() => setShowPassword(!showPassword)}
                                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                                        >
                                                            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                                        </button>
                                                    </div>
                                                </div>

                                                <Button
                                                    type="submit"
                                                    className="w-full h-12 font-bold text-lg rounded-xl gradient-primary shadow-lg shadow-primary/20 hover:shadow-xl transition-all disabled:opacity-70"
                                                    disabled={isSubmitting}
                                                >
                                                    {isSubmitting ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Create Account'}
                                                </Button>
                                            </form>
                                        ) : (
                                            <form onSubmit={handleSupervisorLogin} className="space-y-6">
                                                <div className="space-y-4">
                                                    <div className="space-y-2">
                                                        <Label className="text-xs font-bold uppercase tracking-wider opacity-70">Email or Phone</Label>
                                                        <div className="relative group">
                                                            <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground transition-colors group-focus-within:text-primary" />
                                                            <Input
                                                                placeholder="john@example.com"
                                                                className="pl-10 h-11 bg-white/50 border-white/50 focus:bg-white transition-all rounded-xl"
                                                                value={supervisorIdentifier}
                                                                onChange={(e) => setSupervisorIdentifier(e.target.value)}
                                                                required
                                                            />
                                                        </div>
                                                    </div>

                                                    <div className="space-y-2">
                                                        <Label className="text-xs font-bold uppercase tracking-wider opacity-70">Password</Label>
                                                        <div className="relative group">
                                                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground transition-colors group-focus-within:text-primary" />
                                                            <Input
                                                                type={showPassword ? 'text' : 'password'}
                                                                placeholder="••••••••"
                                                                className="pl-10 pr-10 h-11 bg-white/50 border-white/50 focus:bg-white transition-all rounded-xl"
                                                                value={supervisorPassword}
                                                                onChange={(e) => setSupervisorPassword(e.target.value)}
                                                                required
                                                            />
                                                            <button
                                                                type="button"
                                                                onClick={() => setShowPassword(!showPassword)}
                                                                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary transition-colors"
                                                            >
                                                                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                                            </button>
                                                        </div>
                                                    </div>

                                                    <div className="flex items-center justify-between px-1">
                                                        <div className="flex items-center space-x-2">
                                                            <input 
                                                                type="checkbox" 
                                                                id="remember" 
                                                                checked={rememberMe}
                                                                onChange={(e) => setRememberMe(e.target.checked)}
                                                                className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary accent-primary" 
                                                            />
                                                            <label htmlFor="remember" className="text-xs font-medium text-muted-foreground cursor-pointer select-none">
                                                                Remember me
                                                            </label>
                                                        </div>
                                                        <Link to="/forgot-password" size="sm" className="text-xs font-bold text-primary hover:underline">
                                                            Forgot password?
                                                        </Link>
                                                    </div>
                                                </div>
                                                
                                                <Button
                                                    type="submit"
                                                    className="w-full h-12 font-bold text-lg rounded-xl gradient-primary shadow-lg shadow-primary/20 hover:shadow-xl hover:translate-y-[-1px] active:translate-y-[0px] transition-all disabled:opacity-70"
                                                    disabled={isSubmitting}
                                                >
                                                    {isSubmitting ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Sign In'}
                                                </Button>
                                            </form>
                                        )}

                                        <div className="text-center">
                                            <button 
                                                type="button"
                                                onClick={() => setIsSignupMode(!isSignupMode)}
                                                className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                                            >
                                                {isSignupMode ? 'Already have an account? Sign In' : "Don't have an account? Join Now"}
                                            </button>
                                        </div>
                                    </>
                                </motion.div>
                            ) : (
                                <motion.div
                                    key="labour-form"
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -20 }}
                                    className="space-y-4"
                                >
                                    <form onSubmit={handleLabourLogin} className="space-y-4">
                                        <div className="space-y-2">
                                            <Label className="text-xs font-bold uppercase tracking-wider opacity-70">Phone Number</Label>
                                            <div className="relative group">
                                                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground transition-colors group-focus-within:text-primary" />
                                                <Input
                                                    type="tel"
                                                    placeholder="9876543210"
                                                    className="pl-10 h-11 bg-white/50 border-white/50 focus:bg-white transition-all"
                                                    value={labourPhone}
                                                    onChange={(e) => setLabourPhone(e.target.value)}
                                                    required
                                                />
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <Label className="text-xs font-bold uppercase tracking-wider opacity-70">PIN / Password</Label>
                                            <div className="relative group">
                                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground transition-colors group-focus-within:text-primary" />
                                                <Input
                                                    type={showPassword ? "text" : "password"}
                                                    placeholder="••••"
                                                    className="pl-10 pr-10 h-11 bg-white/50 border-white/50 focus:bg-white transition-all"
                                                    value={labourPassword}
                                                    onChange={(e) => setLabourPassword(e.target.value)}
                                                    required
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => setShowPassword(!showPassword)}
                                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                                >
                                                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                                </button>
                                            </div>
                                        </div>

                                        <Button
                                            type="submit"
                                            className="w-full h-12 font-bold text-lg rounded-xl gradient-primary shadow-lg shadow-primary/20 hover:shadow-xl transition-all disabled:opacity-70"
                                            disabled={isSubmitting}
                                        >
                                            {isSubmitting ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Enter Portal'}
                                        </Button>
                                    </form>
                                    
                                    <div className="p-4 rounded-xl bg-primary/5 border border-primary/10 flex items-start gap-3">
                                        <Sparkles className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                                        <p className="text-xs text-muted-foreground leading-relaxed">
                                            Workers: Use the phone number registered by your supervisor. Default PIN is usually provided by the manager.
                                        </p>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </CardContent>

                    <div className="bg-muted/30 px-8 py-4 flex items-center justify-between border-t border-white/40">
                        <LanguageSwitcher />
                        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">v1.1.0-stable</span>
                    </div>
                </Card>
            </motion.div>

            {/* Footer Links */}
            <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="z-10 mt-8 flex items-center gap-6 text-sm font-medium text-muted-foreground"
            >
                <a href="#" className="hover:text-primary transition-colors">Privacy</a>
                <div className="w-1 h-1 rounded-full bg-muted-foreground/30" />
                <a href="#" className="hover:text-primary transition-colors">Terms</a>
                <div className="w-1 h-1 rounded-full bg-muted-foreground/30" />
                <a href="#" className="hover:text-primary transition-colors">Help Center</a>
            </motion.div>
        </div>
    );
};

export default Login;
