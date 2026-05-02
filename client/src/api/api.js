/**
 * Centralized API configuration for ShramFlow.
 * In production (e.g., Vercel), set VITE_API_BASE_URL to your deployed backend URL.
 * Local development defaults to http://localhost:5000.
 */
export const API_BASE = import.meta.env.VITE_API_BASE_URL;

/**
 * Helper to ensure URLs don't have double slashes
 */
export const getApiUrl = (path) => {
    const cleanPath = path.startsWith('/') ? path.substring(1) : path;
    return `${API_BASE}/api/${cleanPath}`;
};

export default API_BASE;
