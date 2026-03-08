import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { authService } from '@/services/authService';

const AuthContext = createContext({});

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        let mounted = true;

        const init = async () => {
            if (import.meta.env.DEV) console.log('[AuthContext] init start');
            try {
                // race with a short timeout so we never hang forever
                const session = await Promise.race([
                    authService.getSession(),
                    new Promise((_, rej) => setTimeout(() => rej(new Error('session timeout')), 10000))
                ]);
                if (import.meta.env.DEV) console.log('[AuthContext] session result', session);

                if (!session?.user) {
                    if (import.meta.env.DEV) console.log('[AuthContext] no session user, treating as signed out');
                    setUser(null);
                    return;
                }

                // Pass session.user to optimize profile fetching
                const profile = await Promise.race([
                    authService.getUserProfile(session.user.id, session.user),
                    new Promise((_, rej) => setTimeout(() => rej(new Error('profile timeout')), 10000))
                ]);
                if (import.meta.env.DEV) console.log('[AuthContext] fetched profile', profile);
                if (mounted) setUser(profile);
            } catch (err) {
                console.error('[AuthContext] Auth init failed:', err);
                if (mounted) {
                    setUser(null);
                }
            } finally {
                if (mounted) {
                    if (import.meta.env.DEV) console.log('[AuthContext] setting isLoading false');
                    setIsLoading(false);
                }
            }
        };

        init();

        const { data: listener } = supabase.auth.onAuthStateChange(
            async (event, session) => {
                if (event === 'SIGNED_OUT') {
                    setUser(null);
                    setIsLoading(false);
                }

                if (event === 'SIGNED_IN' && session?.user) {
                    try {
                        // Pass session.user here too
                        const profile = await authService.getUserProfile(session.user.id, session.user);
                        setUser(profile);
                    } catch (e) {
                        console.error('Profile load failed after login', e);
                        setUser(null);
                    } finally {
                        setIsLoading(false);
                    }
                }
            }
        );

        return () => {
            mounted = false;
            listener.subscription.unsubscribe();
        };
    }, []);

    // Wrap Supabase auth helpers to keep calling sites simple (email, password)
    const login = async (identifier, password) => {
        // identifier may already be a pseudo-email or real email
        try {
            return await supabase.auth.signInWithPassword({ email: identifier, password });
        } catch (err) {
            return { error: err };
        }
    };

    const signup = async (email, password, fullName = '', phone = '', role = 'supervisor') => {
        try {
            // Pass metadata in `options.data` so the profile can be enriched server-side
            // include a role hint that the trigger can consume
            return await supabase.auth.signUp(
                { email, password },
                { data: { full_name: fullName, phone, role } }
            );
        } catch (err) {
            return { error: err };
        }
    };

    return (
        <AuthContext.Provider
            value={{
                user,
                isAuthenticated: !!user,
                isLoading,
                login,
                signup,
                logout: authService.signOut
            }}
        >
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
