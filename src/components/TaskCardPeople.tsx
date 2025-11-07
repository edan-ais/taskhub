import { motion } from 'framer-motion';
import { Calendar, User, AlertCircle } from 'lucide-react';
import { format, isPast, parseISO } from 'date-fns';
import type { Task } from '../lib/types';
import { useAppStore } from '../lib/store';

interface TaskCardPeopleProps {
  task: Task;
}

const laneBorderColors = {
  red: 'border-red-500 bg-red-50',
  yellow: 'border-yellow-500 bg-yellow-50',
  green: 'border-green-500 bg-green-50',
};

export function TaskCardPeople({ task }: TaskCardPeopleProps) {
  const { setSelectedTask } = useAppStore();

  const isOverdue = task.due_date && isPast(parseISO(task.due_date)) && task.lane !== 'green';
  const completedSubtasks = task.subtasks?.filter((st) => st.progress_state === 'completed').length || 0;
  const totalSubtasks = task.subtasks?.length || 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      onClick={() => setSelectedTask(task)}
      className={`relative cursor-pointer rounded-xl border-2 ${laneBorderColors[task.lane]} shadow-sm hover:shadow-md transition-all h-[280px] overflow-hidden flex flex-col justify-between`}
    >
      <div className="flex flex-col justify-between h-full p-4">
        {/* Title and Description */}
        <div>
          <h3 className="font-semibold text-slate-800 text-sm mb-1 line-clamp-1">{task.title}</h3>
          {task.description && (
            <p className="text-xs text-slate-600 line-clamp-2">{task.description}</p>
          )}
        </div>

        {/* Tags */}
        {task.tags && task.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {task.tags.slice(0, 2).map((tag) => (
              <span
                key={tag.id}
                className="text-[10px] px-2 py-[2px] rounded-full border"
                style={{ borderColor: tag.color, backgroundColor: `${tag.color}20`, color: tag.color }}
              >
                {tag.name}
              </span>
            ))}
            {task.tags.length > 2 && (
              <span className="text-[10px] text-slate-500">+{task.tags.length - 2} more</span>
            )}
          </div>
        )}

        {/* Subtasks */}
        {totalSubtasks > 0 && (
          <div className="mt-2">
            <div className="text-[11px] font-medium text-slate-600 mb-1">
              Subtasks ({completedSubtasks}/{totalSubtasks})
            </div>
            <div className="space-y-[2px]">
              {task.subtasks?.slice(0, 2).map((subtask) => (
                <div
                  key={subtask.id}
                  className={`flex items-center text-[11px] truncate ${
                    subtask.progress_state === 'completed'
                      ? 'line-through text-slate-400'
                      : 'text-slate-700'
                  }`}
                >
                  • {subtask.title}
                </div>
              ))}
              {totalSubtasks > 2 && (
                <div className="text-[10px] text-slate-400 pl-2">
                  +{totalSubtasks - 2} more
                </div>
              )}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between text-[11px] text-slate-600 mt-auto pt-2 border-t border-slate-200">
          {task.assignee && (
            <div className="flex items-center gap-1">
              <User size={12} />
              <span>{task.assignee}</span>
            </div>
          )}
          {task.due_date && (
            <div className={`flex items-center gap-1 ${isOverdue ? 'text-red-600 font-semibold' : ''}`}>
              {isOverdue && <AlertCircle size={12} />}
              <Calendar size={12} />
              <span>{format(parseISO(task.due_date), 'MMM d')}</span>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
