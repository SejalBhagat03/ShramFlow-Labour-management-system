const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { protect, authorize } = require('../middlewares/authMiddleware');

// All routes here are restricted to superadmin
router.use(protect, authorize(['superadmin']));

router.get('/', userController.getAllUsers);
router.patch('/:userId/role', userController.updateUserRole);
router.delete('/:userId', userController.deleteUser);

module.exports = router;
