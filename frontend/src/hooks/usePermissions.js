import { useAuth } from '@/hooks/useAuth';

// Read vs Read & Write gating. Permission is carried by the ROLE itself (not per-form/module —
// the backend contract has no per-form permission field), so this is a single check per user:
// true if ANY held role carries "Read & Write". An optional roleName narrows the check to only
// consider roles the caller cares about (e.g. useCanWrite('Management') for a Management-only
// screen where only Management's own permission should matter).
export const useCanWrite = (roleName) => {
  const { roleObjects } = useAuth();
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
  const { accessibleForms } = useAuth();
  return Object.values(accessibleForms ?? {})
    .flat()
    .some((f) => f.name === formName);
};

// Gates the Modified/Original hours-source toggle in Reports & Dashboard. Backed by
// GET /roles/form-mappings/:userId (see useOriginalDataVisibility.js), refreshed at login
// and after any Role Master edit — not derived from the login roleObjects snapshot, since
// that would go stale until the next login.
export const useCanViewOriginalData = () => {
  const { isOriginalDataVisible } = useAuth();
  return isOriginalDataVisible;
};

export default useCanWrite;
