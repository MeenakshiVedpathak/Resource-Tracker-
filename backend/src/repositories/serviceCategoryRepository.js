'use strict';

const { Op } = require('sequelize');
const { ServiceCategory } = require('../models');

/**
 * ServiceCategory Repository
 * All direct database interaction for the service_categories table.
 */

const findAll = async (filters = {}) => {
  const { search, status } = filters;

  const where = { is_deleted: false };

  if (search && search.trim()) {
    where.name = { [Op.iLike]: `%${search.trim()}%` };
  }

  if (status && status !== 'all') {
    where.status = status;
  }

  return ServiceCategory.findAll({
    where,
    attributes: ['id', 'name', 'status', 'created_at', 'updated_at', 'created_by', 'updated_by'],
    order: [['name', 'ASC']],
  });
};

const findById = async (id) => {
  return ServiceCategory.findOne({
    where: { id, is_deleted: false },
    attributes: ['id', 'name', 'status', 'created_at', 'updated_at', 'created_by', 'updated_by'],
  });
};

const findByName = async (name) => {
  return ServiceCategory.findOne({
    where: { name: { [Op.iLike]: name.trim() }, is_deleted: false },
    attributes: ['id', 'name'],
  });
};

const softDelete = async (id, updatedBy) => {
  const record = await ServiceCategory.findOne({ where: { id, is_deleted: false } });
  if (!record) return null;
  return record.update({ status: 'inactive', is_deleted: true, updated_by: updatedBy });
};

const create = async (data) => {
  return ServiceCategory.create(data);
};

const update = async (id, data) => {
  const [affectedRows, [updated]] = await ServiceCategory.update(data, {
    where: { id },
    returning: true,
  });

  if (affectedRows === 0) return null;

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
