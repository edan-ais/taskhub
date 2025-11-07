import { useState } from 'react';
import {
  Lightbulb,
  Plus,
  ArrowRight,
  Trash2,
  Paperclip,
  Edit2,
  X,
  Save,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { format, parseISO } from 'date-fns';
import { useAppStore } from '../../lib/store';
import {
  createIdea,
  updateIdeaData,
  createTask,
  deleteIdea,
} from '../../hooks/useData';
import type { Idea, IdeaStatus } from '../../lib/types';
import { supabase } from '../../lib/supabase';

export function IdeasTab() {
  const {
    ideas,
    searchQuery,
    removeIdea,
    updateIdea,
    hideCompleted,
    showDeleteConfirmation,
  } = useAppStore();

  const [newIdeaTitle, setNewIdeaTitle] = useState('');
  const [newIdeaDesc, setNewIdeaDesc] = useState('');
  const [newAttachments, setNewAttachments] = useState<File[]>([]);
  const [selectedStatus, setSelectedStatus] = useState<IdeaStatus | 'all'>('all');
  const [activeIdea, setActiveIdea] = useState<Idea | null>(null);
  const [editingIdea, setEditingIdea] = useState<Idea | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDesc, setEditDesc] = useState('');

  // ───────────────────────────────
  // Filtering + Sorting
  // ───────────────────────────────
  const filteredIdeas = ideas
    .filter((idea) => {
      const matchesSearch =
        idea.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        idea.description.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus =
        selectedStatus === 'all' || idea.status === selectedStatus;
      const matchesCompleted = !hideCompleted || idea.status !== 'completed';
      return matchesSearch && matchesStatus && matchesCompleted;
    })
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  // ───────────────────────────────
  // Core Handlers
  // ───────────────────────────────
  const handleCreateIdea = async () => {
    if (!newIdeaTitle.trim()) return;
    const uploadedUrls: string[] = [];
    for (const file of newAttachments) {
      const { data, error } = await supabase.storage
        .from('ideas_attachments')
        .upload(`${Date.now()}-${file.name}`, file);
      if (!error && data) {
        const publicUrl = supabase.storage.from('ideas_attachments').getPublicUrl(data.path)
          .data.publicUrl;
        uploadedUrls.push(publicUrl);
      }
    }
    await createIdea({ title: newIdeaTitle, description: newIdeaDesc, attachments: uploadedUrls });
    setNewIdeaTitle('');
    setNewIdeaDesc('');
    setNewAttachments([]);
  };

  const handleDelete = async (id: string) => {
    showDeleteConfirmation(
      'Delete Idea',
      'Are you sure you want to delete this idea?',
      async () => {
        removeIdea(id);
        await deleteIdea(id);
      }
    );
  };

  const handleEditOpen = (idea: Idea) => {
    setEditingIdea(idea);
    setEditTitle(idea.title);
    setEditDesc(idea.description || '');
  };

  const handleEditSave = async () => {
    if (!editingIdea) return;
    await updateIdeaData(editingIdea.id, { title: editTitle, description: editDesc });
    updateIdea(editingIdea.id, { title: editTitle, description: editDesc });
    setEditingIdea(null);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) setNewAttachments(Array.from(e.target.files));
  };

  const renderDescription = (text: string) => {
    const parts = text.split(/(https?:\/\/[^\s]+)/g);
    return (
      <>
        {parts.map((part, i) =>
          /^https?:\/\//.test(part) ? (
            <a
              key={i}
              href={part}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 underline break-all"
            >
              {part}
            </a>
          ) : (
            <span key={i}>{part}</span>
          )
        )}
      </>
    );
  };

  // ───────────────────────────────
  // UI
  // ───────────────────────────────
  return (
    <div className="mt-[100px] md:mt-0 px-4 md:px-6 lg:px-8 space-y-6">
      {/* NEW IDEA */}
      <div className="bg-white rounded-xl p-6 border-2 border-slate-300">
        <h2 className="text-2xl font-bold text-slate-800 mb-4 flex items-center gap-2">
          <Lightbulb className="text-amber-500 drop-shadow-lg" size={32} />
          Ideas & Requests
        </h2>

        <div className="bg-amber-50 rounded-lg border-2 border-amber-200 p-4 space-y-3">
          <input
            value={newIdeaTitle}
            onChange={(e) => setNewIdeaTitle(e.target.value)}
            placeholder="New idea title..."
            className="w-full px-4 py-2 rounded-lg border-2 border-amber-300 bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
          <textarea
            value={newIdeaDesc}
            onChange={(e) => setNewIdeaDesc(e.target.value)}
            placeholder="Describe your idea..."
            rows={3}
            className="w-full px-4 py-2 rounded-lg border-2 border-amber-300 bg-white focus:outline-none focus:ring-2 focus:ring-amber-500 resize-none"
          />
          <label className="flex items-center justify-center w-full border-2 border-dashed border-amber-300 rounded-lg p-3 bg-white hover:bg-amber-50 cursor-pointer transition-all">
            <Paperclip size={18} className="text-amber-500 mr-2" />
            <span className="font-medium">Attach files or images</span>
            <input type="file" multiple className="hidden" onChange={handleFileChange} />
          </label>
          {newAttachments.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2">
              {newAttachments.map((f, i) => (
                <div
                  key={i}
                  className="px-3 py-1 bg-white border border-slate-300 rounded-lg text-xs text-slate-700"
                >
                  <Paperclip size={12} className="inline mr-1" />
                  {f.name}
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
            className="bg-white rounded-xl p-5 border-2 border-slate-300 shadow-sm hover:shadow-md cursor-pointer transition-all"
            onClick={() => setActiveIdea(idea)}
          >
            <div className="flex justify-between items-start mb-3">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0">
                  <div
                    className={`w-10 h-10 flex items-center justify-center rounded-full shadow-sm ${
                      idea.status === 'not_addressed'
                        ? 'bg-red-100'
                        : idea.status === 'in_progress'
                        ? 'bg-amber-100'
                        : 'bg-green-100'
                    }`}
                  >
                    <Lightbulb
                      size={22}
                      className={`${
                        idea.status === 'not_addressed'
                          ? 'text-red-500'
                          : idea.status === 'in_progress'
                          ? 'text-amber-500'
                          : 'text-green-500'
                      } drop-shadow-sm`}
                    />
                  </div>
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
              <span>{format(parseISO(idea.created_at), 'MMM d, yyyy')}</span>
              <span className="capitalize">{idea.status.replace('_', ' ')}</span>
            </div>
          </motion.div>
        ))}
      </div>

      {/* VIEW IDEA MODAL */}
      <AnimatePresence>
        {activeIdea && (
          <motion.div
            className="fixed inset-0 z-[9999] bg-black/40 backdrop-blur-sm flex items-center justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setActiveIdea(null)}
          >
            <motion.div
              className="bg-white rounded-xl p-6 max-w-lg w-full border-2 border-slate-300 shadow-xl relative max-h-[85vh] overflow-y-auto"
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
              <h3 className="text-xl font-bold text-slate-800 mb-2">{activeIdea.title}</h3>
              {activeIdea.description && (
                <p className="text-slate-700 mb-4 whitespace-pre-wrap">
                  {renderDescription(activeIdea.description)}
                </p>
              )}
              {activeIdea.attachments?.length > 0 && (
                <div className="space-y-2 mb-4">
                  {activeIdea.attachments.map((url, i) => (
                    <a
                      key={i}
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-blue-600 text-sm hover:underline"
                    >
                      <Paperclip size={14} />
                      Attachment {i + 1}
                    </a>
                  ))}
                </div>
              )}
              <div className="flex justify-between text-sm text-slate-500">
                <span>{format(parseISO(activeIdea.created_at), 'MMM d, yyyy')}</span>
                <span className="capitalize">{activeIdea.status.replace('_', ' ')}</span>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* EDIT MODAL */}
      <AnimatePresence>
        {editingIdea && (
          <motion.div
            className="fixed inset-0 z-[10000] bg-black/40 backdrop-blur-sm flex items-center justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setEditingIdea(null)}
          >
            <motion.div
              className="bg-white rounded-xl p-6 w-full max-w-lg border-2 border-slate-300 shadow-lg relative"
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
                className="w-full mb-3 px-4 py-2 border-2 border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <textarea
                value={editDesc}
                onChange={(e) => setEditDesc(e.target.value)}
                rows={5}
                className="w-full mb-4 px-4 py-2 border-2 border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
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
