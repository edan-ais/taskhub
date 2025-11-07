import { useState, useMemo } from "react";
import {
  Tag as TagIcon,
  Layers,
  Plus,
  Edit2,
  Trash2,
  ArrowUp,
  ArrowDown,
  ChevronDown,
  ChevronRight,
  X,
  Check,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAppStore } from "../../lib/store";
import { TaskCardPeople as TaskCard } from "../TaskCardPeople";
import { supabase } from "../../lib/supabase";
import { updateTaskData, moveTask, useData } from "../../hooks/useData";

export function TagsTab() {
  const {
    tasks,
    tags,
    divisions,
    searchQuery,
    hideCompleted,
    addTag,
    updateTag,
    removeTag,
    addDivision,
    updateDivision,
    removeDivision,
    showDeleteConfirmation,
    // ⬇️ these were missing; we need them to update local order
    setTags,
    setDivisions,
  } = useAppStore();

  const { fetchTasks } = useData();

  /* ------------------------------------------------
     STATE
  ------------------------------------------------ */
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [selectedDivision, setSelectedDivision] = useState<string | null>(null);

  const [showAddTag, setShowAddTag] = useState(false);
  const [newTagName, setNewTagName] = useState("");
  const [newTagColor, setNewTagColor] = useState("#3B82F6");

  const [editingTag, setEditingTag] = useState<any>(null);
  const [editTagName, setEditTagName] = useState("");
  const [editTagColor, setEditTagColor] = useState("");

  const [showAddDivision, setShowAddDivision] = useState(false);
  const [newDivisionName, setNewDivisionName] = useState("");
  const [newDivisionColor, setNewDivisionColor] = useState("#8B5CF6");

  const [editingDivision, setEditingDivision] = useState<any>(null);
  const [editDivisionName, setEditDivisionName] = useState("");
  const [editDivisionColor, setEditDivisionColor] = useState("");

  const [collapsedLanes, setCollapsedLanes] = useState<Record<string, boolean>>({
    red: false,
    yellow: false,
    green: false,
  });

  /* ------------------------------------------------
     FILTER + TASK GROUPING
  ------------------------------------------------ */
  const filteredTasks = tasks.filter(
    (task) =>
      (task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        task.description.toLowerCase().includes(searchQuery.toLowerCase())) &&
      (!hideCompleted || task.lane !== "green")
  );

  const displayedTasks = useMemo(() => {
    let result = filteredTasks;
    if (selectedTag)
      result = result.filter((t) => t.tags?.some((tg) => tg.id === selectedTag));
    if (selectedDivision)
      result = result.filter((t) =>
        t.divisions?.some((d) => d.id === selectedDivision)
      );
    return result;
  }, [filteredTasks, selectedTag, selectedDivision]);

  const groupedTasks = useMemo(() => {
    const lanes = { red: [], yellow: [], green: [] } as Record<string, any[]>;
    displayedTasks.forEach((t) => lanes[t.lane]?.push(t));
    return lanes;
  }, [displayedTasks]);

  const toggleLane = (lane: string) =>
    setCollapsedLanes((prev) => ({ ...prev, [lane]: !prev[lane] }));

  /* ------------------------------------------------
     TASK UPDATES + REORDER
  ------------------------------------------------ */
  const handleUpdateTask = async (taskId: string, updates: any) => {
    try {
      await updateTaskData(taskId, updates);
      await fetchTasks();
    } catch (e) {
      console.error("Error updating task:", e);
    }
  };

  const handleReorderTask = async (lane: string, newOrder: any[]) => {
    try {
      for (let i = 0; i < newOrder.length; i++) {
        await moveTask(newOrder[i].id, lane, i + 1);
      }
      await fetchTasks();
    } catch (e) {
      console.error("Error reordering tasks:", e);
    }
  };

  /* ------------------------------------------------
     TAG CRUD
  ------------------------------------------------ */
  const handleAddTag = async () => {
    if (!newTagName.trim()) {
      setShowAddTag(false);
      return;
    }
    try {
      const { data, error } = await supabase
        .from("tags")
        .insert({
          name: newTagName,
          color: newTagColor,
          order_index: tags.length,
        })
        .select()
        .single();
      if (error) throw error;
      if (data) {
        addTag(data);
      }
    } catch (e) {
      console.error("Error adding tag:", e);
    } finally {
      // close + reset
      setShowAddTag(false);
      setNewTagName("");
      setNewTagColor("#3B82F6");
    }
  };

  const handleStartEditTag = (tag: any) => {
    setEditingTag(tag);
    setEditTagName(tag.name);
    setEditTagColor(tag.color);
  };

  const handleSaveEditTag = async () => {
    if (!editingTag) return;
    try {
      const updates = { name: editTagName, color: editTagColor };
      const { error } = await supabase
        .from("tags")
        .update(updates)
        .eq("id", editingTag.id);
      if (error) throw error;

      // update local store so UI reflects immediately
      updateTag(editingTag.id, updates);
    } catch (e) {
      console.error("Error saving tag:", e);
    } finally {
      setEditingTag(null);
      setEditTagName("");
      setEditTagColor("");
    }
  };

  const handleMoveTag = async (id: string, direction: "up" | "down") => {
    const index = tags.findIndex((t) => t.id === id);
    const newIndex = direction === "up" ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= tags.length) return;

    // local reorder
    const reordered = [...tags];
    const [moved] = reordered.splice(index, 1);
    reordered.splice(newIndex, 0, moved);

    // update local store right away
    setTags(reordered);

    // persist order to supabase
    try {
      await Promise.all(
        reordered.map((t, i) =>
          supabase.from("tags").update({ order_index: i }).eq("id", t.id)
        )
      );
    } catch (e) {
      console.error("Error reordering tags:", e);
    }
  };

  const handleDeleteTag = (id: string, name: string) => {
    const tasksWithTag = tasks.filter((t) => t.tags?.some((tg) => tg.id === id));
    showDeleteConfirmation(
      "Delete Tag",
      `Delete "${name}"? It will be removed from ${tasksWithTag.length} task(s).`,
      async () => {
        await supabase.from("tags").delete().eq("id", id);
        removeTag(id);
        if (selectedTag === id) setSelectedTag(null);
      }
    );
  };

  /* ------------------------------------------------
     DIVISION CRUD
  ------------------------------------------------ */
  const handleAddDivision = async () => {
    if (!newDivisionName.trim()) {
      setShowAddDivision(false);
      return;
    }
    try {
      const { data, error } = await supabase
        .from("divisions")
        .insert({
          name: newDivisionName,
          color: newDivisionColor,
          order_index: divisions.length,
        })
        .select()
        .single();
      if (error) throw error;
      if (data) {
        addDivision(data);
      }
    } catch (e) {
      console.error("Error adding division:", e);
    } finally {
      setShowAddDivision(false);
      setNewDivisionName("");
      setNewDivisionColor("#8B5CF6");
    }
  };

  const handleStartEditDivision = (division: any) => {
    setEditingDivision(division);
    setEditDivisionName(division.name);
    setEditDivisionColor(division.color);
  };

  const handleSaveEditDivision = async () => {
    if (!editingDivision) return;
    try {
      const updates = { name: editDivisionName, color: editDivisionColor };
      const { error } = await supabase
        .from("divisions")
        .update(updates)
        .eq("id", editingDivision.id);
      if (error) throw error;

      updateDivision(editingDivision.id, updates);
    } catch (e) {
      console.error("Error saving division:", e);
    } finally {
      setEditingDivision(null);
      setEditDivisionName("");
      setEditDivisionColor("");
    }
  };

  const handleMoveDivision = async (id: string, direction: "up" | "down") => {
    const index = divisions.findIndex((d) => d.id === id);
    const newIndex = direction === "up" ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= divisions.length) return;

    const reordered = [...divisions];
    const [moved] = reordered.splice(index, 1);
    reordered.splice(newIndex, 0, moved);

    // update local store immediately
    setDivisions(reordered);

    try {
      await Promise.all(
        reordered.map((d, i) =>
          supabase.from("divisions").update({ order_index: i }).eq("id", d.id)
        )
      );
    } catch (e) {
      console.error("Error reordering divisions:", e);
    }
  };

  const handleDeleteDivision = (id: string, name: string) => {
    const tasksWithDivision = tasks.filter((t) =>
      t.divisions?.some((d) => d.id === id)
    );
    showDeleteConfirmation(
      "Delete Division",
      `Delete "${name}"? It will be removed from ${tasksWithDivision.length} task(s).`,
      async () => {
        await supabase.from("divisions").delete().eq("id", id);
        removeDivision(id);
        if (selectedDivision === id) setSelectedDivision(null);
      }
    );
  };

  /* ------------------------------------------------
     RENDER ITEM (Tags/Divisions)
  ------------------------------------------------ */
  const renderItem = (
    item: any,
    type: "tag" | "division",
    isActive: boolean,
    editingItem: any,
    editName: string,
    editColor: string,
    setEditName: any,
    setEditColor: any,
    onStartEdit: any,
    onSaveEdit: any,
    onCancelEdit: any,
    onMove: any,
    onDelete: any,
    onClick: any
  ) => {
    const isEditing = editingItem?.id === item.id;
    return (
      <div
        className="flex items-center justify-between p-3 rounded-lg border-2 transition-all select-none shadow-sm relative bg-slate-50 hover:border-blue-300"
        style={{
          borderColor: isActive ? item.color : "#E2E8F0",
          // fake thick border without changing layout
          boxShadow: isActive ? `0 0 0 3px ${item.color} inset` : "none",
        }}
      >
        {isEditing ? (
            <>
              <input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="flex-1 px-2 py-1 rounded border-2 border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                autoFocus
              />
              <input
                type="color"
                value={editColor}
                onChange={(e) => setEditColor(e.target.value)}
                className="w-10 h-8 rounded cursor-pointer ml-2"
              />
              <div className="flex gap-1 ml-2">
                <button
                  onClick={onSaveEdit}
                  className="p-1.5 rounded bg-green-100 text-green-700 hover:bg-green-200"
                >
                  <Check size={14} />
                </button>
                <button
                  onClick={onCancelEdit}
                  className="p-1.5 rounded bg-slate-100 text-slate-700 hover:bg-slate-200"
                >
                  <X size={14} />
                </button>
              </div>
            </>
        ) : (
          <>
            <div
              className="flex-1 flex items-center gap-2 cursor-pointer min-w-0"
              onClick={() => onClick(item.id)}
            >
              <div
                className="w-6 h-6 rounded-full border-2 shrink-0"
                style={{
                  backgroundColor: item.color,
                  borderColor: item.color,
                }}
              />
              <div className="min-w-0">
                <div className="font-medium text-slate-800 truncate">
                  {item.name}
                </div>
                <div className="text-xs text-slate-500">
                  {item.taskCount} task(s)
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1 ml-2 shrink-0">
              <button
                onClick={() => onMove(item.id, "up")}
                className="p-1.5 hover:bg-slate-100 rounded text-slate-500"
                title="Move up"
              >
                <ArrowUp size={14} />
              </button>
              <button
                onClick={() => onMove(item.id, "down")}
                className="p-1.5 hover:bg-slate-100 rounded text-slate-500"
                title="Move down"
              >
                <ArrowDown size={14} />
              </button>
              <button
                onClick={() => onStartEdit(item)}
                className="p-1.5 hover:bg-blue-100 rounded text-blue-600"
                title="Edit"
              >
                <Edit2 size={14} />
              </button>
              <button
                onClick={() => onDelete(item.id, item.name)}
                className="p-1.5 hover:bg-red-100 rounded text-red-600"
                title="Delete"
              >
                <Trash2 size={14} />
              </button>
            </div>
          </>
        )}
      </div>
    );
  };

  /* ------------------------------------------------
     RENDER
  ------------------------------------------------ */
  return (
    <div className="space-y-10">
      {/* TAG MANAGEMENT */}
      <div className="bg-white rounded-xl p-6 border-2 border-slate-300 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <TagIcon size={28} /> Tag Management
          </h2>
          <button
            onClick={() => setShowAddTag(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg border-2 border-blue-700 hover:bg-blue-700"
          >
            <Plus size={18} /> Add Tag
          </button>
        </div>

        {showAddTag && (
          <div className="mb-4 p-4 bg-blue-50 rounded-lg border-2 border-blue-200 flex gap-3 items-center">
            <input
              type="text"
              value={newTagName}
              onChange={(e) => setNewTagName(e.target.value)}
              placeholder="Tag name..."
              className="flex-1 px-4 h-10 rounded-lg border-2 border-slate-300"
              autoFocus
            />
            <input
              type="color"
              value={newTagColor}
              onChange={(e) => setNewTagColor(e.target.value)}
              className="w-12 h-10 rounded cursor-pointer"
            />
            <button
              onClick={handleAddTag}
              className="px-4 h-10 bg-blue-600 text-white rounded-lg border-2 border-blue-700"
            >
              Add
            </button>
            <button
              onClick={() => {
                setShowAddTag(false);
                setNewTagName("");
                setNewTagColor("#3B82F6");
              }}
              className="px-4 h-10 bg-slate-200 text-slate-700 rounded-lg border-2 border-slate-300"
            >
              Cancel
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {tags.map((t) =>
            renderItem(
              {
                ...t,
                taskCount: tasks.filter((task) =>
                  task.tags?.some((tg) => tg.id === t.id)
                ).length,
              },
              "tag",
              selectedTag === t.id,
              editingTag,
              editTagName,
              editTagColor,
              setEditTagName,
              setEditTagColor,
              handleStartEditTag,
              handleSaveEditTag,
              () => setEditingTag(null),
              handleMoveTag,
              handleDeleteTag,
              (id: string) =>
                setSelectedTag((prev) => (prev === id ? null : id))
            )
          )}
        </div>
      </div>

      {/* DIVISION MANAGEMENT */}
      <div className="bg-white rounded-xl p-6 border-2 border-slate-300 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Layers size={28} /> Division Management
          </h2>
          <button
            onClick={() => setShowAddDivision(true)}
            className="flex items-center gap-2 px-4 py-2 bg-violet-600 text-white rounded-lg border-2 border-violet-700 hover:bg-violet-700"
          >
            <Plus size={18} /> Add Division
          </button>
        </div>

        {showAddDivision && (
          <div className="mb-4 p-4 bg-violet-50 rounded-lg border-2 border-violet-200 flex gap-3 items-center">
            <input
              type="text"
              value={newDivisionName}
              onChange={(e) => setNewDivisionName(e.target.value)}
              placeholder="Division name..."
              className="flex-1 px-4 h-10 rounded-lg border-2 border-slate-300"
              autoFocus
            />
            <input
              type="color"
              value={newDivisionColor}
              onChange={(e) => setNewDivisionColor(e.target.value)}
              className="w-12 h-10 rounded cursor-pointer"
            />
            <button
              onClick={handleAddDivision}
              className="px-4 h-10 bg-violet-600 text-white rounded-lg border-2 border-violet-700"
            >
              Add
            </button>
            <button
              onClick={() => {
                setShowAddDivision(false);
                setNewDivisionName("");
                setNewDivisionColor("#8B5CF6");
              }}
              className="px-4 h-10 bg-slate-200 text-slate-700 rounded-lg border-2 border-slate-300"
            >
              Cancel
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {divisions.map((d) =>
            renderItem(
              {
                ...d,
                taskCount: tasks.filter((task) =>
                  task.divisions?.some((dv) => dv.id === d.id)
                ).length,
              },
              "division",
              selectedDivision === d.id,
              editingDivision,
              editDivisionName,
              editDivisionColor,
              setEditDivisionName,
              setEditDivisionColor,
              handleStartEditDivision,
              handleSaveEditDivision,
              () => setEditingDivision(null),
              handleMoveDivision,
              handleDeleteDivision,
              (id: string) =>
                setSelectedDivision((prev) => (prev === id ? null : id))
            )
          )}
        </div>
      </div>

      {/* TASKS BY LANE */}
      {(["red", "yellow", "green"] as const).map((lane) => {
        const laneTasks = groupedTasks[lane];
        const laneTitles = {
          red: "Pending",
          yellow: "In Progress",
          green: "Completed",
        };
        const laneColors = {
          red: "border-red-400 bg-red-50",
          yellow: "border-yellow-400 bg-yellow-50",
          green: "border-green-400 bg-green-50",
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
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.3 }}
                  className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
                >
                  {laneTasks.map((task) => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      onUpdate={(updates) => handleUpdateTask(task.id, updates)}
                      onReorder={(laneName, newOrder) =>
                        handleReorderTask(laneName, newOrder)
                      }
                    />
                  ))}
                  {laneTasks.length === 0 && (
                    <div className="col-span-full text-center py-6 text-slate-400">
                      No {laneTitles[lane].toLowerCase()} tasks
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
