'use strict';

const roleRepository = require('../repositories/roleRepository');
const { createAuditLog } = require('../middlewares/auditLog');
const logger = require('../utils/logger');

/**
 * Role Service
 * All business logic for role management.
 */

/**
 * Return all roles with optional search and status filter.
 * @param {object} query - Express req.query (status, search, sort_by, sort_order)
 * @returns {Promise<Role[]>}
 */
const getAll = async (query = {}) => {
  const filters = {
    search: query.search || '',
    status: query.status || 'active',
  };

  const sort = {
    sortBy: query.sort_by || 'role_name',
    sortOrder: query.sort_order || 'ASC',
  };

  return roleRepository.findAll(filters, sort);
};

/**
 * Return a single role by ID.
 * Throws 404 if not found.
 * @param {number} id
 * @returns {Promise<Role>}
 */
const getById = async (id) => {
  const role = await roleRepository.findById(id);
  if (!role) {
    const err = new Error(`Role with ID ${id} not found.`);
    err.statusCode = 404;
    throw err;
  }
  return role;
};

/**
 * Create a new role.
 * Validates uniqueness of role_name (case-insensitive).
 *
 * @param {object} data          - { role_name, status }
 * @param {number} userId        - ID of the creating user
 * @param {string} ipAddress     - Client IP
 * @returns {Promise<Role>}
 */
const create = async (data, userId, ipAddress = null) => {
  const existing = await roleRepository.findByName(data.role_name);
  if (existing) {
    const err = new Error(`Role name "${data.role_name}" already exists.`);
    err.statusCode = 409;
    throw err;
  }

  const role = await roleRepository.create({
    ...data,
    created_by: userId,
    updated_by: userId,
  });

  await createAuditLog(
    userId,
    'CREATE',
    'roles',
    role.id,
    null,
    role.toJSON(),
    ipAddress
  );

  logger.info('Role created', { roleId: role.id, name: role.role_name, userId });

  return role;
};

/**
 * Update an existing role.
 * Guards against renaming to a name already taken by another role.
 *
 * @param {number} id
 * @param {object} data
 * @param {number} userId
 * @param {string} ipAddress
 * @returns {Promise<Role>}
 */
const update = async (id, data, userId, ipAddress = null) => {
  const existing = await getById(id); // throws 404

  if (data.role_name && data.role_name.toLowerCase() !== existing.role_name.toLowerCase()) {
    const taken = await roleRepository.findByName(data.role_name);
    if (taken && taken.id !== id) {
      const err = new Error(`Role name "${data.role_name}" is already in use.`);
      err.statusCode = 409;
      throw err;
    }
  }

  const oldValues = existing.toJSON();
  const updated = await roleRepository.update(id, { ...data, updated_by: userId });

  await createAuditLog(
    userId,
    'UPDATE',
    'roles',
    id,
    oldValues,
    updated.toJSON(),
    ipAddress
  );

  logger.info('Role updated', { roleId: id, userId });

  return updated;
};

/**
 * Soft-delete a role by setting its status to 'inactive'.
 * Blocks deletion when active users are still assigned to the role.
 *
 * @param {number} id
 * @param {number} userId
 * @param {string} ipAddress
 * @returns {Promise<Role>}
 */
const deleteRole = async (id, userId, ipAddress = null) => {
  const existing = await getById(id); // throws 404

  const userCount = await roleRepository.countUsersByRole(id);
  if (userCount > 0) {
    const err = new Error(
      `Cannot deactivate role "${existing.role_name}". It is assigned to ${userCount} active user(s).`
    );
    err.statusCode = 409;
    throw err;
  }

  const oldValues = existing.toJSON();
  const deleted = await roleRepository.update(id, { status: 'inactive', updated_by: userId });

  await createAuditLog(
    userId,
    'DELETE',
    'roles',
    id,
    oldValues,
    deleted.toJSON(),
    ipAddress
  );

  logger.info('Role soft-deleted', { roleId: id, userId });

  return deleted;
};

module.exports = {
  getAll,
  getById,
  create,
  update,
  delete: deleteRole,
};
