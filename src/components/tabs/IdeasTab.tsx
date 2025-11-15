import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Lightbulb,
  Plus,
  Search,
  Filter,
  SortAsc,
  Trash2,
  Edit2,
  Save,
  X,
  BadgeCheck,
  AlertTriangle,
} from "lucide-react";
import { format } from "date-fns";
import { supabase } from "../../lib/supabase";
import { useAppStore } from "../../lib/store";

/* =============================================================================
   Org / tenancy constants (stay in sync with TaskDrawer)
============================================================================= */
const ADMIN_ORG_TAG = "WW529400";

/* =============================================================================
   Types
============================================================================= */
type IdeaStatus = "idea" | "in_progress" | "shipped" | "archived";

interface Idea {
  id: string;
  title: string;
  description: string | null;
  status: IdeaStatus;
  impact: number; // 1-5
  effort: number; // 1-5
  score?: number; // computed in UI = impact*2 - effort (editable formula here)
  organization_tag: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string | null;
}

/* =============================================================================
   Helpers
============================================================================= */
const computeScore = (impact: number, effort: number) => impact * 2 - effort;

const statusOptions: { value: IdeaStatus; label: string }[] = [
  { value: "idea",        label: "Idea" },
  { value: "in_progress", label: "In Progress" },
  { value: "shipped",     label: "Shipped" },
  { value: "archived",    label: "Archived" },
];

type SortKey = "recent" | "score" | "impact" | "effort" | "title";

/* =============================================================================
   Component
============================================================================= */
export default function IdeasTab() {
  const { showDeleteConfirmation } = useAppStore();
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [loading, setLoading] = useState(true);

  // tenancy
  const [userId, setUserId] = useState<string | null>(null);
  const [userOrgTag, setUserOrgTag] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  // ui state
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<IdeaStatus | "all">("all");
  const [sortKey, setSortKey] = useState<SortKey>("recent");

  // create/edit state
  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newImpact, setNewImpact] = useState(3);
  const [newEffort, setNewEffort] = useState(2);
  const [newStatus, setNewStatus] = useState<IdeaStatus>("idea");

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editBuffer, setEditBuffer] = useState<Partial<Idea>>({});
  const isEditing = (id: string) => editingId === id;

  /* -----------------------------------------------------------------------------
     Bootstrap: auth + profile
  -----------------------------------------------------------------------------*/
  useEffect(() => {
    (async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          setUserId(null);
          setUserOrgTag(null);
          setIsAdmin(false);
          return;
        }
        setUserId(user.id);

        const { data: profile } = await supabase
          .from("profiles")
          .select("organization_tag")
          .eq("user_id", user.id)
          .maybeSingle();

        const org = profile?.organization_tag || null;
        setUserOrgTag(org);
        setIsAdmin(org === ADMIN_ORG_TAG);
      } catch {
        setUserId(null);
        setUserOrgTag(null);
        setIsAdmin(false);
      }
    })();
  }, []);

  /* -----------------------------------------------------------------------------
     Load ideas (respect org scoping for non-admins)
  -----------------------------------------------------------------------------*/
  const loadIdeas = async () => {
    setLoading(true);
    try {
      let q = supabase
        .from("ideas")
        .select(
          "id,title,description,status,impact,effort,organization_tag,created_by,created_at,updated_at"
        )
        .order("created_at", { ascending: false });

      if (!isAdmin && userOrgTag) {
        q = q.eq("organization_tag", userOrgTag);
      } else if (!isAdmin && !userOrgTag) {
        // no org? show nothing for safety
        q = q.eq("organization_tag", "___none___");
      }

      const { data, error } = await q;
      if (error) throw error;

      const withScores =
        (data || []).map((d) => ({
          ...d,
          score: computeScore(d.impact ?? 0, d.effort ?? 0),
        })) as Idea[];

      setIdeas(withScores);
    } catch (err) {
      console.error("Failed to load ideas:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // load when tenancy known
    if (userOrgTag !== undefined) {
      loadIdeas();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userOrgTag, isAdmin]);

  /* -----------------------------------------------------------------------------
     Derived list after search/filter/sort
  -----------------------------------------------------------------------------*/
  const filtered = useMemo(() => {
    let list = ideas;

    // search
    if (query.trim()) {
      const q = query.trim().toLowerCase();
      list = list.filter(
        (i) =>
          i.title.toLowerCase().includes(q) ||
          (i.description || "").toLowerCase().includes(q)
      );
    }

    // status filter
    if (statusFilter !== "all") {
      list = list.filter((i) => i.status === statusFilter);
    }

    // sort
    list = [...list].sort((a, b) => {
      switch (sortKey) {
        case "score":
          return (b.score ?? 0) - (a.score ?? 0);
        case "impact":
          return (b.impact ?? 0) - (a.impact ?? 0);
        case "effort":
          return (a.effort ?? 0) - (b.effort ?? 0); // lower effort first
        case "title":
          return a.title.localeCompare(b.title);
        case "recent":
        default:
          return (
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          );
      }
    });

    return list;
  }, [ideas, query, statusFilter, sortKey]);

  /* -----------------------------------------------------------------------------
     Create
  -----------------------------------------------------------------------------*/
  const resetCreate = () => {
    setNewTitle("");
    setNewDescription("");
    setNewImpact(3);
    setNewEffort(2);
    setNewStatus("idea");
  };

  const handleCreate = async () => {
    if (!newTitle.trim()) return;
    if (!userOrgTag) {
      alert("You must belong to an organization to create ideas.");
      return;
    }

    setCreating(true);
    const optimistic: Idea = {
      id: "temp-" + Date.now(),
      title: newTitle.trim(),
      description: newDescription.trim() || null,
      status: newStatus,
      impact: newImpact,
      effort: newEffort,
      score: computeScore(newImpact, newEffort),
      organization_tag: userOrgTag,
      created_by: userId,
      created_at: new Date().toISOString(),
      updated_at: null,
    };

    setIdeas((prev) => [optimistic, ...prev]);

    try {
      const { data, error } = await supabase
        .from("ideas")
        .insert({
          title: optimistic.title,
          description: optimistic.description,
          status: optimistic.status,
          impact: optimistic.impact,
          effort: optimistic.effort,
          organization_tag: optimistic.organization_tag,
          created_by: userId,
        })
        .select(
          "id,title,description,status,impact,effort,organization_tag,created_by,created_at,updated_at"
        )
        .single();

      if (error) throw error;

      const materialized: Idea = {
        ...data,
        score: computeScore(data.impact ?? 0, data.effort ?? 0),
      };

      setIdeas((prev) => {
        const withoutTemp = prev.filter((p) => p.id !== optimistic.id);
        return [materialized, ...withoutTemp];
      });

      setCreateOpen(false);
      resetCreate();
    } catch (err) {
      console.error("Create idea failed:", err);
      // rollback
      setIdeas((prev) => prev.filter((p) => p.id !== optimistic.id));
      alert("Failed to create idea.");
    } finally {
      setCreating(false);
    }
  };

  /* -----------------------------------------------------------------------------
     Edit / Update
  -----------------------------------------------------------------------------*/
  const startEdit = (idea: Idea) => {
    setEditingId(idea.id);
    setEditBuffer({
      title: idea.title,
      description: idea.description || "",
      impact: idea.impact,
      effort: idea.effort,
      status: idea.status,
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditBuffer({});
  };

  const handleSaveEdit = async (id: string) => {
    const patch = {
      title:
        (editBuffer.title ?? "").toString().trim() || undefined,
      description:
        (editBuffer.description ?? "").toString().trim(),
      impact: Number(editBuffer.impact ?? 3),
      effort: Number(editBuffer.effort ?? 2),
      status: (editBuffer.status as IdeaStatus) ?? "idea",
    };

    // optimistic update
    setIdeas((prev) =>
      prev.map((i) =>
        i.id === id
          ? {
              ...i,
              ...patch,
              score: computeScore(patch.impact!, patch.effort!),
              updated_at: new Date().toISOString(),
            }
          : i
      )
    );

    try {
      const { error } = await supabase
        .from("ideas")
        .update({
          title: patch.title,
          description: patch.description,
          impact: patch.impact,
          effort: patch.effort,
          status: patch.status,
        })
        .eq("id", id);

      if (error) throw error;

      setEditingId(null);
      setEditBuffer({});
    } catch (err) {
      console.error("Update idea failed:", err);
      alert("Failed to save changes.");
      // reload to recover true state
      loadIdeas();
      setEditingId(null);
      setEditBuffer({});
    }
  };

  /* -----------------------------------------------------------------------------
     Delete
  -----------------------------------------------------------------------------*/
  const handleDelete = (idea: Idea) => {
    const runDelete = async () => {
      // optimistic remove
      const prev = ideas;
      setIdeas((p) => p.filter((i) => i.id !== idea.id));
      try {
        const { error } = await supabase.from("ideas").delete().eq("id", idea.id);
        if (error) throw error;
      } catch (err) {
        console.error("Delete idea failed:", err);
        alert("Failed to delete idea.");
        setIdeas(prev); // rollback
      }
    };

    if (showDeleteConfirmation) {
      showDeleteConfirmation(
        "Delete Idea",
        `Are you sure you want to delete “${idea.title}”? This cannot be undone.`,
        runDelete
      );
    } else {
      if (confirm(`Delete “${idea.title}”?`)) runDelete();
    }
  };

  /* -----------------------------------------------------------------------------
     Render
  -----------------------------------------------------------------------------*/
  return (
    <div className="p-4 md:p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Lightbulb className="opacity-70" />
          <h2 className="text-xl font-semibold">Ideas</h2>
        </div>
        <button
          onClick={() => setCreateOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 text-white border-2 border-blue-700 hover:bg-blue-700 transition-colors"
        >
          <Plus size={18} />
          New Idea
        </button>
      </div>

      {/* Controls */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 opacity-60" size={18} />
          <input
            className="w-full pl-9 pr-3 h-10 rounded-xl border-2 border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Search title or description…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>

        <div className="flex gap-2">
          <div className="relative flex-1">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 opacity-60" size={18} />
            <select
              className="w-full pl-9 pr-3 h-10 rounded-xl border-2 border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
            >
              <option value="all">All statuses</option>
              {statusOptions.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>

          <div className="relative flex-1">
            <SortAsc className="absolute left-3 top-1/2 -translate-y-1/2 opacity-60" size={18} />
            <select
              className="w-full pl-9 pr-3 h-10 rounded-xl border-2 border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              value={sortKey}
              onChange={(e) => setSortKey(e.target.value as SortKey)}
            >
              <option value="recent">Newest first</option>
              <option value="score">Score</option>
              <option value="impact">Impact</option>
              <option value="effort">Lowest Effort</option>
              <option value="title">Title (A–Z)</option>
            </select>
          </div>
        </div>

        <div className="flex items-center justify-end">
          {!isAdmin && !userOrgTag && (
            <span className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 inline-flex items-center gap-2">
              <AlertTriangle size={16} /> No organization – results hidden
            </span>
          )}
          {isAdmin && (
            <span className="text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2 inline-flex items-center gap-2">
              <BadgeCheck size={16} /> Admin: viewing all orgs
            </span>
          )}
        </div>
      </div>

      {/* List */}
      <div className="space-y-3">
        {loading ? (
          <div className="text-slate-500">Loading ideas…</div>
        ) : filtered.length === 0 ? (
          <div className="text-slate-500">No ideas yet.</div>
        ) : (
          <AnimatePresence initial={false}>
            {filtered.map((idea) => (
              <motion.div
                key={idea.id}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                className="bg-white border-2 border-slate-200 rounded-2xl p-4"
              >
                {/* Top line */}
                <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
                  {isEditing(idea.id) ? (
                    <input
                      value={String(editBuffer.title ?? "")}
                      onChange={(e) =>
                        setEditBuffer((b) => ({ ...b, title: e.target.value }))
                      }
                      className="w-full px-3 h-10 rounded-lg border-2 border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Idea title"
                    />
                  ) : (
                    <h3 className="text-lg font-semibold">{idea.title}</h3>
                  )}

                  <div className="flex items-center gap-2 shrink-0">
                    {isEditing(idea.id) ? (
                      <>
                        <button
                          onClick={() => handleSaveEdit(idea.id)}
                          className="inline-flex items-center gap-1 px-3 py-2 rounded-lg bg-blue-600 text-white border-2 border-blue-700 hover:bg-blue-700"
                        >
                          <Save size={16} /> Save
                        </button>
                        <button
                          onClick={cancelEdit}
                          className="inline-flex items-center gap-1 px-3 py-2 rounded-lg bg-slate-100 text-slate-700 border-2 border-slate-300 hover:bg-slate-200"
                        >
                          <X size={16} /> Cancel
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => startEdit(idea)}
                          className="inline-flex items-center gap-1 px-3 py-2 rounded-lg bg-slate-100 text-slate-700 border-2 border-slate-300 hover:bg-slate-200"
                        >
                          <Edit2 size={16} /> Edit
                        </button>
                        <button
                          onClick={() => handleDelete(idea)}
                          className="inline-flex items-center gap-1 px-3 py-2 rounded-lg bg-red-600 text-white border-2 border-red-700 hover:bg-red-700"
                        >
                          <Trash2 size={16} /> Delete
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {/* Body */}
                <div className="mt-3 grid grid-cols-1 md:grid-cols-4 gap-3">
                  <div className="md:col-span-2">
                    {isEditing(idea.id) ? (
                      <textarea
                        value={String(editBuffer.description ?? "")}
                        onChange={(e) =>
                          setEditBuffer((b) => ({
                            ...b,
                            description: e.target.value,
                          }))
                        }
                        rows={3}
                        className="w-full px-3 py-2 rounded-lg border-2 border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y"
                        placeholder="Describe the idea…"
                      />
                    ) : (
                      <p className="text-slate-700 whitespace-pre-wrap">
                        {idea.description || "—"}
                      </p>
                    )}
                  </div>

                  <div className="flex flex-col gap-2">
                    <label className="text-sm text-slate-600">Status</label>
                    {isEditing(idea.id) ? (
                      <select
                        value={(editBuffer.status as IdeaStatus) ?? "idea"}
                        onChange={(e) =>
                          setEditBuffer((b) => ({
                            ...b,
                            status: e.target.value as IdeaStatus,
                          }))
                        }
                        className="px-3 h-10 rounded-lg border-2 border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                      >
                        {statusOptions.map((o) => (
                          <option key={o.value} value={o.value}>
                            {o.label}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <span className="inline-block px-3 py-1 rounded-full text-sm border-2 border-slate-300 bg-slate-50">
                        {statusOptions.find((s) => s.value === idea.status)?.label ??
                          idea.status}
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="text-sm text-slate-600">Impact</label>
                      {isEditing(idea.id) ? (
                        <input
                          type="number"
                          min={1}
                          max={5}
                          value={Number(editBuffer.impact ?? 3)}
                          onChange={(e) =>
                            setEditBuffer((b) => ({
                              ...b,
                              impact: Number(e.target.value || 1),
                            }))
                          }
                          className="w-full px-3 h-10 rounded-lg border-2 border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      ) : (
                        <div className="font-medium">{idea.impact}</div>
                      )}
                    </div>
                    <div>
                      <label className="text-sm text-slate-600">Effort</label>
                      {isEditing(idea.id) ? (
                        <input
                          type="number"
                          min={1}
                          max={5}
                          value={Number(editBuffer.effort ?? 2)}
                          onChange={(e) =>
                            setEditBuffer((b) => ({
                              ...b,
                              effort: Number(e.target.value || 1),
                            }))
                          }
                          className="w-full px-3 h-10 rounded-lg border-2 border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      ) : (
                        <div className="font-medium">{idea.effort}</div>
                      )}
                    </div>
                    <div>
                      <label className="text-sm text-slate-600">Score</label>
                      <div className="font-semibold">
                        {isEditing(idea.id)
                          ? computeScore(
                              Number(editBuffer.impact ?? 3),
                              Number(editBuffer.effort ?? 2)
                            )
                          : idea.score ?? computeScore(idea.impact, idea.effort)}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Meta */}
                <div className="mt-3 text-xs text-slate-500">
                  Created {format(new Date(idea.created_at), "MMM d, yyyy h:mm a")}
                  {idea.organization_tag && (
                    <span className="ml-2">
                      • Org: <span className="font-mono">{idea.organization_tag}</span>
                    </span>
                  )}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>

      {/* Create modal */}
      <AnimatePresence>
        {createOpen && (
          <motion.div
            className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/50 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => !creating && setCreateOpen(false)}
          >
            <motion.div
              initial={{ y: 32, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 32, opacity: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 26 }}
              className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl border-2 border-slate-200 p-5 m-3"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Lightbulb />
                  <h3 className="text-lg font-semibold">New Idea</h3>
                </div>
                <button
                  disabled={creating}
                  onClick={() => setCreateOpen(false)}
                  className="p-2 rounded-lg hover:bg-slate-100"
                >
                  <X />
                </button>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Title
                  </label>
                  <input
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    className="w-full px-3 h-10 rounded-lg border-2 border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Short, punchy title"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Description
                  </label>
                  <textarea
                    value={newDescription}
                    onChange={(e) => setNewDescription(e.target.value)}
                    rows={4}
                    className="w-full px-3 py-2 rounded-lg border-2 border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y"
                    placeholder="What problem does it solve? What’s the user impact?"
                  />
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Impact (1–5)
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={5}
                      value={newImpact}
                      onChange={(e) => setNewImpact(Number(e.target.value || 1))}
                      className="w-full px-3 h-10 rounded-lg border-2 border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Effort (1–5)
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={5}
                      value={newEffort}
                      onChange={(e) => setNewEffort(Number(e.target.value || 1))}
                      className="w-full px-3 h-10 rounded-lg border-2 border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Status
                    </label>
                    <select
                      value={newStatus}
                      onChange={(e) => setNewStatus(e.target.value as IdeaStatus)}
                      className="w-full px-3 h-10 rounded-lg border-2 border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                    >
                      {statusOptions.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="text-sm text-slate-600">
                  Score preview:{" "}
                  <span className="font-semibold">
                    {computeScore(newImpact, newEffort)}
                  </span>{" "}
                  (impact×2 − effort)
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    disabled={creating}
                    onClick={() => {
                      resetCreate();
                      setCreateOpen(false);
                    }}
                    className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 border-2 border-slate-300 hover:bg-slate-200"
                  >
                    Cancel
                  </button>
                  <button
                    disabled={creating || !newTitle.trim() || !userOrgTag}
                    onClick={handleCreate}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 text-white border-2 border-blue-700 hover:bg-blue-700 disabled:opacity-60"
                  >
                    <Plus size={18} />
                    {creating ? "Creating…" : "Create Idea"}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
