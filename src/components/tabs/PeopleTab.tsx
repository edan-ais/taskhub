import { useState, useMemo } from 'react';
import { Users, Plus, Edit2, Trash2, X, Check } from 'lucide-react';
import { useAppStore } from '../../lib/store';
import { TaskCard } from '../TaskCard';
import { motion } from 'framer-motion';
import { createPerson, updatePersonData, deletePerson, updateTaskData } from '../../hooks/useData';
import type { Person } from '../../lib/types';

export function PeopleTab() {
  const { tasks, searchQuery, hideCompleted, people, addPerson, removePerson, updatePerson, updateTask, showDeleteConfirmation } = useAppStore();
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

  const peopleWithTasks = useMemo(() => {
    return people.map((person) => {
      const personTasks = filteredTasks.filter((task) => task.assignee === person.name);
      return { person: person.name, tasks: personTasks };
    }).filter(p => p.tasks.length > 0)
      .sort((a, b) => b.tasks.length - a.tasks.length);
  }, [people, filteredTasks]);

  const unassignedTasks = filteredTasks.filter((task) => !task.assignee);

  const displayedPerson = selectedPerson || peopleWithTasks[0]?.person;
  const displayedTasks = displayedPerson
    ? peopleWithTasks.find((p) => p.person === displayedPerson)?.tasks || []
    : unassignedTasks;

  const handleAddPerson = async () => {
    if (!newPersonName.trim()) return;
    if (people.some(p => p.name === newPersonName)) {
      alert('Person already exists');
      return;
    }
    try {
      const person = await createPerson(newPersonName);
      addPerson(person);
      setNewPersonName('');
      setShowAddPerson(false);
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

    if (people.some(p => p.name === editPersonName && p.name !== editingPerson)) {
      alert('A person with this name already exists');
      return;
    }

    try {
      const person = people.find(p => p.name === editingPerson);
      if (!person) return;

      await updatePersonData(person.id, { name: editPersonName });
      updatePerson(person.id, { name: editPersonName });

      const tasksToUpdate = tasks.filter(t => t.assignee === editingPerson);
      for (const task of tasksToUpdate) {
        await updateTaskData(task.id, { assignee: editPersonName });
        updateTask(task.id, { assignee: editPersonName });
      }

      if (selectedPerson === editingPerson) {
        setSelectedPerson(editPersonName);
      }
      setEditingPerson(null);
    } catch (error) {
      console.error('Error updating person:', error);
    }
  };

  const handleDeletePerson = (personName: string) => {
    const tasksWithPerson = tasks.filter(t => t.assignee === personName);
    const person = people.find(p => p.name === personName);
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
          if (selectedPerson === personName) {
            setSelectedPerson(null);
          }
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

        <div className="mb-6">
          <h3 className="text-sm font-semibold text-slate-600 mb-3">All People</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {people.map((person) => {
              const taskCount = tasks.filter(t => t.assignee === person.name).length;
              return (
                <div
                  key={person.id}
                  className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border-2 border-slate-200 hover:border-blue-300 transition-all"
                >
                  {editingPerson === person.name ? (
                    <div className="flex-1 flex items-center gap-2">
                      <input
                        type="text"
                        value={editPersonName}
                        onChange={(e) => setEditPersonName(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSaveEdit()}
                        className="flex-1 px-2 py-1 border-2 border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                      <div className="flex-1">
                        <div className="font-medium text-slate-800">{person.name}</div>
                        <div className="text-xs text-slate-500">{taskCount} task(s)</div>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleStartEdit(person.name)}
                          className="p-1.5 hover:bg-blue-100 rounded text-blue-600 transition-colors"
                          title="Edit person"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          onClick={() => handleDeletePerson(person.name)}
                          className="p-1.5 hover:bg-red-100 rounded text-red-600 transition-colors"
                          title="Remove person"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </>
                  )}
                </div>
              );
            })}
            {people.length === 0 && (
              <div className="col-span-full text-center py-6 text-slate-400">
                No people added yet. Click "Add Person" to get started.
              </div>
            )}
          </div>
        </div>

        <div>
          <h3 className="text-sm font-semibold text-slate-600 mb-2">Filter by Person</h3>
          <div className="flex flex-wrap gap-2">
            {peopleWithTasks.map(({ person, tasks }) => (
              <button
                key={person}
                onClick={() => setSelectedPerson(person)}
                className={`px-4 py-2 rounded-lg font-medium border-2 transition-all ${
                  displayedPerson === person
                    ? 'bg-blue-600 text-white border-blue-700'
                    : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                }`}
              >
                {person}
                <span className="ml-2 text-sm opacity-75">({tasks.length})</span>
              </button>
            ))}
            {unassignedTasks.length > 0 && (
              <button
                onClick={() => setSelectedPerson(null)}
                className={`px-4 py-2 rounded-lg font-medium border-2 transition-all ${
                  !displayedPerson
                    ? 'bg-slate-600 text-white border-slate-700'
                    : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                }`}
              >
                Unassigned
                <span className="ml-2 text-sm opacity-75">({unassignedTasks.length})</span>
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
            No tasks found for {displayedPerson || 'unassigned'}
          </div>
        )}
      </div>
    </div>
  );
}
