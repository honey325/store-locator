const prisma = require('../prisma');
const bcrypt = require('bcryptjs');

// Standard user field selection without createdAt, updatedAt, deletedAt, or password
const userSelect = {
  id: true,
  name: true,
  email: true,
  roleId: true,
  role: {
    select: {
      id: true,
      roleName: true,
    },
  },
};

/**
 * Get all users with search, role filter, and pagination (Admin only)
 */
async function getAllUsers(req, res) {
  try {
    const { search, role, page = 1, limit = 10 } = req.query;

    const pageNumber = Math.max(1, parseInt(page, 10));
    const pageSize = Math.max(1, Math.min(100, parseInt(limit, 10)));
    const skip = (pageNumber - 1) * pageSize;

    // Filter out soft-deleted users (where deletedAt is null)
    const where = {
      deletedAt: null,
    };

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (role) {
      where.role = {
        roleName: { equals: role, mode: 'insensitive' },
        deletedAt: null,
      };
    }

    const [total, users] = await Promise.all([
      prisma.users.count({ where }),
      prisma.users.findMany({
        where,
        select: userSelect,
        orderBy: { id: 'desc' },
        skip,
        take: pageSize,
      }),
    ]);

    return res.status(200).json({
      success: true,
      pagination: {
        total,
        page: pageNumber,
        limit: pageSize,
        totalPages: Math.ceil(total / pageSize),
      },
      users,
    });
  } catch (error) {
    console.error('Get All Users Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve users',
      error: error.message,
    });
  }
}

/**
 * Get user by ID (excludes soft-deleted, createdAt, updatedAt)
 */
async function getUserById(req, res) {
  try {
    const userId = parseInt(req.params.id, 10);
    if (isNaN(userId)) {
      return res.status(400).json({ success: false, message: 'Invalid user ID' });
    }

    // Only allow users to view themselves unless they are admin
    if (req.user.role.roleName.toLowerCase() !== 'admin' && req.user.id !== userId) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const user = await prisma.users.findFirst({
      where: {
        id: userId,
        deletedAt: null, // Exclude soft-deleted users
      },
      select: {
        ...userSelect,
        stores: {
          where: { deletedAt: null }, // Exclude soft-deleted stores
          select: {
            id: true,
            name: true,
            userId: true,
            addresses: {
              where: { deletedAt: null }, // Exclude soft-deleted addresses
              select: {
                id: true,
                storeId: true,
                addressLine1: true,
                addressLine2: true,
                city: true,
                state: true,
                pincode: true,
                latitude: true,
                longitude: true,
              },
            },
          },
        },
      },
    });

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    return res.status(200).json({ success: true, user });
  } catch (error) {
    console.error('Get User By ID Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve user',
      error: error.message,
    });
  }
}

/**
 * Update user details
 */
async function updateUser(req, res) {
  try {
    const userId = parseInt(req.params.id, 10);
    if (isNaN(userId)) {
      return res.status(400).json({ success: false, message: 'Invalid user ID' });
    }

    const isAdmin = req.user.role.roleName.toLowerCase() === 'admin';
    if (!isAdmin && req.user.id !== userId) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    // Check if user exists and is not soft-deleted
    const existing = await prisma.users.findFirst({
      where: { id: userId, deletedAt: null },
    });

    if (!existing) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const { name, password, roleId } = req.body;
    const updateData = {};

    if (name) updateData.name = name.trim();
    if (password) {
      const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS, 10) || 10;
      updateData.password = await bcrypt.hash(password, saltRounds);
    }
    // Only admins can change user roles
    if (roleId && isAdmin) {
      updateData.roleId = parseInt(roleId, 10);
    }

    const updatedUser = await prisma.users.update({
      where: { id: userId },
      data: updateData,
      select: userSelect,
    });

    return res.status(200).json({
      success: true,
      message: 'User updated successfully',
      user: updatedUser,
    });
  } catch (error) {
    console.error('Update User Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update user',
      error: error.message,
    });
  }
}

/**
 * Soft delete user
 */
async function deleteUser(req, res) {
  try {
    const userId = parseInt(req.params.id, 10);
    if (isNaN(userId)) {
      return res.status(400).json({ success: false, message: 'Invalid user ID' });
    }

    const isAdmin = req.user.role.roleName.toLowerCase() === 'admin';
    if (!isAdmin && req.user.id !== userId) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const existing = await prisma.users.findFirst({
      where: { id: userId, deletedAt: null },
    });

    if (!existing) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    await prisma.users.update({
      where: { id: userId },
      data: { deletedAt: new Date() },
    });

    return res.status(200).json({
      success: true,
      message: 'User deactivated successfully',
    });
  } catch (error) {
    console.error('Delete User Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to delete user',
      error: error.message,
    });
  }
}

module.exports = {
  getAllUsers,
  getUserById,
  updateUser,
  deleteUser,
};
