const prisma = require('../prisma');

// Field selection helper to exclude createdAt, updatedAt, and deletedAt
const roleSelect = {
  id: true,
  roleName: true,
};

/**
 * Get all active roles (excludes deleted roles and admin role)
 */
async function getAllRoles(req, res) {
  try {
    const roles = await prisma.roles.findMany({
      where: {
        deletedAt: null, // Exclude soft-deleted roles
        roleName: { not: 'admin' },
      },
      select: roleSelect,
      orderBy: { id: 'asc' },
    });

    return res.status(200).json({
      success: true,
      roles,
    });
  } catch (error) {
    console.error('Get All Roles Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve roles',
      error: error.message,
    });
  }
}

/**
 * Get role by ID (excludes soft-deleted)
 */
async function getRoleById(req, res) {
  try {
    const roleId = parseInt(req.params.id, 10);
    if (isNaN(roleId)) {
      return res.status(400).json({ success: false, message: 'Invalid role ID' });
    }

    const role = await prisma.roles.findFirst({
      where: {
        id: roleId,
        deletedAt: null, // Exclude soft-deleted
      },
      select: roleSelect,
    });

    if (!role) {
      return res.status(404).json({ success: false, message: 'Role not found' });
    }

    return res.status(200).json({ success: true, role });
  } catch (error) {
    console.error('Get Role By ID Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve role',
      error: error.message,
    });
  }
}

/**
 * Create a new role (Admin only)
 */
async function createRole(req, res) {
  try {
    const { roleName } = req.body;
    if (!roleName || !roleName.trim()) {
      return res.status(400).json({ success: false, message: 'roleName is required' });
    }

    const normalizedName = roleName.trim().toLowerCase();

    // Check if active role already exists
    const existing = await prisma.roles.findFirst({
      where: {
        roleName: { equals: normalizedName, mode: 'insensitive' },
        deletedAt: null,
      },
    });

    if (existing) {
      return res.status(409).json({ success: false, message: 'Role already exists' });
    }

    const newRole = await prisma.roles.create({
      data: { roleName: normalizedName },
      select: roleSelect,
    });

    return res.status(201).json({
      success: true,
      message: 'Role created successfully',
      role: newRole,
    });
  } catch (error) {
    console.error('Create Role Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to create role',
      error: error.message,
    });
  }
}

/**
 * Update role (Admin only)
 */
async function updateRole(req, res) {
  try {
    const roleId = parseInt(req.params.id, 10);
    const { roleName } = req.body;

    if (isNaN(roleId)) {
      return res.status(400).json({ success: false, message: 'Invalid role ID' });
    }

    if (!roleName || !roleName.trim()) {
      return res.status(400).json({ success: false, message: 'roleName is required' });
    }

    // Verify role exists and is not soft-deleted
    const existing = await prisma.roles.findFirst({
      where: { id: roleId, deletedAt: null },
    });

    if (!existing) {
      return res.status(404).json({ success: false, message: 'Role not found' });
    }

    const updatedRole = await prisma.roles.update({
      where: { id: roleId },
      data: { roleName: roleName.trim().toLowerCase() },
      select: roleSelect,
    });

    return res.status(200).json({
      success: true,
      message: 'Role updated successfully',
      role: updatedRole,
    });
  } catch (error) {
    console.error('Update Role Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update role',
      error: error.message,
    });
  }
}

/**
 * Soft-delete role (Admin only)
 */
async function deleteRole(req, res) {
  try {
    const roleId = parseInt(req.params.id, 10);
    if (isNaN(roleId)) {
      return res.status(400).json({ success: false, message: 'Invalid role ID' });
    }

    const existing = await prisma.roles.findFirst({
      where: { id: roleId, deletedAt: null },
    });

    if (!existing) {
      return res.status(404).json({ success: false, message: 'Role not found' });
    }

    await prisma.roles.update({
      where: { id: roleId },
      data: { deletedAt: new Date() },
    });

    return res.status(200).json({
      success: true,
      message: 'Role deleted successfully',
    });
  } catch (error) {
    console.error('Delete Role Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to delete role',
      error: error.message,
    });
  }
}

module.exports = {
  getAllRoles,
  getRoleById,
  createRole,
  updateRole,
  deleteRole,
};
