import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Plus } from 'lucide-react';
import { motion } from 'framer-motion';
import type { Task, Lane as LaneType } from '../lib/types';
import { TaskCard } from './TaskCard';

interface LaneProps {
  lane: LaneType;
  tasks: Task[];
  title: string;
  color: string;
  onAddTask: () => void;
}

export function Lane({ lane, tasks, title, color, onAddTask }: LaneProps) {
  const { setNodeRef, isOver } = useDroppable({ id: lane });

  const laneColors = {
    red: 'bg-red-50 border-red-300',
    yellow: 'bg-yellow-50 border-yellow-300',
    green: 'bg-green-50 border-green-300',
  };

  const headerColors = {
    red: 'bg-red-600',
    yellow: 'bg-yellow-600',
    green: 'bg-green-600',
  };

  return (
    <div className="flex flex-col h-[calc(100vh-180px)]">
      <div className="flex-shrink-0 bg-white rounded-t-xl border-2 border-slate-300 border-b-0 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-3 h-3 rounded-full ${headerColors[lane]}`} />
            <h2 className="text-lg font-bold text-slate-800">{title}</h2>
            <span className="text-sm text-slate-500 font-medium px-2.5 py-0.5 rounded-full bg-slate-100 border border-slate-300">
              {tasks.length}
            </span>
          </div>
          <button
            onClick={onAddTask}
            className="p-2 hover:bg-slate-100 rounded-lg border border-slate-300 transition-colors group"
            title="Add task"
          >
            <Plus size={20} className="text-slate-600 group-hover:text-blue-600 transition-colors" />
          </button>
        </div>
      </div>

      <div
        ref={setNodeRef}
        className={`flex-1 overflow-y-auto p-4 rounded-b-xl ${laneColors[lane]} border-2 ${
          isOver ? 'border-blue-500 scale-[1.01]' : 'border-slate-300'
        } transition-all`}
      >
        <SortableContext items={tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
          <div className="space-y-3">
            {tasks.map((task) => (
              <TaskCard key={task.id} task={task} />
            ))}
            {tasks.length === 0 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex items-center justify-center h-32 text-slate-400 text-sm"
              >
                Drop tasks here or click + to add
              </motion.div>
            )}
          </div>
        </SortableContext>
      </div>
    </div>
  );
}
