import { createContext, useContext, useEffect, useState, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { authService } from '@/services/authService';

const AuthContext = createContext({});

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    // Use a ref for the auth state listener to avoid stale closure issues
    const userRef = useRef(null);
    
    // Update ref whenever state changes
    useEffect(() => {
        userRef.current = user;
    }, [user]);

    useEffect(() => {
        let mounted = true;
        let lastUserId = null;
        let isFirstLoad = true;
        const loadingUsers = new Set();

        const syncProfile = async (session, source = 'unknown') => {
            if (!mounted || !session?.user) return;

            const userId = session.user.id;
            if (loadingUsers.has(userId)) return;
            
            // If we already have a confirmed DB profile for this user, skip refresh
            if (lastUserId === userId && userRef.current && !userRef.current.isFallback) return;
            
            loadingUsers.add(userId);
            lastUserId = userId;

            try {
                // Background fetch - we don't 'await' this in the main load flow anymore
                const profile = await authService.getUserProfile(userId, session.user);
                
                if (mounted) {
                    // Sync metadata if DB changed (background)
                    const meta = session.user.user_metadata || {};
                    const hasMetaIssue = (
                         profile.role !== meta.role || 
                         profile.name !== (meta.full_name || meta.name) || 
                         profile.organization_id !== meta.organization_id
                    );

                    if (hasMetaIssue) {
                        supabase.auth.updateUser({
                            data: { 
                                role: profile.role, 
                                full_name: profile.name,
                                organization_id: profile.organization_id 
                            }
                        }).catch(() => {});
                    }

                    setUser(profile);
                }
            } catch (err) {
                if (import.meta.env.DEV) console.log(`[AuthContext] Background sync skipped: ${err.message}`);
            } finally {
                loadingUsers.delete(userId);
                if (mounted) setIsLoading(false);
            }
        };

        const handleAuthState = async (session, source = 'unknown') => {
            if (!mounted) return;

            if (!session?.user) {
                setUser(null);
                setIsLoading(false);
                return;
            }

            // OPTIMISTIC UPDATE: Set user immediately from metadata so they don't wait
            const meta = session.user.user_metadata || {};
            const optimisticProfile = {
                id: session.user.id,
                email: session.user.email,
                name: meta.full_name || meta.name || 'User',
                role: meta.role || 'labour',
                organization_id: meta.organization_id || null,
                isFallback: true // We mark as fallback until DB confirms
            };

            setUser(optimisticProfile);
            setIsLoading(false); // Stop the spinner IMMEDIATELY

            // Then sync with DB in background
            syncProfile(session, source);
        };

        const init = async () => {
            try {
                const session = await authService.getSession();
                await handleAuthState(session, 'init');
            } catch (err) {
                if (mounted) setIsLoading(false);
            }
        };

        init();

        const { data: listener } = supabase.auth.onAuthStateChange(
            async (event, session) => {
                if (event === 'SIGNED_OUT') {
                    lastUserId = null;
                    setUser(null);
                    setIsLoading(false);
                } else if (event === 'SIGNED_IN' || event === 'USER_UPDATED' || event === 'TOKEN_REFRESHED') {
                    // Use ref to check current state in the listener
                    const currentUser = userRef.current;
                    if (!currentUser || currentUser.isFallback || (session?.user && session.user.id !== currentUser.id)) {
                        await handleAuthState(session, 'onAuthStateChange');
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
        try {
            // Add safety timeout to sign in
            return await Promise.race([
                supabase.auth.signInWithPassword({ email: identifier, password }),
                new Promise((_, rej) => setTimeout(() => rej(new Error('login timeout')), 20000))
            ]);
        } catch (err) {
            console.error('[AuthContext] login failed or timed out:', err.message);
            return { error: err };
        }
    };

    const signup = async (email, password, fullName = '', phone = '', role = 'supervisor') => {
        try {
            // Add safety timeout to sign up
            return await Promise.race([
                supabase.auth.signUp(
                    { email, password },
                    { data: { full_name: fullName, phone, role } }
                ),
                new Promise((_, rej) => setTimeout(() => rej(new Error('signup timeout')), 30000))
            ]);
        } catch (err) {
            console.error('[AuthContext] signup failed or timed out:', err.message);
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
}

export function useAuth() {
    return useContext(AuthContext);
}
