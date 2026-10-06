const prisma = require('../prisma');

/**
 * Get all products for a specific store
 */
async function getProductsByStore(req, res) {
  try {
    const storeId = parseInt(req.params.storeId, 10);
    if (isNaN(storeId)) return res.status(400).json({ success: false, message: 'Invalid store ID' });

    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const skip = (page - 1) * limit;

    const [total, products] = await Promise.all([
      prisma.product.count({ where: { storeId, deletedAt: null } }),
      prisma.product.findMany({
        where: { storeId, deletedAt: null },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit
      })
    ]);

    return res.status(200).json({ 
      success: true, 
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      },
      products 
    });
  } catch (error) {
    console.error('Get Products Error:', error);
    return res.status(500).json({ success: false, message: 'Failed to retrieve products' });
  }
}

/**
 * Add a new product to a store (Owner only)
 */
async function addProduct(req, res) {
  try {
    const storeId = parseInt(req.params.storeId, 10);
    const { name, description, price, stock } = req.body;

    if (!name || price === undefined) {
      return res.status(400).json({ success: false, message: 'Name and price are required' });
    }

    // Verify ownership
    const store = await prisma.store.findFirst({
      where: { id: storeId, userId: req.user.id, deletedAt: null }
    });

    if (!store && req.user.role.roleName.toLowerCase() !== 'admin') {
      return res.status(403).json({ success: false, message: 'You do not own this store' });
    }

    const product = await prisma.product.create({
      data: {
        storeId,
        name,
        description,
        price: parseFloat(price),
        stock: parseInt(stock, 10) || 0
      }
    });

    return res.status(201).json({ success: true, message: 'Product added successfully', product });
  } catch (error) {
    console.error('Add Product Error:', error);
    return res.status(500).json({ success: false, message: 'Failed to add product' });
  }
}

/**
 * Update a product
 */
async function updateProduct(req, res) {
  try {
    const productId = parseInt(req.params.productId, 10);
    const { name, description, price, stock } = req.body;

    // Verify product exists and owner
    const existing = await prisma.product.findFirst({
      where: { id: productId, deletedAt: null },
      include: { store: true }
    });

    if (!existing) return res.status(404).json({ success: false, message: 'Product not found' });
    
    if (existing.store.userId !== req.user.id && req.user.role.roleName.toLowerCase() !== 'admin') {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    const product = await prisma.product.update({
      where: { id: productId },
      data: {
        name: name !== undefined ? name : existing.name,
        description: description !== undefined ? description : existing.description,
        price: price !== undefined ? parseFloat(price) : existing.price,
        stock: stock !== undefined ? parseInt(stock, 10) : existing.stock,
      }
    });

    return res.status(200).json({ success: true, message: 'Product updated', product });
  } catch (error) {
    console.error('Update Product Error:', error);
    return res.status(500).json({ success: false, message: 'Failed to update product' });
  }
}

/**
 * Soft delete a product
 */
async function deleteProduct(req, res) {
  try {
    const productId = parseInt(req.params.productId, 10);

    const existing = await prisma.product.findFirst({
      where: { id: productId, deletedAt: null },
      include: { store: true }
    });

    if (!existing) return res.status(404).json({ success: false, message: 'Product not found' });
    
    if (existing.store.userId !== req.user.id && req.user.role.roleName.toLowerCase() !== 'admin') {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    await prisma.product.update({
      where: { id: productId },
      data: { deletedAt: new Date() }
    });

    return res.status(200).json({ success: true, message: 'Product deleted successfully' });
  } catch (error) {
    console.error('Delete Product Error:', error);
    return res.status(500).json({ success: false, message: 'Failed to delete product' });
  }
}

module.exports = { getProductsByStore, addProduct, updateProduct, deleteProduct };
