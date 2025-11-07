import { useState } from 'react';
import {
  DndContext,
  DragEndEvent,
  DragOverEvent,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
} from '@dnd-kit/core';
import { arrayMove } from '@dnd-kit/sortable';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore } from '../../lib/store';
import { createTask, moveTask, updateTaskData } from '../../hooks/useData';
import { Lane } from '../Lane';
import type { Task, Lane as LaneType } from '../../lib/types';

export function HomeTab() {
  const { tasks, searchQuery, updateTask } = useAppStore();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState({
    red: false,
    yellow: false,
    green: false,
  });

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    })
  );

  const toggleCollapse = (lane: LaneType) => {
    setCollapsed((prev) => ({ ...prev, [lane]: !prev[lane] }));
  };

  const filteredTasks = tasks.filter(
    (task) =>
      task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      task.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      task.assignee.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const redTasks = filteredTasks.filter((t) => t.lane === 'red').sort((a, b) => a.order_rank - b.order_rank);
  const yellowTasks = filteredTasks.filter((t) => t.lane === 'yellow').sort((a, b) => a.order_rank - b.order_rank);
  const greenTasks = filteredTasks.filter((t) => t.lane === 'green').sort((a, b) => a.order_rank - b.order_rank);

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) return;

    const activeTask = tasks.find((t) => t.id === active.id);
    if (!activeTask) return;

    const overId = over.id as string;
    if (['red', 'yellow', 'green'].includes(overId)) {
      const newLane = overId as LaneType;
      if (activeTask.lane !== newLane) {
        updateTask(activeTask.id, { lane: newLane });
      }
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);
    if (!over) return;

    const activeTask = tasks.find((t) => t.id === active.id);
    if (!activeTask) return;

    const overId = over.id as string;
    let targetLane: LaneType;
    let tasksInLane: Task[];

    if (['red', 'yellow', 'green'].includes(overId)) {
      targetLane = overId as LaneType;
    } else {
      const overTask = tasks.find((t) => t.id === overId);
      if (!overTask) return;
      targetLane = overTask.lane;
    }

    tasksInLane = tasks.filter((t) => t.lane === targetLane).sort((a, b) => a.order_rank - b.order_rank);

    const oldIndex = tasksInLane.findIndex((t) => t.id === active.id);
    const newIndex = tasksInLane.findIndex((t) => t.id === (overId === targetLane ? tasksInLane[0]?.id : overId));

    if (oldIndex === -1) {
      const newOrderRank = tasksInLane.length > 0 ? tasksInLane[tasksInLane.length - 1].order_rank + 1000 : 1000;
      await moveTask(activeTask.id, targetLane, newOrderRank);
    } else if (oldIndex !== newIndex && newIndex !== -1) {
      const reorderedTasks = arrayMove(tasksInLane, oldIndex, newIndex);
      for (let i = 0; i < reorderedTasks.length; i++) {
        const newOrderRank = (i + 1) * 1000;
        if (reorderedTasks[i].order_rank !== newOrderRank) {
          await updateTaskData(reorderedTasks[i].id, { order_rank: newOrderRank });
          updateTask(reorderedTasks[i].id, { order_rank: newOrderRank });
        }
      }
    } else if (activeTask.lane !== targetLane) {
      const newOrderRank = tasksInLane.length > 0 ? Math.max(...tasksInLane.map((t) => t.order_rank)) + 1000 : 1000;
      await moveTask(activeTask.id, targetLane, newOrderRank);
    }
  };

  const handleAddTask = (lane: LaneType) => {
    // Always expand the lane before creating
    if (collapsed[lane]) toggleCollapse(lane);

    const tasksInLane = tasks.filter((t) => t.lane === lane);
    const maxOrderRank = tasksInLane.length > 0 ? Math.max(...tasksInLane.map((t) => t.order_rank)) : 0;

    const newTask = {
      id: 'temp-' + Date.now(),
      title: 'New Task',
      description: '',
      lane,
      progress_state: 'not_started' as const,
      assignee: '',
      due_date: null,
      order_rank: maxOrderRank + 1000,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      completed_at: null,
    };

    const { setSelectedTask } = useAppStore.getState();
    setSelectedTask(newTask);
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-full">
        {[
          { lane: 'red', title: 'Master / To-Do', color: 'red', tasks: redTasks },
          { lane: 'yellow', title: 'Pending Approval', color: 'yellow', tasks: yellowTasks },
          { lane: 'green', title: 'Completed', color: 'green', tasks: greenTasks },
        ].map(({ lane, title, color, tasks }) => (
          <div key={lane} className="border rounded-2xl shadow-sm overflow-hidden bg-white">
            {/* HEADER */}
            <div className="flex justify-between items-center p-3 border-b md:border-none bg-gray-50">
              <h3 className="font-bold text-lg text-gray-700">{title}</h3>
              <div className="flex items-center gap-2">
                {/* Collapse / Expand Button */}
                <button
                  onClick={() => toggleCollapse(lane as LaneType)}
                  className="md:hidden text-gray-600 hover:text-gray-900 transition-transform"
                >
                  <motion.svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={2}
                    stroke="currentColor"
                    animate={{
                      rotate: collapsed[lane as LaneType] ? -90 : 0,
                    }}
                    transition={{ duration: 0.25 }}
                    className="w-5 h-5"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 9l6 6 6-6" />
                  </motion.svg>
                </button>

                {/* Add Task Button */}
                <button
                  onClick={() => handleAddTask(lane as LaneType)}
                  className="text-gray-600 hover:text-gray-900"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={2}
                    stroke="currentColor"
                    className="w-5 h-5"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                  </svg>
                </button>
              </div>
            </div>

            {/* TASK CONTAINER (Animated Collapse on Mobile) */}
            <AnimatePresence initial={false}>
              {!collapsed[lane as LaneType] && (
                <motion.div
                  key={`${lane}-content`}
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3, ease: 'easeInOut' }}
                  className="overflow-hidden md:overflow-visible"
                >
                  <Lane
                    lane={lane as LaneType}
                    tasks={tasks}
                    title={title}
                    color={color}
                    onAddTask={() => handleAddTask(lane as LaneType)}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ))}
      </div>
    </DndContext>
  );
}
