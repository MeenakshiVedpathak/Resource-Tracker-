'use strict';

const { Model, DataTypes } = require('sequelize');

/**
 * ServiceType model — seed defaults: Project, Service Pack,
 * Resource Outsourcing, Managed Services.
 */
module.exports = (sequelize) => {
  class ServiceType extends Model {
    static associate(models) {
      ServiceType.hasMany(models.ServicePO, {
        foreignKey: 'service_type_id',
        as: 'servicePOs',
      });
    }
  }

  ServiceType.init(
    {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      service_type_name: {
        type: DataTypes.STRING(100),
        allowNull: false,
        unique: {
          name: 'service_types_service_type_name_key',
          msg: 'Service type name must be unique.',
        },
        validate: {
          notEmpty: { msg: 'Service type name cannot be empty.' },
          len: { args: [1, 100], msg: 'Service type name must be between 1 and 100 characters.' },
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
      modelName: 'ServiceType',
      tableName: 'service_types',
      timestamps: true,
      underscored: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at',
    }
  );

  return ServiceType;
};
