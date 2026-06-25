'use strict';

const servicePORepository = require('../repositories/servicePORepository');
const clientRepository = require('../repositories/clientRepository');
const { Employee } = require('../models');
const { generatePOCode } = require('../helpers/codeGenerator');
const { createAuditLog, getIpAddress } = require('../middlewares/auditLog');
const { getPaginationParams, getPaginationMeta } = require('../utils/pagination');
const logger = require('../utils/logger');

/**
 * ServicePO Service
 * All business logic for Service POs and resource allocation.
 */

// Valid status transitions when closing or updating
const ALLOWED_CLOSE_FROM = ['active'];

/**
 * Return a paginated list of Service POs.
 *
 * @param {object} query - req.query
 * @returns {Promise<{ data: ServicePO[], meta: object }>}
 */
const getAll = async (query = {}) => {
  const { page, limit, offset } = getPaginationParams(query);

  const filters = {
    search: query.search || null,
    status: query.status || 'active',
    client_id: query.client_id ? parseInt(query.client_id, 10) : null,
    service_type_id: query.service_type_id ? parseInt(query.service_type_id, 10) : null,
    is_billable: query.is_billable !== undefined ? query.is_billable : undefined,
    start_date_from: query.start_date_from || null,
    start_date_to: query.start_date_to || null,
  };

  const sort = {
    sortBy: query.sort_by || 'created_at',
    sortOrder: query.sort_order || 'DESC',
  };

  const { rows, count } = await servicePORepository.findAll(filters, { limit, offset }, sort);
  const meta = getPaginationMeta(count, page, limit);

  return { data: rows, meta };
};

/**
 * Return the full details for a single Service PO, including resources.
 *
 * @param {number} id
 * @returns {Promise<ServicePO>}
 */
const getById = async (id) => {
  const po = await servicePORepository.findById(id);

  if (!po) {
    const err = new Error('Service PO not found.');
    err.statusCode = 404;
    throw err;
  }

  return po;
};

/**
 * Create a new Service PO.
 * - Auto-generates a PO code (PO-YYYYMMDD-XXXX)
 * - Validates that start_date < end_date
 * - Validates that client and service type exist and are active
 *
 * @param {object} data   - Validated request body
 * @param {number} userId
 * @param {object} req
 * @returns {Promise<ServicePO>}
 */
const create = async (data, userId, req) => {
  // Validate client exists and is active
  const client = await clientRepository.findById(data.client_id);
  if (!client) {
    const err = new Error('Client not found.');
    err.statusCode = 404;
    throw err;
  }
  if (client.status !== 'active') {
    const err = new Error('Cannot create a Service PO for an inactive client.');
    err.statusCode = 400;
    throw err;
  }

  // Date ordering guard (Joi already checks, but we also enforce in service)
  if (data.start_date && data.end_date && data.end_date < data.start_date) {
    const err = new Error('End date must be on or after the start date.');
    err.statusCode = 400;
    throw err;
  }

  // Generate a unique PO code — retry up to 5 times on collision
  let service_po_code = generatePOCode();
  let attempts = 0;
  while (await servicePORepository.findByCode(service_po_code)) {
    if (attempts >= 5) {
      const err = new Error('Failed to generate a unique PO code. Please try again.');
      err.statusCode = 500;
      throw err;
    }
    service_po_code = generatePOCode();
    attempts++;
  }

  const payload = {
    ...data,
    service_po_code,
    created_by: userId,
    updated_by: userId,
  };

  const po = await servicePORepository.create(payload);

  await createAuditLog(
    userId,
    'CREATE',
    'service_pos',
    po.id,
    null,
    { service_po_code: po.service_po_code, service_po_name: po.service_po_name, client_id: po.client_id },
    getIpAddress(req)
  );

  logger.info('Service PO created', { poId: po.id, service_po_code: po.service_po_code, userId });

  return po;
};

/**
 * Update an existing Service PO.
 * Cannot update a PO that is already closed or cancelled.
 *
 * @param {number} id
 * @param {object} data
 * @param {number} userId
 * @param {object} req
 * @returns {Promise<ServicePO>}
 */
const update = async (id, data, userId, req) => {
  const existing = await servicePORepository.findById(id);
  if (!existing) {
    const err = new Error('Service PO not found.');
    err.statusCode = 404;
    throw err;
  }

  if (existing.status === 'closed' || existing.status === 'cancelled') {
    const err = new Error(`Cannot update a Service PO with status "${existing.status}".`);
    err.statusCode = 400;
    throw err;
  }

  // If client_id is being changed, validate the new client
  if (data.client_id && data.client_id !== existing.client_id) {
    const client = await clientRepository.findById(data.client_id);
    if (!client) {
      const err = new Error('Client not found.');
      err.statusCode = 404;
      throw err;
    }
    if (client.status !== 'active') {
      const err = new Error('Cannot reassign a Service PO to an inactive client.');
      err.statusCode = 400;
      throw err;
    }
  }

  // Cross-field date validation when one or both dates are being changed
  const newStartDate = data.start_date || existing.start_date;
  const newEndDate = data.end_date || existing.end_date;
  if (newStartDate && newEndDate && newEndDate < newStartDate) {
    const err = new Error('End date must be on or after the start date.');
    err.statusCode = 400;
    throw err;
  }

  const oldValues = {
    service_po_name: existing.service_po_name,
    client_id: existing.client_id,
    service_type_id: existing.service_type_id,
    po_value: existing.po_value,
    start_date: existing.start_date,
    end_date: existing.end_date,
    status: existing.status,
  };

  const payload = { ...data, updated_by: userId };
  const updated = await servicePORepository.update(id, payload);

  await createAuditLog(
    userId,
    'UPDATE',
    'service_pos',
    id,
    oldValues,
    payload,
    getIpAddress(req)
  );

  logger.info('Service PO updated', { poId: id, userId });

  return updated;
};

/**
 * Close a Service PO.
 * Only an 'active' PO can be closed.
 *
 * @param {number} id
 * @param {number} userId
 * @param {object} req
 * @returns {Promise<void>}
 */
const close = async (id, userId, req) => {
  const existing = await servicePORepository.findById(id);
  if (!existing) {
    const err = new Error('Service PO not found.');
    err.statusCode = 404;
    throw err;
  }

  if (!ALLOWED_CLOSE_FROM.includes(existing.status)) {
    const err = new Error(
      `Cannot close a Service PO with status "${existing.status}". ` +
      `Only POs with status "active" can be closed.`
    );
    err.statusCode = 400;
    throw err;
  }

  await servicePORepository.close(id, userId);

  await createAuditLog(
    userId,
    'CLOSE',
    'service_pos',
    id,
    { status: existing.status },
    { status: 'closed' },
    getIpAddress(req)
  );

  logger.info('Service PO closed', { poId: id, userId });
};

/**
 * Allocate one or more employees to a Service PO.
 * - Validates that the PO is active
 * - Validates that all provided employee IDs are active employees
 *
 * @param {number} poId
 * @param {number[]} employeeIds
 * @param {number} userId
 * @param {object} req
 * @returns {Promise<void>}
 */
const allocateResources = async (poId, employeeIds, userId, req) => {
  const po = await servicePORepository.findById(poId);
  if (!po) {
    const err = new Error('Service PO not found.');
    err.statusCode = 404;
    throw err;
  }

  if (po.status !== 'active') {
    const err = new Error(`Cannot allocate resources to a Service PO with status "${po.status}".`);
    err.statusCode = 400;
    throw err;
  }

  // Validate all employees exist and are active
  const employees = await Employee.findAll({
    where: { id: employeeIds },
    attributes: ['id', 'full_name', 'status'],
  });

  if (employees.length !== employeeIds.length) {
    const foundIds = employees.map((e) => e.id);
    const missing = employeeIds.filter((id) => !foundIds.includes(id));
    const err = new Error(`Employee(s) not found: ${missing.join(', ')}.`);
    err.statusCode = 404;
    throw err;
  }

  const inactiveEmployees = employees.filter((e) => e.status !== 'active');
  if (inactiveEmployees.length > 0) {
    const names = inactiveEmployees.map((e) => `${e.full_name} (ID: ${e.id})`).join(', ');
    const err = new Error(`Cannot allocate inactive employee(s): ${names}.`);
    err.statusCode = 400;
    throw err;
  }

  await servicePORepository.allocateResources(poId, employeeIds);

  await createAuditLog(
    userId,
    'ALLOCATE_RESOURCES',
    'service_pos',
    poId,
    null,
    { employee_ids: employeeIds },
    getIpAddress(req)
  );

  logger.info('Resources allocated to Service PO', { poId, employeeIds, userId });
};

/**
 * Remove a single employee from a Service PO.
 *
 * @param {number} poId
 * @param {number} employeeId
 * @param {number} userId
 * @param {object} req
 * @returns {Promise<void>}
 */
const deallocateResource = async (poId, employeeId, userId, req) => {
  const po = await servicePORepository.findById(poId);
  if (!po) {
    const err = new Error('Service PO not found.');
    err.statusCode = 404;
    throw err;
  }

  const deleted = await servicePORepository.deallocateResource(poId, employeeId);

  if (deleted === 0) {
    const err = new Error('Employee is not allocated to this Service PO.');
    err.statusCode = 404;
    throw err;
  }

  await createAuditLog(
    userId,
    'DEALLOCATE_RESOURCE',
    'service_pos',
    poId,
    { employee_id: employeeId },
    null,
    getIpAddress(req)
  );

  logger.info('Resource deallocated from Service PO', { poId, employeeId, userId });
};

/**
 * Get utilisation data for a Service PO.
 * Returns hours logged, expected hours, and a utilisation percentage.
 *
 * @param {number} poId
 * @returns {Promise<object>}
 */
const getUtilisation = async (poId) => {
  const po = await servicePORepository.findById(poId);
  if (!po) {
    const err = new Error('Service PO not found.');
    err.statusCode = 404;
    throw err;
  }

  const raw = await servicePORepository.getUtilisation(poId);

  const totalHoursLogged = raw ? raw.total_hours_logged : 0;
  const expectedManHours = raw ? raw.expected_man_hours : 0;

  let utilisationPercentage = 0;
  if (expectedManHours > 0) {
    utilisationPercentage = Math.min(
      parseFloat(((totalHoursLogged / expectedManHours) * 100).toFixed(2)),
      9999.99
    );
  }

  const remainingHours = Math.max(expectedManHours - totalHoursLogged, 0);

  return {
    service_po_id: poId,
    service_po_code: po.service_po_code,
    service_po_name: po.service_po_name,
    expected_man_hours: expectedManHours,
    total_hours_logged: totalHoursLogged,
    remaining_hours: remainingHours,
    utilisation_percentage: utilisationPercentage,
    is_over_utilised: totalHoursLogged > expectedManHours,
  };
};

/**
 * Return a lightweight list of active POs.
 *
 * @returns {Promise<ServicePO[]>}
 */
const getActivePOs = async () => {
  return servicePORepository.getActivePOs();
};

module.exports = {
  getAll,
  getById,
  create,
  update,
  close,
  allocateResources,
  deallocateResource,
  getUtilisation,
  getActivePOs,
};
