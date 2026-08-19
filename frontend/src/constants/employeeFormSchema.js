import { z } from 'zod';
import { passwordSchema } from '@/utils/validators';

// Shared Zod field schemas for "this is an Employee" data — single source of truth so
// EmployeeForm.jsx and the BU Admin creation flow (CompanyForm.jsx, which also creates an
// Employee record for the new BU Admin) can never drift apart on validation rules.
export const employeeBaseFields = {
  employee_code: z.string().min(2, 'Must be at least 2 characters').max(20).regex(/^[A-Z0-9_-]+$/).transform((v) => v.toUpperCase()),
  full_name: z.string().min(2, 'Must be at least 2 characters').max(100)
    .regex(/^[A-Za-z\s]+$/, 'Only alphabetic characters are allowed'),
  email: z.string().min(1, 'Email is required').email('Invalid email address'),
  designation: z.string().max(100).optional().or(z.literal('')),
  total_experience: z.preprocess((v) => (v === '' || v == null ? null : Number(v)), z.number().min(0).max(60).nullable().optional()),
  company_experience: z.preprocess((v) => (v === '' || v == null ? null : Number(v)), z.number().min(0).max(60).nullable().optional()),
  resource_description: z.string().max(2000).optional().or(z.literal('')),
  date_of_joining: z.string().min(1, 'Date of joining is required'),
  date_of_leaving: z.string().optional().or(z.literal('')),
  status: z.enum(['active', 'inactive']).default('active'),
  secondary_manager_user_id: z.coerce.number().positive().optional().nullable(),
  is_timesheet_approval_required: z.boolean(),
};

export const employeePasswordField = passwordSchema
  .regex(/[A-Z]/, 'Must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Must contain at least one digit')
  .regex(/[^A-Za-z0-9]/, 'Must contain at least one special character');
