import { useAuth } from '@/hooks/useAuth';

// Read vs Read & Write gating. Permission is carried by the ROLE itself (not per-form/module —
// the backend contract has no per-form permission field), so this is a single check per user:
// true if ANY held role carries "Read & Write". An optional roleName narrows the check to only
// consider roles the caller cares about (e.g. useCanWrite('Management') for a Management-only
// screen where only Management's own permission should matter).
// A Platform Admin has no roles at all (sits above the per-company RBAC system), so it always
// gets full write access on the screens it's allowed onto (Role/Forms Master) rather than
// reading as permanently read-only.
export const useCanWrite = (roleName) => {
  const { roleObjects, isPlatformAdmin } = useAuth();
  if (isPlatformAdmin) return true;
  const relevant = roleName ? roleObjects.filter((r) => r.name === roleName) : roleObjects;
  return relevant.some((r) => r.permission === 'Read & Write');
};

// Declarative wrapper for the common case of hiding a single Create/Edit/Delete/Save button.
export const RequireWrite = ({ roleName, children, fallback = null }) => {
  const canWrite = useCanWrite(roleName);
  return canWrite ? children : fallback;
};

// true if the accessible-forms map grants this exact form name, in any module.
// For capabilities that are their own distinct Administration form (e.g. "Role Form Mapping")
// rather than just a permission check — the form itself must be granted, not only Read & Write.
export const useHasForm = (formName) => {
  const { accessibleForms, isPlatformAdmin } = useAuth();
  if (isPlatformAdmin) return true;
  return Object.values(accessibleForms ?? {})
    .flat()
    .some((f) => f.name === formName);
};

// Gates the Modified/Original hours-source toggle in Reports & Dashboard, and the Modified
// Hours visibility on the Timesheet Import screens. Set once from the POST /auth/login
// response's roles[] and never refreshed mid-session — a Role Master edit only takes effect
// on the user's next login.
export const useCanViewOriginalData = () => {
  const { isOriginalDataVisible } = useAuth();
  return isOriginalDataVisible;
};

export default useCanWrite;
