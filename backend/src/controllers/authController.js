const bcrypt = require('bcryptjs');
const prisma = require('../prisma');
const { generateToken } = require('../utils/jwt');

// Helper for user response selection (omits password, createdAt, updatedAt, and deletedAt)
const authUserSelect = {
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
 * Register a new user (Customer or Shop Owner/Owner)
 */
async function register(req, res) {
  try {
    const { name, email, password, roleName } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Name, email, and password are required fields',
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Check if user already exists
    const existingUser = await prisma.users.findUnique({
      where: { email: normalizedEmail },
    });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'An account with this email address already exists',
      });
    }

    // Determine target role (default to 'customer' if not specified)
    const targetRoleName = (roleName || 'customer').trim().toLowerCase();

    // Prevent regular registration from claiming admin role
    if (targetRoleName === 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Admin accounts cannot be self-registered',
      });
    }

    const role = await prisma.roles.findFirst({
      where: {
        roleName: {
          equals: targetRoleName,
          mode: 'insensitive',
        },
        deletedAt: null, // Only assign active, non-deleted roles
      },
      select: {
        id: true,
        roleName: true,
      },
    });

    if (!role) {
      return res.status(400).json({
        success: false,
        message: `Role "${targetRoleName}" not found. Valid roles are: customer, owner`,
      });
    }

    // Hash the password
    const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS, 10) || 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Create user (select only safe fields, excluding createdAt, updatedAt, deletedAt, password)
    const newUser = await prisma.users.create({
      data: {
        name: name.trim(),
        email: normalizedEmail,
        password: hashedPassword,
        roleId: role.id,
      },
      select: authUserSelect,
    });

    // Generate JWT
    const token = generateToken({
      id: newUser.id,
      email: newUser.email,
      role: newUser.role.roleName,
    });

    return res.status(201).json({
      success: true,
      message: 'User registered successfully',
      token,
      user: newUser,
    });
  } catch (error) {
    console.error('Registration Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to register user',
      error: error.message,
    });
  }
}

/**
 * Login user with email and password
 */
async function login(req, res) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required',
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Find active, non-deleted user (deletedAt is null)
    const user = await prisma.users.findFirst({
      where: {
        email: normalizedEmail,
        deletedAt: null, // Exclude soft-deleted user
      },
      select: {
        id: true,
        name: true,
        email: true,
        password: true,
        roleId: true,
        role: {
          select: {
            id: true,
            roleName: true,
          },
        },
      },
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password',
      });
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password',
      });
    }

    // Generate JWT token
    const token = generateToken({
      id: user.id,
      email: user.email,
      role: user.role.roleName,
    });

    // Strip password from user payload
    const { password: _, ...userResponse } = user;

    return res.status(200).json({
      success: true,
      message: 'Login successful',
      token,
      user: userResponse,
    });
  } catch (error) {
    console.error('Login Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to log in',
      error: error.message,
    });
  }
}

/**
 * Logout user
 */
async function logout(req, res) {
  try {
    return res.status(200).json({
      success: true,
      message: 'Logout successful. Please remove the token from your client storage.',
    });
  } catch (error) {
    console.error('Logout Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to log out',
      error: error.message,
    });
  }
}

/**
 * Get current authenticated user profile
 */
async function getMe(req, res) {
  try {
    return res.status(200).json({
      success: true,
      user: req.user,
    });
  } catch (error) {
    console.error('Get Profile Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch user profile',
      error: error.message,
    });
  }
}

module.exports = {
  register,
  login,
  logout,
  getMe,
};
