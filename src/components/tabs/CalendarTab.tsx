import { useState, useMemo } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Plus,
} from 'lucide-react';
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameDay,
  parseISO,
  addMonths,
  subMonths,
  startOfWeek,
  endOfWeek,
  isPast,
  isToday,
} from 'date-fns';
import { motion } from 'framer-motion';
import { useAppStore } from '../../lib/store';
import { createTask, updateTaskData } from '../../hooks/useData';
import type { Task } from '../../lib/types';

export function CalendarTab() {
  const { tasks, setSelectedTask, updateTask, hideCompleted } = useAppStore();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calendarStart = startOfWeek(monthStart);
  const calendarEnd = endOfWeek(monthEnd);
  const calendarDays = eachDayOfInterval({
    start: calendarStart,
    end: calendarEnd,
  });

  const tasksWithDates = tasks.filter(
    (task) => task.due_date && (!hideCompleted || task.lane !== 'green')
  );

  const getTasksForDate = (date: Date) =>
    tasksWithDates.filter(
      (task) => task.due_date && isSameDay(parseISO(task.due_date), date)
    );

  const selectedDateTasks = selectedDate ? getTasksForDate(selectedDate) : [];
  const overdueCount = tasksWithDates.filter(
    (task) =>
      task.due_date &&
      isPast(parseISO(task.due_date)) &&
      !isSameDay(parseISO(task.due_date), new Date()) &&
      task.lane !== 'green'
  ).length;

  const handlePrevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
  const handleNextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));

  const handleDateClick = (date: Date) => {
    setSelectedDate(
      isSameDay(date, selectedDate || new Date('2000-01-01'))
        ? null
        : date
    );
  };

  const handleAddTaskToDate = async (date: Date) => {
    await createTask({
      title: 'New Task',
      due_date: format(date, 'yyyy-MM-dd'),
      lane: 'red',
    });
  };

  const handleDragStart = (e: React.DragEvent, task: Task) => {
    e.dataTransfer.setData('taskId', task.id);
  };

  const handleDrop = async (e: React.DragEvent, date: Date) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData('taskId');
    const task = tasks.find((t) => t.id === taskId);
    if (task) {
      const newDueDate = format(date, 'yyyy-MM-dd');
      await updateTaskData(taskId, { due_date: newDueDate });
      updateTask(taskId, { due_date: newDueDate });
    }
  };

  const handleDragOver = (e: React.DragEvent) => e.preventDefault();

  return (
    <div className="mt-[100px] md:mt-0 px-4 md:px-6 lg:px-8 space-y-6">
      {/* Calendar Card */}
      <div className="bg-white rounded-xl p-6 border-2 border-slate-300 shadow-sm">
        {/* Responsive Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <CalendarIcon size={28} />
            {format(currentMonth, 'MMMM yyyy')}
          </h2>

          <div className="flex flex-wrap items-center gap-2">
            {overdueCount > 0 && (
              <div className="px-4 py-2 bg-red-100 text-red-700 rounded-lg text-sm font-semibold">
                {overdueCount} Overdue
              </div>
            )}
            <div className="flex items-center gap-2">
              <button
                onClick={handlePrevMonth}
                className="p-2 hover:bg-slate-100 rounded-lg border border-slate-300 transition-colors"
              >
                <ChevronLeft size={20} />
              </button>
              <button
                onClick={() => setCurrentMonth(new Date())}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg border-2 border-blue-700 font-medium hover:bg-blue-700 transition-all"
              >
                Today
              </button>
              <button
                onClick={handleNextMonth}
                className="p-2 hover:bg-slate-100 rounded-lg border border-slate-300 transition-colors"
              >
                <ChevronRight size={20} />
              </button>
            </div>
          </div>
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-7 gap-0 border-2 border-slate-200 rounded-lg overflow-hidden">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
            <div
              key={day}
              className="text-center font-semibold text-slate-600 py-2 border-b-2 border-slate-200 bg-slate-50"
            >
              {day}
            </div>
          ))}

          {calendarDays.map((day, idx) => {
            const dayTasks = getTasksForDate(day);
            const isCurrentMonth = day.getMonth() === currentMonth.getMonth();
            const isOverdue =
              isPast(day) && !isToday(day) && dayTasks.some((t) => t.lane !== 'green');
            const isSelected = selectedDate && isSameDay(day, selectedDate);
            const isBeforeToday = isPast(day) && !isToday(day);

            return (
              <motion.div
                key={idx}
                onDrop={(e) => handleDrop(e, day)}
                onDragOver={handleDragOver}
                onClick={() => handleDateClick(day)}
                className={`min-h-24 p-2 border-r border-b border-slate-200 transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-blue-100'
                    : isOverdue
                    ? 'bg-red-50'
                    : isToday(day)
                    ? 'bg-cyan-50'
                    : isBeforeToday
                    ? 'bg-slate-50'
                    : 'bg-white hover:bg-slate-50'
                } ${!isCurrentMonth ? 'opacity-40' : ''} ${
                  (idx + 1) % 7 === 0 ? 'border-r-0' : ''
                }`}
                whileHover={{ scale: 1.02 }}
              >
                {/* Date Header */}
                <div className="flex items-center justify-between mb-1">
                  <span
                    className={`text-sm font-semibold ${
                      isToday(day)
                        ? 'text-cyan-600'
                        : isOverdue
                        ? 'text-red-600'
                        : isBeforeToday
                        ? 'text-slate-400 line-through'
                        : 'text-slate-700'
                    }`}
                  >
                    {format(day, 'd')}
                  </span>
                  {dayTasks.length > 0 && (
                    <span className="text-xs bg-blue-500 text-white rounded-full w-5 h-5 flex items-center justify-center">
                      {dayTasks.length}
                    </span>
                  )}
                </div>

                {/* Tasks */}
                <div className="space-y-1">
                  {dayTasks.slice(0, 2).map((task) => (
                    <div
                      key={task.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, task)}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedTask(task);
                      }}
                      className={`text-xs p-1 rounded truncate cursor-move ${
                        task.lane === 'red'
                          ? 'bg-red-100 text-red-700'
                          : task.lane === 'yellow'
                          ? 'bg-amber-100 text-amber-700'
                          : 'bg-green-100 text-green-700'
                      }`}
                    >
                      {task.title}
                    </div>
                  ))}
                  {dayTasks.length > 2 && (
                    <div className="text-xs text-slate-500 text-center">
                      +{dayTasks.length - 2} more
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Selected Date Panel */}
      {selectedDate && (
        <div className="bg-white rounded-xl p-6 border-2 border-slate-300 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-slate-800">
              {format(selectedDate, 'MMMM d, yyyy')} ({selectedDateTasks.length})
            </h3>
            <button
              onClick={() => handleAddTaskToDate(selectedDate)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg border-2 border-blue-700 hover:bg-blue-700 transition-all"
            >
              <Plus size={18} />
              Add Task
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {selectedDateTasks.map((task) => (
              <div
                key={task.id}
                draggable
                onDragStart={(e) => handleDragStart(e, task)}
                onClick={() => setSelectedTask(task)}
                className="bg-white rounded-xl p-4 shadow-sm hover:shadow-md transition-all cursor-pointer border-2 border-slate-300"
              >
                <h4 className="font-semibold text-slate-800 mb-2 truncate">
                  {task.title}
                </h4>
                {task.description && (
                  <p className="text-sm text-slate-600 line-clamp-2 mb-2">
                    {task.description}
                  </p>
                )}
                <div className="flex items-center gap-2">
                  <span
                    className={`text-xs px-2 py-1 rounded-full ${
                      task.lane === 'red'
                        ? 'bg-red-100 text-red-700'
                        : task.lane === 'yellow'
                        ? 'bg-amber-100 text-amber-700'
                        : 'bg-green-100 text-green-700'
                    }`}
                  >
                    {task.lane === 'red'
                      ? 'To-Do'
                      : task.lane === 'yellow'
                      ? 'Pending'
                      : 'Completed'}
                  </span>
                  {task.assignee && (
                    <span className="text-xs text-slate-600">
                      {task.assignee}
                    </span>
                  )}
                </div>
              </div>
            ))}
            {selectedDateTasks.length === 0 && (
              <div className="col-span-full text-center py-8 text-slate-400">
                No tasks scheduled for this date
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
