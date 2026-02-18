import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { authService } from '@/services/authService';

const AuthContext = createContext({});

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        let mounted = true;

        const init = async () => {
            try {
                const session = await authService.getSession();
                if (!session?.user) {
                    setUser(null);
                    return;
                }

                const profile = await authService.getUserProfile(session.user.id);
                if (mounted) setUser(profile);
            } catch (err) {
                console.error('Auth init failed:', err);
                if (mounted) setUser(null);
            } finally {
                if (mounted) setIsLoading(false);
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
                        const profile = await authService.getUserProfile(session.user.id);
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

    const signup = async (email, password, fullName = '', phone = '') => {
        try {
            // Pass metadata in `options.data` so the profile can be enriched server-side
            return await supabase.auth.signUp({ email, password }, { data: { full_name: fullName, phone } });
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
