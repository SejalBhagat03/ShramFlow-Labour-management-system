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
            return res.status(401).json({ error: 'Not authorized, no token' });
        }

        // 1. Verify token with Supabase
        const { data: { user }, error: authError } = await supabase.auth.getUser(token);

        if (authError || !user) {
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
        
        // 3. Resolve Organization ID (Deterministic & Secure)
        const userRole = user.user_metadata?.role || profile?.role;
        let orgId = profile?.organization_id || user.user_metadata?.organization_id;

        // Logic: ONLY superadmins can override the organization context via headers
        if (userRole === 'superadmin') {
            const requestedOrgId = req.headers['x-organization-id'] || req.query.organization_id;
            if (requestedOrgId) {
                orgId = requestedOrgId;
            }
        }

        // 4. Verification Check
        if (!orgId || orgId === 'null' || orgId === 'undefined') {
            // Last resort for legacy/migration: Try to find any associated organization
            const { data: fallbackOrg } = await supabase
                .from('organizations')
                .select('id')
                .order('created_at', { ascending: true })
                .limit(1)
                .maybeSingle();
            
            orgId = fallbackOrg?.id || null;
        }

        req.orgId = orgId;
        req.userRole = userRole; // Bonus: Attach role for downstream logic

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
            // ALWAYS ALLOW SUPERADMIN
            const metadataRole = req.user.user_metadata?.role;
            if (metadataRole === 'superadmin') {
                return next();
            }

            // First check user metadata for role to avoid DB hit if possible or if DB is slow
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

/**
 * checkPermission
 * Middleware to restrict access based on specific permissions
 * @param {string} permission - The permission string to check
 */
exports.checkPermission = (permission) => {
    return async (req, res, next) => {
        try {
            // Check if user has the specific permission through any of their roles
            const { data, error } = await supabase
                .rpc('user_has_permission', { p_permission: permission });

            if (error) {
                console.error('[CheckPermission] Error:', error.message);
                return res.status(500).json({ error: 'Permission check failed' });
            }

            if (!data) {
                return res.status(403).json({ error: `Not authorized: Missing permission '${permission}'` });
            }

            next();
        } catch (error) {
            console.error('CheckPermission Middleware Error:', error);
            res.status(403).json({ error: 'Forbidden' });
        }
    };
};
