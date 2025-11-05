import { useState } from 'react';
import { Lightbulb, Plus, ArrowRight, Trash2, Mail, Paperclip, CheckCircle, XCircle, Clock } from 'lucide-react';
import { motion } from 'framer-motion';
import { format, parseISO } from 'date-fns';
import { useAppStore } from '../../lib/store';
import { createIdea, updateIdeaData, createTask, deleteIdea } from '../../hooks/useData';
import type { Idea, IdeaStatus } from '../../lib/types';

export function IdeasTab() {
  const { ideas, emails, searchQuery, removeIdea, updateIdea, hideCompleted, showDeleteConfirmation } = useAppStore();
  const [newIdeaTitle, setNewIdeaTitle] = useState('');
  const [newIdeaDesc, setNewIdeaDesc] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<IdeaStatus | 'all'>('all');
  const [showEmails, setShowEmails] = useState(true);

  const filteredIdeas = ideas
    .filter((idea) => {
      const matchesSearch =
        idea.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        idea.description.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = selectedStatus === 'all' || idea.status === selectedStatus;
      const matchesCompleted = !hideCompleted || idea.status !== 'completed';
      return matchesSearch && matchesStatus && matchesCompleted;
    })
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  const statusCounts = {
    all: ideas.length,
    not_addressed: ideas.filter((i) => i.status === 'not_addressed').length,
    in_progress: ideas.filter((i) => i.status === 'in_progress').length,
    completed: ideas.filter((i) => i.status === 'completed').length,
  };

  const handleCreateIdea = async () => {
    if (!newIdeaTitle.trim()) return;
    await createIdea({ title: newIdeaTitle, description: newIdeaDesc });
    setNewIdeaTitle('');
    setNewIdeaDesc('');
  };

  const handleConvertToTask = async (idea: Idea) => {
    const task = await createTask({
      title: idea.title,
      description: idea.description,
      lane: 'red',
    });
    await updateIdeaData(idea.id, { converted_to_task_id: task.id, status: 'completed' });
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
        await deleteIdea(id);
        removeIdea(id);
      }
    );
  };

  const statusOptions: { value: IdeaStatus | 'all'; label: string; color: string }[] = [
    { value: 'all', label: 'All Ideas', color: 'bg-slate-600 border-slate-700' },
    { value: 'not_addressed', label: 'Not Addressed', color: 'bg-red-600 border-red-700' },
    { value: 'in_progress', label: 'In Progress', color: 'bg-yellow-600 border-yellow-700' },
    { value: 'completed', label: 'Completed', color: 'bg-green-600 border-green-700' },
  ];

  const recentEmails = emails
    .filter((email) =>
      email.sender_email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      email.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
      email.body_text.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .slice(0, 10);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'processed':
        return <CheckCircle size={16} className="text-green-600" />;
      case 'failed':
        return <XCircle size={16} className="text-red-600" />;
      case 'pending':
      case 'manual':
        return <Clock size={16} className="text-yellow-600" />;
      default:
        return <Mail size={16} className="text-slate-400" />;
    }
  };

  return (
    <div className="space-y-6">
      {showEmails && recentEmails.length > 0 && (
        <div className="bg-white rounded-xl p-6 border-2 border-blue-300">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
              <Mail size={28} className="text-blue-600" />
              Inbound Emails ({recentEmails.length})
            </h2>
            <button
              onClick={() => setShowEmails(false)}
              className="text-sm text-slate-600 hover:text-slate-800 underline"
            >
              Hide
            </button>
          </div>

          <div className="space-y-3 max-h-[400px] overflow-y-auto">
            {recentEmails.map((email) => (
              <motion.div
                key={email.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-blue-50 rounded-lg p-4 border-2 border-blue-200"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      {getStatusIcon(email.processing_status)}
                      <span className="font-semibold text-slate-800">
                        {email.sender_name || email.sender_email}
                      </span>
                      <span className="text-xs text-slate-500">
                        {format(parseISO(email.received_at), 'MMM d, h:mm a')}
                      </span>
                    </div>
                    <h4 className="font-medium text-slate-700 mb-1">{email.subject}</h4>
                    <p className="text-sm text-slate-600 line-clamp-2">{email.body_text}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 mt-3 pt-3 border-t border-blue-300">
                  {email.attachments && email.attachments.length > 0 && (
                    <span className="flex items-center gap-1 text-xs text-slate-600">
                      <Paperclip size={12} />
                      {email.attachments.length} attachment{email.attachments.length > 1 ? 's' : ''}
                    </span>
                  )}

                  {email.created_task_id && (
                    <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-lg border border-green-300">
                      Created Task
                    </span>
                  )}

                  {email.created_idea_id && (
                    <span className="px-2 py-1 bg-amber-100 text-amber-700 text-xs rounded-lg border border-amber-300">
                      Created Idea
                    </span>
                  )}

                  <span className={`ml-auto px-2 py-1 text-xs rounded-lg border ${
                    email.processing_status === 'processed'
                      ? 'bg-green-100 text-green-700 border-green-300'
                      : email.processing_status === 'failed'
                      ? 'bg-red-100 text-red-700 border-red-300'
                      : 'bg-yellow-100 text-yellow-700 border-yellow-300'
                  }`}>
                    {email.processing_status}
                  </span>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {!showEmails && recentEmails.length > 0 && (
        <button
          onClick={() => setShowEmails(true)}
          className="w-full bg-blue-50 text-blue-700 rounded-xl p-4 border-2 border-blue-300 hover:bg-blue-100 transition-colors font-medium"
        >
          Show Inbound Emails ({recentEmails.length})
        </button>
      )}

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
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleCreateIdea()}
            className="w-full px-4 py-2 rounded-lg border-2 border-amber-300 focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white"
            placeholder="New idea title..."
          />
          <textarea
            value={newIdeaDesc}
            onChange={(e) => setNewIdeaDesc(e.target.value)}
            className="w-full px-4 py-2 rounded-lg border-2 border-amber-300 focus:outline-none focus:ring-2 focus:ring-amber-500 resize-none bg-white"
            rows={3}
            placeholder="Describe your idea (optional)..."
          />
          <button
            onClick={handleCreateIdea}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-amber-600 text-white rounded-lg border-2 border-amber-700 hover:bg-amber-700 transition-all font-medium"
          >
            <Plus size={20} />
            Add Idea
          </button>
        </div>

        <div className="flex flex-wrap gap-2">
          {statusOptions.map((option) => (
            <button
              key={option.value}
              onClick={() => setSelectedStatus(option.value)}
              className={`px-4 py-2 rounded-lg font-medium border-2 transition-all ${
                selectedStatus === option.value
                  ? `${option.color} text-white`
                  : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
              }`}
            >
              {option.label}
              <span className="ml-2 text-sm opacity-75">({statusCounts[option.value]})</span>
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredIdeas.map((idea) => (
          <motion.div
            key={idea.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-xl p-5 shadow-sm hover:shadow-md transition-all border-2 border-slate-300"
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-start gap-2 flex-1">
                <Lightbulb
                  size={20}
                  className={`mt-1 flex-shrink-0 ${
                    idea.status === 'not_addressed'
                      ? 'text-red-500'
                      : idea.status === 'in_progress'
                      ? 'text-amber-500'
                      : 'text-green-500'
                  }`}
                />
                <div className="flex-1">
                  <h3 className="font-semibold text-slate-800 leading-tight">{idea.title}</h3>
                  {idea.description && (
                    <p className="text-sm text-slate-600 mt-1 line-clamp-3">{idea.description}</p>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 mb-3">
              <select
                value={idea.status}
                onChange={(e) => handleUpdateStatus(idea.id, e.target.value as IdeaStatus)}
                className={`flex-1 px-3 py-1.5 rounded-lg text-sm font-medium focus:outline-none focus:ring-2 ${
                  idea.status === 'not_addressed'
                    ? 'bg-red-100 text-red-700 focus:ring-red-500'
                    : idea.status === 'in_progress'
                    ? 'bg-amber-100 text-amber-700 focus:ring-amber-500'
                    : 'bg-green-100 text-green-700 focus:ring-green-500'
                }`}
              >
                <option value="not_addressed">Not Addressed</option>
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
              </select>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-slate-200">
              <span className="text-xs text-slate-500">{format(parseISO(idea.created_at), 'MMM d, yyyy')}</span>
              <div className="flex items-center gap-2">
                {!idea.converted_to_task_id && (
                  <button
                    onClick={() => handleConvertToTask(idea)}
                    className="flex items-center gap-1 px-3 py-1.5 bg-blue-500 text-white text-sm rounded-lg hover:bg-blue-600 transition-colors"
                    title="Convert to task"
                  >
                    <ArrowRight size={14} />
                    Task
                  </button>
                )}
                <button
                  onClick={() => handleDelete(idea.id)}
                  className="p-1.5 hover:bg-red-100 rounded text-red-600 transition-colors"
                  title="Delete idea"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>

            {idea.converted_to_task_id && (
              <div className="mt-2 px-3 py-1.5 bg-blue-50 text-blue-700 text-xs rounded-lg flex items-center gap-1">
                <ArrowRight size={12} />
                Converted to task
              </div>
            )}
          </motion.div>
        ))}

        {filteredIdeas.length === 0 && (
          <div className="col-span-full text-center py-12 text-slate-400">
            No ideas match the selected status
          </div>
        )}
      </div>
    </div>
  );
}
