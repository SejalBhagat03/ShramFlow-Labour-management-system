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
            .single();

        if (profileError || !profile) {
            console.log('[AuthMiddleware] Profile fetch failed for user:', user.id, profileError?.message);
            return res.status(401).json({
                error: 'User profile or organization not found',
                details: profileError?.message,
                userId: user.id
            });
        }

        if (!profile.organization_id) {
            console.log('[AuthMiddleware] User has no organization assigned:', user.id);
            // We might want to allow this if there's a default, or reject.
            // For SaaS, organization_id is usually mandatory.
        }

        // 3. Attach user and orgId to request
        req.user = user;
        req.orgId = profile.organization_id;

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
            const { data, error } = await supabase
                .from('user_roles')
                .select('role')
                .eq('user_id', req.user.id)
                .in('role', roles)
                .single();

            if (error || !data) {
                return res.status(403).json({ error: `User role is not authorized to access this route` });
            }

            next();
        } catch (error) {
            console.error('Authorize Middleware Error:', error);
            res.status(403).json({ error: 'Forbidden' });
        }
    };
};
