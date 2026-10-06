const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { authenticateToken, authorizeRoles } = require('../middlewares/authMiddleware');

// All user routes require authentication
router.use(authenticateToken);

// Admin-only listing
router.get('/', authorizeRoles('admin'), userController.getAllUsers);

// Self or admin routes
router.get('/:id', userController.getUserById);
router.put('/:id', userController.updateUser);
router.delete('/:id', userController.deleteUser);

module.exports = router;
