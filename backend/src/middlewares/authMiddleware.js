const { verifyToken } = require('../utils/jwt');
const prisma = require('../prisma');

/**
 * Middleware to verify JWT token and authenticate user
 */
async function authenticateToken(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Access denied: No token provided or malformed authorization header. Format should be: Bearer <token>',
      });
    }

    const token = authHeader.split(' ')[1];
    let decoded;

    try {
      decoded = verifyToken(token);
    } catch (err) {
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired token',
        error: err.message,
      });
    }

    // Fetch user from DB to verify they still exist and are not soft-deleted (deletedAt is null)
    const user = await prisma.users.findFirst({
      where: {
        id: decoded.id,
        deletedAt: null,
      },
      select: {
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
      },
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User belonging to this token no longer exists or has been deactivated',
      });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error('Authentication Middleware Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error during authentication',
      error: error.message,
    });
  }
}

/**
 * Middleware to authorize specific roles
 * @param  {...string} allowedRoles - Names of allowed roles (e.g. 'admin', 'owner', 'customer')
 */
function authorizeRoles(...allowedRoles) {
  const normalizedAllowed = allowedRoles.map((r) => r.toLowerCase());

  return (req, res, next) => {
    if (!req.user || !req.user.role) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized: User role not identified',
      });
    }

    const userRole = (req.user.role.roleName || '').toLowerCase();

    if (!normalizedAllowed.includes(userRole)) {
      return res.status(403).json({
        success: false,
        message: `Forbidden: Access denied. Required role: [${allowedRoles.join(', ')}], your role: [${req.user.role.roleName}]`,
      });
    }

    next();
  };
}

module.exports = {
  authenticateToken,
  authorizeRoles,
};
