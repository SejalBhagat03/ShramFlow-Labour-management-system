const express = require('express');
const router = express.Router();
const labourController = require('../controllers/labourController');
const { protect, authorize } = require('../middlewares/authMiddleware');
const supabase = require('../config/supabase');

/**
 * Proxy for creating labourer login accounts in Supabase Auth.
 * We now use the Supabase Admin Client directly from the server to bypass 
 * the need for deploying Edge Functions.
 */
router.post('/create-user', protect, authorize(['supervisor']), async (req, res) => {
    try {
        const { email, password, fullName, phone, orgId } = req.body;

        // 1. Create the user in Supabase Auth using Admin Client
        const { data: authData, error: authError } = await supabase.auth.admin.createUser({
            email,
            password,
            email_confirm: true,
            user_metadata: {
                full_name: fullName,
                phone: phone || null,
                organization_id: orgId,
                role: 'labour'
            }
        });

        if (authError) {
            console.error('[Labour Auth Create Error]:', authError.message);
            return res.status(400).json({ error: authError.message });
        }

        const userId = authData.user.id;

        // 2. Assign 'labour' role to the new user in the user_roles table
        const { error: roleError } = await supabase
            .from('user_roles')
            .upsert({ user_id: userId, role: 'labour' }, { onConflict: 'user_id,role' });

        if (roleError) {
            console.error('[Labour Role Assign Error]:', roleError.message);
            // We don't fail the whole request if just the role table update fails, 
            // but we log it.
        }

        console.log(`[Success] Created labourer account: ${userId} for ${email}`);
        
        res.json({
            userId: userId,
            message: "Labour account created successfully"
        });
    } catch (error) {
        console.error('[Labour User Creation Error]:', error.message);
        res.status(500).json({ error: error.message });
    }
});

// Standard CRUD Routes
router.get('/', protect, authorize(['supervisor']), labourController.getAllLabourers);
router.get('/:id', protect, authorize(['supervisor', 'labour']), labourController.getLabourerById);
router.get('/:id/balance', protect, authorize(['supervisor', 'labour']), labourController.getLabourBalance);
router.get('/:id/stats', protect, authorize(['supervisor', 'labour']), labourController.getLabourStats);
router.post('/', protect, authorize(['supervisor']), labourController.createLabourer);
router.patch('/:id', protect, authorize(['supervisor']), labourController.updateLabourer);
router.get('/:id/history', protect, authorize(['supervisor']), labourController.getWorkHistory);
router.get('/:id/ledger', protect, authorize(['supervisor', 'labour']), labourController.getLedger);
router.delete('/:id', protect, authorize(['supervisor']), labourController.deleteLabourer);

module.exports = router;
