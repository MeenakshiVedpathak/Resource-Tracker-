'use strict';

const servicePOService = require('../services/servicePOService');
const {
  sendSuccess,
  sendCreated,
  sendNoContent,
  sendPaginated,
  sendNotFound,
  sendError,
} = require('../utils/response');
const logger = require('../utils/logger');

/**
 * ServicePO Controller
 * Thin layer: parse request, delegate to service, format response.
 */

/**
 * GET /api/v1/service-pos
 */
const getAllServicePOs = async (req, res) => {
  try {
    const { data, meta } = await servicePOService.getAll(req.query);
    return sendPaginated(res, data, meta, 'Service POs fetched successfully.');
  } catch (error) {
    logger.error('getAllServicePOs error', { error: error.message });
    return sendError(res, error.message, error.statusCode || 500);
  }
};

/**
 * GET /api/v1/service-pos/active/list
 */
const getActivePOs = async (req, res) => {
  try {
    const pos = await servicePOService.getActivePOs();
    return sendSuccess(res, pos, 'Active Service POs fetched successfully.');
  } catch (error) {
    logger.error('getActivePOs error', { error: error.message });
    return sendError(res, error.message, error.statusCode || 500);
  }
};

/**
 * GET /api/v1/service-pos/:id
 */
const getServicePOById = async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id) || id < 1) {
      return sendError(res, 'Invalid Service PO ID.', 400);
    }

    const po = await servicePOService.getById(id);
    return sendSuccess(res, po, 'Service PO fetched successfully.');
  } catch (error) {
    if (error.statusCode === 404) {
      return sendNotFound(res, 'Service PO');
    }
    logger.error('getServicePOById error', { error: error.message, id: req.params.id });
    return sendError(res, error.message, error.statusCode || 500);
  }
};

/**
 * POST /api/v1/service-pos
 */
const createServicePO = async (req, res) => {
  try {
    const po = await servicePOService.create(req.body, req.userId, req);
    return sendCreated(res, po, 'Service PO created successfully.');
  } catch (error) {
    if (error.statusCode === 404) {
      return sendNotFound(res, error.message.includes('Client') ? 'Client' : 'Service type');
    }
    logger.error('createServicePO error', { error: error.message, userId: req.userId });
    return sendError(res, error.message, error.statusCode || 500);
  }
};

/**
 * PUT /api/v1/service-pos/:id
 */
const updateServicePO = async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id) || id < 1) {
      return sendError(res, 'Invalid Service PO ID.', 400);
    }

    const po = await servicePOService.update(id, req.body, req.userId, req);
    return sendSuccess(res, po, 'Service PO updated successfully.');
  } catch (error) {
    if (error.statusCode === 404) {
      return sendNotFound(res, 'Service PO');
    }
    logger.error('updateServicePO error', { error: error.message, id: req.params.id });
    return sendError(res, error.message, error.statusCode || 500);
  }
};

/**
 * POST /api/v1/service-pos/:id/close
 */
const closeServicePO = async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id) || id < 1) {
      return sendError(res, 'Invalid Service PO ID.', 400);
    }

    await servicePOService.close(id, req.userId, req);
    return sendSuccess(res, null, 'Service PO closed successfully.');
  } catch (error) {
    if (error.statusCode === 404) {
      return sendNotFound(res, 'Service PO');
    }
    logger.error('closeServicePO error', { error: error.message, id: req.params.id });
    return sendError(res, error.message, error.statusCode || 500);
  }
};

/**
 * POST /api/v1/service-pos/:id/allocate
 * Body: { employee_ids: number[] }
 */
const allocateResources = async (req, res) => {
  try {
    const poId = parseInt(req.params.id, 10);
    if (isNaN(poId) || poId < 1) {
      return sendError(res, 'Invalid Service PO ID.', 400);
    }

    const { employee_ids } = req.body;
    await servicePOService.allocateResources(poId, employee_ids, req.userId, req);
    return sendSuccess(res, null, 'Resources allocated successfully.');
  } catch (error) {
    if (error.statusCode === 404) {
      return sendError(res, error.message, 404);
    }
    logger.error('allocateResources error', { error: error.message, id: req.params.id });
    return sendError(res, error.message, error.statusCode || 500);
  }
};

/**
 * DELETE /api/v1/service-pos/:id/resources/:employeeId
 */
const deallocateResource = async (req, res) => {
  try {
    const poId = parseInt(req.params.id, 10);
    const employeeId = parseInt(req.params.employeeId, 10);

    if (isNaN(poId) || poId < 1) {
      return sendError(res, 'Invalid Service PO ID.', 400);
    }
    if (isNaN(employeeId) || employeeId < 1) {
      return sendError(res, 'Invalid employee ID.', 400);
    }

    await servicePOService.deallocateResource(poId, employeeId, req.userId, req);
    return sendNoContent(res);
  } catch (error) {
    if (error.statusCode === 404) {
      return sendError(res, error.message, 404);
    }
    logger.error('deallocateResource error', { error: error.message, poId: req.params.id, employeeId: req.params.employeeId });
    return sendError(res, error.message, error.statusCode || 500);
  }
};

/**
 * GET /api/v1/service-pos/:id/utilisation
 */
const getUtilisation = async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id) || id < 1) {
      return sendError(res, 'Invalid Service PO ID.', 400);
    }

    const utilisation = await servicePOService.getUtilisation(id);
    return sendSuccess(res, utilisation, 'Utilisation data fetched successfully.');
  } catch (error) {
    if (error.statusCode === 404) {
      return sendNotFound(res, 'Service PO');
    }
    logger.error('getUtilisation error', { error: error.message, id: req.params.id });
    return sendError(res, error.message, error.statusCode || 500);
  }
};

module.exports = {
  getAllServicePOs,
  getActivePOs,
  getServicePOById,
  createServicePO,
  updateServicePO,
  closeServicePO,
  allocateResources,
  deallocateResource,
  getUtilisation,
};
