import { useState, useEffect } from "react";
import {
  Lightbulb,
  Plus,
  Trash2,
  Paperclip,
  Edit2,
  X,
  Save,
  Link2,
  User,
  Tag as TagIcon,
  ChevronDown,
  ArrowRight,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { format, parseISO } from "date-fns";
import { useAppStore } from "../../lib/store";
import {
  createIdea,
  updateIdeaData,
  createTask,
  deleteIdea,
} from "../../hooks/useData";
import type { Idea } from "../../lib/types";
import { supabase } from "../../lib/supabase";

export function IdeasTab() {
  const {
    ideas,
    people,
    tags,
    searchQuery,
    hideCompleted,
    removeIdea,
    updateIdea,
    showDeleteConfirmation,
  } = useAppStore();

  // create form state
  const [newIdeaTitle, setNewIdeaTitle] = useState("");
  const [newIdeaDesc, setNewIdeaDesc] = useState("");
  const [newLinks, setNewLinks] = useState<string[]>([""]);
  const [newAttachments, setNewAttachments] = useState<File[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [submittedBy, setSubmittedBy] = useState("");
  const [directedTo, setDirectedTo] = useState("");

  // modals
  const [activeIdea, setActiveIdea] = useState<Idea | null>(null);
  const [editingIdea, setEditingIdea] = useState<Idea | null>(null);

  // edit modal state
  const [editTitle, setEditTitle] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editLinks, setEditLinks] = useState<string[]>([""]);
  const [editTagIds, setEditTagIds] = useState<string[]>([]);
  const [editSubmittedBy, setEditSubmittedBy] = useState("");
  const [editDirectedTo, setEditDirectedTo] = useState("");

  // lock body scroll when modals open
  useEffect(() => {
    if (activeIdea || editingIdea) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "auto";
    }
  }, [activeIdea, editingIdea]);

  const filteredIdeas = ideas
    .filter((idea) => {
      const q = searchQuery.toLowerCase();
      const matches =
        idea.title.toLowerCase().includes(q) ||
        (idea.description || "").toLowerCase().includes(q);
      return matches && (!hideCompleted || idea.status !== "completed");
    })
    .sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

  const handleNewLinkChange = (idx: number, value: string) => {
    setNewLinks((prev) => {
      const next = [...prev];
      next[idx] = value;
      return next;
    });
  };

  const addNewLinkField = () => {
    setNewLinks((prev) => [...prev, ""]);
  };

  const handleCreateIdea = async () => {
    if (!newIdeaTitle.trim()) return;

    // upload files -> urls
    const uploadedUrls: string[] = [];
    for (const file of newAttachments) {
      const { data, error } = await supabase.storage
        .from("ideas_attachments")
        .upload(`${Date.now()}-${file.name}`, file);
      if (!error && data) {
        const publicUrl = supabase.storage
          .from("ideas_attachments")
          .getPublicUrl(data.path).data.publicUrl;
        uploadedUrls.push(publicUrl);
      }
    }

    // join links into a single string, but we’ll pass array-ish to backend too
    const cleanedLinks = newLinks.filter((l) => l.trim().length > 0);

    // NOTE: this assumes your createIdea can accept these extra fields
    const newIdea = await createIdea({
      title: newIdeaTitle,
      description: newIdeaDesc,
      attachments: uploadedUrls,
      links: cleanedLinks,
      tag_ids: selectedTags,
      submitted_by: submittedBy || null,
      directed_to: directedTo || null,
    } as any);

    // update local store if createIdea didn't already
    if (newIdea && newIdea.id) {
      updateIdea(newIdea.id, newIdea);
    }

    // reset form
    setNewIdeaTitle("");
    setNewIdeaDesc("");
    setNewLinks([""]);
    setNewAttachments([]);
    setSelectedTags([]);
    setSubmittedBy("");
    setDirectedTo("");
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setNewAttachments(Array.from(e.target.files));
    }
  };

  const toggleTag = (tagId: string) => {
    setSelectedTags((prev) =>
      prev.includes(tagId) ? prev.filter((t) => t !== tagId) : [...prev, tagId]
    );
  };

  const toggleEditTag = (tagId: string) => {
    setEditTagIds((prev) =>
      prev.includes(tagId) ? prev.filter((t) => t !== tagId) : [...prev, tagId]
    );
  };

  const handleDelete = (id: string) => {
    showDeleteConfirmation(
      "Delete Idea",
      "Are you sure you want to delete this idea?",
      async () => {
        removeIdea(id);
        try {
          await deleteIdea(id);
        } catch (e) {
          console.error("Failed to delete idea", e);
        }
      }
    );
  };

  const handleEditOpen = (idea: Idea) => {
    setEditingIdea(idea);
    setEditTitle(idea.title);
    setEditDesc(idea.description || "");
    setEditLinks(
      Array.isArray(idea.links)
        ? (idea.links as string[])
        : (idea.links ? [idea.links] : [""])
    );
    setEditTagIds(idea.tag_ids || []);
    setEditSubmittedBy(idea.submitted_by || "");
    setEditDirectedTo(idea.directed_to || "");
  };

  const handleEditLinkChange = (idx: number, value: string) => {
    setEditLinks((prev) => {
      const next = [...prev];
      next[idx] = value;
      return next;
    });
  };

  const addEditLinkField = () => {
    setEditLinks((prev) => [...prev, ""]);
  };

  const handleEditSave = async () => {
    if (!editingIdea) return;
    const cleanedLinks = editLinks.filter((l) => l.trim().length > 0);

    await updateIdeaData(editingIdea.id, {
      title: editTitle,
      description: editDesc,
      links: cleanedLinks,
      tag_ids: editTagIds,
      submitted_by: editSubmittedBy || null,
      directed_to: editDirectedTo || null,
    } as any);

    updateIdea(editingIdea.id, {
      ...editingIdea,
      title: editTitle,
      description: editDesc,
      links: cleanedLinks,
      tag_ids: editTagIds,
      submitted_by: editSubmittedBy || null,
      directed_to: editDirectedTo || null,
    } as any);

    setEditingIdea(null);
  };

  const handleConvertToTask = async (idea: Idea) => {
    const task = await createTask({
      title: idea.title,
      description: idea.description,
      lane: "red",
    });
    await updateIdeaData(idea.id, {
      converted_to_task_id: task.id,
      status: "completed",
    } as any);
    updateIdea(idea.id, {
      ...idea,
      converted_to_task_id: task.id,
      status: "completed",
    });
    setActiveIdea((prev) =>
      prev ? { ...prev, converted_to_task_id: task.id, status: "completed" } : prev
    );
  };

  const renderLinks = (links: string[] | string | null | undefined) => {
    if (!links) return null;
    const list = Array.isArray(links) ? links : [links];
    return list
      .filter((l) => l.trim().length > 0)
      .map((link, i) => (
        <a
          key={i}
          href={link}
          target="_blank"
          rel="noopener noreferrer"
          className="block text-blue-600 underline text-sm break-all"
        >
          {link}
        </a>
      ));
  };

  return (
    <div className="mt-[100px] md:mt-0 px-4 md:px-6 lg:px-8 space-y-6">
      {/* CREATE IDEA */}
      <div className="bg-white rounded-xl p-6 border-2 border-slate-300 shadow-sm">
        <h2 className="text-2xl font-bold text-slate-800 mb-4 flex items-center gap-2">
          <Lightbulb size={32} className="text-amber-500 drop-shadow-md" />
          Ideas & Requests
        </h2>

        <div className="space-y-3 bg-amber-50 border-2 border-amber-200 rounded-lg p-4">
          <input
            value={newIdeaTitle}
            onChange={(e) => setNewIdeaTitle(e.target.value)}
            placeholder="Idea title..."
            className="w-full px-4 py-2 rounded-lg border-2 border-amber-300 focus:ring-2 focus:ring-amber-500 bg-white"
          />
          <textarea
            value={newIdeaDesc}
            onChange={(e) => setNewIdeaDesc(e.target.value)}
            rows={3}
            placeholder="Describe your idea..."
            className="w-full px-4 py-2 rounded-lg border-2 border-amber-300 focus:ring-2 focus:ring-amber-500 bg-white"
          />

          {/* unlimited links */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
              <Link2 size={14} />
              Links
            </div>
            {newLinks.map((link, idx) => (
              <input
                key={idx}
                value={link}
                onChange={(e) => handleNewLinkChange(idx, e.target.value)}
                placeholder="https://..."
                className="w-full px-3 py-2 rounded-lg border-2 border-blue-200 focus:ring-2 focus:ring-blue-400 bg-white"
              />
            ))}
            <button
              type="button"
              onClick={addNewLinkField}
              className="text-xs text-blue-600 hover:underline"
            >
              + Add another link
            </button>
          </div>

          {/* submitter / directed to */}
          <div className="flex flex-col md:flex-row gap-3">
            <div className="flex-1">
              <label className="text-sm font-medium text-slate-700 flex items-center gap-1 mb-1">
                <User size={14} /> Submitted by
              </label>
              <div className="relative">
                <select
                  value={submittedBy}
                  onChange={(e) => setSubmittedBy(e.target.value)}
                  className="w-full appearance-none pr-8 px-3 py-2 rounded-lg border-2 border-slate-300 focus:ring-2 focus:ring-slate-500 bg-white"
                >
                  <option value="">Select person</option>
                  {people.map((p) => (
                    <option key={p.id} value={p.name}>
                      {p.name}
                    </option>
                  ))}
                </select>
                <ChevronDown
                  size={16}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none"
                />
              </div>
            </div>
            <div className="flex-1">
              <label className="text-sm font-medium text-slate-700 flex items-center gap-1 mb-1">
                <User size={14} /> Directed to
              </label>
              <div className="relative">
                <select
                  value={directedTo}
                  onChange={(e) => setDirectedTo(e.target.value)}
                  className="w-full appearance-none pr-8 px-3 py-2 rounded-lg border-2 border-slate-300 focus:ring-2 focus:ring-slate-500 bg-white"
                >
                  <option value="">Select person</option>
                  {people.map((p) => (
                    <option key={p.id} value={p.name}>
                      {p.name}
                    </option>
                  ))}
                </select>
                <ChevronDown
                  size={16}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none"
                />
              </div>
            </div>
          </div>

          {/* tag selection same style language */}
          <div>
            <div className="text-sm font-medium text-slate-700 flex items-center gap-1 mb-2">
              <TagIcon size={14} /> Tags
            </div>
            <div className="flex flex-wrap gap-2">
              {tags.map((tag) => {
                const isActive = selectedTags.includes(tag.id);
                return (
                  <button
                    key={tag.id}
                    type="button"
                    onClick={() => toggleTag(tag.id)}
                    className={`text-xs px-2 py-1 rounded-full border-[1.5px] transition-all ${
                      isActive
                        ? "shadow-sm"
                        : "bg-white hover:bg-slate-50"
                    }`}
                    style={{
                      borderColor: tag.color,
                      backgroundColor: isActive ? `${tag.color}20` : "white",
                      color: tag.color,
                    }}
                  >
                    {tag.name}
                  </button>
                );
              })}
            </div>
          </div>

          {/* file upload */}
          <label className="flex items-center justify-center w-full border-2 border-dashed border-amber-300 rounded-lg p-3 bg-white hover:bg-amber-50 cursor-pointer transition-all">
            <Paperclip size={18} className="text-amber-500 mr-2" />
            <span className="font-medium">Attach files</span>
            <input type="file" multiple className="hidden" onChange={handleFileChange} />
          </label>
          {newAttachments.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {newAttachments.map((file, i) => (
                <div
                  key={i}
                  className="px-3 py-1 bg-white border border-slate-200 rounded text-xs"
                >
                  <Paperclip size={12} className="inline mr-1" />
                  {file.name}
                </div>
              ))}
            </div>
          )}

          <button
            onClick={handleCreateIdea}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-amber-600 text-white rounded-lg border-2 border-amber-700 hover:bg-amber-700 transition-all font-medium"
          >
            <Plus size={18} />
            Add Idea
          </button>
        </div>
      </div>

      {/* IDEA CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredIdeas.map((idea) => (
          <motion.div
            key={idea.id}
            whileHover={{ y: -2 }}
            className="bg-white rounded-xl p-5 border-2 border-slate-300 shadow-sm hover:shadow-md transition-all cursor-pointer"
            onClick={() => setActiveIdea(idea)}
          >
            <div className="flex justify-between items-start mb-3 gap-3">
              <div className="flex gap-3 items-start">
                <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center shadow-inner flex-shrink-0">
                  <Lightbulb size={22} className="text-amber-500" />
                </div>
                <div className="min-w-0">
                  <h3 className="font-semibold text-slate-800 leading-tight line-clamp-1">
                    {idea.title}
                  </h3>
                  <p className="text-sm text-slate-600 line-clamp-2 mt-1">
                    {idea.description}
                  </p>
                </div>
              </div>
              <div className="flex gap-2 shrink-0">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleEditOpen(idea);
                  }}
                  className="p-1.5 hover:bg-slate-100 rounded text-slate-600"
                >
                  <Edit2 size={16} />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(idea.id);
                  }}
                  className="p-1.5 hover:bg-red-100 rounded text-red-600"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
            <div className="flex items-center justify-between pt-2 border-t border-slate-200 text-xs text-slate-500">
              <span>{format(parseISO(idea.created_at), "MMM d, yyyy")}</span>
              <span className="capitalize">{idea.status.replace("_", " ")}</span>
            </div>
          </motion.div>
        ))}
      </div>

      {/* VIEW MODAL */}
      <AnimatePresence>
        {activeIdea && (
          <motion.div
            className="fixed inset-0 z-[9999] bg-black/50 flex items-center justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setActiveIdea(null)}
          >
            <motion.div
              className="bg-white rounded-xl p-6 w-[95vw] md:w-[640px] max-h-[90vh] overflow-y-auto border-2 border-slate-300 relative"
              initial={{ scale: 0.97, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.97, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => setActiveIdea(null)}
                className="absolute top-3 right-3 text-slate-500 hover:text-slate-700"
              >
                <X size={18} />
              </button>
              <div className="flex items-start gap-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center shadow-inner">
                  <Lightbulb size={22} className="text-amber-500" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-xl font-bold text-slate-800">
                    {activeIdea.title}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {format(parseISO(activeIdea.created_at), "MMM d, yyyy")}
                  </p>
                </div>
              </div>

              {activeIdea.description && (
                <p className="text-slate-700 mb-4 whitespace-pre-wrap">
                    {activeIdea.description}
                </p>
              )}

              {activeIdea.links && (
                <div className="mb-4">
                  <h4 className="text-sm font-semibold text-slate-700 mb-2 flex items-center gap-1">
                    <Link2 size={14} /> Links
                  </h4>
                  {renderLinks(activeIdea.links)}
                </div>
              )}

              {activeIdea.attachments?.length ? (
                <div className="mb-4">
                  <h4 className="text-sm font-semibold text-slate-700 mb-2 flex items-center gap-1">
                    <Paperclip size={14} /> Attachments
                  </h4>
                  {activeIdea.attachments.map((url, i) => (
                    <a
                      key={i}
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block text-blue-600 text-sm hover:underline break-all"
                    >
                      File {i + 1}
                    </a>
                  ))}
                </div>
              ) : null}

              {activeIdea.tag_ids?.length ? (
                <div className="flex flex-wrap gap-2 mb-4">
                  {activeIdea.tag_ids.map((id) => {
                    const tag = tags.find((t) => t.id === id);
                    if (!tag) return null;
                    return (
                      <span
                        key={id}
                        className="text-xs px-2 py-1 rounded-full text-white"
                        style={{ backgroundColor: tag.color }}
                      >
                        {tag.name}
                      </span>
                    );
                  })}
                </div>
              ) : null}

              {(activeIdea.submitted_by || activeIdea.directed_to) && (
                <div className="mb-4 text-sm text-slate-600">
                  {activeIdea.submitted_by && (
                    <div>
                      <span className="font-medium">Submitted by:</span>{" "}
                      {activeIdea.submitted_by}
                    </div>
                  )}
                  {activeIdea.directed_to && (
                    <div>
                      <span className="font-medium">Directed to:</span>{" "}
                      {activeIdea.directed_to}
                    </div>
                  )}
                </div>
              )}

              {/* actions */}
              <div className="flex flex-wrap gap-3">
                {!activeIdea.converted_to_task_id && (
                  <button
                    onClick={() => handleConvertToTask(activeIdea)}
                    className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white rounded-lg border-2 border-blue-700 hover:bg-blue-700 text-sm"
                  >
                    <ArrowRight size={14} />
                    Convert to task
                  </button>
                )}
                <button
                  onClick={() => {
                    setActiveIdea(null);
                    handleEditOpen(activeIdea);
                  }}
                  className="flex items-center gap-1 px-3 py-1.5 bg-slate-100 text-slate-700 rounded-lg border border-slate-200 text-sm"
                >
                  <Edit2 size={14} />
                  Edit
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* EDIT MODAL */}
      <AnimatePresence>
        {editingIdea && (
          <motion.div
            className="fixed inset-0 z-[10000] bg-black/50 flex items-center justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setEditingIdea(null)}
          >
            <motion.div
              className="bg-white rounded-xl p-6 w-[95vw] md:w-[640px] max-h-[90vh] overflow-y-auto border-2 border-slate-300 relative"
              initial={{ scale: 0.97, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.97, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => setEditingIdea(null)}
                className="absolute top-3 right-3 text-slate-500 hover:text-slate-700"
              >
                <X size={18} />
              </button>
              <h3 className="text-xl font-bold text-slate-800 mb-4">
                Edit Idea
              </h3>
              <input
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                className="w-full mb-3 px-4 py-2 border-2 border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
              <textarea
                value={editDesc}
                onChange={(e) => setEditDesc(e.target.value)}
                rows={4}
                className="w-full mb-3 px-4 py-2 border-2 border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
              <div className="space-y-2 mb-3">
                <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
                  <Link2 size={14} />
                  Links
                </div>
                {editLinks.map((link, idx) => (
                  <input
                    key={idx}
                    value={link}
                    onChange={(e) => handleEditLinkChange(idx, e.target.value)}
                    placeholder="https://..."
                    className="w-full px-3 py-2 rounded-lg border-2 border-blue-200 focus:ring-2 focus:ring-blue-400 bg-white"
                  />
                ))}
                <button
                  type="button"
                  onClick={addEditLinkField}
                  className="text-xs text-blue-600 hover:underline"
                >
                  + Add another link
                </button>
              </div>

              {/* submitter / directed to */}
              <div className="flex flex-col md:flex-row gap-3 mb-3">
                <div className="flex-1">
                  <label className="text-sm font-medium text-slate-700 flex items-center gap-1 mb-1">
                    <User size={14} /> Submitted by
                  </label>
                  <div className="relative">
                    <select
                      value={editSubmittedBy}
                      onChange={(e) => setEditSubmittedBy(e.target.value)}
                      className="w-full appearance-none pr-8 px-3 py-2 rounded-lg border-2 border-slate-300 focus:ring-2 focus:ring-slate-500 bg-white"
                    >
                      <option value="">Select person</option>
                      {people.map((p) => (
                        <option key={p.id} value={p.name}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                    <ChevronDown
                      size={16}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none"
                    />
                  </div>
                </div>
                <div className="flex-1">
                  <label className="text-sm font-medium text-slate-700 flex items-center gap-1 mb-1">
                    <User size={14} /> Directed to
                  </label>
                  <div className="relative">
                    <select
                      value={editDirectedTo}
                      onChange={(e) => setEditDirectedTo(e.target.value)}
                      className="w-full appearance-none pr-8 px-3 py-2 rounded-lg border-2 border-slate-300 focus:ring-2 focus:ring-slate-500 bg-white"
                    >
                      <option value="">Select person</option>
                      {people.map((p) => (
                        <option key={p.id} value={p.name}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                    <ChevronDown
                      size={16}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none"
                    />
                  </div>
                </div>
              </div>

              {/* tag selection */}
              <div className="mb-4">
                <div className="text-sm font-medium text-slate-700 flex items-center gap-1 mb-2">
                  <TagIcon size={14} /> Tags
                </div>
                <div className="flex flex-wrap gap-2">
                  {tags.map((tag) => {
                    const isActive = editTagIds.includes(tag.id);
                    return (
                      <button
                        key={tag.id}
                        type="button"
                        onClick={() => toggleEditTag(tag.id)}
                        className={`text-xs px-2 py-1 rounded-full border-[1.5px] transition-all ${
                          isActive ? "shadow-sm" : "bg-white hover:bg-slate-50"
                        }`}
                        style={{
                          borderColor: tag.color,
                          backgroundColor: isActive ? `${tag.color}20` : "white",
                          color: tag.color,
                        }}
                      >
                        {tag.name}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setEditingIdea(null)}
                  className="px-4 py-2 rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleEditSave}
                  className="px-4 py-2 rounded-lg bg-blue-600 text-white border-2 border-blue-700 hover:bg-blue-700"
                >
                  <Save size={16} className="inline mr-1" />
                  Save
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
