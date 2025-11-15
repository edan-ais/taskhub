import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Tags as TagsIcon,
  Plus,
  Search,
  SortAsc,
  Edit2,
  Save,
  X,
  Trash2,
  Merge,
  BadgeCheck,
  AlertTriangle,
  Palette,
  Hash,
} from "lucide-react";
import { format } from "date-fns";
import { supabase } from "../../lib/supabase";
import { useAppStore } from "../../lib/store";

/* =============================================================================
   Multitenancy
============================================================================= */
const ADMIN_ORG_TAG = "WW529400";

/* =============================================================================
   Types
============================================================================= */
interface TagRow {
  id: string;
  name: string;
  color: string | null;
  slug: string | null;
  organization_tag: string | null;
  created_at: string;
  updated_at: string | null;
  usage_count?: number;
}

type SortKey = "recent" | "name" | "usage";

/* =============================================================================
   Helpers
============================================================================= */
const makeSlug = (s: string) =>
  s
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 64);

/* =============================================================================
   Component
============================================================================= */
export default function TagsTab() {
  const { showDeleteConfirmation } = useAppStore();

  // tenancy
  const [userId, setUserId] = useState<string | null>(null);
  const [userOrgTag, setUserOrgTag] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  // data
  const [tags, setTags] = useState<TagRow[]>([]);
  const [loading, setLoading] = useState(true);

  // ui state
  const [query, setQuery] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("recent");

  // create
  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState("#3b82f6");

  // edit
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editBuffer, setEditBuffer] = useState<Partial<TagRow>>({});
  const isEditing = (id: string) => editingId === id;

  // merge
  const [mergeOpen, setMergeOpen] = useState(false);
  const [mergeSource, setMergeSource] = useState<string | null>(null);
  const [mergeTarget, setMergeTarget] = useState<string | null>(null);
  const [merging, setMerging] = useState(false);

  /* -----------------------------------------------------------------------------
     Bootstrap auth + profile
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
     Load tags + usage counts
  -----------------------------------------------------------------------------*/
  const loadTags = async () => {
    setLoading(true);
    try {
      let q = supabase
        .from("tags")
        .select("id,name,color,slug,organization_tag,created_at,updated_at")
        .order("created_at", { ascending: false });

      if (!isAdmin && userOrgTag) {
        q = q.eq("organization_tag", userOrgTag);
      } else if (!isAdmin && !userOrgTag) {
        // Safety: return none if user has no org
        q = q.eq("organization_tag", "___none___");
      }

      const { data: rawTags, error } = await q;
      if (error) throw error;

      const ids = (rawTags ?? []).map((t) => t.id);
      let usageMap: Record<string, number> = {};

      if (ids.length) {
        // Reliable reduce over tag_ids present in junctions for these tags
        const { data: rows, error: usageErr } = await supabase
          .from("task_tags")
          .select("tag_id")
          .in("tag_id", ids);

        if (usageErr) throw usageErr;

        usageMap =
          (rows || []).reduce((acc: Record<string, number>, r: { tag_id: string }) => {
            acc[r.tag_id] = (acc[r.tag_id] || 0) + 1;
            return acc;
          }, {}) || {};
      }

      const withCounts: TagRow[] = (rawTags || []).map((t) => ({
        ...t,
        usage_count: usageMap[t.id] || 0,
      }));

      setTags(withCounts);
    } catch (err) {
      console.error("Failed to load tags:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (userOrgTag !== undefined) {
      loadTags();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userOrgTag, isAdmin]);

  /* -----------------------------------------------------------------------------
     Derived list
  -----------------------------------------------------------------------------*/
  const visible = useMemo(() => {
    let list = tags;

    if (query.trim()) {
      const q = query.toLowerCase().trim();
      list = list.filter(
        (t) =>
          t.name.toLowerCase().includes(q) ||
          (t.slug || "").toLowerCase().includes(q)
      );
    }

    list = [...list].sort((a, b) => {
      switch (sortKey) {
        case "name":
          return a.name.localeCompare(b.name);
        case "usage":
          return (b.usage_count || 0) - (a.usage_count || 0);
        case "recent":
        default:
          return (
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          );
      }
    });

    return list;
  }, [tags, query, sortKey]);

  /* -----------------------------------------------------------------------------
     Create
  -----------------------------------------------------------------------------*/
  const resetCreate = () => {
    setNewName("");
    setNewColor("#3b82f6");
  };

  const handleCreate = async () => {
    if (!newName.trim()) return;
    if (!userOrgTag) {
      alert("You must belong to an organization to create tags.");
      return;
    }

    setCreating(true);
    const optimistic: TagRow = {
      id: "temp-" + Date.now(),
      name: newName.trim(),
      color: newColor,
      slug: makeSlug(newName),
      organization_tag: userOrgTag,
      created_at: new Date().toISOString(),
      updated_at: null,
      usage_count: 0,
    };

    setTags((prev) => [optimistic, ...prev]);

    try {
      const { data, error } = await supabase
        .from("tags")
        .insert({
          name: optimistic.name,
          color: optimistic.color,
          slug: optimistic.slug,
          organization_tag: optimistic.organization_tag,
          created_by: userId,
        })
        .select("id,name,color,slug,organization_tag,created_at,updated_at")
        .single();

      if (error) throw error;

      const materialized: TagRow = { ...data, usage_count: 0 };
      setTags((prev) => {
        const withoutTemp = prev.filter((p) => p.id !== optimistic.id);
        return [materialized, ...withoutTemp];
      });

      setCreateOpen(false);
      resetCreate();
    } catch (err) {
      console.error("Create tag failed:", err);
      setTags((prev) => prev.filter((p) => p.id !== optimistic.id));
      alert("Failed to create tag.");
    } finally {
      setCreating(false);
    }
  };

  /* -----------------------------------------------------------------------------
     Edit
  -----------------------------------------------------------------------------*/
  const startEdit = (tag: TagRow) => {
    setEditingId(tag.id);
    setEditBuffer({
      name: tag.name,
      color: tag.color || "#3b82f6",
      slug: tag.slug || makeSlug(tag.name),
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditBuffer({});
  };

  const handleSaveEdit = async (id: string) => {
    const patch = {
      name: (editBuffer.name ?? "").toString().trim(),
      color: (editBuffer.color ?? "#3b82f6").toString(),
      slug: (editBuffer.slug ?? "").toString().trim(),
    };
    if (!patch.name) return;

    // optimistic
    setTags((prev) =>
      prev.map((t) => (t.id === id ? { ...t, ...patch, updated_at: new Date().toISOString() } : t))
    );

    try {
      const { error } = await supabase
        .from("tags")
        .update(patch)
        .eq("id", id);
      if (error) throw error;

      setEditingId(null);
      setEditBuffer({});
    } catch (err) {
      console.error("Update tag failed:", err);
      alert("Failed to save changes.");
      loadTags();
      setEditingId(null);
      setEditBuffer({});
    }
  };

  /* -----------------------------------------------------------------------------
     Delete
  -----------------------------------------------------------------------------*/
  const handleDelete = (tag: TagRow) => {
    const runDelete = async () => {
      const prev = tags;
      setTags((p) => p.filter((t) => t.id !== tag.id));
      try {
        // Remove junctions first to avoid FK issues
        await supabase.from("task_tags").delete().eq("tag_id", tag.id);
        const { error } = await supabase.from("tags").delete().eq("id", tag.id);
        if (error) throw error;
      } catch (err) {
        console.error("Delete tag failed:", err);
        alert("Failed to delete tag.");
        setTags(prev);
      }
    };

    if (showDeleteConfirmation) {
      showDeleteConfirmation(
        "Delete Tag",
        `Delete “${tag.name}”? This removes the tag and its task associations.`,
        runDelete
      );
    } else {
      if (confirm(`Delete “${tag.name}”? This removes the tag and its task associations.`)) {
        runDelete();
      }
    }
  };

  /* -----------------------------------------------------------------------------
     Merge
  -----------------------------------------------------------------------------*/
  const doMerge = async () => {
    if (!mergeSource || !mergeTarget || mergeSource === mergeTarget) return;
    setMerging(true);

    const source = tags.find((t) => t.id === mergeSource);
    const target = tags.find((t) => t.id === mergeTarget);
    if (!source || !target) {
      setMerging(false);
      return;
    }

    // Optimistic: reassign counts and remove source
    const prev = tags;
    const sourceCount = source.usage_count || 0;
    setTags((curr) => {
      const withoutSource = curr.filter((t) => t.id !== source.id);
      return withoutSource.map((t) =>
        t.id === target.id
          ? { ...t, usage_count: (t.usage_count || 0) + sourceCount }
          : t
      );
    });

    try {
      // Re-point junctions
      await supabase
        .from("task_tags")
        .update({ tag_id: target.id })
        .eq("tag_id", source.id);

      // Delete source tag
      const { error } = await supabase.from("tags").delete().eq("id", source.id);
      if (error) throw error;

      setMergeOpen(false);
      setMergeSource(null);
      setMergeTarget(null);
    } catch (err) {
      console.error("Merge failed:", err);
      alert("Failed to merge tags.");
      setTags(prev);
    } finally {
      setMerging(false);
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
          <TagsIcon className="opacity-70" />
          <h2 className="text-xl font-semibold">Tags</h2>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setMergeOpen(true)}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border-2 border-slate-300 bg-white hover:bg-slate-50"
          >
            <Merge size={18} />
            Merge
          </button>
          <button
            onClick={() => setCreateOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 text-white border-2 border-blue-700 hover:bg-blue-700"
          >
            <Plus size={18} />
            New Tag
          </button>
        </div>
      </div>

      {/* Controls */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 opacity-60" size={18} />
          <input
            className="w-full pl-9 pr-3 h-10 rounded-xl border-2 border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Search name or slug…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>

        <div className="relative">
          <SortAsc className="absolute left-3 top-1/2 -translate-y-1/2 opacity-60" size={18} />
          <select
            className="w-full pl-9 pr-3 h-10 rounded-xl border-2 border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            value={sortKey}
            onChange={(e) => setSortKey(e.target.value as SortKey)}
          >
            <option value="recent">Newest first</option>
            <option value="name">Name (A–Z)</option>
            <option value="usage">Most used</option>
          </select>
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
          <div className="text-slate-500">Loading tags…</div>
        ) : visible.length === 0 ? (
          <div className="text-slate-500">No tags yet.</div>
        ) : (
          <AnimatePresence initial={false}>
            {visible.map((tag) => (
              <motion.div
                key={tag.id}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                className="bg-white border-2 border-slate-200 rounded-2xl p-4"
              >
                <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
                  {/* Left block: name/slug/color */}
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <span
                        className="inline-block w-4 h-4 rounded"
                        style={{ backgroundColor: tag.color || "#e5e7eb", border: "1px solid rgba(0,0,0,0.1)" }}
                        title={tag.color || "#e5e7eb"}
                      />
                      {isEditing(tag.id) ? (
                        <input
                          value={String(editBuffer.name ?? "")}
                          onChange={(e) =>
                            setEditBuffer((b) => ({ ...b, name: e.target.value }))
                          }
                          className="min-w-[220px] px-3 h-10 rounded-lg border-2 border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="Tag name"
                        />
                      ) : (
                        <h3 className="text-lg font-semibold">{tag.name}</h3>
                      )}
                    </div>

                    <div className="mt-2 grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div className="flex items-center gap-2">
                        <Palette size={16} className="opacity-60" />
                        {isEditing(tag.id) ? (
                          <input
                            type="color"
                            value={String(editBuffer.color ?? tag.color ?? "#3b82f6")}
                            onChange={(e) =>
                              setEditBuffer((b) => ({ ...b, color: e.target.value }))
                            }
                            className="w-10 h-10 p-0 border rounded"
                          />
                        ) : (
                          <span className="text-sm">
                            {tag.color || "—"}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <Hash size={16} className="opacity-60" />
                        {isEditing(tag.id) ? (
                          <input
                            value={String(editBuffer.slug ?? tag.slug ?? makeSlug(tag.name))}
                            onChange={(e) =>
                              setEditBuffer((b) => ({ ...b, slug: makeSlug(e.target.value) }))
                            }
                            className="w-full px-3 h-10 rounded-lg border-2 border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                            placeholder="slug"
                          />
                        ) : (
                          <span className="text-sm font-mono">{tag.slug || "—"}</span>
                        )}
                      </div>

                      <div className="text-sm text-slate-600">
                        Created {format(new Date(tag.created_at), "MMM d, yyyy")}
                        {tag.organization_tag && (
                          <span className="ml-2">
                            • Org: <span className="font-mono">{tag.organization_tag}</span>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right block: actions + usage */}
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="px-3 py-1 rounded-full border-2 border-slate-300 bg-slate-50 text-sm">
                      {tag.usage_count || 0} uses
                    </span>

                    {isEditing(tag.id) ? (
                      <>
                        <button
                          onClick={() => handleSaveEdit(tag.id)}
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
                          onClick={() => startEdit(tag)}
                          className="inline-flex items-center gap-1 px-3 py-2 rounded-lg bg-slate-100 text-slate-700 border-2 border-slate-300 hover:bg-slate-200"
                        >
                          <Edit2 size={16} /> Edit
                        </button>
                        <button
                          onClick={() => handleDelete(tag)}
                          className="inline-flex items-center gap-1 px-3 py-2 rounded-lg bg-red-600 text-white border-2 border-red-700 hover:bg-red-700"
                        >
                          <Trash2 size={16} /> Delete
                        </button>
                      </>
                    )}
                  </div>
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
              className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border-2 border-slate-200 p-5 m-3"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <TagsIcon />
                  <h3 className="text-lg font-semibold">New Tag</h3>
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
                    Name
                  </label>
                  <input
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    className="w-full px-3 h-10 rounded-lg border-2 border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., Urgent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Color
                  </label>
                  <input
                    type="color"
                    value={newColor}
                    onChange={(e) => setNewColor(e.target.value)}
                    className="w-12 h-12 p-0 border rounded"
                  />
                </div>

                <div className="text-sm text-slate-600">
                  Slug preview:{" "}
                  <span className="font-mono">{makeSlug(newName || "tag")}</span>
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
                    disabled={creating || !newName.trim() || !userOrgTag}
                    onClick={handleCreate}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 text-white border-2 border-blue-700 hover:bg-blue-700 disabled:opacity-60"
                  >
                    <Plus size={18} />
                    {creating ? "Creating…" : "Create Tag"}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Merge modal */}
      <AnimatePresence>
        {mergeOpen && (
          <motion.div
            className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/50 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => !merging && setMergeOpen(false)}
          >
            <motion.div
              initial={{ y: 32, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 32, opacity: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 26 }}
              className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border-2 border-slate-200 p-5 m-3"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Merge />
                  <h3 className="text-lg font-semibold">Merge Tags</h3>
                </div>
                <button
                  disabled={merging}
                  onClick={() => setMergeOpen(false)}
                  className="p-2 rounded-lg hover:bg-slate-100"
                >
                  <X />
                </button>
              </div>

              <div className="space-y-3">
                <p className="text-sm text-slate-600">
                  Move all task associations from the <b>source</b> tag into the <b>target</b> tag,
                  then delete the source.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Source tag
                    </label>
                    <select
                      className="w-full px-3 h-10 rounded-lg border-2 border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      value={mergeSource ?? ""}
                      onChange={(e) => setMergeSource(e.target.value || null)}
                    >
                      <option value="">Select…</option>
                      {tags.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name} {t.usage_count ? `(${t.usage_count})` : ""}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Target tag
                    </label>
                    <select
                      className="w-full px-3 h-10 rounded-lg border-2 border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      value={mergeTarget ?? ""}
                      onChange={(e) => setMergeTarget(e.target.value || null)}
                    >
                      <option value="">Select…</option>
                      {tags.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name} {t.usage_count ? `(${t.usage_count})` : ""}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {mergeSource && mergeTarget && mergeSource === mergeTarget && (
                  <div className="text-sm text-red-600">
                    Source and target must be different.
                  </div>
                )}

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    disabled={merging}
                    onClick={() => {
                      setMergeOpen(false);
                      setMergeSource(null);
                      setMergeTarget(null);
                    }}
                    className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 border-2 border-slate-300 hover:bg-slate-200"
                  >
                    Cancel
                  </button>
                  <button
                    disabled={
                      merging ||
                      !mergeSource ||
                      !mergeTarget ||
                      mergeSource === mergeTarget
                    }
                    onClick={doMerge}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 text-white border-2 border-blue-700 hover:bg-blue-700 disabled:opacity-60"
                  >
                    <Merge size={18} />
                    {merging ? "Merging…" : "Merge"}
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

// Support named import in App.tsx: `import { TagsTab } from './components/tabs/TagsTab'`
export { TagsTab };
