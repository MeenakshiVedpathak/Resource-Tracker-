import { Plus, Trash2, Move } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select, SelectTrigger, SelectContent, SelectItem, SelectValue,
} from '@/components/ui/select';
import { cn } from '@/utils/cn';

let tempIdSeq = 0;
export const newTempNodeId = () => `new-${++tempIdSeq}`;

export const emptyChildNode = () => ({ id: newTempNodeId(), name: '', isNew: true });
export const emptyParentNode = () => ({ id: newTempNodeId(), name: '', isNew: true, children: [] });

// No reparent endpoint exists server-side (only create/rename/delete), so a "move" is really a
// delete-and-recreate under the target: the moved row loses its original id and becomes a fresh
// `isNew` node at the destination. ServicePOHierarchyDrawer's save already deletes any node whose
// id disappears from state and creates any node flagged `isNew`, so no save-logic changes are
// needed — dropping the row from its old spot and appending a new one at the target is enough.
// Any hours already logged against the old node's id are lost once Save runs; callers should
// surface that before the drawer commits.
const MoveToSelect = ({ options, onMove, title }) =>
  options.length === 0 ? null : (
    <Select onValueChange={onMove}>
      <SelectTrigger
        title={title}
        className="h-7 w-auto min-w-0 gap-1 border-dashed px-2 text-xs text-muted-foreground"
      >
        <Move className="h-3 w-3 shrink-0" />
        <SelectValue placeholder="Move to…" />
      </SelectTrigger>
      <SelectContent>
        {options.map((opt) => (
          <SelectItem key={opt.id} value={opt.id}>{opt.name}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );

const ChildRow = ({ child, moveTargets = [], onChangeName, onDelete, onMove }) => (
  <div className="relative flex items-center gap-2 pl-5">
    {/* horizontal tick connecting to the vertical tree line on the wrapper */}
    <span className="absolute left-0 top-1/2 h-px w-3.5 -translate-y-1/2 bg-border" />
    <Input
      value={child.name}
      onChange={(e) => onChangeName(e.target.value)}
      placeholder="Child name"
      className="h-8 flex-1 text-sm bg-white"
    />
    <MoveToSelect options={moveTargets} onMove={onMove} title="Move under a different Sub PO" />
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
  parent, moveTargets, onChangeName, onDelete, onAddChild, onMove,
  onChangeChildName, onDeleteChild, onMoveChild, childMoveTargetsFor,
}) => (
  <div className="space-y-3 rounded-lg border bg-muted/30 p-3">
    <div className="flex items-center gap-2">
      <Input
        value={parent.name}
        onChange={(e) => onChangeName(e.target.value)}
        placeholder="Sub PO name"
        className="h-9 flex-1 text-sm font-medium bg-white"
      />
      {/* Only a childless Sub PO can be converted into a Child — one with its own children
          can't carry them along, since Child nodes can't have children of their own. */}
      {parent.children.length === 0 && (
        <MoveToSelect options={moveTargets} onMove={onMove} title="Make this a Child under a different Sub PO" />
      )}
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
            moveTargets={childMoveTargetsFor(parent.id)}
            onChangeName={(name) => onChangeChildName(child.id, name)}
            onDelete={() => onDeleteChild(child.id)}
            onMove={(targetParentId) => onMoveChild(child.id, targetParentId)}
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

  // Converts a childless Sub PO into a Child under `targetParentId`: dropped from the top-level
  // list, re-added as a fresh `isNew` Child so the existing save logic deletes the old node and
  // creates the new one (see the comment on MoveToSelect above).
  const moveParentToChild = (parentId, targetParentId) => {
    const source = parents.find((p) => p.id === parentId);
    if (!source || source.children.length > 0) return;
    onChange(
      parents
        .filter((p) => p.id !== parentId)
        .map((p) => (p.id === targetParentId
          ? { ...p, children: [...p.children, { id: newTempNodeId(), name: source.name, isNew: true }] }
          : p))
    );
  };

  // Moves a Child from one Sub PO to another, same delete-old/create-new mechanism.
  const moveChildToParent = (sourceParentId, childId, targetParentId) => {
    if (sourceParentId === targetParentId) return;
    const child = parents.find((p) => p.id === sourceParentId)?.children.find((c) => c.id === childId);
    if (!child) return;
    onChange(
      parents.map((p) => {
        if (p.id === sourceParentId) return { ...p, children: p.children.filter((c) => c.id !== childId) };
        if (p.id === targetParentId) {
          return { ...p, children: [...p.children, { id: newTempNodeId(), name: child.name, isNew: true }] };
        }
        return p;
      })
    );
  };

  return (
    <div className={cn('space-y-3', parents.length > 0 && 'mb-1')}>
      {parents.map((parent) => (
        <ParentRow
          key={parent.id}
          parent={parent}
          moveTargets={parents.filter((p) => p.id !== parent.id).map((p) => ({ id: p.id, name: p.name || '(unnamed Sub PO)' }))}
          onChangeName={(name) => changeParentName(parent.id, name)}
          onDelete={() => deleteParent(parent.id)}
          onAddChild={() => addChild(parent.id)}
          onMove={(targetParentId) => moveParentToChild(parent.id, targetParentId)}
          onChangeChildName={(childId, name) => changeChildName(parent.id, childId, name)}
          onDeleteChild={(childId) => deleteChild(parent.id, childId)}
          onMoveChild={(childId, targetParentId) => moveChildToParent(parent.id, childId, targetParentId)}
          childMoveTargetsFor={(currentParentId) =>
            parents.filter((p) => p.id !== currentParentId).map((p) => ({ id: p.id, name: p.name || '(unnamed Sub PO)' }))}
        />
      ))}
      <Button type="button" variant="outline" size="sm" className="h-8 gap-1.5" onClick={addParent}>
        <Plus className="h-3.5 w-3.5" /> Add Sub PO
      </Button>
    </div>
  );
};

export default ServicePOHierarchyEditor;
