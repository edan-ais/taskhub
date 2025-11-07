import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Calendar, User, AlertCircle, Check, CheckCheck } from 'lucide-react';
import { motion } from 'framer-motion';
import { format, isPast, parseISO } from 'date-fns';
import type { Task } from '../lib/types';
import { useAppStore } from '../lib/store';
import { moveTask, updateSubtask } from '../hooks/useData';

interface TaskCardPeopleProps {
  task: Task;
}

const laneBorderColors = {
  red: 'border-red-500 bg-red-50',
  yellow: 'border-yellow-500 bg-yellow-50',
  green: 'border-green-500 bg-green-50',
};

export function TaskCardPeople({ task }: TaskCardPeopleProps) {
  const { setSelectedTask, updateTask } = useAppStore();
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const isOverdue = task.due_date && isPast(parseISO(task.due_date)) && task.lane !== 'green';
  const completedSubtasks = task.subtasks?.filter((st) => st.progress_state === 'completed').length || 0;
  const totalSubtasks = task.subtasks?.length || 0;

  const handleStatusToggle = async (e: React.MouseEvent, targetLane: 'yellow' | 'green' | 'red') => {
    e.stopPropagation();
    const maxOrderRank = 1000000;
    await moveTask(task.id, targetLane, maxOrderRank);
    updateTask(task.id, { lane: targetLane });
  };

  const handleSubtaskToggle = async (e: React.MouseEvent, subtaskId: string, isCompleted: boolean) => {
    e.stopPropagation();
    await updateSubtask(subtaskId, { progress_state: isCompleted ? 'not_started' : 'completed' });
    updateTask(task.id, {
      subtasks: task.subtasks?.map((st) =>
        st.id === subtaskId ? { ...st, progress_state: isCompleted ? 'not_started' : 'completed' } : st
      ),
    });
  };

  return (
    <motion.div
      ref={setNodeRef}
      style={style}
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      onClick={() => setSelectedTask(task)}
      className={`group relative rounded-xl p-4 shadow-sm hover:shadow-md transition-all cursor-pointer border-2 h-[280px] overflow-hidden flex flex-col justify-between ${
        laneBorderColors[task.lane]
      } ${isOverdue ? 'ring-2 ring-red-500' : ''}`}
    >
      {/* Top controls */}
      <div className="absolute top-2 right-2 flex gap-1 items-center">
        {task.lane === 'red' && (
          <button
            onClick={(e) => handleStatusToggle(e, 'yellow')}
            className="p-1.5 hover:bg-yellow-100 rounded border border-yellow-500 bg-white"
            title="Move to In Progress"
          >
            <Check size={16} className="text-yellow-600" />
          </button>
        )}
        {task.lane === 'yellow' && (
          <>
            <button
              onClick={(e) => handleStatusToggle(e, 'red')}
              className="p-1.5 hover:bg-red-100 rounded border border-red-500 bg-white"
              title="Move back to Pending"
            >
              <Check size={16} className="text-red-600" />
            </button>
            <button
              onClick={(e) => handleStatusToggle(e, 'green')}
              className="p-1.5 hover:bg-green-100 rounded border border-green-500 bg-white"
              title="Mark as Completed"
            >
              <CheckCheck size={16} className="text-green-600" />
            </button>
          </>
        )}
        {task.lane === 'green' && (
          <button
            onClick={(e) => handleStatusToggle(e, 'yellow')}
            className="p-1.5 hover:bg-yellow-100 rounded border border-yellow-500 bg-white"
            title="Move back to In Progress"
          >
            <CheckCheck size={16} className="text-yellow-600" />
          </button>
        )}
        <button
          {...attributes}
          {...listeners}
          className="p-1 hover:bg-slate-100 rounded cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={(e) => e.stopPropagation()}
        >
          <GripVertical size={16} className="text-slate-400" />
        </button>
      </div>

      {/* Main content */}
      <div className="space-y-3">
        <div>
          <h3 className="font-semibold text-slate-800 pr-24 leading-tight line-clamp-1">{task.title}</h3>
          {task.description && (
            <p className="text-sm text-slate-600 mt-1 line-clamp-2">{task.description}</p>
          )}
        </div>

        {task.tags && task.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {task.tags.slice(0, 3).map((tag) => (
              <span
                key={tag.id}
                className="text-xs px-2 py-1 rounded-full border"
                style={{
                  borderColor: tag.color,
                  backgroundColor: `${tag.color}20`,
                  color: tag.color,
                }}
              >
                {tag.name}
              </span>
            ))}
            {task.tags.length > 3 && (
              <span className="text-xs text-slate-400">+{task.tags.length - 3} more</span>
            )}
          </div>
        )}

        {totalSubtasks > 0 && (
          <div className="space-y-1">
            <div className="text-xs font-medium text-slate-600">
              Subtasks ({completedSubtasks}/{totalSubtasks})
            </div>
            <div className="space-y-1">
              {task.subtasks?.slice(0, 2).map((subtask) => (
                <div key={subtask.id} className="flex items-center gap-2 text-xs truncate">
                  <input
                    type="checkbox"
                    checked={subtask.progress_state === 'completed'}
                    onChange={(e) => handleSubtaskToggle(e, subtask.id, subtask.progress_state === 'completed')}
                    onClick={(e) => e.stopPropagation()}
                    className="w-3 h-3 rounded border-slate-300"
                  />
                  <span
                    className={`flex-1 ${
                      subtask.progress_state === 'completed'
                        ? 'line-through text-slate-400'
                        : 'text-slate-700'
                    }`}
                  >
                    {subtask.title}
                  </span>
                </div>
              ))}
              {totalSubtasks > 2 && (
                <div className="text-xs text-slate-400 pl-5">
                  +{totalSubtasks - 2} more
                </div>
              )}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between text-xs text-slate-600">
          {task.assignee && (
            <div className="flex items-center gap-1">
              <User size={14} />
              <span>{task.assignee}</span>
            </div>
          )}
          {task.due_date && (
            <div className={`flex items-center gap-1 ${isOverdue ? 'text-red-600 font-semibold' : ''}`}>
              {isOverdue && <AlertCircle size={14} />}
              <Calendar size={14} />
              <span>{format(parseISO(task.due_date), 'MMM d')}</span>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
