import { useState } from 'react';
import {
  Lightbulb,
  Plus,
  ArrowRight,
  Trash2,
  Mail,
  Paperclip,
  CheckCircle,
  XCircle,
  Clock,
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
    emails,
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
  const [editingIdea, setEditingIdea] = useState<Idea | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [activeIdea, setActiveIdea] = useState<Idea | null>(null);

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
    .sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

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

    await createIdea({
      title: newIdeaTitle,
      description: newIdeaDesc,
      attachments: uploadedUrls,
    });

    setNewIdeaTitle('');
    setNewIdeaDesc('');
    setNewAttachments([]);
  };

  const handleConvertToTask = async (idea: Idea) => {
    const task = await createTask({
      title: idea.title,
      description: idea.description,
      lane: 'red',
    });
    await updateIdeaData(idea.id, {
      converted_to_task_id: task.id,
      status: 'completed',
    });
    updateIdea(idea.id, { converted_to_task_id: task.id, status: 'completed' });
  };

  const handleUpdateStatus = async (id: string, status: IdeaStatus) => {
    await updateIdeaData(id, { status });
    updateIdea(id, { status });
  };

  const handleDelete = async (id: string) => {
    showDeleteConfirmation(
      'Delete Idea',
      'Are you sure you want to delete this idea? This action cannot be undone.',
      async () => {
        removeIdea(id);
        try {
          await deleteIdea(id);
        } catch (error) {
          console.error('Failed to delete idea:', error);
        }
      }
    );
  };

  const handleStartEdit = (idea: Idea) => {
    setEditingIdea(idea);
    setEditTitle(idea.title);
    setEditDesc(idea.description || '');
  };

  const handleSaveEdit = async () => {
    if (!editingIdea) return;
    await updateIdeaData(editingIdea.id, {
      title: editTitle,
      description: editDesc,
    });
    updateIdea(editingIdea.id, { title: editTitle, description: editDesc });
    setEditingIdea(null);
  };

  const renderDescription = (text: string) => {
    const parts = text.split(/(https?:\/\/[^\s]+)/g);
    return (
      <>
        {parts.map((part, idx) =>
          part.match(/^https?:\/\//) ? (
            <a
              key={idx}
              href={part}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 underline break-all"
            >
              {part}
            </a>
          ) : (
            <span key={idx}>{part}</span>
          )
        )}
      </>
    );
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) setNewAttachments(Array.from(e.target.files));
  };

  return (
    <div className="mt-[100px] md:mt-0 px-4 md:px-6 lg:px-8 space-y-6">
      {/* NEW IDEA INPUT */}
      <div className="bg-white rounded-xl p-6 border-2 border-slate-300">
        <h2 className="text-2xl font-bold text-slate-800 mb-4 flex items-center gap-2">
          <Lightbulb size={28} className="text-amber-500" />
          Ideas & Requests
        </h2>

        <div className="bg-amber-50 rounded-lg border-2 border-amber-200 p-4 mb-6 space-y-3">
          <input
            type="text"
            value={newIdeaTitle}
            onChange={(e) => setNewIdeaTitle(e.target.value)}
            className="w-full px-4 py-2 rounded-lg border-2 border-amber-300 focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white"
            placeholder="New idea title..."
          />
          <textarea
            value={newIdeaDesc}
            onChange={(e) => setNewIdeaDesc(e.target.value)}
            className="w-full px-4 py-2 rounded-lg border-2 border-amber-300 focus:outline-none focus:ring-2 focus:ring-amber-500 resize-none bg-white"
            rows={3}
            placeholder="Describe your idea..."
          />
          <label className="block w-full text-sm text-slate-700">
            <div className="flex items-center justify-center w-full border-2 border-dashed border-amber-300 rounded-lg p-3 bg-white hover:bg-amber-50 cursor-pointer transition-all">
              <Paperclip size={18} className="text-amber-500 mr-2" />
              <span className="font-medium">Attach files or images</span>
              <input
                type="file"
                multiple
                onChange={handleFileChange}
                className="hidden"
              />
            </div>
          </label>

          {newAttachments.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2">
              {newAttachments.map((file, i) => (
                <div
                  key={i}
                  className="px-3 py-1 bg-white border border-slate-300 rounded-lg text-xs text-slate-700"
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
            <Plus size={20} />
            Add Idea
          </button>
        </div>
      </div>

      {/* IDEAS GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredIdeas.map((idea) => (
          <motion.div
            key={idea.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            onClick={() => setActiveIdea(idea)}
            className="bg-white rounded-xl p-5 shadow-sm hover:shadow-md transition-all border-2 border-slate-300 cursor-pointer"
          >
            <div className="flex justify-between items-start mb-3">
              <div className="flex items-start gap-2">
                <Lightbulb
                  size={20}
                  className={`mt-1 ${
                    idea.status === 'not_addressed'
                      ? 'text-red-500'
                      : idea.status === 'in_progress'
                      ? 'text-amber-500'
                      : 'text-green-500'
                  }`}
                />
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
                    handleStartEdit(idea);
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

      {/* FULL IDEA MODAL */}
      <AnimatePresence>
        {activeIdea && (
          <motion.div
            className="fixed left-0 right-0 bottom-0 top-[100px] md:top-0 z-[999] bg-black bg-opacity-40 flex items-center justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setActiveIdea(null)}
          >
            <motion.div
              className="bg-white rounded-xl p-6 max-w-lg w-full border-2 border-slate-300 shadow-lg relative"
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
                <span className="capitalize">
                  {activeIdea.status.replace('_', ' ')}
                </span>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
