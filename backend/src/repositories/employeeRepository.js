'use strict';

const { Op } = require('sequelize');
const { Employee, ServicePOResource, ServicePO } = require('../models');

/**
 * Employee Repository
 * Raw database access — no business logic.
 */

/**
 * Fetch a paginated, filtered, sorted list of employees.
 *
 * @param {object} filters    - { search, status, designation }
 * @param {object} pagination - { limit, offset }
 * @param {object} sort       - { sortBy, sortOrder }
 * @returns {Promise<{ rows: Employee[], count: number }>}
 */
const findAll = async (filters = {}, pagination = {}, sort = {}) => {
  const { search, status, designation } = filters;
  const { limit = 20, offset = 0 } = pagination;
  const { sortBy = 'full_name', sortOrder = 'ASC' } = sort;

  const where = {};

  // Status filter — omit clause entirely when 'all' is requested
  if (status && status !== 'all') {
    where.status = status;
  }

  // Designation filter
  if (designation) {
    where.designation = { [Op.iLike]: `%${designation}%` };
  }

  // Full-text search across full_name, employee_code, designation
  if (search && search.trim()) {
    const term = `%${search.trim()}%`;
    where[Op.or] = [
      { full_name: { [Op.iLike]: term } },
      { employee_code: { [Op.iLike]: term } },
      { designation: { [Op.iLike]: term } },
    ];
  }

  return Employee.findAndCountAll({
    where,
    limit,
    offset,
    order: [[sortBy, sortOrder.toUpperCase()]],
    distinct: true,
  });
};

/**
 * Find a single employee by primary key.
 * @param {number} id
 * @returns {Promise<Employee|null>}
 */
const findById = async (id) => {
  return Employee.findByPk(id);
};

/**
 * Find a single employee by employee_code.
 * @param {string} code
 * @returns {Promise<Employee|null>}
 */
const findByCode = async (code) => {
  return Employee.findOne({ where: { employee_code: code } });
};

/**
 * Insert a new employee record.
 * @param {object} data
 * @returns {Promise<Employee>}
 */
const create = async (data) => {
  return Employee.create(data);
};

/**
 * Update an existing employee by primary key.
 * @param {number} id
 * @param {object} data
 * @returns {Promise<Employee>}
 */
const update = async (id, data) => {
  const employee = await Employee.findByPk(id);
  if (!employee) return null;
  return employee.update(data);
};

/**
 * Soft-delete an employee by setting status to 'inactive'.
 * @param {number} id
 * @param {number} updatedBy
 * @returns {Promise<Employee|null>}
 */
const softDelete = async (id, updatedBy) => {
  const employee = await Employee.findByPk(id);
  if (!employee) return null;
  return employee.update({ status: 'inactive', updated_by: updatedBy });
};

/**
 * Return all employees with status = 'active', ordered by full_name.
 * @returns {Promise<Employee[]>}
 */
const getActiveEmployees = async () => {
  return Employee.findAll({
    where: { status: 'active' },
    order: [['full_name', 'ASC']],
    attributes: [
      'id',
      'employee_code',
      'full_name',
      'designation',
      'total_experience',
      'company_experience',
      'status',
    ],
  });
};

/**
 * Return employees whose IDs are in the provided array.
 * Used for resource allocation checks.
 * @param {number[]} ids
 * @returns {Promise<Employee[]>}
 */
const findByIds = async (ids) => {
  if (!ids || ids.length === 0) return [];
  return Employee.findAll({
    where: { id: { [Op.in]: ids } },
    order: [['full_name', 'ASC']],
  });
};

/**
 * Check if an employee is allocated to any active Service PO.
 * Returns an array of active PO records that reference this employee.
 * @param {number} employeeId
 * @returns {Promise<ServicePOResource[]>}
 */
const findActiveAllocations = async (employeeId) => {
  return ServicePOResource.findAll({
    where: { employee_id: employeeId },
    include: [
      {
        model: ServicePO,
        as: 'servicePO',
        where: { status: 'active' },
        attributes: ['id', 'service_po_code', 'service_po_name', 'status'],
        required: true,
      },
    ],
  });
};

module.exports = {
  findAll,
  findById,
  findByCode,
  create,
  update,
  softDelete,
  getActiveEmployees,
  findByIds,
  findActiveAllocations,
};
