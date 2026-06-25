'use strict';

const { Model, DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  class MonthlyCost extends Model {
    static associate(models) {
      MonthlyCost.belongsTo(models.Employee, {
        foreignKey: 'employee_id',
        as: 'employee',
      });
    }
  }

  MonthlyCost.init(
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
      month: {
        type: DataTypes.INTEGER,
        allowNull: false,
        validate: {
          notNull: { msg: 'Month is required.' },
          isInt:   { msg: 'Month must be an integer.' },
          min:     { args: [1],  msg: 'Month must be between 1 and 12.' },
          max:     { args: [12], msg: 'Month must be between 1 and 12.' },
        },
      },
      year: {
        type: DataTypes.INTEGER,
        allowNull: false,
        validate: {
          notNull: { msg: 'Year is required.' },
          isInt:   { msg: 'Year must be an integer.' },
          min:     { args: [2000], msg: 'Year must be 2000 or later.' },
          max:     { args: [2100], msg: 'Year must be 2100 or earlier.' },
        },
      },
      salary_cost: {
        type: DataTypes.DECIMAL(15, 2),
        allowNull: true,
        validate: {
          min: { args: [0], msg: 'Salary cost cannot be negative.' },
        },
      },
      ops_cost: {
        type: DataTypes.DECIMAL(15, 2),
        allowNull: true,
        validate: {
          min: { args: [0], msg: 'Ops cost cannot be negative.' },
        },
      },
      total_cost: {
        type: DataTypes.DECIMAL(15, 2),
        allowNull: true,
        validate: {
          min: { args: [0], msg: 'Total cost cannot be negative.' },
        },
      },
      ops_cost_per_employee: {
        type: DataTypes.DECIMAL(15, 2),
        allowNull: true,
        validate: {
          min: { args: [0], msg: 'Ops cost per employee cannot be negative.' },
        },
      },
      billable_cost: {
        type: DataTypes.DECIMAL(15, 2),
        allowNull: true,
        validate: {
          min: { args: [0], msg: 'Billable cost cannot be negative.' },
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
      modelName: 'MonthlyCost',
      tableName: 'monthly_costs',
      timestamps: true,
      underscored: true,
      createdAt: 'created_at',
      updatedAt: false,
      indexes: [
        {
          unique: true,
          fields: ['employee_id', 'month', 'year'],
          name: 'monthly_costs_employee_month_year_unique',
        },
      ],
    }
  );

  return MonthlyCost;
};
