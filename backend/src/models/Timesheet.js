'use strict';

const { Model, DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  class Timesheet extends Model {
    static associate(models) {
      Timesheet.belongsTo(models.Employee, {
        foreignKey: 'employee_id',
        as: 'employee',
      });
      Timesheet.belongsTo(models.ServicePO, {
        foreignKey: 'service_po_id',
        as: 'servicePO',
      });
      Timesheet.belongsTo(models.SubProject, {
        foreignKey: 'sub_project_id',
        as: 'subProject',
      });
      Timesheet.belongsTo(models.TimesheetImportHistory, {
        foreignKey: 'timesheet_import_id',
        as: 'importHistory',
      });
    }
  }

  Timesheet.init(
    {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      employee_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: 'employees',
          key: 'id',
        },
        validate: {
          notNull: { msg: 'Employee is required.' },
        },
      },
      service_po_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: 'service_pos',
          key: 'id',
        },
        validate: {
          notNull: { msg: 'Service PO is required.' },
        },
      },
      sub_project_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
          model: 'sub_projects',
          key: 'id',
        },
      },
      timesheet_import_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
          model: 'timesheet_import_history',
          key: 'id',
        },
      },
      timesheet_date: {
        type: DataTypes.DATEONLY,
        allowNull: false,
        validate: {
          notNull: { msg: 'Timesheet date is required.' },
          isDate:  { msg: 'Timesheet date must be a valid date.' },
        },
      },
      hours_logged: {
        type: DataTypes.DECIMAL(5, 2),
        allowNull: false,
        validate: {
          notNull: { msg: 'Hours logged is required.' },
          min: { args: [0], msg: 'Hours logged must be greater than or equal to 0.' },
          // No upper bound here — monthly working hours may exceed 24.
        },
      },
      created_by: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      updated_by: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
    },
    {
      sequelize,
      modelName: 'Timesheet',
      tableName: 'timesheets',
      timestamps: true,
      underscored: true,
      createdAt: 'created_at',
      updatedAt: false,
      indexes: [
        {
          unique: true,
          fields: ['employee_id', 'service_po_id', 'timesheet_date'],
          name: 'timesheets_employee_po_date_unique',
        },
      ],
    }
  );

  

  return Timesheet;
};
