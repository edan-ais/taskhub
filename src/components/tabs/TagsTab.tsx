import { useState, useMemo } from 'react';
import {
  Tag as TagIcon,
  Layers,
  Plus,
  Edit2,
  Trash2,
  GripVertical,
  ChevronDown,
  ChevronRight,
  X,
  Check,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore } from '../../lib/store';
import { TaskCardPeople as TaskCard } from '../TaskCardPeople';
import { supabase } from '../../lib/supabase';
import { DndContext, closestCenter } from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

/* =========================================================
   SORTABLE ITEM (supports view mode + edit mode)
========================================================= */
function SortableItem({
  item,
  onClick,
  isActive,
  type,
  onDelete,
  onStartEdit,
  isEditing,
  editName,
  editColor,
  onEditNameChange,
  onEditColorChange,
  onSaveEdit,
  onCancelEdit,
}: any) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({
    id: item.id,
  });
  const style = { transform: CSS.Transform.toString(transform), transition };

  // EDIT MODE
  if (isEditing) {
    return (
      <div
        ref={setNodeRef}
        style={style}
        className="flex items-center gap-2 p-3 rounded-lg border-2 border-blue-400 bg-blue-50"
      >
        {/* keep handle so user sees it's still reorderable */}
        <div
          {...attributes}
          {...listeners}
          onClick={(e) => e.stopPropagation()}
          className="p-1.5 text-slate-400 hover:text-slate-600 cursor-grab active:cursor-grabbing"
          title="Drag to reorder"
        >
          <GripVertical size={16} />
        </div>
        <input
          value={editName}
          onChange={(e) => onEditNameChange(e.target.value)}
          className="flex-1 px-2 py-1 rounded border-2 border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder={type === 'tag' ? 'Tag name' : 'Division name'}
          autoFocus
        />
        <input
          type="color"
          value={editColor}
          onChange={(e) => onEditColorChange(e.target.value)}
          className="w-10 h-8 rounded cursor-pointer"
        />
        <button
          onClick={(e) => {
            e.stopPropagation();
            onSaveEdit();
          }}
          className="p-1.5 rounded bg-green-100 text-green-700 hover:bg-green-200"
          title="Save"
        >
          <Check size={14} />
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onCancelEdit();
          }}
          className="p-1.5 rounded bg-slate-100 text-slate-700 hover:bg-slate-200"
          title="Cancel"
        >
          <X size={14} />
        </button>
      </div>
    );
  }

  // VIEW MODE
  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center justify-between p-3 rounded-lg border-2 transition-all select-none shadow-sm ${
        isActive
          ? 'border-4 border-blue-400 bg-blue-50'
          : 'border-slate-200 bg-slate-50 hover:border-blue-300'
      }`}
    >
      {/* Drag handle only */}
      <div
        {...attributes}
        {...listeners}
        onClick={(e) => e.stopPropagation()}
        className="p-1.5 mr-2 text-slate-400 hover:text-slate-600 cursor-grab active:cursor-grabbing"
        title="Drag to reorder"
      >
        <GripVertical size={16} />
      </div>

      {/* Clickable body (filters) */}
      <div
        className="flex-1 flex items-center gap-2 cursor-pointer min-w-0"
        onClick={() => onClick?.(item.id)}
      >
        <div
          className="w-6 h-6 rounded-full border-2 shrink-0"
          style={{ backgroundColor: item.color, borderColor: item.color }}
        />
        <div className="min-w-0">
          <div className="font-medium text-slate-800 truncate">{item.name}</div>
          <div className="text-xs text-slate-500">{item.taskCount} task(s)</div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 ml-2 shrink-0">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onStartEdit(item);
          }}
          className="p-1.5 hover:bg-blue-100 rounded text-blue-600"
          title={`Edit ${type}`}
        >
          <Edit2 size={14} />
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete(item.id, item.name);
          }}
          className="p-1.5 hover:bg-red-100 rounded text-red-600"
          title={`Delete ${type}`}
        >
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  );
}

/* =========================================================
   MAIN COMPONENT
========================================================= */
export function TagsTab() {
  const {
    tasks,
    tags,
    divisions,
    searchQuery,
    hideCompleted,
    addTag,
    updateTag,
    removeTag,
    addDivision,
    updateDivision,
    removeDivision,
    showDeleteConfirmation,
  } = useAppStore();

  // filters
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [selectedDivision, setSelectedDivision] = useState<string | null>(null);

  // add tag form
  const [showAddTag, setShowAddTag] = useState(false);
  const [newTagName, setNewTagName] = useState('');
  const [newTagColor, setNewTagColor] = useState('#3B82F6');

  // edit tag
  const [editingTag, setEditingTag] = useState<any>(null);
  const [editTagName, setEditTagName] = useState('');
  const [editTagColor, setEditTagColor] = useState('');

  // add division form
  const [showAddDivision, setShowAddDivision] = useState(false);
  const [newDivisionName, setNewDivisionName] = useState('');
  const [newDivisionColor, setNewDivisionColor] = useState('#8B5CF6');

  // edit division
  const [editingDivision, setEditingDivision] = useState<any>(null);
  const [editDivisionName, setEditDivisionName] = useState('');
  const [editDivisionColor, setEditDivisionColor] = useState('');

  // lanes
  const [collapsedLanes, setCollapsedLanes] = useState<Record<string, boolean>>({
    red: false,
    yellow: false,
    green: false,
  });

  /* ------------------ FILTER TASKS ------------------ */
  const filteredTasks = tasks.filter(
    (task) =>
      (task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        task.description.toLowerCase().includes(searchQuery.toLowerCase())) &&
      (!hideCompleted || task.lane !== 'green')
  );

  const displayedTasks = useMemo(() => {
    let result = filteredTasks;
    if (selectedTag) {
      result = result.filter((t) => t.tags?.some((tg) => tg.id === selectedTag));
    }
    if (selectedDivision) {
      result = result.filter((t) => t.divisions?.some((d) => d.id === selectedDivision));
    }
    return result;
  }, [filteredTasks, selectedTag, selectedDivision]);

  const groupedTasks = useMemo(() => {
    const lanes = { red: [], yellow: [], green: [] } as Record<string, any[]>;
    displayedTasks.forEach((t) => lanes[t.lane]?.push(t));
    return lanes;
  }, [displayedTasks]);

  const toggleLane = (lane: string) =>
    setCollapsedLanes((prev) => ({ ...prev, [lane]: !prev[lane] }));

  /* ------------------ TAG CRUD ------------------ */
  const handleAddTag = async () => {
    if (!newTagName.trim()) {
      setShowAddTag(false);
      return;
    }

    // try to insert, but close form regardless
    try {
      const { data, error } = await supabase
        .from('tags')
        .insert({ name: newTagName, color: newTagColor, order_index: tags.length })
        .select()
        .single();

      if (error) throw error;
      if (data) {
        addTag(data);
      }
    } catch (err) {
      console.error('Error creating tag:', err);
    } finally {
      setNewTagName('');
      setNewTagColor('#3B82F6');
      setShowAddTag(false);
    }
  };

  const handleStartEditTag = (tag: any) => {
    setEditingTag(tag);
    setEditTagName(tag.name);
    setEditTagColor(tag.color);
  };

  const handleSaveEditTag = async () => {
    if (!editingTag) return;
    try {
      const { error } = await supabase
        .from('tags')
        .update({ name: editTagName, color: editTagColor })
        .eq('id', editingTag.id);

      if (error) throw error;
      updateTag(editingTag.id, { name: editTagName, color: editTagColor });
    } catch (err) {
      console.error('Error updating tag:', err);
    } finally {
      setEditingTag(null);
      setEditTagName('');
      setEditTagColor('');
    }
  };

  const handleCancelEditTag = () => {
    setEditingTag(null);
    setEditTagName('');
    setEditTagColor('');
  };

  const handleDeleteTag = (id: string, name: string) => {
    const tasksWithTag = tasks.filter((t) => t.tags?.some((tg) => tg.id === id));
    showDeleteConfirmation(
      'Delete Tag',
      `Delete "${name}"? It will be removed from ${tasksWithTag.length} task(s).`,
      async () => {
        try {
          await supabase.from('tags').delete().eq('id', id);
          removeTag(id);
          if (selectedTag === id) setSelectedTag(null);
        } catch (err) {
          console.error('Error deleting tag:', err);
        }
      }
    );
  };

  const handleTagDragEnd = async (e: any) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;

    const oldIndex = tags.findIndex((t) => t.id === active.id);
    const newIndex = tags.findIndex((t) => t.id === over.id);
    const reordered = arrayMove(tags, oldIndex, newIndex);

    // optimistic order update
    reordered.forEach((t, i) => {
      supabase.from('tags').update({ order_index: i }).eq('id', t.id);
    });
  };

  /* ------------------ DIVISION CRUD ------------------ */
  const handleAddDivision = async () => {
    if (!newDivisionName.trim()) {
      setShowAddDivision(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('divisions')
        .insert({
          name: newDivisionName,
          color: newDivisionColor,
          order_index: divisions.length,
        })
        .select()
        .single();

      if (error) throw error;
      if (data) {
        addDivision(data);
      }
    } catch (err) {
      console.error('Error creating division:', err);
    } finally {
      setNewDivisionName('');
      setNewDivisionColor('#8B5CF6');
      setShowAddDivision(false);
    }
  };

  const handleStartEditDivision = (division: any) => {
    setEditingDivision(division);
    setEditDivisionName(division.name);
    setEditDivisionColor(division.color);
  };

  const handleSaveEditDivision = async () => {
    if (!editingDivision) return;
    try {
      const { error } = await supabase
        .from('divisions')
        .update({ name: editDivisionName, color: editDivisionColor })
        .eq('id', editingDivision.id);

      if (error) throw error;
      updateDivision(editingDivision.id, {
        name: editDivisionName,
        color: editDivisionColor,
      });
    } catch (err) {
      console.error('Error updating division:', err);
    } finally {
      setEditingDivision(null);
      setEditDivisionName('');
      setEditDivisionColor('');
    }
  };

  const handleCancelEditDivision = () => {
    setEditingDivision(null);
    setEditDivisionName('');
    setEditDivisionColor('');
  };

  const handleDeleteDivision = (id: string, name: string) => {
    const tasksWithDivision = tasks.filter((t) => t.divisions?.some((d) => d.id === id));
    showDeleteConfirmation(
      'Delete Division',
      `Delete "${name}"? It will be removed from ${tasksWithDivision.length} task(s).`,
      async () => {
        try {
          await supabase.from('divisions').delete().eq('id', id);
          removeDivision(id);
          if (selectedDivision === id) setSelectedDivision(null);
        } catch (err) {
          console.error('Error deleting division:', err);
        }
      }
    );
  };

  const handleDivisionDragEnd = async (e: any) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;

    const oldIndex = divisions.findIndex((d) => d.id === active.id);
    const newIndex = divisions.findIndex((d) => d.id === over.id);
    const reordered = arrayMove(divisions, oldIndex, newIndex);

    reordered.forEach((d, i) => {
      supabase.from('divisions').update({ order_index: i }).eq('id', d.id);
    });
  };

  /* ------------------ RENDER ------------------ */
  return (
    <div className="space-y-10">
      {/* TAG MANAGEMENT */}
      <div className="bg-white rounded-xl p-6 border-2 border-slate-300 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <TagIcon size={28} />
            Tag Management
          </h2>
          <button
            onClick={() => setShowAddTag(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg border-2 border-blue-700 hover:bg-blue-700"
          >
            <Plus size={18} />
            Add Tag
          </button>
        </div>

        {showAddTag && (
          <div className="mb-4 p-4 bg-blue-50 rounded-lg border-2 border-blue-200 flex gap-3 items-center">
            <input
              type="text"
              value={newTagName}
              onChange={(e) => setNewTagName(e.target.value)}
              placeholder="Tag name..."
              className="flex-1 px-4 h-10 rounded-lg border-2 border-slate-300"
              autoFocus
            />
            <input
              type="color"
              value={newTagColor}
              onChange={(e) => setNewTagColor(e.target.value)}
              className="w-12 h-10 rounded cursor-pointer"
            />
            <button
              onClick={handleAddTag}
              className="px-4 h-10 bg-blue-600 text-white rounded-lg border-2 border-blue-700"
            >
              Add
            </button>
            <button
              onClick={() => {
                setShowAddTag(false);
                setNewTagName('');
                setNewTagColor('#3B82F6');
              }}
              className="px-4 h-10 bg-slate-200 text-slate-700 rounded-lg border-2 border-slate-300"
            >
              Cancel
            </button>
          </div>
        )}

        <DndContext collisionDetection={closestCenter} onDragEnd={handleTagDragEnd}>
          <SortableContext items={tags.map((t) => t.id)} strategy={verticalListSortingStrategy}>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {tags.map((t) => (
                <SortableItem
                  key={t.id}
                  item={{
                    ...t,
                    taskCount: tasks.filter((task) =>
                      task.tags?.some((tg) => tg.id === t.id)
                    ).length,
                  }}
                  onClick={(id: string) =>
                    setSelectedTag((prev) => (prev === id ? null : id))
                  }
                  isActive={selectedTag === t.id}
                  type="tag"
                  onDelete={handleDeleteTag}
                  onStartEdit={handleStartEditTag}
                  isEditing={editingTag?.id === t.id}
                  editName={editTagName}
                  editColor={editTagColor}
                  onEditNameChange={setEditTagName}
                  onEditColorChange={setEditTagColor}
                  onSaveEdit={handleSaveEditTag}
                  onCancelEdit={handleCancelEditTag}
                />
              ))}
              {tags.length === 0 && (
                <div className="col-span-full text-center py-6 text-slate-400">
                    No tags yet.
                </div>
              )}
            </div>
          </SortableContext>
        </DndContext>
      </div>

      {/* DIVISION MANAGEMENT */}
      <div className="bg-white rounded-xl p-6 border-2 border-slate-300 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Layers size={28} />
            Division Management
          </h2>
          <button
            onClick={() => setShowAddDivision(true)}
            className="flex items-center gap-2 px-4 py-2 bg-violet-600 text-white rounded-lg border-2 border-violet-700 hover:bg-violet-700"
          >
            <Plus size={18} />
            Add Division
          </button>
        </div>

        {showAddDivision && (
          <div className="mb-4 p-4 bg-violet-50 rounded-lg border-2 border-violet-200 flex gap-3 items-center">
            <input
              type="text"
              value={newDivisionName}
              onChange={(e) => setNewDivisionName(e.target.value)}
              placeholder="Division name..."
              className="flex-1 px-4 h-10 rounded-lg border-2 border-slate-300"
              autoFocus
            />
            <input
              type="color"
              value={newDivisionColor}
              onChange={(e) => setNewDivisionColor(e.target.value)}
              className="w-12 h-10 rounded cursor-pointer"
            />
            <button
              onClick={handleAddDivision}
              className="px-4 h-10 bg-violet-600 text-white rounded-lg border-2 border-violet-700"
            >
              Add
            </button>
            <button
              onClick={() => {
                setShowAddDivision(false);
                setNewDivisionName('');
                setNewDivisionColor('#8B5CF6');
              }}
              className="px-4 h-10 bg-slate-200 text-slate-700 rounded-lg border-2 border-slate-300"
            >
              Cancel
            </button>
          </div>
        )}

        <DndContext collisionDetection={closestCenter} onDragEnd={handleDivisionDragEnd}>
          <SortableContext
            items={divisions.map((d) => d.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {divisions.map((d) => (
                <SortableItem
                  key={d.id}
                  item={{
                    ...d,
                    taskCount: tasks.filter((task) =>
                      task.divisions?.some((dv) => dv.id === d.id)
                    ).length,
                  }}
                  onClick={(id: string) =>
                    setSelectedDivision((prev) => (prev === id ? null : id))
                  }
                  isActive={selectedDivision === d.id}
                  type="division"
                  onDelete={handleDeleteDivision}
                  onStartEdit={handleStartEditDivision}
                  isEditing={editingDivision?.id === d.id}
                  editName={editDivisionName}
                  editColor={editDivisionColor}
                  onEditNameChange={setEditDivisionName}
                  onEditColorChange={setEditDivisionColor}
                  onSaveEdit={handleSaveEditDivision}
                  onCancelEdit={handleCancelEditDivision}
                />
              ))}
              {divisions.length === 0 && (
                <div className="col-span-full text-center py-6 text-slate-400">
                  No divisions yet.
                </div>
              )}
            </div>
          </SortableContext>
        </DndContext>
      </div>

      {/* TASKS BY LANE */}
      {(['red', 'yellow', 'green'] as const).map((lane) => {
        const laneTasks = groupedTasks[lane];
        const laneTitles = { red: 'Pending', yellow: 'In Progress', green: 'Completed' };
        const laneColors = {
          red: 'border-red-400 bg-red-50',
          yellow: 'border-yellow-400 bg-yellow-50',
          green: 'border-green-400 bg-green-50',
        };
        return (
          <div key={lane} className={`rounded-xl border-2 ${laneColors[lane]} p-6`}>
            <button
              onClick={() => toggleLane(lane)}
              className="flex items-center justify-between w-full text-left font-semibold text-slate-800 mb-4"
            >
              <div className="flex items-center gap-2 text-lg">
                {collapsedLanes[lane] ? <ChevronRight size={18} /> : <ChevronDown size={18} />}
                {laneTitles[lane]} ({laneTasks.length})
              </div>
            </button>
            <AnimatePresence>
              {!collapsedLanes[lane] && (
                <motion.div
                  key={lane}
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.3 }}
                  className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
                >
                  {laneTasks.map((task) => (
                    <TaskCard key={task.id} task={task} />
                  ))}
                  {laneTasks.length === 0 && (
                    <div className="col-span-full text-center py-6 text-slate-400">
                      No {laneTitles[lane].toLowerCase()} tasks
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
}
