// The seeded super-admin account. Protected from deletion, edits, status changes, and role
// reassignment everywhere in the UI, regardless of the acting user's own role/permission —
// this is a client-side safety net on top of whatever the backend itself enforces.
export const PROTECTED_ADMIN_EMAIL = 'admin@rutportal.com';

export const isProtectedAccount = (email) => email === PROTECTED_ADMIN_EMAIL;
