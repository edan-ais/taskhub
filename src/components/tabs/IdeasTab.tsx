import { useState, useEffect } from 'react';
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
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { format, parseISO } from 'date-fns';
import { useAppStore } from '../../lib/store';
import {
  createIdea,
  updateIdeaData,
  deleteIdea,
} from '../../hooks/useData';
import type { Idea, IdeaStatus } from '../../lib/types';
import { supabase } from '../../lib/supabase';

export function IdeasTab() {
  const {
    ideas,
    people,
    tags,
    searchQuery,
    removeIdea,
    updateIdea,
    hideCompleted,
    showDeleteConfirmation,
  } = useAppStore();

  const [newIdeaTitle, setNewIdeaTitle] = useState('');
  const [newIdeaDesc, setNewIdeaDesc] = useState('');
  const [newIdeaLinks, setNewIdeaLinks] = useState('');
  const [newAttachments, setNewAttachments] = useState<File[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [submittedBy, setSubmittedBy] = useState('');
  const [directedTo, setDirectedTo] = useState('');
  const [activeIdea, setActiveIdea] = useState<Idea | null>(null);
  const [editingIdea, setEditingIdea] = useState<Idea | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editLinks, setEditLinks] = useState('');
  const [editTags, setEditTags] = useState<string[]>([]);
  const [editFiles, setEditFiles] = useState<string[]>([]);

  // ───────────────────────────────
  // Scroll lock for modals
  // ───────────────────────────────
  useEffect(() => {
    document.body.style.overflow =
      activeIdea || editingIdea ? 'hidden' : 'auto';
  }, [activeIdea, editingIdea]);

  // ───────────────────────────────
  // Handlers
  // ───────────────────────────────
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) setNewAttachments(Array.from(e.target.files));
  };

  const handleTagToggle = (tagId: string) => {
    setSelectedTags((prev) =>
      prev.includes(tagId) ? prev.filter((id) => id !== tagId) : [...prev, tagId]
    );
  };

  const handleCreateIdea = async () => {
    if (!newIdeaTitle.trim()) return;
    const uploadedUrls: string[] = [];
    for (const file of newAttachments) {
      const { data, error } = await supabase.storage
        .from('ideas_attachments')
        .upload(`${Date.now()}-${file.name}`, file);
      if (!error && data) {
        const publicUrl = supabase.storage
          .from('ideas_attachments')
          .getPublicUrl(data.path).data.publicUrl;
        uploadedUrls.push(publicUrl);
      }
    }

    const { data: newIdea } = await supabase
      .from('ideas')
      .insert([
        {
          title: newIdeaTitle,
          description: newIdeaDesc,
          links: newIdeaLinks,
          attachments: uploadedUrls,
          tag_ids: selectedTags,
          submitted_by: submittedBy || null,
          directed_to: directedTo || null,
          status: 'not_addressed',
        },
      ])
      .select()
      .single();

    if (newIdea) updateIdea(newIdea.id, newIdea);
    setNewIdeaTitle('');
    setNewIdeaDesc('');
    setNewIdeaLinks('');
    setSelectedTags([]);
    setNewAttachments([]);
    setSubmittedBy('');
    setDirectedTo('');
  };

  const handleDelete = async (id: string) => {
    showDeleteConfirmation('Delete Idea', 'Are you sure?', async () => {
      removeIdea(id);
      await deleteIdea(id);
    });
  };

  const handleEditOpen = (idea: Idea) => {
    setEditingIdea(idea);
    setEditTitle(idea.title);
    setEditDesc(idea.description || '');
    setEditLinks(idea.links || '');
    setEditTags(idea.tag_ids || []);
    setEditFiles(idea.attachments || []);
  };

  const handleEditSave = async () => {
    if (!editingIdea) return;
    await updateIdeaData(editingIdea.id, {
      title: editTitle,
      description: editDesc,
      links: editLinks,
      tag_ids: editTags,
    });
    updateIdea(editingIdea.id, {
      title: editTitle,
      description: editDesc,
      links: editLinks,
      tag_ids: editTags,
    });
    setEditingIdea(null);
  };

  const renderLinks = (links: string) => {
    return links
      .split(/\s+/)
      .filter((l) => l.startsWith('http'))
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

  const filteredIdeas = ideas
    .filter((i) => {
      const q = searchQuery.toLowerCase();
      const matches =
        i.title.toLowerCase().includes(q) ||
        i.description.toLowerCase().includes(q);
      return matches && (!hideCompleted || i.status !== 'completed');
    })
    .sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

  // ───────────────────────────────
  // JSX
  // ───────────────────────────────
  return (
    <div className="mt-[100px] md:mt-0 px-4 md:px-6 lg:px-8 space-y-6">
      {/* NEW IDEA */}
      <div className="bg-white rounded-xl p-6 border-2 border-slate-300 shadow-sm">
        <h2 className="text-2xl font-bold text-slate-800 mb-4 flex items-center gap-2">
          <Lightbulb size={32} className="text-amber-500 drop-shadow-md" />
          Ideas & Requests
        </h2>

        <div className="space-y-3 bg-amber-50 border-2 border-amber-200 rounded-lg p-4">
          <input
            type="text"
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
          <textarea
            value={newIdeaLinks}
            onChange={(e) => setNewIdeaLinks(e.target.value)}
            rows={2}
            placeholder="Add any relevant links (one per line)..."
            className="w-full px-4 py-2 rounded-lg border-2 border-blue-300 focus:ring-2 focus:ring-blue-500 bg-white"
          />

          {/* People Selection */}
          <div className="flex flex-col md:flex-row gap-3">
            <div className="flex-1">
              <label className="text-sm font-medium text-slate-700 flex items-center gap-1 mb-1">
                <User size={14} /> Submitted by
              </label>
              <select
                value={submittedBy}
                onChange={(e) => setSubmittedBy(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border-2 border-slate-300 focus:ring-2 focus:ring-slate-500 bg-white"
              >
                <option value="">Select person</option>
                {people.map((p) => (
                  <option key={p.id} value={p.name}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex-1">
              <label className="text-sm font-medium text-slate-700 flex items-center gap-1 mb-1">
                <User size={14} /> Directed to
              </label>
              <select
                value={directedTo}
                onChange={(e) => setDirectedTo(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border-2 border-slate-300 focus:ring-2 focus:ring-slate-500 bg-white"
              >
                <option value="">Select person</option>
                {people.map((p) => (
                  <option key={p.id} value={p.name}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Tags */}
          <div>
            <label className="text-sm font-medium text-slate-700 flex items-center gap-1 mb-1">
              <TagIcon size={14} /> Tags
            </label>
            <div className="flex flex-wrap gap-2">
              {tags.map((tag) => (
                <button
                  key={tag.id}
                  onClick={() => handleTagToggle(tag.id)}
                  className={`text-xs px-2 py-1 rounded-full border-2 ${
                    selectedTags.includes(tag.id)
                      ? 'text-white'
                      : 'text-slate-700'
                  }`}
                  style={{
                    backgroundColor: selectedTags.includes(tag.id)
                      ? tag.color
                      : 'white',
                    borderColor: tag.color,
                  }}
                >
                  {tag.name}
                </button>
              ))}
            </div>
          </div>

          {/* File Upload */}
          <label className="flex items-center justify-center w-full border-2 border-dashed border-amber-300 rounded-lg p-3 bg-white hover:bg-amber-50 cursor-pointer transition-all">
            <Paperclip size={18} className="text-amber-500 mr-2" />
            <span className="font-medium">Attach files</span>
            <input type="file" multiple className="hidden" onChange={handleFileChange} />
          </label>

          <button
            onClick={handleCreateIdea}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-amber-600 text-white rounded-lg border-2 border-amber-700 hover:bg-amber-700 font-medium"
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
            className="bg-white rounded-xl p-5 border-2 border-slate-300 shadow-sm hover:shadow-md cursor-pointer transition-all relative"
            onClick={() => setActiveIdea(idea)}
          >
            <div className="flex justify-between items-start mb-3">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 flex items-center justify-center rounded-full bg-amber-100 shadow-inner">
                  <Lightbulb
                    size={24}
                    className="text-amber-500 drop-shadow-sm"
                  />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-800 leading-tight line-clamp-1">
                    {idea.title}
                  </h3>
                  <p className="text-sm text-slate-600 line-clamp-2 mt-1">
                    {idea.description}
                  </p>
                </div>
              </div>
              <div className="flex flex-col gap-1 items-end shrink-0">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleEditOpen(idea);
                  }}
                  className="p-1 hover:bg-slate-100 rounded text-slate-600"
                >
                  <Edit2 size={16} />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(idea.id);
                  }}
                  className="p-1 hover:bg-red-100 rounded text-red-600"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* FULL VIEW MODAL */}
      <AnimatePresence>
        {activeIdea && (
          <motion.div
            className="fixed inset-0 z-[9999] bg-black/50 backdrop-blur-sm flex items-center justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setActiveIdea(null)}
          >
            <motion.div
              className="bg-white rounded-xl p-6 w-[95vw] md:w-[640px] max-h-[90vh] overflow-y-auto border-2 border-slate-300 relative"
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => setActiveIdea(null)}
                className="absolute top-3 right-3 text-slate-500 hover:text-slate-700"
              >
                <X size={18} />
              </button>
              <h3 className="text-xl font-bold text-slate-800 mb-2">
                {activeIdea.title}
              </h3>
              {activeIdea.description && (
                <p className="text-slate-700 mb-4 whitespace-pre-wrap">
                  {activeIdea.description}
                </p>
              )}
              {activeIdea.links && (
                <div className="mb-4">
                  <h4 className="font-semibold text-slate-700 mb-1 flex items-center gap-1">
                    <Link2 size={14} /> Links
                  </h4>
                  {renderLinks(activeIdea.links)}
                </div>
              )}
              {activeIdea.attachments?.length > 0 && (
                <div className="mb-4">
                  <h4 className="font-semibold text-slate-700 mb-1 flex items-center gap-1">
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
              )}
              {activeIdea.tag_ids?.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-3">
                  {activeIdea.tag_ids.map((id) => {
                    const tag = tags.find((t) => t.id === id);
                    return (
                      tag && (
                        <span
                          key={id}
                          className="text-xs px-2 py-1 rounded-full text-white"
                          style={{ backgroundColor: tag.color }}
                        >
                          {tag.name}
                        </span>
                      )
                    );
                  })}
                </div>
              )}
              <div className="flex justify-between text-xs text-slate-500">
                <span>
                  {format(parseISO(activeIdea.created_at), 'MMM d, yyyy')}
                </span>
                <span>
                  {activeIdea.submitted_by && (
                    <>From: {activeIdea.submitted_by}</>
                  )}
                  {activeIdea.directed_to && (
                    <> → To: {activeIdea.directed_to}</>
                  )}
                </span>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* EDIT MODAL */}
      <AnimatePresence>
        {editingIdea && (
          <motion.div
            className="fixed inset-0 z-[10000] bg-black/50 backdrop-blur-sm flex items-center justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setEditingIdea(null)}
          >
            <motion.div
              className="bg-white rounded-xl p-6 w-[95vw] md:w-[640px] max-h-[90vh] overflow-y-auto border-2 border-slate-300 relative"
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => setEditingIdea(null)}
                className="absolute top-3 right-3 text-slate-500 hover:text-slate-700"
              >
                <X size={18} />
              </button>
              <h3 className="text-xl font-bold text-slate-800 mb-4">Edit Idea</h3>
              <input
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                className="w-full mb-3 px-4 py-2 border-2 border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
              <textarea
                value={editDesc}
                onChange={(e) => setEditDesc(e.target.value)}
                rows={4}
                className="w-full mb-3 px-4 py-2 border-2 border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 resize-none"
              />
              <textarea
                value={editLinks}
                onChange={(e) => setEditLinks(e.target.value)}
                rows={2}
                className="w-full mb-4 px-4 py-2 border-2 border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 resize-none"
                placeholder="Links (one per line)..."
              />
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
