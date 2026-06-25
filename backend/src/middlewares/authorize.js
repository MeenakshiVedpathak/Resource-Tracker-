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

    const userRole = req.userRole;

    if (!userRole) {
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

    const isAuthorized = roles.some(
      (role) => role.toLowerCase() === userRole.toLowerCase()
    );

    if (!isAuthorized) {
      logger.warn('Unauthorized access attempt', {
        userId: req.userId,
        userRole,
        requiredRoles: roles,
        path: req.path,
        method: req.method,
        ip: req.ip,
      });
      return res.status(403).json({
        success: false,
        message: `Access denied. Required role(s): ${roles.join(', ')}. Your role: ${userRole}.`,
        code: 'FORBIDDEN',
      });
    }

    next();
  };
};

module.exports = authorize;
