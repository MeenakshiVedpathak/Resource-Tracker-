import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useEmployeeMappedProjects } from '@/hooks/useEmployeeProjects';

// Only the Service POs/projects mapped to the logged-in employee (never the full list) —
// see api/employeeProjects.api.js.
const ProjectSelect = ({ value, onChange, disabled }) => {
  const { data: projects = [], isLoading } = useEmployeeMappedProjects();

  return (
    <Select
      value={value || undefined}
      // Guard against Radix firing onValueChange with an empty value while the projects list
      // is still loading (async-bound Select) — an unguarded call here would wipe out a
      // value already set when editing an existing task.
      onValueChange={(v) => v && onChange(v)}
      disabled={disabled || isLoading}
    >
      <SelectTrigger>
        <SelectValue placeholder={isLoading ? 'Loading projects…' : 'Select a project'} />
      </SelectTrigger>
      <SelectContent>
        {!isLoading && projects.length === 0 ? (
          <div className="px-3 py-2 text-sm text-muted-foreground">No projects assigned to you.</div>
        ) : (
          projects.map((p) => (
            <SelectItem key={p.id} value={String(p.id)}>
              {p.name} {p.code && <span className="text-muted-foreground font-mono text-xs">({p.code})</span>}
            </SelectItem>
          ))
        )}
      </SelectContent>
    </Select>
  );
};

export default ProjectSelect;
