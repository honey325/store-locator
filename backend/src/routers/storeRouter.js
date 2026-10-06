const express = require('express');
const router = express.Router();
const storeController = require('../controllers/storeController');
const { authenticateToken, authorizeRoles } = require('../middlewares/authMiddleware');

// Public search endpoints
router.get('/', storeController.getAllStores);
router.get('/nearest', storeController.getNearestStores);

// Authenticated shop owner endpoints
router.get('/my-stores', authenticateToken, authorizeRoles('owner', 'admin'), storeController.getMyStores);
router.get('/:id', storeController.getStoreById);

// Create, Update, Delete (Shop Owner / Owner or Admin)
router.post('/', authenticateToken, authorizeRoles('owner', 'admin'), storeController.createStore);
router.put('/:id', authenticateToken, authorizeRoles('owner', 'admin'), storeController.updateStore);
router.delete('/:id', authenticateToken, authorizeRoles('owner', 'admin'), storeController.deleteStore);

module.exports = router;
