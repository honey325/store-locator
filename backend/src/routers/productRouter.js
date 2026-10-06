const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');
const { authenticateToken, authorizeRoles } = require('../middlewares/authMiddleware');

// Get products (public or customer)
router.get('/:storeId', authenticateToken, productController.getProductsByStore);

// Owner-only product management
router.post('/:storeId', authenticateToken, authorizeRoles('owner', 'admin'), productController.addProduct);
router.put('/:productId', authenticateToken, authorizeRoles('owner', 'admin'), productController.updateProduct);
router.delete('/:productId', authenticateToken, authorizeRoles('owner', 'admin'), productController.deleteProduct);

module.exports = router;
