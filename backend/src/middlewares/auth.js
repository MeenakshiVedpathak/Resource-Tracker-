'use strict';

const jwt = require('jsonwebtoken');
const { User, Role, Employee } = require('../models');
const logger = require('../utils/logger');

/**
 * JWT Authentication Middleware
 * Extracts Bearer token, verifies it, loads the user, and attaches to req.user.
 */
const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. No token provided.',
        code: 'NO_TOKEN',
      });
    }

    const token = authHeader.split(' ')[1];

    if (!token || token.trim() === '') {
      return res.status(401).json({
        success: false,
        message: 'Access denied. Token is empty.',
        code: 'EMPTY_TOKEN',
      });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      if (err instanceof jwt.TokenExpiredError) {
        return res.status(401).json({
          success: false,
          message: 'Token has expired. Please log in again.',
          code: 'TOKEN_EXPIRED',
          expiredAt: err.expiredAt,
        });
      }
      if (err instanceof jwt.JsonWebTokenError) {
        return res.status(401).json({
          success: false,
          message: 'Invalid token. Please log in again.',
          code: 'INVALID_TOKEN',
        });
      }
      // NotBeforeError or any other JWT error
      return res.status(401).json({
        success: false,
        message: 'Token verification failed.',
        code: 'TOKEN_ERROR',
      });
    }

    // Load user with role and employee data
    const user = await User.findOne({
      where: { id: decoded.id, status: 'active' },
      include: [
        {
          model: Role,
          as: 'role',
          attributes: ['id', 'role_name', 'status'],
        },
        {
          model: Employee,
          as: 'employee',
          attributes: ['id', 'employee_code', 'full_name', 'designation', 'status'],
          required: false,
        },
      ],
      attributes: { exclude: ['password'] },
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User not found or account is inactive.',
        code: 'USER_INACTIVE',
      });
    }

    if (user.role && user.role.status !== 'active') {
      return res.status(401).json({
        success: false,
        message: 'Your role has been deactivated. Please contact the administrator.',
        code: 'ROLE_INACTIVE',
      });
    }

    // Attach user and convenience fields to request
    req.user = user;
    req.userId = user.id;
    req.userRole = user.role ? user.role.role_name : null;

    next();
  } catch (error) {
    logger.error('Authentication middleware error', {
      error: error.message,
      stack: error.stack,
      path: req.path,
      method: req.method,
    });
    return res.status(500).json({
      success: false,
      message: 'Internal server error during authentication.',
      code: 'AUTH_ERROR',
    });
  }
};

module.exports = authenticate;
