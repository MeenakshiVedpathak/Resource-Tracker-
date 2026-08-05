import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/utils/cn';

let tempIdSeq = 0;
export const newTempNodeId = () => `new-${++tempIdSeq}`;

export const emptyChildNode = () => ({ id: newTempNodeId(), name: '', isNew: true });
export const emptyParentNode = () => ({ id: newTempNodeId(), name: '', isNew: true, children: [] });

const ChildRow = ({ child, onChangeName, onDelete }) => (
  <div className="relative flex items-center gap-2 pl-5">
    {/* horizontal tick connecting to the vertical tree line on the wrapper */}
    <span className="absolute left-0 top-1/2 h-px w-3.5 -translate-y-1/2 bg-border" />
    <Input
      value={child.name}
      onChange={(e) => onChangeName(e.target.value)}
      placeholder="Child name"
      className="h-8 flex-1 text-sm bg-white"
    />
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className="h-7 w-7 p-0 shrink-0 text-destructive hover:text-destructive"
      title="Delete child"
      onClick={onDelete}
    >
      <Trash2 className="h-3.5 w-3.5" />
    </Button>
  </div>
);

// Flat list of Child rows with a single "+ Add Child" — used when the Service PO being edited is
// itself a Sub PO, so it can only manage its own (leaf) children.
export const ServicePOChildrenOnlyEditor = ({ nodes, onChange }) => {
  const addChild = () => onChange([...nodes, emptyChildNode()]);
  const changeName = (id, name) => onChange(nodes.map((c) => (c.id === id ? { ...c, name } : c)));
  const deleteChild = (id) => onChange(nodes.filter((c) => c.id !== id));

  return (
    <div className="space-y-2">
      {nodes.length > 0 && (
        <div className="space-y-2 border-l-2 border-border pl-4">
          {nodes.map((child) => (
            <ChildRow
              key={child.id}
              child={child}
              onChangeName={(name) => changeName(child.id, name)}
              onDelete={() => deleteChild(child.id)}
            />
          ))}
        </div>
      )}
      <Button type="button" variant="outline" size="sm" className="h-7 gap-1.5 text-xs" onClick={addChild}>
        <Plus className="h-3 w-3" /> Add Child
      </Button>
    </div>
  );
};

const ParentRow = ({
  parent, onChangeName, onDelete, onAddChild,
  onChangeChildName, onDeleteChild,
}) => (
  <div className="space-y-3 rounded-lg border bg-muted/30 p-3">
    <div className="flex items-center gap-2">
      <Input
        value={parent.name}
        onChange={(e) => onChangeName(e.target.value)}
        placeholder="Sub PO name"
        className="h-9 flex-1 text-sm font-medium bg-white"
      />
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="h-8 gap-1.5 whitespace-nowrap text-xs shrink-0"
        onClick={onAddChild}
      >
        <Plus className="h-3 w-3" /> Add Child
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="h-8 w-8 p-0 shrink-0 text-destructive hover:text-destructive"
        title="Delete Sub PO (removes its children too)"
        onClick={onDelete}
      >
        <Trash2 className="h-3.5 w-3.5" />
      </Button>
    </div>
    {parent.children.length > 0 && (
      <div className="space-y-2 border-l-2 border-border pl-4">
        {parent.children.map((child) => (
          <ChildRow
            key={child.id}
            child={child}
            onChangeName={(name) => onChangeChildName(child.id, name)}
            onDelete={() => onDeleteChild(child.id)}
          />
        ))}
      </div>
    )}
  </div>
);

// Full "root" editor: a single "+ Add Sub PO" button (beside the Service PO name, rendered by the
// caller) plus each Sub PO's own "+ Add Child". Deleting a Sub PO drops its whole children array
// with it (client-side cascade); deleting a Child only removes that one row.
const ServicePOHierarchyEditor = ({ parents, onChange }) => {
  const addParent = () => onChange([...parents, emptyParentNode()]);

  const changeParentName = (id, name) => onChange(parents.map((p) => (p.id === id ? { ...p, name } : p)));

  const deleteParent = (id) => onChange(parents.filter((p) => p.id !== id));

  const addChild = (parentId) =>
    onChange(parents.map((p) => (p.id === parentId ? { ...p, children: [...p.children, emptyChildNode()] } : p)));

  const changeChildName = (parentId, childId, name) =>
    onChange(
      parents.map((p) =>
        p.id === parentId
          ? { ...p, children: p.children.map((c) => (c.id === childId ? { ...c, name } : c)) }
          : p
      )
    );

  const deleteChild = (parentId, childId) =>
    onChange(parents.map((p) => (p.id === parentId ? { ...p, children: p.children.filter((c) => c.id !== childId) } : p)));

  return (
    <div className={cn('space-y-3', parents.length > 0 && 'mb-1')}>
      {parents.map((parent) => (
        <ParentRow
          key={parent.id}
          parent={parent}
          onChangeName={(name) => changeParentName(parent.id, name)}
          onDelete={() => deleteParent(parent.id)}
          onAddChild={() => addChild(parent.id)}
          onChangeChildName={(childId, name) => changeChildName(parent.id, childId, name)}
          onDeleteChild={(childId) => deleteChild(parent.id, childId)}
        />
      ))}
      <Button type="button" variant="outline" size="sm" className="h-8 gap-1.5" onClick={addParent}>
        <Plus className="h-3.5 w-3.5" /> Add Sub PO
      </Button>
    </div>
  );
};

export default ServicePOHierarchyEditor;
