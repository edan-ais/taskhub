import { useState } from "react";
import {
  DndContext,
  DragEndEvent,
  DragOverEvent,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
} from "@dnd-kit/core";
import { arrayMove } from "@dnd-kit/sortable";
import { useAppStore } from "../../lib/store";
import { moveTask, updateTaskData } from "../../hooks/useData";
import { Lane } from "../Lane";
import type { Task, Lane as LaneType } from "../../lib/types";

export function HomeTab() {
  const { tasks, searchQuery, updateTask } = useAppStore();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState({
    red: false,
    yellow: false,
    green: false,
  });

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  const toggleCollapse = (lane: LaneType) =>
    setCollapsed((prev) => ({ ...prev, [lane]: !prev[lane] }));

  const filteredTasks = tasks.filter(
    (t) =>
      t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.assignee.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const redTasks = filteredTasks
    .filter((t) => t.lane === "red")
    .sort((a, b) => a.order_rank - b.order_rank);
  const yellowTasks = filteredTasks
    .filter((t) => t.lane === "yellow")
    .sort((a, b) => a.order_rank - b.order_rank);
  const greenTasks = filteredTasks
    .filter((t) => t.lane === "green")
    .sort((a, b) => a.order_rank - b.order_rank);

  const handleDragStart = (e: DragStartEvent) =>
    setActiveId(e.active.id as string);

  const handleDragOver = (e: DragOverEvent) => {
    const { active, over } = e;
    if (!over) return;
    const activeTask = tasks.find((t) => t.id === active.id);
    if (!activeTask) return;
    const overId = over.id as string;
    if (["red", "yellow", "green"].includes(overId)) {
      const newLane = overId as LaneType;
      if (activeTask.lane !== newLane)
        updateTask(activeTask.id, { lane: newLane });
    }
  };

  const handleDragEnd = async (e: DragEndEvent) => {
    const { active, over } = e;
    setActiveId(null);
    if (!over) return;

    const activeTask = tasks.find((t) => t.id === active.id);
    if (!activeTask) return;

    const overId = over.id as string;
    let targetLane: LaneType;
    if (["red", "yellow", "green"].includes(overId)) {
      targetLane = overId as LaneType;
    } else {
      const overTask = tasks.find((t) => t.id === overId);
      if (!overTask) return;
      targetLane = overTask.lane;
    }

    const tasksInLane = tasks
      .filter((t) => t.lane === targetLane)
      .sort((a, b) => a.order_rank - b.order_rank);

    const oldIndex = tasksInLane.findIndex((t) => t.id === active.id);
    const newIndex = tasksInLane.findIndex((t) => t.id === overId);

    if (oldIndex !== -1 && newIndex !== -1 && oldIndex !== newIndex) {
      const reordered = arrayMove(tasksInLane, oldIndex, newIndex);
      for (let i = 0; i < reordered.length; i++) {
        const newOrderRank = (i + 1) * 1000;
        if (reordered[i].order_rank !== newOrderRank) {
          await updateTaskData(reordered[i].id, { order_rank: newOrderRank });
          updateTask(reordered[i].id, { order_rank: newOrderRank });
        }
      }
    }
  };

  const handleAddTask = (lane: LaneType) => {
    if (collapsed[lane]) toggleCollapse(lane);
    const tasksInLane = tasks.filter((t) => t.lane === lane);
    const maxRank = tasksInLane.length
      ? Math.max(...tasksInLane.map((t) => t.order_rank))
      : 0;
    const newTask = {
      id: "temp-" + Date.now(),
      title: "New Task",
      description: "",
      lane,
      progress_state: "not_started" as const,
      assignee: "",
      due_date: null,
      order_rank: maxRank + 1000,
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
      {/* more top padding on mobile to clear the taller header */}
      <div className="pt-[145px] md:pt-20">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-[calc(100vh-145px)] md:h-[calc(100vh-80px)]">
          {[
            { lane: "red", title: "Master / To-Do", color: "red", tasks: redTasks },
            { lane: "yellow", title: "Pending Approval", color: "yellow", tasks: yellowTasks },
            { lane: "green", title: "Completed", color: "green", tasks: greenTasks },
          ].map(({ lane, title, color, tasks }) => (
            <Lane
              key={lane}
              lane={lane as LaneType}
              tasks={tasks}
              title={title}
              color={color}
              onAddTask={() => handleAddTask(lane as LaneType)}
              isCollapsed={collapsed[lane as LaneType]}
              onToggleCollapse={() => toggleCollapse(lane as LaneType)}
            />
          ))}
        </div>
      </div>
    </DndContext>
  );
}
