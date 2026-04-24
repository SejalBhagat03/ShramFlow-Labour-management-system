import { useContext } from 'react';
import { AuthContext } from '../contexts/AuthContext';

/**
 * Custom hook to use the AuthContext.
 * Provides access to the current user, session, and authentication methods.
 * 
 * @returns {import('../contexts/AuthContext').AuthContextType} The auth context value.
 */
export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
