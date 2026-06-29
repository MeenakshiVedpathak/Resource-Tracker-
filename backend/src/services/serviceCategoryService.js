'use strict';

const serviceCategoryRepository = require('../repositories/serviceCategoryRepository');
const logger = require('../utils/logger');

const getAll = async (query = {}) => {
  return serviceCategoryRepository.findAll({
    search: query.search,
    status: query.status,
  });
};

const getById = async (id) => {
  const category = await serviceCategoryRepository.findById(id);
  if (!category) {
    const err = new Error('Service category not found.');
    err.statusCode = 404;
    throw err;
  }
  return category;
};

const create = async (data, userId) => {
  const existing = await serviceCategoryRepository.findByName(data.name);
  if (existing) {
    const err = new Error(`Service category "${data.name}" already exists.`);
    err.statusCode = 409;
    throw err;
  }

  const payload = { ...data, created_by: userId, updated_by: userId };
  const category = await serviceCategoryRepository.create(payload);

  logger.info('Service category created', { categoryId: category.id, name: category.name, userId });

  return category;
};

const update = async (id, data, userId) => {
  const existing = await serviceCategoryRepository.findById(id);
  if (!existing) {
    const err = new Error('Service category not found.');
    err.statusCode = 404;
    throw err;
  }

  if (data.name && data.name.trim().toLowerCase() !== existing.name.toLowerCase()) {
    const conflict = await serviceCategoryRepository.findByName(data.name);
    if (conflict) {
      const err = new Error(`Service category "${data.name}" already exists.`);
      err.statusCode = 409;
      throw err;
    }
  }

  const payload = { ...data, updated_by: userId };
  const updated = await serviceCategoryRepository.update(id, payload);

  logger.info('Service category updated', { categoryId: id, userId });

  return updated;
};

module.exports = { getAll, getById, create, update };
