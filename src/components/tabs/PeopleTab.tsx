import { useState, useMemo } from 'react';
import { Users, Plus, Edit2, Trash2, X, Check, ChevronDown, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore } from '../../lib/store';
import { TaskCardPeople } from '../TaskCardPeople';
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

  const groupedTasks = useMemo(() => {
    const lanes = { red: [], yellow: [], green: [] } as Record<string, typeof displayedTasks>;
    displayedTasks.forEach((task) => {
      if (lanes[task.lane]) lanes[task.lane].push(task);
    });
    return lanes;
  }, [displayedTasks]);

  const toggleLane = (lane: string) => {
    setCollapsedLanes((prev) => ({ ...prev, [lane]: !prev[lane] }));
  };

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
    <div className="space-y-8">
      <div className="bg-white rounded-xl p-6 border-2 border-slate-300 shadow-sm">
        <div className="flex items-center justify-between mb-6">
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
          <div className="mb-6 p-4 bg-blue-50 rounded-lg border-2 border-blue-200">
            <div className="flex gap-3">
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

        {/* People Filter Buttons */}
        <div>
          <h3 className="text-sm font-semibold text-slate-600 mb-3">Team Members</h3>
          <div className="flex flex-wrap gap-3">
            {/* Unassigned first */}
            {unassignedTasks.length > 0 && (
              <button
                onClick={() => setSelectedPerson(null)}
                className={`min-w-[220px] px-6 py-3.5 rounded-xl font-medium border-2 flex items-center justify-between transition-all ${
                  selectedPerson === null
                    ? 'bg-slate-50 border-slate-400 shadow-sm'
                    : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold bg-slate-100 text-slate-700 rounded-full px-2 py-0.5">
                    {unassignedTasks.length}
                  </span>
                  <span>Unassigned</span>
                </div>
              </button>
            )}

            {peopleWithCounts.map((person) => (
              <div
                key={person.id}
                className={`min-w-[220px] px-6 py-3.5 rounded-xl border-2 flex items-center justify-between transition-all ${
                  selectedPerson === person.name
                    ? 'bg-blue-50 border-blue-400 shadow-sm'
                    : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                }`}
                onClick={() => setSelectedPerson(person.name)}
              >
                {editingPerson === person.name ? (
                  <div className="flex items-center gap-2 w-full">
                    <input
                      type="text"
                      value={editPersonName}
                      onChange={(e) => setEditPersonName(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSaveEdit()}
                      className="flex-1 px-2 py-1 border-2 border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                      autoFocus
                    />
                    <button onClick={handleSaveEdit} className="p-1 hover:bg-green-100 rounded text-green-600">
                      <Check size={16} />
                    </button>
                    <button onClick={() => setEditingPerson(null)} className="p-1 hover:bg-slate-200 rounded text-slate-600">
                      <X size={16} />
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold rounded-full px-2 py-0.5 bg-slate-100 text-slate-700">
                        {person.taskCount}
                      </span>
                      <span className="font-medium truncate">{person.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
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
          </div>
        </div>
      </div>

      {/* --- TASKS BY LANE --- */}
      {['red', 'yellow', 'green'].map((lane) => {
        const laneTasks = groupedTasks[lane];
        const laneTitles: Record<string, string> = {
          red: 'Pending',
          yellow: 'In Progress',
          green: 'Completed',
        };
        const laneColors: Record<string, string> = {
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
                  className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 overflow-hidden"
                >
                  {laneTasks.map((task) => (
                    <TaskCardPeople key={task.id} task={task} />
                  ))}
                  {laneTasks.length === 0 && (
                    <div className="col-span-full text-center py-6 text-slate-400">
                      No {laneTitles[lane].toLowerCase()} tasks for {selectedPerson || 'unassigned'}
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
