'use strict';

const logger = require('../utils/logger');

/**
 * Role-based Authorization Middleware Factory
 * @param {string[]} roles - Array of allowed role names
 * @returns {Function} Express middleware
 *
 * Usage:
 *   router.get('/admin', authenticate, authorize(['HR', 'Finance']), handler)
 */
const authorize = (roles = []) => {
  if (typeof roles === 'string') {
    roles = [roles];
  }

  return (req, res, next) => {
    if (!req.user) {
      logger.warn('authorize() called without req.user — ensure authenticate middleware runs first', {
        path: req.path,
        method: req.method,
      });
      return res.status(401).json({
        success: false,
        message: 'Authentication required.',
        code: 'NOT_AUTHENTICATED',
      });
    }

    const userRoles = Array.isArray(req.userRoles)
      ? req.userRoles
      : req.userRole
      ? [req.userRole]
      : [];

    if (userRoles.length === 0) {
      logger.warn('User has no role assigned', {
        userId: req.userId,
        path: req.path,
      });
      return res.status(403).json({
        success: false,
        message: 'Access denied. No role assigned to your account.',
        code: 'NO_ROLE',
      });
    }

    if (roles.length === 0) {
      // No roles specified means any authenticated user is allowed
      return next();
    }

    const isAuthorized = roles.some((role) =>
      userRoles.some((userRole) => userRole.toLowerCase() === role.toLowerCase())
    );

    if (!isAuthorized) {
      const userRolesDisplay = userRoles.join(', ');
      logger.warn('Unauthorized access attempt', {
        userId: req.userId,
        userRoles: userRolesDisplay,
        requiredRoles: roles,
        path: req.path,
        method: req.method,
        ip: req.ip,
      });
      return res.status(403).json({
        success: false,
        message: `Access denied. Required role(s): ${roles.join(', ')}. Your roles: ${userRolesDisplay}.`,
        code: 'FORBIDDEN',
      });
    }

    next();
  };
};

module.exports = authorize;
