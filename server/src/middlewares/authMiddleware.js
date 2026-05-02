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
        
        // 3. Resolve Organization ID (DB -> Metadata -> Query -> Header)
        let orgId = profile?.organization_id || 
                      user.user_metadata?.organization_id || 
                      req.query.organization_id || 
                      req.headers['x-organization-id'];

        // 4. Fallback for Supervisors/Admins if still no orgId
        if (!orgId || orgId === 'null') {
            const { data: roleData, error: roleErr } = await supabase
                .from('user_roles')
                .select('role')
                .eq('user_id', user.id)
                .eq('role', 'supervisor') // Only check for supervisor to avoid enum error
                .maybeSingle();

            if (roleErr) console.error('[AuthMiddleware] Role check error:', roleErr.message);

            if (roleData) {
                const { data: firstOrg, error: orgErr } = await supabase
                    .from('organizations')
                    .select('id')
                    .order('created_at', { ascending: true })
                    .limit(1)
                    .maybeSingle();
                
                if (orgErr) console.error('[AuthMiddleware] Org fetch error:', orgErr.message);

                if (firstOrg) {
                    orgId = firstOrg.id;
                } else {
                    console.warn('[AuthMiddleware] Fallback FAILED: No organizations found');
                }
            }
        }

        if (!orgId) {
            console.warn('[AuthMiddleware] Final organization_id is NULL');
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
