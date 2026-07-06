'use strict';

const { Model, DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  class ServiceCategory extends Model {
    static associate(models) {
      ServiceCategory.hasMany(models.ServiceType, {
        foreignKey: 'service_category_id',
        as: 'serviceTypes',
      });
    }
  }

  ServiceCategory.init(
    {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      name: {
        type: DataTypes.STRING(100),
        allowNull: false,
        validate: {
          notEmpty: { msg: 'Service category name cannot be empty.' },
          len: { args: [1, 100], msg: 'Service category name must be between 1 and 100 characters.' },
        },
      },
      status: {
        type: DataTypes.STRING(10),
        allowNull: false,
        defaultValue: 'active',
        validate: {
          isIn: {
            args: [['active', 'inactive']],
            msg: 'Status must be active or inactive.',
          },
        },
      },
      is_deleted: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
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
      modelName: 'ServiceCategory',
      tableName: 'service_categories',
      timestamps: true,
      underscored: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at',
    }
  );

  return ServiceCategory;
};
