'use strict';

const { sequelize } = require('../models');
const monthlyCostRepository = require('../repositories/monthlyCostRepository');
const { Employee } = require('../models');
const { createAuditLog } = require('../middlewares/auditLog');
const { getPaginationParams, getPaginationMeta } = require('../utils/pagination');
const logger = require('../utils/logger');

/**
 * Monthly Cost Service
 * Business logic for cost calculation, validation, and bulk operations.
 *
 * Key formulas:
 *   ops_cost_per_employee  = total_ops_cost_for_month / active_headcount
 *   total_cost             = salary_cost + ops_cost_per_employee
 *   per_hour_rate          = total_cost / working_hours  (default 176 h/month)
 */

const DEFAULT_WORKING_HOURS = 176;

/**
 * Round a number to 2 decimal places.
 * @param {number} value
 * @returns {number}
 */
const round2 = (value) => Math.round((value + Number.EPSILON) * 100) / 100;

/**
 * Calculate derived cost fields given the raw inputs and headcount.
 *
 * @param {number} salaryCost
 * @param {number} opsCost          - This employee's share of ops (total ops / headcount)
 * @param {number} workingHours
 * @returns {{ total_cost, ops_cost_per_employee, per_hour_rate }}
 */
const calculateDerivedFields = (salaryCost, opsCostPerEmployee, workingHours) => {
  const totalCost = round2(parseFloat(salaryCost || 0) + parseFloat(opsCostPerEmployee || 0));
  const perHourRate = workingHours > 0 ? round2(totalCost / workingHours) : 0;

  return {
    total_cost: totalCost,
    ops_cost_per_employee: round2(parseFloat(opsCostPerEmployee || 0)),
    per_hour_rate: perHourRate,
  };
};

// ─── getAll ────────────────────────────────────────────────────────────────────
/**
 * Paginated list of monthly cost records.
 *
 * @param {object} query
 * @returns {Promise<{ data: MonthlyCost[], meta: object }>}
 */
const getAll = async (query = {}) => {
  const { page, limit, offset } = getPaginationParams(query);

  const filters = {
    year: query.year || null,
    month: query.month || null,
    employee_id: query.employee_id || null,
    sortBy: query.sort_by || 'year',
    sortOrder: (query.sort_order || 'DESC').toUpperCase(),
  };

  const { rows, count } = await monthlyCostRepository.findAll(
    filters,
    { limit, offset },
    {}
  );

  const meta = getPaginationMeta(count, page, limit);

  return { data: rows, meta };
};

// ─── getById ───────────────────────────────────────────────────────────────────
/**
 * @param {number} id
 * @returns {Promise<MonthlyCost>}
 */
const getById = async (id) => {
  const record = await monthlyCostRepository.findById(id);

  if (!record) {
    const error = new Error('Monthly cost record not found.');
    error.statusCode = 404;
    throw error;
  }

  return record;
};

// ─── create ────────────────────────────────────────────────────────────────────
/**
 * Create a new monthly cost entry.
 *
 * Steps:
 * 1. Validate employee exists and is active.
 * 2. Guard duplicate employee + month + year.
 * 3. Fetch active headcount for that month/year (employees with salary_cost > 0).
 *    Headcount includes the current new entry so we add 1 if this is the first record
 *    for that employee this period.
 * 4. Calculate ops_cost_per_employee = ops_cost / headcount.
 * 5. Calculate total_cost = salary_cost + ops_cost_per_employee.
 * 6. Persist and audit.
 *
 * @param {object} data   - Validated request body
 * @param {number} userId
 * @param {string} ip
 * @returns {Promise<MonthlyCost>}
 */
const create = async (data, userId, ip = null) => {
  const { employee_id, month, year, salary_cost, ops_cost, billable_cost, working_hours } = data;

  // 1. Validate employee
  const employee = await Employee.findOne({
    where: { id: employee_id },
    attributes: ['id', 'full_name', 'status'],
  });

  if (!employee) {
    const error = new Error('Employee not found.');
    error.statusCode = 404;
    throw error;
  }

  if (employee.status !== 'active') {
    const error = new Error(
      `Employee "${employee.full_name}" is not active. Monthly costs can only be created for active employees.`
    );
    error.statusCode = 400;
    throw error;
  }

  // 2. Guard duplicate
  const existing = await monthlyCostRepository.findByEmployeeMonthYear(employee_id, month, year);
  if (existing) {
    const error = new Error(
      `A monthly cost record already exists for employee ID ${employee_id} for ${month}/${year}. Use PUT to update it.`
    );
    error.statusCode = 409;
    throw error;
  }

  // 3. Headcount for this month/year — count existing records with salary_cost > 0
  //    The new record being created also counts if its salary_cost > 0, so we add 1.
  let headcount = await monthlyCostRepository.getActiveHeadcount(month, year);
  if (parseFloat(salary_cost || 0) > 0) {
    headcount += 1; // include this new employee in the denominator
  }
  if (headcount < 1) headcount = 1; // guard zero division

  // 4–5. Calculate derived fields
  const effectiveOpsCost = parseFloat(ops_cost || 0);
  const opsCostPerEmployee = round2(effectiveOpsCost / headcount);
  const workingHoursValue = parseInt(working_hours || DEFAULT_WORKING_HOURS, 10);
  const { total_cost, per_hour_rate } = calculateDerivedFields(
    salary_cost,
    opsCostPerEmployee,
    workingHoursValue
  );

  const payload = {
    employee_id,
    month,
    year,
    salary_cost: round2(parseFloat(salary_cost || 0)),
    ops_cost: round2(effectiveOpsCost),
    ops_cost_per_employee: opsCostPerEmployee,
    total_cost,
    billable_cost: billable_cost !== undefined ? round2(parseFloat(billable_cost || 0)) : null,
    created_by: userId,
    updated_by: userId,
  };

  const record = await monthlyCostRepository.create(payload);

  // Audit log
  await createAuditLog(
    userId,
    'CREATE',
    'monthly_costs',
    record.id,
    null,
    {
      employee_id: record.employee_id,
      month: record.month,
      year: record.year,
      salary_cost: record.salary_cost,
      ops_cost: record.ops_cost,
      ops_cost_per_employee: record.ops_cost_per_employee,
      total_cost: record.total_cost,
      per_hour_rate,
    },
    ip
  );

  return monthlyCostRepository.findById(record.id);
};

// ─── update ────────────────────────────────────────────────────────────────────
/**
 * Update a monthly cost record and recalculate all derived fields.
 *
 * If salary_cost or ops_cost change, recalculate ops_cost_per_employee and total_cost.
 * Headcount is re-fetched from the current persisted state (excluding this record
 * if its existing salary_cost was already > 0, then factoring the new value in).
 *
 * @param {number} id
 * @param {object} data
 * @param {number} userId
 * @param {string} ip
 * @returns {Promise<MonthlyCost>}
 */
const update = async (id, data, userId, ip = null) => {
  const existing = await monthlyCostRepository.findById(id);

  if (!existing) {
    const error = new Error('Monthly cost record not found.');
    error.statusCode = 404;
    throw error;
  }

  // If changing employee/month/year, check for duplicate
  const targetEmployeeId = data.employee_id || existing.employee_id;
  const targetMonth = data.month || existing.month;
  const targetYear = data.year || existing.year;

  const isKeyChanging =
    (data.employee_id && data.employee_id !== existing.employee_id) ||
    (data.month && data.month !== existing.month) ||
    (data.year && data.year !== existing.year);

  if (isKeyChanging) {
    const duplicate = await monthlyCostRepository.findByEmployeeMonthYear(
      targetEmployeeId,
      targetMonth,
      targetYear
    );
    if (duplicate && duplicate.id !== id) {
      const error = new Error(
        `A monthly cost record already exists for employee ID ${targetEmployeeId} for ${targetMonth}/${targetYear}.`
      );
      error.statusCode = 409;
      throw error;
    }
  }

  // Recalculate derived fields
  const newSalaryCost = data.salary_cost !== undefined
    ? parseFloat(data.salary_cost)
    : parseFloat(existing.salary_cost || 0);

  const newOpsCost = data.ops_cost !== undefined
    ? parseFloat(data.ops_cost)
    : parseFloat(existing.ops_cost || 0);

  // Re-fetch headcount for the target month/year
  // Exclude the current record from the count, then add it back with new salary value
  let headcount = await monthlyCostRepository.getActiveHeadcount(targetMonth, targetYear);
  // Subtract existing contribution if it was counted
  if (parseFloat(existing.salary_cost || 0) > 0) headcount -= 1;
  // Add new contribution
  if (newSalaryCost > 0) headcount += 1;
  if (headcount < 1) headcount = 1;

  const opsCostPerEmployee = round2(newOpsCost / headcount);
  const workingHoursValue = parseInt(data.working_hours || DEFAULT_WORKING_HOURS, 10);
  const { total_cost, per_hour_rate } = calculateDerivedFields(
    newSalaryCost,
    opsCostPerEmployee,
    workingHoursValue
  );

  const oldValues = {
    employee_id: existing.employee_id,
    month: existing.month,
    year: existing.year,
    salary_cost: existing.salary_cost,
    ops_cost: existing.ops_cost,
    ops_cost_per_employee: existing.ops_cost_per_employee,
    total_cost: existing.total_cost,
  };

  const updatePayload = {
    employee_id: targetEmployeeId,
    month: targetMonth,
    year: targetYear,
    salary_cost: round2(newSalaryCost),
    ops_cost: round2(newOpsCost),
    ops_cost_per_employee: opsCostPerEmployee,
    total_cost,
    updated_by: userId,
  };

  if (data.billable_cost !== undefined) {
    updatePayload.billable_cost = round2(parseFloat(data.billable_cost || 0));
  }

  await monthlyCostRepository.update(id, updatePayload);

  const updated = await monthlyCostRepository.findById(id);

  // Audit log
  await createAuditLog(
    userId,
    'UPDATE',
    'monthly_costs',
    id,
    oldValues,
    {
      employee_id: updated.employee_id,
      month: updated.month,
      year: updated.year,
      salary_cost: updated.salary_cost,
      ops_cost: updated.ops_cost,
      ops_cost_per_employee: updated.ops_cost_per_employee,
      total_cost: updated.total_cost,
      per_hour_rate,
    },
    ip
  );

  return updated;
};

// ─── delete ────────────────────────────────────────────────────────────────────
/**
 * Hard-delete a monthly cost record.
 *
 * @param {number} id
 * @param {number} userId
 * @param {string} ip
 * @returns {Promise<void>}
 */
const deleteCost = async (id, userId, ip = null) => {
  const existing = await monthlyCostRepository.findById(id);

  if (!existing) {
    const error = new Error('Monthly cost record not found.');
    error.statusCode = 404;
    throw error;
  }

  await monthlyCostRepository.delete(id);

  // Audit log
  await createAuditLog(
    userId,
    'DELETE',
    'monthly_costs',
    id,
    {
      employee_id: existing.employee_id,
      month: existing.month,
      year: existing.year,
      salary_cost: existing.salary_cost,
      total_cost: existing.total_cost,
    },
    null,
    ip
  );
};

// ─── calculateForMonth ─────────────────────────────────────────────────────────
/**
 * Bulk recalculate ops_cost_per_employee and total_cost for every record
 * in a given month/year.
 *
 * Algorithm:
 * 1. Fetch all records for the month.
 * 2. Count active headcount (records with salary_cost > 0).
 * 3. Sum total ops_cost across all records.
 * 4. ops_cost_per_employee = total_ops_cost / headcount.
 * 5. total_cost = salary_cost + ops_cost_per_employee for each record.
 * 6. Persist all updates inside a single transaction.
 *
 * @param {number} month
 * @param {number} year
 * @param {number} userId
 * @param {string} ip
 * @param {number} [workingHours=176]
 * @returns {Promise<{ processed: number, updated: number, summary: object }>}
 */
const calculateForMonth = async (month, year, userId, ip = null, workingHours = DEFAULT_WORKING_HOURS) => {
  const records = await monthlyCostRepository.getBulkForMonth(month, year);

  if (!records || records.length === 0) {
    const error = new Error(`No monthly cost records found for ${month}/${year}.`);
    error.statusCode = 404;
    throw error;
  }

  // Compute headcount and total ops cost
  const activeRecords = records.filter((r) => parseFloat(r.salary_cost || 0) > 0);
  const headcount = activeRecords.length || 1; // guard zero division

  const totalOpsCost = records.reduce(
    (sum, r) => sum + parseFloat(r.ops_cost || 0),
    0
  );

  const opsCostPerEmployee = round2(totalOpsCost / headcount);
  const effectiveWorkingHours = parseInt(workingHours || DEFAULT_WORKING_HOURS, 10);

  let updatedCount = 0;
  const transaction = await sequelize.transaction();

  try {
    for (const record of records) {
      const salaryCost = parseFloat(record.salary_cost || 0);
      const totalCost = round2(salaryCost + opsCostPerEmployee);

      await monthlyCostRepository.update(record.id, {
        ops_cost_per_employee: opsCostPerEmployee,
        total_cost: totalCost,
        updated_by: userId,
      });

      updatedCount++;
    }

    await transaction.commit();
  } catch (error) {
    await transaction.rollback();
    logger.error('MonthlyCostService.calculateForMonth transaction failed', {
      month, year, error: error.message,
    });
    throw error;
  }

  const summary = {
    month,
    year,
    total_records: records.length,
    active_headcount: headcount,
    total_ops_cost: round2(totalOpsCost),
    ops_cost_per_employee: opsCostPerEmployee,
    working_hours: effectiveWorkingHours,
  };

  // Audit log for bulk operation
  await createAuditLog(
    userId,
    'BULK_CALCULATE',
    'monthly_costs',
    null,
    null,
    summary,
    ip
  );

  logger.info('MonthlyCostService.calculateForMonth completed', summary);

  return {
    processed: records.length,
    updated: updatedCount,
    summary,
  };
};

module.exports = {
  getAll,
  getById,
  create,
  update,
  delete: deleteCost,
  calculateForMonth,
};
