import { Plus } from "lucide-react";
import { motion } from "framer-motion";
import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import type { Task, Lane as LaneType } from "../lib/types";
import { TaskCard } from "./TaskCard";

interface LaneProps {
  lane: LaneType;
  tasks: Task[];
  title: string;
  color: string;
  onAddTask: () => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

export function Lane({
  lane,
  tasks,
  title,
  color,
  onAddTask,
  isCollapsed = false,
  onToggleCollapse,
}: LaneProps) {
  const { setNodeRef, isOver } = useDroppable({ id: lane });

  const handleAddTask = () => {
    if (isCollapsed && onToggleCollapse) onToggleCollapse();
    onAddTask();
  };

  const laneColors = {
    red: "bg-red-50 border-red-300",
    yellow: "bg-yellow-50 border-yellow-300",
    green: "bg-green-50 border-green-300",
  };

  const headerColors = {
    red: "bg-red-600",
    yellow: "bg-yellow-600",
    green: "bg-green-600",
  };

  return (
    <div
      ref={setNodeRef}
      className={`flex flex-col border-2 border-slate-300 rounded-xl overflow-hidden bg-white shadow-sm transition-all duration-300 ${
        isOver ? "border-blue-500 scale-[1.01]" : ""
      }`}
    >
      {/* HEADER */}
      <div className="flex-shrink-0 bg-white border-b border-slate-300 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-3 h-3 rounded-full ${headerColors[lane]}`} />
            <h2 className="text-lg font-bold text-slate-800">{title}</h2>
            <span className="text-sm text-slate-500 font-medium px-2.5 py-0.5 rounded-full bg-slate-100 border border-slate-300">
              {tasks.length}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* Collapse Toggle (Mobile Only) */}
            <button
              onClick={onToggleCollapse}
              className="md:hidden p-2 rounded-lg border border-slate-300 hover:bg-slate-100 transition-colors"
              title={isCollapsed ? "Expand" : "Collapse"}
            >
              <motion.svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
                animate={{ rotate: isCollapsed ? -90 : 0 }}
                transition={{ duration: 0.25 }}
                className="w-5 h-5 text-slate-600"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 9l6 6 6-6" />
              </motion.svg>
            </button>

            {/* Add Task Button */}
            <button
              onClick={handleAddTask}
              className="p-2 hover:bg-slate-100 rounded-lg border border-slate-300 transition-colors group"
              title="Add task"
            >
              <Plus
                size={20}
                className="text-slate-600 group-hover:text-blue-600 transition-colors"
              />
            </button>
          </div>
        </div>
      </div>

      {/* TASK CONTENT (Animated fade/slide, not height shrink) */}
      <motion.div
        initial={false}
        animate={{
          opacity: isCollapsed ? 0 : 1,
          y: isCollapsed ? -12 : 0,
          height: isCollapsed ? 0 : "auto",
        }}
        transition={{ duration: 0.3, ease: "easeInOut" }}
        className={`overflow-hidden p-4 ${laneColors[lane]} border-t-0`}
      >
        <SortableContext
          items={tasks.map((t) => t.id)}
          strategy={verticalListSortingStrategy}
        >
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
      </motion.div>
    </div>
  );
}
