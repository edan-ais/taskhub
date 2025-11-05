import { useState, useMemo } from 'react';
import { Tag as TagIcon, Plus, Edit2, Trash2, X, Check } from 'lucide-react';
import { useAppStore } from '../../lib/store';
import { TaskCard } from '../TaskCard';
import { motion } from 'framer-motion';
import { supabase } from '../../lib/supabase';

export function TagsTab() {
  const { tasks, tags, divisions, searchQuery, hideCompleted, updateTag, removeTag, addTag, showDeleteConfirmation } = useAppStore();
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [selectedDivision, setSelectedDivision] = useState<string | null>(null);
  const [showAddTag, setShowAddTag] = useState(false);
  const [newTagName, setNewTagName] = useState('');
  const [newTagColor, setNewTagColor] = useState('#3B82F6');
  const [editingTag, setEditingTag] = useState<string | null>(null);
  const [editTagName, setEditTagName] = useState('');
  const [editTagColor, setEditTagColor] = useState('');

  const filteredTasks = tasks.filter(
    (task) =>
      (task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      task.description.toLowerCase().includes(searchQuery.toLowerCase())) &&
      (!hideCompleted || task.lane !== 'green')
  );

  const displayedTasks = useMemo(() => {
    let result = filteredTasks;

    if (selectedTag) {
      result = result.filter((task) => task.tags?.some((t) => t.id === selectedTag));
    }

    if (selectedDivision) {
      result = result.filter((task) => task.divisions?.some((d) => d.id === selectedDivision));
    }

    return result;
  }, [filteredTasks, selectedTag, selectedDivision]);

  const handleAddTag = async () => {
    if (!newTagName.trim()) return;

    try {
      const { data: tag, error } = await supabase
        .from('tags')
        .insert({ name: newTagName, color: newTagColor })
        .select()
        .single();

      if (error) throw error;

      addTag(tag);
      setNewTagName('');
      setNewTagColor('#3B82F6');
      setShowAddTag(false);
    } catch (error) {
      console.error('Error creating tag:', error);
    }
  };

  const handleStartEdit = (tag: any) => {
    setEditingTag(tag.id);
    setEditTagName(tag.name);
    setEditTagColor(tag.color);
  };

  const handleSaveEdit = async () => {
    if (!editTagName.trim() || !editingTag) {
      setEditingTag(null);
      return;
    }

    try {
      const { error } = await supabase
        .from('tags')
        .update({ name: editTagName, color: editTagColor })
        .eq('id', editingTag);

      if (error) throw error;

      updateTag(editingTag, { name: editTagName, color: editTagColor });
      setEditingTag(null);
    } catch (error) {
      console.error('Error updating tag:', error);
    }
  };

  const handleDeleteTag = (tagId: string, tagName: string) => {
    const tasksWithTag = tasks.filter(t => t.tags?.some(tag => tag.id === tagId));

    showDeleteConfirmation(
      'Delete Tag',
      `Are you sure you want to delete the tag "${tagName}"? It will be removed from ${tasksWithTag.length} task(s).`,
      async () => {
        try {
          await supabase.from('task_tags').delete().eq('tag_id', tagId);
          await supabase.from('tags').delete().eq('id', tagId);
          removeTag(tagId);
          if (selectedTag === tagId) {
            setSelectedTag(null);
          }
        } catch (error) {
          console.error('Error deleting tag:', error);
        }
      }
    );
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl p-6 border-2 border-slate-300">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <TagIcon size={28} />
            Tag Management
          </h2>
          <button
            onClick={() => setShowAddTag(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg border-2 border-blue-700 hover:bg-blue-700 transition-all font-medium"
          >
            <Plus size={18} />
            Create Tag
          </button>
        </div>

        {showAddTag && (
          <div className="mb-4 p-4 bg-blue-50 rounded-lg border-2 border-blue-200">
            <div className="flex gap-2 items-center">
              <input
                type="text"
                value={newTagName}
                onChange={(e) => setNewTagName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddTag()}
                placeholder="Tag name..."
                className="flex-1 px-4 h-10 rounded-lg border-2 border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                className="px-4 h-10 bg-blue-600 text-white rounded-lg border-2 border-blue-700 hover:bg-blue-700 transition-colors"
              >
                Create
              </button>
              <button
                onClick={() => {
                  setShowAddTag(false);
                  setNewTagName('');
                  setNewTagColor('#3B82F6');
                }}
                className="px-4 h-10 bg-slate-200 text-slate-700 rounded-lg border-2 border-slate-300 hover:bg-slate-300 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        <div className="mb-6">
          <h3 className="text-sm font-semibold text-slate-600 mb-3">All Tags</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {tags.map((tag) => {
              const taskCount = tasks.filter(t => t.tags?.some(tg => tg.id === tag.id)).length;
              return (
                <div
                  key={tag.id}
                  className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border-2 border-slate-200 hover:border-blue-300 transition-all"
                >
                  {editingTag === tag.id ? (
                    <div className="flex-1 flex items-center gap-2">
                      <input
                        type="text"
                        value={editTagName}
                        onChange={(e) => setEditTagName(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSaveEdit()}
                        className="flex-1 px-2 py-1 border-2 border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                        autoFocus
                      />
                      <input
                        type="color"
                        value={editTagColor}
                        onChange={(e) => setEditTagColor(e.target.value)}
                        className="w-10 h-8 rounded cursor-pointer"
                      />
                      <button
                        onClick={handleSaveEdit}
                        className="p-1 hover:bg-green-100 rounded text-green-600"
                      >
                        <Check size={16} />
                      </button>
                      <button
                        onClick={() => setEditingTag(null)}
                        className="p-1 hover:bg-slate-200 rounded text-slate-600"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="flex-1 flex items-center gap-2">
                        <div
                          className="w-6 h-6 rounded-full border-2"
                          style={{ backgroundColor: tag.color, borderColor: tag.color }}
                        />
                        <div>
                          <div className="font-medium text-slate-800">{tag.name}</div>
                          <div className="text-xs text-slate-500">{taskCount} task(s)</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleStartEdit(tag)}
                          className="p-1.5 hover:bg-blue-100 rounded text-blue-600 transition-colors"
                          title="Edit tag"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          onClick={() => handleDeleteTag(tag.id, tag.name)}
                          className="p-1.5 hover:bg-red-100 rounded text-red-600 transition-colors"
                          title="Delete tag"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </>
                  )}
                </div>
              );
            })}
            {tags.length === 0 && (
              <div className="col-span-full text-center py-6 text-slate-400">
                No tags created yet. Click "Create Tag" to get started.
              </div>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <h3 className="text-sm font-semibold text-slate-600 mb-2">Filter by Tags</h3>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setSelectedTag(null)}
                className={`px-4 py-2 rounded-lg font-medium border-2 transition-all ${
                  !selectedTag
                    ? 'bg-blue-600 text-white border-blue-700'
                    : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                }`}
              >
                All Tags
              </button>
              {tags.map((tag) => {
                const count = filteredTasks.filter((task) => task.tags?.some((t) => t.id === tag.id)).length;
                return (
                  <button
                    key={tag.id}
                    onClick={() => setSelectedTag(tag.id)}
                    className={`px-4 py-2 rounded-lg font-medium border-2 transition-all ${
                      selectedTag === tag.id ? 'ring-2 ring-offset-2' : 'hover:bg-opacity-80'
                    }`}
                    style={{
                      backgroundColor: selectedTag === tag.id ? tag.color : `${tag.color}30`,
                      color: selectedTag === tag.id ? 'white' : tag.color,
                      borderColor: tag.color,
                      ringColor: tag.color,
                    }}
                  >
                    {tag.name}
                    <span className="ml-2 text-sm opacity-75">({count})</span>
                  </button>
                );
              })}
            </div>
          </div>

          {divisions.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-slate-600 mb-2">Filter by Divisions</h3>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setSelectedDivision(null)}
                className={`px-4 py-2 rounded-lg font-medium border-2 transition-all ${
                  !selectedDivision
                    ? 'bg-blue-600 text-white border-blue-700'
                    : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                }`}
              >
                All Divisions
              </button>
              {divisions.map((division) => {
                const count = filteredTasks.filter((task) =>
                  task.divisions?.some((d) => d.id === division.id)
                ).length;
                return (
                  <button
                    key={division.id}
                    onClick={() => setSelectedDivision(division.id)}
                    className={`px-4 py-2 rounded-lg font-medium border-2 transition-all ${
                      selectedDivision === division.id ? 'ring-2 ring-offset-2' : 'hover:bg-opacity-80'
                    }`}
                    style={{
                      backgroundColor: selectedDivision === division.id ? division.color : `${division.color}30`,
                      color: selectedDivision === division.id ? 'white' : division.color,
                      borderColor: division.color,
                      ringColor: division.color,
                    }}
                  >
                    {division.name}
                    <span className="ml-2 text-sm opacity-75">({count})</span>
                  </button>
                );
              })}
            </div>
            </div>
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl p-6 border-2 border-slate-300">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-slate-800">
            {displayedTasks.length} {displayedTasks.length === 1 ? 'Task' : 'Tasks'}
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {displayedTasks.map((task) => (
            <motion.div
              key={task.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <TaskCard task={task} />
            </motion.div>
          ))}
          {displayedTasks.length === 0 && (
            <div className="col-span-full text-center py-12 text-slate-400">
              No tasks match the selected filters
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
