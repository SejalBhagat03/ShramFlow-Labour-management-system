/**
 * Centralized API configuration for ShramFlow
 */
export const API_BASE = import.meta.env.VITE_BACKEND_URL || "http://localhost:5000";

/**
 * Helper to ensure URLs don't have double slashes
 */
export const getApiUrl = (path) => {
    const cleanPath = path.startsWith('/') ? path.substring(1) : path;
    return `${API_BASE}/api/${cleanPath}`;
};

export default API_BASE;
