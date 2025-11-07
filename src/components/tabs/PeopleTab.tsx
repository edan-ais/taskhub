import { useState, useMemo } from 'react';
import { Users, Plus, Edit2, Trash2, X, Check } from 'lucide-react';
import { useAppStore } from '../../lib/store';
import { TaskCard } from '../TaskCard';
import { motion } from 'framer-motion';
import { createPerson, updatePersonData, deletePerson, updateTaskData } from '../../hooks/useData';
import type { Person } from '../../lib/types';

export function PeopleTab() {
  const {
    tasks,
    searchQuery,
    hideCompleted,
    people,
    addPerson,
    removePerson,
    updatePerson,
    updateTask,
    showDeleteConfirmation,
  } = useAppStore();

  const [selectedPerson, setSelectedPerson] = useState<string | null>(null);
  const [showAddPerson, setShowAddPerson] = useState(false);
  const [newPersonName, setNewPersonName] = useState('');
  const [editingPerson, setEditingPerson] = useState<string | null>(null);
  const [editPersonName, setEditPersonName] = useState('');

  const filteredTasks = tasks.filter(
    (task) =>
      (task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        task.description.toLowerCase().includes(searchQuery.toLowerCase())) &&
      (!hideCompleted || task.lane !== 'green')
  );

  const unassignedTasks = filteredTasks.filter((task) => !task.assignee);

  const peopleWithCounts = useMemo(() => {
    return people
      .map((p) => ({
        ...p,
        taskCount: filteredTasks.filter((t) => t.assignee === p.name).length,
      }))
      .sort((a, b) => b.taskCount - a.taskCount);
  }, [people, filteredTasks]);

  const displayedTasks =
    selectedPerson === null
      ? unassignedTasks
      : filteredTasks.filter((t) => t.assignee === selectedPerson);

  const handleAddPerson = async () => {
    if (!newPersonName.trim()) return;
    if (people.some((p) => p.name === newPersonName)) {
      alert('Person already exists');
      return;
    }
    try {
      const person = await createPerson(newPersonName);
      addPerson(person);
      setNewPersonName('');
      setShowAddPerson(false);
      setSelectedPerson(person.name);
    } catch (error) {
      console.error('Error creating person:', error);
    }
  };

  const handleStartEdit = (person: string) => {
    setEditingPerson(person);
    setEditPersonName(person);
  };

  const handleSaveEdit = async () => {
    if (!editPersonName.trim() || editingPerson === editPersonName) {
      setEditingPerson(null);
      return;
    }

    if (people.some((p) => p.name === editPersonName && p.name !== editingPerson)) {
      alert('A person with this name already exists');
      return;
    }

    try {
      const person = people.find((p) => p.name === editingPerson);
      if (!person) return;

      await updatePersonData(person.id, { name: editPersonName });
      updatePerson(person.id, { name: editPersonName });

      const tasksToUpdate = tasks.filter((t) => t.assignee === editingPerson);
      for (const task of tasksToUpdate) {
        await updateTaskData(task.id, { assignee: editPersonName });
        updateTask(task.id, { assignee: editPersonName });
      }

      if (selectedPerson === editingPerson) setSelectedPerson(editPersonName);
      setEditingPerson(null);
    } catch (error) {
      console.error('Error updating person:', error);
    }
  };

  const handleDeletePerson = (personName: string) => {
    const tasksWithPerson = tasks.filter((t) => t.assignee === personName);
    const person = people.find((p) => p.name === personName);
    if (!person) return;

    showDeleteConfirmation(
      'Remove Person',
      `Are you sure you want to remove ${personName}? ${tasksWithPerson.length} task(s) will be unassigned.`,
      async () => {
        try {
          for (const task of tasksWithPerson) {
            await updateTaskData(task.id, { assignee: '' });
            updateTask(task.id, { assignee: '' });
          }
          await deletePerson(person.id);
          removePerson(person.id);
          if (selectedPerson === personName) setSelectedPerson(null);
        } catch (error) {
          console.error('Error deleting person:', error);
        }
      }
    );
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl p-6 border-2 border-slate-300">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Users size={28} />
            Team Management
          </h2>
          <button
            onClick={() => setShowAddPerson(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg border-2 border-blue-700 hover:bg-blue-700 transition-all font-medium"
          >
            <Plus size={18} />
            Add Person
          </button>
        </div>

        {showAddPerson && (
          <div className="mb-4 p-4 bg-blue-50 rounded-lg border-2 border-blue-200">
            <div className="flex gap-2">
              <input
                type="text"
                value={newPersonName}
                onChange={(e) => setNewPersonName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddPerson()}
                placeholder="Enter person's name..."
                className="flex-1 px-4 h-10 rounded-lg border-2 border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                autoFocus
              />
              <button
                onClick={handleAddPerson}
                className="px-4 h-10 bg-blue-600 text-white rounded-lg border-2 border-blue-700 hover:bg-blue-700 transition-colors"
              >
                Add
              </button>
              <button
                onClick={() => {
                  setShowAddPerson(false);
                  setNewPersonName('');
                }}
                className="px-4 h-10 bg-slate-200 text-slate-700 rounded-lg border-2 border-slate-300 hover:bg-slate-300 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        <div>
          <h3 className="text-sm font-semibold text-slate-600 mb-3">Team Members</h3>
          <div className="flex flex-wrap gap-2">
            {peopleWithCounts.map((person) => (
              <div
                key={person.id}
                className={`flex items-center justify-between px-4 py-2 rounded-lg border-2 cursor-pointer transition-all ${
                  selectedPerson === person.name
                    ? 'bg-blue-600 text-white border-blue-700'
                    : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                }`}
                onClick={() => setSelectedPerson(person.name)}
              >
                {editingPerson === person.name ? (
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={editPersonName}
                      onChange={(e) => setEditPersonName(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSaveEdit()}
                      className="px-2 py-1 border-2 border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                      autoFocus
                    />
                    <button
                      onClick={handleSaveEdit}
                      className="p-1 hover:bg-green-100 rounded text-green-600"
                    >
                      <Check size={16} />
                    </button>
                    <button
                      onClick={() => setEditingPerson(null)}
                      className="p-1 hover:bg-slate-200 rounded text-slate-600"
                    >
                      <X size={16} />
                    </button>
                  </div>
                ) : (
                  <>
                    <span className="font-medium">{person.name}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs opacity-80">{person.taskCount}</span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleStartEdit(person.name);
                        }}
                        className="p-1 hover:bg-blue-100 rounded text-blue-600"
                      >
                        <Edit2 size={14} />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeletePerson(person.name);
                        }}
                        className="p-1 hover:bg-red-100 rounded text-red-600"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))}

            {unassignedTasks.length > 0 && (
              <button
                onClick={() => setSelectedPerson(null)}
                className={`px-4 py-2 rounded-lg font-medium border-2 transition-all ${
                  selectedPerson === null
                    ? 'bg-slate-600 text-white border-slate-700'
                    : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                }`}
              >
                Unassigned ({unassignedTasks.length})
              </button>
            )}
          </div>
        </div>
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
            No tasks found for {selectedPerson || 'unassigned'}
          </div>
        )}
      </div>
    </div>
  );
}
