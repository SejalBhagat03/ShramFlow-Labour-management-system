import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useState, useRef, useEffect } from 'react';
import { HardHat, UserCircle, Phone, Lock, Mail, User, Loader2, Eye, EyeOff } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { authService } from '@/services/authService';
import { labourerService } from '@/services/labourerService';
import { supabase } from '@/lib/supabase';

/**
 * Login page component handling authentication for both supervisors and labourers.
 * Supports sign-in, account registration for supervisors, and navigation to password recovery.
 *
 * @returns {JSX.Element} The Login page component.
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

    // Supervisor login state
    const [supervisorIdentifier, setSupervisorIdentifier] = useState('');
    const [supervisorPassword, setSupervisorPassword] = useState('');
    const [isLoggingIn, setIsLoggingIn] = useState(false);

    // Signup state
    const [isSignupMode, setIsSignupMode] = useState(false);
    const [signupName, setSignupName] = useState('');
    const [signupIdentifier, setSignupIdentifier] = useState('');
    const [signupPassword, setSignupPassword] = useState('');
    const [isSigningUp, setIsSigningUp] = useState(false);

    // Labour login state
    const [labourPhone, setLabourPhone] = useState('');
    const [labourPassword, setLabourPassword] = useState('');
    const [isLabourLoggingIn, setIsLabourLoggingIn] = useState(false);

    // Password visibility state
    const [showSupervisorPassword, setShowSupervisorPassword] = useState(false);
    const [showSignupPassword, setShowSignupPassword] = useState(false);
    const [showLabourPassword, setShowLabourPassword] = useState(false);

    const submittingRef = useRef(false);

    const handleSupervisorLogin = async (e) => {
        e.preventDefault();

        if (submittingRef.current) return;
        if (!supervisorIdentifier || !supervisorPassword) {
            toast({ title: 'Error', description: 'Enter credentials', variant: 'destructive' });
            return;
        }

        submittingRef.current = true;
        setIsLoggingIn(true);

        // Normalize Input
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
                    msg = 'Email or password is incorrect.';
                }
                toast({ title: 'Login Failed', description: msg, variant: 'destructive' });

                submittingRef.current = false;
                setIsLoggingIn(false);
            } else {
                // Verify role
                try {
                    const sessionUser = await authService.getUserProfile(data.user.id);
                    if (sessionUser.role === 'labour') {
                        toast({ title: 'Access Denied', description: 'Please use the labour login form.', variant: 'destructive' });
                        await supabase.auth.signOut();
                        submittingRef.current = false;
                        setIsLoggingIn(false);
                        return;
                    }
                    navigate('/dashboard', { replace: true });
                } catch (e) {
                    console.error('Role verification failed:', e);
                }
            }
        } catch (err) {
            console.error("Login failed:", err);
            submittingRef.current = false;
            setIsLoggingIn(false);
        }
    };

    const handleSupervisorSignup = async (e) => {
        e.preventDefault();
        if (!signupIdentifier || !signupPassword || !signupName) {
            toast({
                title: 'Error',
                description: 'Please fill in all required fields',
                variant: 'destructive'
            });
            return;
        }

        let emailToRegister = signupIdentifier;
        let phoneToRegister = '';

        // Determine if Email or Phone
        const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(signupIdentifier);

        if (!isEmail) {
            // Validate Phone
            const cleanPhone = signupIdentifier.replace(/\D/g, '');
            if (cleanPhone.length < 10) {
                toast({
                    title: 'Error',
                    description: 'Please enter a valid email or 10-digit phone number',
                    variant: 'destructive'
                });
                return;
            }
            emailToRegister = `${cleanPhone}@shramflow.com`;
            phoneToRegister = signupIdentifier; // Save original input as phone
        }

        if (signupPassword.length < 6) {
            toast({
                title: 'Error',
                description: 'Password must be at least 6 characters',
                variant: 'destructive'
            });
            return;
        }

        setIsSigningUp(true);
        try {
            // We pass phoneToRegister if it was a phone signup, or existing signupPhone state if they filled that optional field (we will remove the optional field to avoid confusion, or keep it? The user said "option like email or phone", implying one field).
            // Let's assume the single input field serves as the ID.

            const { error } = await signup(emailToRegister, signupPassword, signupName, phoneToRegister, 'supervisor');

            if (error) {
                // Provide user-friendly error messages
                let errorMessage = error.message || "Signup failed";
                if (errorMessage.includes('already registered') || errorMessage.includes('already exists')) {
                    errorMessage = 'This account is already registered. Please try logging in.';
                }

                toast({
                    title: 'Signup Failed',
                    description: errorMessage,
                    variant: 'destructive'
                });
            } else {
                toast({
                    title: 'Account Created',
                    description: 'You can now login with your credentials'
                });
                setIsSignupMode(false);
                setSupervisorIdentifier(signupIdentifier);
                setSupervisorPassword(signupPassword);
            }
        } catch (err) {
            toast({
                title: 'Signup Failed',
                description: err.message || 'Something went wrong.',
                variant: 'destructive'
            });
        } finally {
            setIsSigningUp(false);
        }
    };

    const handleLabourLogin = async (e) => {
        e.preventDefault();
        if (!labourPhone || !labourPassword) {
            toast({
                title: 'Error',
                description: 'Please enter phone number and password',
                variant: 'destructive'
            });
            return;
        }

        setIsLabourLoggingIn(true);
        // Clean phone number and create pseudo-email
        const cleanPhone = labourPhone.replace(/\D/g, '');
        const emailToLogin = `${cleanPhone}@shramflow.com`;

        const { data, error } = await login(emailToLogin, labourPassword);
        setIsLabourLoggingIn(false);

        if (error) {
            let msg = error.message || "Login failed";
            if (msg.includes('Invalid login credentials')) {
                msg = 'Phone number or password is incorrect.';
            }
            toast({
                title: 'Login Failed',
                description: msg,
                variant: 'destructive'
            });
        } else {
            // verify that the authenticated user actually has a labour role
            try {
                // Pass data.user to optimize profile fetching using heuristics
                const sessionUser = await authService.getUserProfile(data.user.id, data.user);
                if (sessionUser.role !== 'labour') {
                    toast({ title: 'Access Denied', description: 'This account does not have labour access.', variant: 'destructive' });
                    await supabase.auth.signOut();
                    return;
                }
                // ensure the labourer profile exists before redirecting
                const labourProfile = await labourerService.getLabourerByUserId(data.user.id);
                if (!labourProfile) {
                    toast({ title: 'Account not set up', description: 'Please ask your supervisor to activate your account.', variant: 'destructive' });
                    await supabase.auth.signOut();
                    return;
                }
                navigate('/labour-portal', { replace: true });
            } catch (e) {
                console.error('Role/check failed:', e);
            }
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
                        <h1 className="font-bold text-xl text-foreground">{t('appName')}</h1>
                        <p className="text-xs text-muted-foreground">{t('tagline')}</p>
                    </div>
                </div>
                <LanguageSwitcher />
            </header>

            {/* Main Content */}
            <main className="flex-1 flex items-center justify-center p-4">
                <div className="w-full max-w-md space-y-6 animate-fade-in">
                    <div className="text-center space-y-1.5">
                        <h2 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight">
                            {isSignupMode ? 'Create Account' : t('welcomeBack')}
                        </h2>
                        <p className="text-sm md:text-base text-muted-foreground">
                            {isSignupMode ? 'Register as a Supervisor' : t('loginSubtitle')}
                        </p>
                    </div>

                    {/* Supervisor Login/Signup Card */}
                    <Card className="shadow-card border-none bg-card/80 backdrop-blur-sm hover:shadow-lg transition-all">
                        <CardHeader className="pb-3 pt-5 px-5 md:px-6">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-primary/10 flex items-center justify-center">
                                    <UserCircle className="h-5 w-5 md:h-6 md:w-6 text-primary" />
                                </div>
                                <div>
                                    <CardTitle className="text-base md:text-lg font-bold">
                                        {isSignupMode ? 'Supervisor Registration' : t('loginAsSupervisor')}
                                    </CardTitle>
                                    <CardDescription className="text-xs md:text-sm">
                                        {isSignupMode ? 'Create your supervisor account' : 'Manage your workforce'}
                                    </CardDescription>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="px-5 md:px-6 pb-6">
                            {isSignupMode ? (
                                <form onSubmit={handleSupervisorSignup} className="space-y-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="signupName">{t('fullName')} *</Label>
                                        <div className="relative">
                                            <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                            <Input
                                                id="signupName"
                                                type="text"
                                                placeholder="Your full name"
                                                className="pl-10"
                                                value={signupName}
                                                onChange={(e) => setSignupName(e.target.value)}
                                                required
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="signupIdentifier">{t('email')} or Phone *</Label>
                                        <div className="relative">
                                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                            <Input
                                                id="signupIdentifier"
                                                type="text"
                                                placeholder="email@example.com or 9876543210"
                                                className="pl-10"
                                                value={signupIdentifier}
                                                onChange={(e) => setSignupIdentifier(e.target.value)}
                                                required
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="signupPassword">{t('password')} *</Label>
                                        <div className="relative">
                                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                            <Input
                                                id="signupPassword"
                                                type={showSignupPassword ? "text" : "password"}
                                                placeholder="••••••••"
                                                className="pl-10 pr-10"
                                                value={signupPassword}
                                                onChange={(e) => setSignupPassword(e.target.value)}
                                                required
                                                minLength={6}
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowSignupPassword(!showSignupPassword)}
                                                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                                            >
                                                {showSignupPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                            </button>
                                        </div>
                                    </div>
                                    <Button
                                        type="submit"
                                        className="w-full gradient-primary shadow-glow hover:shadow-lg transition-all"
                                        disabled={isSigningUp}
                                    >
                                        {isSigningUp ? (
                                            <>
                                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                                Creating Account...
                                            </>
                                        ) : (
                                            'Create Account'
                                        )}
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="link"
                                        className="w-full text-sm text-muted-foreground"
                                        onClick={() => setIsSignupMode(false)}
                                    >
                                        Already have an account? Login
                                    </Button>
                                </form>
                            ) : (
                                <form onSubmit={handleSupervisorLogin} className="space-y-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="supervisorIdentifier">{t('email')} or Phone</Label>
                                        <div className="relative">
                                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                            <Input
                                                id="supervisorIdentifier"
                                                type="text"
                                                placeholder="email or phone number"
                                                className="pl-10"
                                                value={supervisorIdentifier}
                                                onChange={(e) => setSupervisorIdentifier(e.target.value)}
                                                required
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="password">{t('password')}</Label>
                                        <div className="relative">
                                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                            <Input
                                                id="password"
                                                type={showSupervisorPassword ? "text" : "password"}
                                                placeholder="••••••••"
                                                className="pl-10 pr-10"
                                                value={supervisorPassword}
                                                onChange={(e) => setSupervisorPassword(e.target.value)}
                                                required
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowSupervisorPassword(!showSupervisorPassword)}
                                                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                                            >
                                                {showSupervisorPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                            </button>
                                        </div>
                                    </div>
                                    <Button
                                        type="submit"
                                        className="w-full gradient-primary shadow-glow hover:shadow-lg transition-all"
                                        disabled={isLoggingIn}
                                    >
                                        {isLoggingIn ? (
                                            <>
                                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                                Logging in...
                                            </>
                                        ) : (
                                            t('login')
                                        )}
                                    </Button>
                                    <div className="flex flex-col gap-1">
                                        <Button
                                            type="button"
                                            variant="link"
                                            className="text-sm text-primary hover:text-primary/80"
                                            onClick={() => navigate('/forgot-password')}
                                        >
                                            Forgot your password?
                                        </Button>
                                        <Button
                                            type="button"
                                            variant="link"
                                            className="text-sm text-muted-foreground"
                                            onClick={() => setIsSignupMode(true)}
                                        >
                                            Don't have an account? Register
                                        </Button>
                                    </div>
                                </form>
                            )}
                        </CardContent>
                    </Card>

                    {/* Divider */}
                    {!isSignupMode && (
                        <>
                            <div className="relative">
                                <div className="absolute inset-0 flex items-center">
                                    <div className="w-full border-t border-border" />
                                </div>
                                <div className="relative flex justify-center text-xs uppercase">
                                    <span className="bg-background px-2 text-muted-foreground">or</span>
                                </div>
                            </div>

                            {/* Labour Login Card */}
                            <Card className="shadow-card border-2 hover:border-primary/20 transition-colors">
                                <CardHeader className="pb-3">
                                    <div className="flex items-center gap-3">
                                        <div className="w-12 h-12 rounded-full bg-accent flex items-center justify-center">
                                            <HardHat className="h-6 w-6 text-accent-foreground" />
                                        </div>
                                        <div>
                                            <CardTitle className="text-lg">{t('loginAsLabour')}</CardTitle>
                                            <CardDescription>View tasks & attendance</CardDescription>
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    <form onSubmit={handleLabourLogin} className="space-y-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="labourPhone">{t('phoneNumber')}</Label>
                                            <div className="relative">
                                                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                                <Input
                                                    id="labourPhone"
                                                    type="tel"
                                                    placeholder="+91 98765 43210"
                                                    className="pl-10"
                                                    value={labourPhone}
                                                    onChange={(e) => setLabourPhone(e.target.value)}
                                                    required
                                                />
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="labourPassword">{t('password')}</Label>
                                            <div className="relative">
                                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                                <Input
                                                    id="labourPassword"
                                                    type={showLabourPassword ? "text" : "password"}
                                                    placeholder="••••••••"
                                                    className="pl-10 pr-10"
                                                    value={labourPassword}
                                                    onChange={(e) => setLabourPassword(e.target.value)}
                                                    required
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => setShowLabourPassword(!showLabourPassword)}
                                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                                                >
                                                    {showLabourPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                                </button>
                                            </div>
                                        </div>
                                        <Button
                                            type="submit"
                                            variant="outline"
                                            className="w-full border-primary text-primary hover:bg-primary hover:text-primary-foreground transition-all"
                                            disabled={isLabourLoggingIn}
                                        >
                                            {isLabourLoggingIn ? (
                                                <>
                                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                                    Logging in...
                                                </>
                                            ) : (
                                                t('login')
                                            )}
                                        </Button>
                                    </form>
                                </CardContent>
                            </Card>
                        </>
                    )}
                </div>
            </main>

            {/* Footer */}
            <footer className="p-4 text-center text-xs text-muted-foreground">
                <p>© 2024 ShramFlow. All rights reserved.</p>
            </footer>
        </div>
    );
};

export default Login;
