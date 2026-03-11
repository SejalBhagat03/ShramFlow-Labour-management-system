const supabase = require('../config/supabase');

/**
 * authMiddleware
 * Verifies the Supabase JWT from the Authorization header
 * and fetches the user's organization_id.
 */
exports.protect = async (req, res, next) => {
    try {
        let token;
        if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
            token = req.headers.authorization.split(' ')[1];
        }

        if (!token) {
            console.log('[AuthMiddleware] No token provided');
            return res.status(401).json({ error: 'Not authorized, no token' });
        }

        // 1. Verify token with Supabase
        const { data: { user }, error: authError } = await supabase.auth.getUser(token);

        if (authError || !user) {
            console.log('[AuthMiddleware] Token verification failed:', authError?.message);
            return res.status(401).json({ error: 'Not authorized, invalid token', message: authError?.message });
        }

        // 2. Fetch user profile to get organization_id
        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('organization_id')
            .eq('user_id', user.id)
            .maybeSingle();

        if (profileError) {
            console.error('[AuthMiddleware] Profile fetch error:', profileError.message);
            // Don't block here, try to use metadata next
        }

        // Attach user
        req.user = user;
        
        // 3. Resolve Organization ID (DB -> Metadata -> Fallback)
        const orgId = profile?.organization_id || user.user_metadata?.organization_id;
        
        if (!orgId) {
            console.warn('[AuthMiddleware] No organization_id found for user:', user.id);
            // We allow the request to proceed but attach a null orgId
            // The controllers will handle if they strictly need it
            req.orgId = null;
        } else {
            req.orgId = orgId;
        }

        next();
    } catch (error) {
        console.error('Auth Middleware Critical Error:', error);
        res.status(401).json({ error: 'Not authorized', message: error.message });
    }
};

/**
 * authorize
 * Middleware to restrict access based on user roles
 * @param {string[]} roles - Array of allowed roles
 */
exports.authorize = (roles) => {
    return async (req, res, next) => {
        try {
            // First check user metadata for role to avoid DB hit if possible or if DB is slow
            const metadataRole = req.user.user_metadata?.role;
            if (roles.includes(metadataRole)) {
                return next();
            }

            const { data, error } = await supabase
                .from('user_roles')
                .select('role')
                .eq('user_id', req.user.id)
                .in('role', roles)
                .maybeSingle();

            if (error) {
                console.error('[Authorize] Role fetch error:', error.message);
            }

            if (!data && !roles.includes(metadataRole)) {
                return res.status(403).json({ error: `User role is not authorized to access this route` });
            }

            next();
        } catch (error) {
            console.error('Authorize Middleware Error:', error);
            res.status(403).json({ error: 'Forbidden' });
        }
    };
};
