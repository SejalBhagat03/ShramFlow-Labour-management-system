const supabase = require('../config/supabase');

/**
 * Get all users across all organizations (SuperAdmin only)
 */
exports.getAllUsers = async (req, res) => {
    try {
        const { page = 1, limit = 50, search = '' } = req.query;
        const offset = (page - 1) * limit;

        // Note: auth.admin.listUsers() is restricted, so we use our public 'profiles' and 'user_roles' table
        // We assume we have a profiles table that mirrors some user data
        let query = supabase
            .from('profiles')
            .select(`
                *,
                user_roles (role)
            `, { count: 'exact' });

        if (search) {
            query = query.ilike('name', `%${search}%`);
        }

        const { data, count, error } = await query
            .range(offset, offset + limit - 1)
            .order('created_at', { ascending: false });

        if (error) throw error;

        res.json({
            users: data.map(u => ({
                id: u.user_id,
                name: u.name,
                email: u.email,
                role: u.user_roles?.[0]?.role || 'labour',
                organization_id: u.organization_id,
                created_at: u.created_at
            })),
            pagination: {
                total: count,
                page: Number(page),
                limit: Number(limit),
                totalPages: Math.ceil(count / limit)
            }
        });
    } catch (error) {
        console.error('[UserController] Get All Users Error:', error.message);
        res.status(500).json({ error: error.message });
    }
};

/**
 * Update user role (SuperAdmin only)
 */
exports.updateUserRole = async (req, res) => {
    try {
        const { userId } = req.params;
        const { role } = req.body;

        if (!['superadmin', 'supervisor', 'labour'].includes(role)) {
            return res.status(400).json({ error: 'Invalid role' });
        }

        // 1. Update user_roles table
        const { error: roleErr } = await supabase
            .from('user_roles')
            .upsert({ user_id: userId, role }, { onConflict: 'user_id' });

        if (roleErr) throw roleErr;

        // 2. Update user metadata in auth.users (requires Admin Client)
        const { error: authErr } = await supabase.auth.admin.updateUserById(userId, {
            user_metadata: { role }
        });

        if (authErr) {
            console.warn('[UserController] Auth Metadata Update Error:', authErr.message);
            // We don't fail here if the table updated but metadata failed (though both should work)
        }

        res.json({ message: `User role updated to ${role} successfully` });
    } catch (error) {
        console.error('[UserController] Update Role Error:', error.message);
        res.status(500).json({ error: error.message });
    }
};

/**
 * Delete user (SuperAdmin only)
 */
exports.deleteUser = async (req, res) => {
    try {
        const { userId } = req.params;

        // 1. Delete from auth.users
        const { error: authErr } = await supabase.auth.admin.deleteUser(userId);
        if (authErr) throw authErr;

        // Cascading deletes should handle the rest (profiles, user_roles, etc.)
        res.json({ message: "User deleted successfully" });
    } catch (error) {
        console.error('[UserController] Delete User Error:', error.message);
        res.status(500).json({ error: error.message });
    }
};
