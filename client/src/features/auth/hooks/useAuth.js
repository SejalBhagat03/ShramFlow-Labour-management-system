import { useContext } from 'react';
import { AuthContext } from '@/providers/AuthContext';
import { API_BASE } from '@/api/api';

/**
 * Custom hook to use the AuthContext.
 * Provides access to the current user, session, and authentication methods.
 * 
 * @returns {import('@/providers/AuthContext').AuthContextType & { authFetch: (url: string, options?: RequestInit) => Promise<Response> }} The auth context value.
 */
export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }

    const authFetch = async (url, options = {}) => {
        const token = context.session?.access_token;
        const headers = {
            ...options.headers,
        };
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }
        
        // Ensure url has the full API_BASE prefix if it's relative
        const absoluteUrl = url.startsWith('http') ? url : `${API_BASE || ''}${url}`;
        
        return fetch(absoluteUrl, {
            ...options,
            headers,
        });
    };

    return {
        ...context,
        authFetch
    };
}
