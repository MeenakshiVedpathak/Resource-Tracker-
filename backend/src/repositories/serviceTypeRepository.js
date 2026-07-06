'use strict';

const { Op } = require('sequelize');
const { ServiceType, ServiceCategory } = require('../models');

/**
 * ServiceType Repository
 * All direct database interaction for the service_types table.
 */

/**
 * Return all service types, optionally filtered by a search term.
 *
 * @param {{ search?: string, service_category_id?: number }} filters
 * @returns {Promise<ServiceType[]>}
 */
const findAll = async (filters = {}) => {
  const { search, service_category_id } = filters;

  const where = { is_deleted: false };

  if (search && search.trim()) {
    where.service_type_name = { [Op.iLike]: `%${search.trim()}%` };
  }

  if (service_category_id) {
    where.service_category_id = parseInt(service_category_id, 10);
  }

  return ServiceType.findAll({
    where,
    attributes: ['id', 'service_type_name', 'service_category_id', 'created_at', 'updated_at', 'created_by', 'updated_by'],
    include: [{ model: ServiceCategory, as: 'serviceCategory', attributes: ['id', 'name', 'status'] }],
    order: [['service_type_name', 'ASC']],
  });
};

/**
 * Find a service type by primary key.
 *
 * @param {number} id
 * @returns {Promise<ServiceType|null>}
 */
const findById = async (id) => {
  return ServiceType.findOne({
    where: { id, is_deleted: false },
    attributes: ['id', 'service_type_name', 'service_category_id', 'created_at', 'updated_at', 'created_by', 'updated_by'],
    include: [{ model: ServiceCategory, as: 'serviceCategory', attributes: ['id', 'name', 'status'] }],
  });
};

/**
 * Find a service type by its unique name (case-insensitive).
 *
 * @param {string} name
 * @returns {Promise<ServiceType|null>}
 */
const findByName = async (name) => {
  return ServiceType.findOne({
    where: { service_type_name: { [Op.iLike]: name.trim() }, is_deleted: false },
    attributes: ['id', 'service_type_name'],
  });
};

const softDelete = async (id, updatedBy) => {
  const record = await ServiceType.findOne({ where: { id, is_deleted: false } });
  if (!record) return null;
  return record.update({ is_deleted: true, updated_by: updatedBy });
};

/**
 * Insert a new service type record.
 *
 * @param {object} data
 * @returns {Promise<ServiceType>}
 */
const create = async (data) => {
  return ServiceType.create(data);
};

/**
 * Update an existing service type by primary key.
 *
 * @param {number} id
 * @param {object} data
 * @returns {Promise<ServiceType|null>}
 */
const update = async (id, data) => {
  const [affectedRows, [updated]] = await ServiceType.update(data, {
    where: { id },
    returning: true,
  });

  if (affectedRows === 0) {
    return null;
  }

  return updated;
};

module.exports = {
  findAll,
  findById,
  findByName,
  create,
  update,
  softDelete,
};
