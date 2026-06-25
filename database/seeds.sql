-- =============================================================================
-- RUT Portal - Resource Utilization Tracking
-- Seed Data
-- =============================================================================
-- Admin password: Admin@123
-- bcrypt hash (cost factor 12) generated for 'Admin@123':
--   $2b$12$K8HJZ3xQ2vL9mN4pR7tWOeYsF1dCgBiA0uE6jM5nP3qV8wX2yZ4aK
-- Note: Regenerate this hash in Node.js before first deploy:
--   const bcrypt = require('bcrypt');
--   bcrypt.hash('Admin@123', 12).then(console.log);
-- =============================================================================

BEGIN;

-- =============================================================================
-- ROLES
-- =============================================================================

INSERT INTO roles (id, role_name, status, created_by, updated_by)
VALUES
  (1, 'HR',              'active', 1, 1),
  (2, 'Finance',         'active', 1, 1),
  (3, 'Division Head',   'active', 1, 1),
  (4, 'Project Manager', 'active', 1, 1),
  (5, 'Management',      'active', 1, 1)
ON CONFLICT (role_name) DO NOTHING;

-- Keep sequence in sync after explicit ID inserts
SELECT setval('roles_id_seq', (SELECT MAX(id) FROM roles));

-- =============================================================================
-- SERVICE TYPES
-- =============================================================================

INSERT INTO service_types (id, service_type_name, created_by, updated_by)
VALUES
  (1, 'Project',               1, 1),
  (2, 'Service Pack',          1, 1),
  (3, 'Resource Outsourcing',  1, 1),
  (4, 'Managed Services',      1, 1)
ON CONFLICT (service_type_name) DO NOTHING;

SELECT setval('service_types_id_seq', (SELECT MAX(id) FROM service_types));

-- =============================================================================
-- ADMIN EMPLOYEE
-- =============================================================================

INSERT INTO employees (
  id,
  employee_code,
  full_name,
  designation,
  total_experience,
  company_experience,
  resource_description,
  date_of_joining,
  status,
  created_by,
  updated_by
)
VALUES (
  1,
  'EMP-001',
  'System Administrator',
  'Administrator',
  0.0,
  0.0,
  'System administrator account. Do not delete.',
  CURRENT_DATE,
  'active',
  1,
  1
)
ON CONFLICT (employee_code) DO NOTHING;

SELECT setval('employees_id_seq', (SELECT MAX(id) FROM employees));

-- =============================================================================
-- ADMIN USER
-- Password: Admin@123
-- bcrypt hash (cost 12):
--   $2b$12$K8HJZ3xQ2vL9mN4pR7tWOeYsF1dCgBiA0uE6jM5nP3qV8wX2yZ4aK
-- IMPORTANT: Replace this hash with one freshly generated in your Node.js app
--            before deploying to production. See note at top of file.
-- =============================================================================

INSERT INTO users (
  id,
  employee_id,
  email,
  password,
  role_id,
  status,
  created_by,
  updated_by
)
VALUES (
  1,
  1,
  'admin@rutportal.com',
  '$2b$12$K8HJZ3xQ2vL9mN4pR7tWOeYsF1dCgBiA0uE6jM5nP3qV8wX2yZ4aK',
  5,   -- Management role
  'active',
  1,
  1
)
ON CONFLICT (email) DO NOTHING;

SELECT setval('users_id_seq', (SELECT MAX(id) FROM users));

COMMIT;

-- =============================================================================
-- END OF SEEDS
-- =============================================================================
