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

  const filtered = tasks.filter(
    (t) =>
      t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.assignee.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const lanes: Record<LaneType, Task[]> = {
    red: filtered.filter((t) => t.lane === "red").sort((a, b) => a.order_rank - b.order_rank),
    yellow: filtered.filter((t) => t.lane === "yellow").sort((a, b) => a.order_rank - b.order_rank),
    green: filtered.filter((t) => t.lane === "green").sort((a, b) => a.order_rank - b.order_rank),
  };

  const handleDragEnd = async (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over) return;
    const activeTask = tasks.find((t) => t.id === active.id);
    if (!activeTask) return;
    const overId = over.id as string;
    const overTask = tasks.find((t) => t.id === overId);
    const targetLane = overTask ? overTask.lane : (overId as LaneType);
    const inLane = tasks.filter((t) => t.lane === targetLane).sort((a, b) => a.order_rank - b.order_rank);
    const oldIndex = inLane.findIndex((t) => t.id === active.id);
    const newIndex = inLane.findIndex((t) => t.id === overId);
    if (oldIndex !== -1 && newIndex !== -1 && oldIndex !== newIndex) {
      const reordered = arrayMove(inLane, oldIndex, newIndex);
      for (let i = 0; i < reordered.length; i++) {
        const rank = (i + 1) * 1000;
        if (reordered[i].order_rank !== rank) {
          await updateTaskData(reordered[i].id, { order_rank: rank });
          updateTask(reordered[i].id, { order_rank: rank });
        }
      }
    }
  };

  const handleAddTask = (lane: LaneType) => {
    const laneTasks = tasks.filter((t) => t.lane === lane);
    const maxRank = laneTasks.length ? Math.max(...laneTasks.map((t) => t.order_rank)) : 0;
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
      onDragEnd={handleDragEnd}
    >
      {/* Margin instead of padding, responsive to header height */}
      <div className="mt-[115px] md:mt-0 px-4 md:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {(["red", "yellow", "green"] as LaneType[]).map((lane) => (
            <Lane
              key={lane}
              lane={lane}
              tasks={lanes[lane]}
              title={
                lane === "red"
                  ? "Master / To-Do"
                  : lane === "yellow"
                  ? "Pending Approval"
                  : "Completed"
              }
              color={lane}
              onAddTask={() => handleAddTask(lane)}
              isCollapsed={collapsed[lane]}
              onToggleCollapse={() => toggleCollapse(lane)}
            />
          ))}
        </div>
      </div>
    </DndContext>
  );
}
