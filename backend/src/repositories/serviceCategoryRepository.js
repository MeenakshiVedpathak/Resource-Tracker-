'use strict';

const { Op } = require('sequelize');
const { ServiceCategory } = require('../models');

/**
 * ServiceCategory Repository
 * All direct database interaction for the service_categories table.
 */

const findAll = async (filters = {}) => {
  const { search, status } = filters;

  const where = {};

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
  return ServiceCategory.findByPk(id, {
    attributes: ['id', 'name', 'status', 'created_at', 'updated_at', 'created_by', 'updated_by'],
  });
};

const findByName = async (name) => {
  return ServiceCategory.findOne({
    where: { name: { [Op.iLike]: name.trim() } },
    attributes: ['id', 'name'],
  });
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
};
