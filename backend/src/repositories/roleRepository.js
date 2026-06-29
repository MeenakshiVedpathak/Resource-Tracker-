'use strict';

const { Op } = require('sequelize');
const { Role, User, UserRole } = require('../models');

/**
 * Role Repository
 * Raw database access only — no business logic.
 */

/**
 * Fetch all roles with optional search and status filter.
 *
 * @param {object} filters - { search, status }
 * @param {object} sort    - { sortBy, sortOrder }
 * @returns {Promise<Role[]>}
 */
const findAll = async (filters = {}, sort = {}) => {
  const { search, status } = filters;
  const { sortBy = 'role_name', sortOrder = 'ASC' } = sort;

  const where = {};

  if (status && status !== 'all') {
    where.status = status;
  }

  if (search && search.trim()) {
    where.role_name = { [Op.iLike]: `%${search.trim()}%` };
  }

  return Role.findAll({
    where,
    order: [[sortBy, sortOrder.toUpperCase()]],
  });
};

/**
 * Find a single role by primary key.
 * @param {number} id
 * @returns {Promise<Role|null>}
 */
const findById = async (id) => {
  return Role.findByPk(id);
};

/**
 * Find a role by its name (case-insensitive).
 * @param {string} name
 * @returns {Promise<Role|null>}
 */
const findByName = async (name) => {
  return Role.findOne({
    where: { role_name: { [Op.iLike]: name.trim() } },
  });
};

/**
 * Insert a new role.
 * @param {object} data
 * @returns {Promise<Role>}
 */
const create = async (data) => {
  return Role.create(data);
};

/**
 * Update an existing role by primary key.
 * @param {number} id
 * @param {object} data
 * @returns {Promise<Role|null>}
 */
const update = async (id, data) => {
  const role = await Role.findByPk(id);
  if (!role) return null;
  return role.update(data);
};

/**
 * Count the number of active users assigned to a given role.
 * Used before deletion to guard against orphaned users.
 * @param {number} roleId
 * @returns {Promise<number>}
 */
const countUsersByRole = async (roleId) => {
  return User.count({
    distinct: true,
    where: {
      status: 'active',
      [Op.or]: [
        { role_id: roleId },
        { '$userRoles.role_id$': roleId },
      ],
    },
    include: [
      {
        model: UserRole,
        as: 'userRoles',
        attributes: [],
        required: false,
      },
    ],
  });
};

module.exports = {
  findAll,
  findById,
  findByName,
  create,
  update,
  countUsersByRole,
};
