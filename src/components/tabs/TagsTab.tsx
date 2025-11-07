import { useState, useMemo } from 'react';
import {
  Tag as TagIcon,
  Layers,
  Plus,
  Edit2,
  Trash2,
  X,
  Check,
  ChevronDown,
  ChevronRight,
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

function SortableItem({ item, onEdit, onDelete, type }: any) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: item.id });
  const style = { transform: CSS.Transform.toString(transform), transition };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border-2 border-slate-200 hover:border-blue-300 transition-all cursor-grab"
      {...attributes}
      {...listeners}
    >
      <div className="flex-1 flex items-center gap-2">
        <div
          className="w-6 h-6 rounded-full border-2"
          style={{ backgroundColor: item.color, borderColor: item.color }}
        />
        <div>
          <div className="font-medium text-slate-800">{item.name}</div>
          <div className="text-xs text-slate-500">{item.taskCount} task(s)</div>
        </div>
      </div>
      <div className="flex items-center gap-1">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onEdit(item);
          }}
          className="p-1.5 hover:bg-blue-100 rounded text-blue-600 transition-colors"
          title={`Edit ${type}`}
        >
          <Edit2 size={14} />
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete(item.id, item.name);
          }}
          className="p-1.5 hover:bg-red-100 rounded text-red-600 transition-colors"
          title={`Delete ${type}`}
        >
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  );
}

export function TagsTab() {
  const {
    tasks,
    tags,
    divisions,
    searchQuery,
    hideCompleted,
    updateTag,
    removeTag,
    addTag,
    addDivision,
    updateDivision,
    removeDivision,
    showDeleteConfirmation,
  } = useAppStore();

  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [selectedDivision, setSelectedDivision] = useState<string | null>(null);

  const [showAddTag, setShowAddTag] = useState(false);
  const [newTagName, setNewTagName] = useState('');
  const [newTagColor, setNewTagColor] = useState('#3B82F6');
  const [editingTag, setEditingTag] = useState<any>(null);
  const [editTagName, setEditTagName] = useState('');
  const [editTagColor, setEditTagColor] = useState('');

  const [showAddDivision, setShowAddDivision] = useState(false);
  const [newDivisionName, setNewDivisionName] = useState('');
  const [newDivisionColor, setNewDivisionColor] = useState('#8B5CF6');
  const [editingDivision, setEditingDivision] = useState<any>(null);
  const [editDivisionName, setEditDivisionName] = useState('');
  const [editDivisionColor, setEditDivisionColor] = useState('');

  const [collapsedLanes, setCollapsedLanes] = useState<Record<string, boolean>>({
    red: false,
    yellow: false,
    green: false,
  });

  const filteredTasks = tasks.filter(
    (task) =>
      (task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        task.description.toLowerCase().includes(searchQuery.toLowerCase())) &&
      (!hideCompleted || task.lane !== 'green')
  );

  const displayedTasks = useMemo(() => {
    let result = filteredTasks;
    if (selectedTag) result = result.filter((t) => t.tags?.some((tg) => tg.id === selectedTag));
    if (selectedDivision)
      result = result.filter((t) => t.divisions?.some((d) => d.id === selectedDivision));
    return result;
  }, [filteredTasks, selectedTag, selectedDivision]);

  const groupedTasks = useMemo(() => {
    const lanes = { red: [], yellow: [], green: [] } as Record<string, any[]>;
    displayedTasks.forEach((t) => lanes[t.lane]?.push(t));
    return lanes;
  }, [displayedTasks]);

  const toggleLane = (lane: string) => {
    setCollapsedLanes((prev) => ({ ...prev, [lane]: !prev[lane] }));
  };

  // --- TAG CRUD + ORDER ---
  const handleAddTag = async () => {
    if (!newTagName.trim()) return;
    const { data, error } = await supabase
      .from('tags')
      .insert({ name: newTagName, color: newTagColor, order_index: tags.length })
      .select()
      .single();
    if (!error && data) {
      addTag(data);
      setNewTagName('');
      setNewTagColor('#3B82F6');
      setShowAddTag(false);
    }
  };

  const handleEditTag = (tag: any) => {
    setEditingTag(tag);
    setEditTagName(tag.name);
    setEditTagColor(tag.color);
  };

  const handleSaveTag = async () => {
    if (!editingTag) return;
    await supabase
      .from('tags')
      .update({ name: editTagName, color: editTagColor })
      .eq('id', editingTag.id);
    updateTag(editingTag.id, { name: editTagName, color: editTagColor });
    setEditingTag(null);
  };

  const handleDeleteTag = (id: string, name: string) => {
    const tasksWithTag = tasks.filter((t) => t.tags?.some((tg) => tg.id === id));
    showDeleteConfirmation(
      'Delete Tag',
      `Delete "${name}"? It will be removed from ${tasksWithTag.length} tasks.`,
      async () => {
        await supabase.from('tags').delete().eq('id', id);
        removeTag(id);
        if (selectedTag === id) setSelectedTag(null);
      }
    );
  };

  const handleTagDragEnd = async (event: any) => {
    const { active, over } = event;
    if (active.id !== over?.id) {
      const oldIndex = tags.findIndex((t) => t.id === active.id);
      const newIndex = tags.findIndex((t) => t.id === over.id);
      const newOrder = arrayMove(tags, oldIndex, newIndex);
      newOrder.forEach((t, i) => supabase.from('tags').update({ order_index: i }).eq('id', t.id));
    }
  };

  // --- DIVISION CRUD + ORDER ---
  const handleAddDivision = async () => {
    if (!newDivisionName.trim()) return;
    const { data, error } = await supabase
      .from('divisions')
      .insert({ name: newDivisionName, color: newDivisionColor, order_index: divisions.length })
      .select()
      .single();
    if (!error && data) {
      addDivision(data);
      setNewDivisionName('');
      setNewDivisionColor('#8B5CF6');
      setShowAddDivision(false);
    }
  };

  const handleEditDivision = (division: any) => {
    setEditingDivision(division);
    setEditDivisionName(division.name);
    setEditDivisionColor(division.color);
  };

  const handleSaveDivision = async () => {
    if (!editingDivision) return;
    await supabase
      .from('divisions')
      .update({ name: editDivisionName, color: editDivisionColor })
      .eq('id', editingDivision.id);
    updateDivision(editingDivision.id, { name: editDivisionName, color: editDivisionColor });
    setEditingDivision(null);
  };

  const handleDeleteDivision = (id: string, name: string) => {
    const tasksWithDivision = tasks.filter((t) => t.divisions?.some((d) => d.id === id));
    showDeleteConfirmation(
      'Delete Division',
      `Delete "${name}"? It will be removed from ${tasksWithDivision.length} tasks.`,
      async () => {
        await supabase.from('divisions').delete().eq('id', id);
        removeDivision(id);
        if (selectedDivision === id) setSelectedDivision(null);
      }
    );
  };

  const handleDivisionDragEnd = async (event: any) => {
    const { active, over } = event;
    if (active.id !== over?.id) {
      const oldIndex = divisions.findIndex((d) => d.id === active.id);
      const newIndex = divisions.findIndex((d) => d.id === over.id);
      const newOrder = arrayMove(divisions, oldIndex, newIndex);
      newOrder.forEach((d, i) =>
        supabase.from('divisions').update({ order_index: i }).eq('id', d.id)
      );
    }
  };

  return (
    <div className="space-y-10">
      {/* --- TAG MANAGEMENT --- */}
      <div className="bg-white rounded-xl p-6 border-2 border-slate-300 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <TagIcon size={28} /> Tag Management
          </h2>
          <button
            onClick={() => setShowAddTag(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg border-2 border-blue-700 hover:bg-blue-700 font-medium"
          >
            <Plus size={18} /> Add Tag
          </button>
        </div>

        {showAddTag && (
          <div className="mb-4 p-4 bg-blue-50 rounded-lg border-2 border-blue-200">
            <div className="flex gap-3 items-center">
              <input
                type="text"
                value={newTagName}
                onChange={(e) => setNewTagName(e.target.value)}
                placeholder="Tag name..."
                className="flex-1 px-4 h-10 rounded-lg border-2 border-slate-300 focus:ring-2 focus:ring-blue-500"
              />
              <input
                type="color"
                value={newTagColor}
                onChange={(e) => setNewTagColor(e.target.value)}
                className="w-12 h-10 rounded cursor-pointer"
              />
              <button
                onClick={handleAddTag}
                className="px-4 h-10 bg-blue-600 text-white rounded-lg border-2 border-blue-700 hover:bg-blue-700"
              >
                Add
              </button>
              <button
                onClick={() => setShowAddTag(false)}
                className="px-4 h-10 bg-slate-200 text-slate-700 rounded-lg border-2 border-slate-300 hover:bg-slate-300"
              >
                Cancel
              </button>
            </div>
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
                  onEdit={handleEditTag}
                  onDelete={handleDeleteTag}
                  type="tag"
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      </div>

      {/* --- DIVISION MANAGEMENT --- */}
      <div className="bg-white rounded-xl p-6 border-2 border-slate-300 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Layers size={28} /> Division Management
          </h2>
          <button
            onClick={() => setShowAddDivision(true)}
            className="flex items-center gap-2 px-4 py-2 bg-violet-600 text-white rounded-lg border-2 border-violet-700 hover:bg-violet-700 font-medium"
          >
            <Plus size={18} /> Add Division
          </button>
        </div>

        {showAddDivision && (
          <div className="mb-4 p-4 bg-violet-50 rounded-lg border-2 border-violet-200">
            <div className="flex gap-3 items-center">
              <input
                type="text"
                value={newDivisionName}
                onChange={(e) => setNewDivisionName(e.target.value)}
                placeholder="Division name..."
                className="flex-1 px-4 h-10 rounded-lg border-2 border-slate-300 focus:ring-2 focus:ring-violet-500"
              />
              <input
                type="color"
                value={newDivisionColor}
                onChange={(e) => setNewDivisionColor(e.target.value)}
                className="w-12 h-10 rounded cursor-pointer"
              />
              <button
                onClick={handleAddDivision}
                className="px-4 h-10 bg-violet-600 text-white rounded-lg border-2 border-violet-700 hover:bg-violet-700"
              >
                Add
              </button>
              <button
                onClick={() => setShowAddDivision(false)}
                className="px-4 h-10 bg-slate-200 text-slate-700 rounded-lg border-2 border-slate-300 hover:bg-slate-300"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        <DndContext collisionDetection={closestCenter} onDragEnd={handleDivisionDragEnd}>
          <SortableContext items={divisions.map((d) => d.id)} strategy={verticalListSortingStrategy}>
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
                  onEdit={handleEditDivision}
                  onDelete={handleDeleteDivision}
                  type="division"
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      </div>

      {/* --- LANE GROUPINGS --- */}
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
