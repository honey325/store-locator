const express = require('express');
const router = express.Router();
const roleController = require('../controllers/roleController');
const { authenticateToken, authorizeRoles } = require('../middlewares/authMiddleware');

// Public or Authenticated routes
router.get('/', roleController.getAllRoles);
router.get('/:id', roleController.getRoleById);

// Admin-only management routes
router.post('/', authenticateToken, authorizeRoles('admin'), roleController.createRole);
router.put('/:id', authenticateToken, authorizeRoles('admin'), roleController.updateRole);
router.delete('/:id', authenticateToken, authorizeRoles('admin'), roleController.deleteRole);

module.exports = router;
