'use strict';

const { Sequelize } = require('sequelize');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

// ---------------------------------------------------------------------------
// Database connection
// ---------------------------------------------------------------------------
const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASSWORD,
  {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT, 10) || 5432,
    dialect: 'postgres',
    logging: process.env.NODE_ENV === 'development' ? console.log : false,
    pool: {
      max: parseInt(process.env.DB_POOL_MAX, 10) || 10,
      min: parseInt(process.env.DB_POOL_MIN, 10) || 0,
      acquire: parseInt(process.env.DB_POOL_ACQUIRE, 10) || 30000,
      idle: parseInt(process.env.DB_POOL_IDLE, 10) || 10000,
    },
    define: {
      underscored: true,
      freezeTableName: true,
    },
  }
);

// ---------------------------------------------------------------------------
// Model imports
// ---------------------------------------------------------------------------
const Role                   = require('./Role')(sequelize);
const Employee               = require('./Employee')(sequelize);
const User                   = require('./User')(sequelize);
const Client                 = require('./Client')(sequelize);
const ServiceCategory        = require('./ServiceCategory')(sequelize);
const ServiceType            = require('./ServiceType')(sequelize);
const ServicePO              = require('./ServicePO')(sequelize);
const ServicePOResource      = require('./ServicePOResource')(sequelize);
const SubProject             = require('./SubProject')(sequelize);
const MonthlyCost            = require('./MonthlyCost')(sequelize);
const Timesheet              = require('./Timesheet')(sequelize);
const AuditLog               = require('./AuditLog')(sequelize);
const UserSession            = require('./UserSession')(sequelize);
const TimesheetImportHistory = require('./TimesheetImportHistory')(sequelize);
const TimesheetImportError   = require('./TimesheetImportError')(sequelize);
const Notification           = require('./Notification')(sequelize);
const UserRole               = require('./UserRole')(sequelize);

// ---------------------------------------------------------------------------
// Associations
// ---------------------------------------------------------------------------

// Role <-> User
Role.hasMany(User, { foreignKey: 'role_id', as: 'users' });
User.belongsTo(Role, { foreignKey: 'role_id', as: 'role' });

// Employee <-> User
Employee.hasMany(User, { foreignKey: 'employee_id', as: 'users' });
User.belongsTo(Employee, { foreignKey: 'employee_id', as: 'employee' });

// Employee <-> ServicePOResource
Employee.hasMany(ServicePOResource, { foreignKey: 'employee_id', as: 'servicePOResources' });
ServicePOResource.belongsTo(Employee, { foreignKey: 'employee_id', as: 'employee' });

// Employee <-> MonthlyCost
Employee.hasMany(MonthlyCost, { foreignKey: 'employee_id', as: 'monthlyCosts' });
MonthlyCost.belongsTo(Employee, { foreignKey: 'employee_id', as: 'employee' });

// Employee <-> Timesheet
Employee.hasMany(Timesheet, { foreignKey: 'employee_id', as: 'timesheets' });
Timesheet.belongsTo(Employee, { foreignKey: 'employee_id', as: 'employee' });

// User <-> UserSession
User.hasMany(UserSession, { foreignKey: 'user_id', as: 'sessions' });
UserSession.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

// User <-> UserRole (many-to-many roles)
User.belongsToMany(Role, {
  through: UserRole,
  foreignKey: 'user_id',
  otherKey: 'role_id',
  as: 'roles',
});
Role.belongsToMany(User, {
  through: UserRole,
  foreignKey: 'role_id',
  otherKey: 'user_id',
  as: 'usersWithRoles',
});
User.hasMany(UserRole, { foreignKey: 'user_id', as: 'userRoles' });
Role.hasMany(UserRole, { foreignKey: 'role_id', as: 'userRoles' });
UserRole.belongsTo(User, { foreignKey: 'user_id', as: 'user' });
UserRole.belongsTo(Role, { foreignKey: 'role_id', as: 'role' });

// User <-> AuditLog
User.hasMany(AuditLog, { foreignKey: 'user_id', as: 'auditLogs' });
AuditLog.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

// User <-> Notification
User.hasMany(Notification, { foreignKey: 'user_id', as: 'notifications' });
Notification.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

// Client <-> ServicePO
Client.hasMany(ServicePO, { foreignKey: 'client_id', as: 'servicePOs' });
ServicePO.belongsTo(Client, { foreignKey: 'client_id', as: 'client' });

// ServiceCategory <-> ServiceType
ServiceCategory.hasMany(ServiceType, { foreignKey: 'service_category_id', as: 'serviceTypes' });
ServiceType.belongsTo(ServiceCategory, { foreignKey: 'service_category_id', as: 'serviceCategory' });

// ServiceType <-> ServicePO
ServiceType.hasMany(ServicePO, { foreignKey: 'service_type_id', as: 'servicePOs' });
ServicePO.belongsTo(ServiceType, { foreignKey: 'service_type_id', as: 'serviceType' });

// ServicePO <-> ServicePOResource
ServicePO.hasMany(ServicePOResource, { foreignKey: 'service_po_id', as: 'resources' });
ServicePOResource.belongsTo(ServicePO, { foreignKey: 'service_po_id', as: 'servicePO' });

// ServicePO <-> SubProject
ServicePO.hasMany(SubProject, { foreignKey: 'service_po_id', as: 'subProjects' });
SubProject.belongsTo(ServicePO, { foreignKey: 'service_po_id', as: 'servicePO' });

// ServicePO <-> Timesheet
ServicePO.hasMany(Timesheet, { foreignKey: 'service_po_id', as: 'timesheets' });
Timesheet.belongsTo(ServicePO, { foreignKey: 'service_po_id', as: 'servicePO' });

// ServicePO <-> Employee (many-to-many through ServicePOResource)
ServicePO.belongsToMany(Employee, {
  through: ServicePOResource,
  foreignKey: 'service_po_id',
  otherKey: 'employee_id',
  as: 'employees',
});
Employee.belongsToMany(ServicePO, {
  through: ServicePOResource,
  foreignKey: 'employee_id',
  otherKey: 'service_po_id',
  as: 'servicePOs',
});

// SubProject <-> Timesheet
SubProject.hasMany(Timesheet, { foreignKey: 'sub_project_id', as: 'timesheets' });
Timesheet.belongsTo(SubProject, { foreignKey: 'sub_project_id', as: 'subProject' });

// User <-> TimesheetImportHistory (imported_by)
User.hasMany(TimesheetImportHistory, { foreignKey: 'imported_by', as: 'importHistory' });
TimesheetImportHistory.belongsTo(User, { foreignKey: 'imported_by', as: 'importer' });

// TimesheetImportHistory <-> TimesheetImportError
TimesheetImportHistory.hasMany(TimesheetImportError, { foreignKey: 'import_id', as: 'errors' });
TimesheetImportError.belongsTo(TimesheetImportHistory, { foreignKey: 'import_id', as: 'importHistory' });

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------
module.exports = {
  sequelize,
  Sequelize,
  Role,
  Employee,
  User,
  Client,
  ServiceCategory,
  ServiceType,
  ServicePO,
  ServicePOResource,
  SubProject,
  MonthlyCost,
  Timesheet,
  AuditLog,
  UserSession,
  TimesheetImportHistory,
  TimesheetImportError,
  Notification,
  UserRole,
};
