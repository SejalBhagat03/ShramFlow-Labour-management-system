import { createContext } from 'react';

/**
 * AuthContext instance.
 * Separated into a plain .js file to ensure Vite HMR compatibility 
 * when exported alongside the AuthProvider component.
 */
export const AuthContext = createContext({});
