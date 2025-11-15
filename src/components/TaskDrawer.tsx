import { useState, useEffect, useMemo } from 'react';
import {
  X,
  Calendar,
  User,
  Tag,
  Layers,
  FileText,
  CheckSquare,
  Plus,
  Trash2,
  Edit2,
  Link2,
  Paperclip,
  AlertCircle,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import { useAppStore } from '../lib/store';
import { supabase } from '../lib/supabase';
import {
  createTask,
  updateTaskData,
  deleteTask,
  addTagToTask,
  removeTagFromTask,
  createSubtask,
  updateSubtask,
  deleteSubtask,
  createNote,
  updateNote,
  deleteNote,
  addDivisionToTask,
  removeDivisionFromTask,
} from '../hooks/useData';
import type {
  ProgressState,
  Tag as TagType,
  Division,
} from '../lib/types';

/* -----------------------------------------------------------------------------
   Tenancy constants
----------------------------------------------------------------------------- */
const ADMIN_ORG_TAG = 'WW529400';

const progressStates: { value: ProgressState; label: string }[] = [
  { value: 'not_started', label: 'Not Started' },
  { value: 'working', label: 'Working' },
  { value: 'blocked', label: 'Blocked' },
  { value: 'needs_review', label: 'Needs Review' },
  { value: 'completed', label: 'Completed' },
];

interface TempSubtask {
  id: string;
  title: string;
  progress_state: ProgressState;
}

interface LinkItem {
  id?: string;
  label: string;
  url: string;
}

interface UploadedFile {
  name: string;
  url: string;
}

/* =============================================================================
   WRAPPER COMPONENT — keeps hooks order stable
============================================================================= */
export function TaskDrawer() {
  const { selectedTask, tags, divisions } = useAppStore();
  if (!selectedTask) return null;
  return (
    <TaskDrawerInner
      selectedTask={selectedTask}
      tags={tags}
      divisions={divisions}
    />
  );
}

/* =============================================================================
   INNER COMPONENT
============================================================================= */
function TaskDrawerInner({
  selectedTask,
  tags,
  divisions,
}: {
  selectedTask: any;
  tags: TagType[];
  divisions: Division[];
}) {
  const {
    setSelectedTask,
    updateTask,
    removeTask,
    showDeleteConfirmation,
  } = useAppStore();

  // tenancy state
  const [userOrgTag, setUserOrgTag] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);

  // local temp state for new task
  const [newSubtask, setNewSubtask] = useState('');
  const [tempSubtasks, setTempSubtasks] = useState<TempSubtask[]>([]);
  const [tempTags, setTempTags] = useState<TagType[]>([]);
  const [tempDivisions, setTempDivisions] = useState<Division[]>([]);
  const [newNote, setNewNote] = useState('');
  const [newLinkLabel, setNewLinkLabel] = useState('');
  const [newLinkUrl, setNewLinkUrl] = useState('');
  const [tempLinks, setTempLinks] = useState<LinkItem[]>([]);
  const [uploadingFiles, setUploadingFiles] = useState(false);
  const isNewTask = selectedTask?.id?.startsWith('temp-');
  const { people } = useAppStore.getState();

  // tenancy bootstrap
  useEffect(() => {
    (async () => {
      try {
        const {
          data: { user },
          error,
        } = await supabase.auth.getUser();
        if (error || !user) {
          setUserOrgTag(null);
          setIsAdmin(false);
          return;
        }
        const { data: profile } = await supabase
          .from('profiles')
          .select('organization_tag')
          .eq('user_id', user.id)
          .maybeSingle();

        const org = profile?.organization_tag || null;
        setUserOrgTag(org);
        setIsAdmin(org === ADMIN_ORG_TAG);
      } catch {
        setUserOrgTag(null);
        setIsAdmin(false);
      }
    })();
  }, []);

  useEffect(() => {
    if (selectedTask && isNewTask) {
      setTempSubtasks([]);
      setTempTags([]);
      setTempDivisions([]);
      setTempLinks([]);
    }
  }, [selectedTask?.id, isNewTask]);

  const handleClose = () => {
    setTempSubtasks([]);
    setTempTags([]);
    setTempDivisions([]);
    setTempLinks([]);
    setNewSubtask('');
    setNewNote('');
    setNewLinkLabel('');
    setNewLinkUrl('');
    setSelectedTask(null);
  };

  const handleUpdate = async (updates: any) => {
    try {
      if (isNewTask) {
        updateTask(selectedTask.id, updates);
      } else {
        await updateTaskData(selectedTask.id, updates);
        updateTask(selectedTask.id, updates);
      }
    } catch (e) {
      console.error('handleUpdate failed:', e);
    }
  };

  /* -----------------------------------------------------------------------------
     TAGS (toggle only — no create/delete here)
  -----------------------------------------------------------------------------*/
  const handleToggleTag = async (tagId: string) => {
    if (isNewTask) {
      const hasTag = tempTags.some((t) => t.id === tagId);
      if (hasTag) {
        setTempTags(tempTags.filter((t) => t.id !== tagId));
      } else {
        const tag = tags.find((t) => t.id === tagId);
        if (tag) setTempTags([...tempTags, tag]);
      }
    } else {
      const hasTag = selectedTask.tags?.some((t: any) => t.id === tagId);
      if (hasTag) {
        await removeTagFromTask(selectedTask.id, tagId);
        updateTask(selectedTask.id, {
          tags: selectedTask.tags?.filter((t: any) => t.id !== tagId),
        });
      } else {
        await addTagToTask(selectedTask.id, tagId);
        const tag = tags.find((t) => t.id === tagId);
        if (tag) {
          updateTask(selectedTask.id, {
            tags: [...(selectedTask.tags || []), tag],
          });
        }
      }
    }
  };

  /* -----------------------------------------------------------------------------
     DIVISIONS (toggle only — creation managed in Tags/Divisions tab)
  -----------------------------------------------------------------------------*/
  const filteredDivisions = useMemo<Division[]>(() => {
    if (isAdmin) return divisions;
    if (!userOrgTag) return [];
    return (divisions || []).filter((d) => d.organization_tag === userOrgTag);
  }, [divisions, isAdmin, userOrgTag]);

  const handleToggleDivision = async (divisionId: string) => {
    if (!isAdmin) {
      const div = divisions.find((d) => d.id === divisionId);
      if (div && div.organization_tag !== userOrgTag) {
        return; // block cross-org tagging
      }
    }

    if (isNewTask) {
      const hasDivision = tempDivisions.some((d) => d.id === divisionId);
      if (hasDivision) {
        setTempDivisions(tempDivisions.filter((d) => d.id !== divisionId));
      } else {
        const division = divisions.find((d) => d.id === divisionId);
        if (division) setTempDivisions([...tempDivisions, division]);
      }
    } else {
      const hasDivision = selectedTask.divisions?.some((d: any) => d.id === divisionId);
      if (hasDivision) {
        await removeDivisionFromTask(selectedTask.id, divisionId);
        updateTask(selectedTask.id, {
          divisions: selectedTask.divisions?.filter((d: any) => d.id !== divisionId),
        });
      } else {
        try {
          await addDivisionToTask(selectedTask.id, divisionId);
          const division = divisions.find((d) => d.id === divisionId);
          if (division) {
            updateTask(selectedTask.id, {
              divisions: [...(selectedTask.divisions || []), division],
            });
          }
        } catch (err) {
          console.error(err);
        }
      }
    }
  };

  /* -----------------------------------------------------------------------------
     SUBTASKS
  -----------------------------------------------------------------------------*/
  const displaySubtasks = isNewTask ? tempSubtasks : selectedTask.subtasks || [];

  const handleAddSubtask = async () => {
    if (!newSubtask.trim()) return;

    if (isNewTask) {
      const tempId = 'temp-subtask-' + Date.now();
      setTempSubtasks([
        ...tempSubtasks,
        { id: tempId, title: newSubtask, progress_state: 'not_started' },
      ]);
      setNewSubtask('');
    } else {
      const maxOrderRank = selectedTask.subtasks?.length
        ? Math.max(...selectedTask.subtasks.map((st: any) => st.order_rank || 0))
        : 0;
      const subtask = await createSubtask(
        selectedTask.id,
        newSubtask,
        maxOrderRank + 1000
      );
      updateTask(selectedTask.id, {
        subtasks: [...(selectedTask.subtasks || []), subtask],
      });
      setNewSubtask('');
    }
  };

  const handleUpdateSubtask = async (id: string, updates: any) => {
    if (isNewTask) {
      setTempSubtasks((prev) =>
        prev.map((st) => (st.id === id ? { ...st, ...updates } : st))
      );
    } else {
      await updateSubtask(id, updates);
      updateTask(selectedTask.id, {
        subtasks: selectedTask.subtasks?.map((st: any) =>
          st.id === id ? { ...st, ...updates } : st
        ),
      });
    }
  };

  const handleDeleteSubtask = async (id: string) => {
    if (isNewTask) {
      setTempSubtasks(tempSubtasks.filter((st) => st.id !== id));
    } else {
      await deleteSubtask(id);
      updateTask(selectedTask.id, {
        subtasks: selectedTask.subtasks?.filter((st: any) => st.id !== id),
      });
    }
  };

  /* -----------------------------------------------------------------------------
     NOTES
  -----------------------------------------------------------------------------*/
  const handleAddNote = async () => {
    if (!newNote.trim() || isNewTask) return;
    const note = await createNote(selectedTask.id, newNote);
    updateTask(selectedTask.id, {
      notes: [...(selectedTask.notes || []), note],
    });
    setNewNote('');
  };

  const handleUpdateNote = async (id: string, content: string) => {
    await updateNote(id, content);
    updateTask(selectedTask.id, {
      notes: selectedTask.notes?.map((n: any) =>
        n.id === id ? { ...n, content } : n
      ),
    });
  };

  const handleDeleteNote = async (id: string) => {
    await deleteNote(id);
    updateTask(selectedTask.id, {
      notes: selectedTask.notes?.filter((n: any) => n.id !== id),
    });
  };

  /* -----------------------------------------------------------------------------
     LINKS
  -----------------------------------------------------------------------------*/
  const displayLinks = isNewTask ? tempLinks : selectedTask.links || [];

  const handleAddLink = async () => {
    if (!newLinkLabel.trim() || !newLinkUrl.trim()) return;
    const newLink = { label: newLinkLabel.trim(), url: newLinkUrl.trim() };

    if (isNewTask) {
      setTempLinks([...tempLinks, newLink]);
    } else {
      const updated = [...(selectedTask.links || []), newLink];
      await handleUpdate({ links: updated });
    }

    setNewLinkLabel('');
    setNewLinkUrl('');
  };

  const handleDeleteLink = async (idx: number) => {
    if (isNewTask) {
      setTempLinks(tempLinks.filter((_, i) => i !== idx));
    } else {
      const updated = (selectedTask.links || []).filter((_, i) => i !== idx);
      await handleUpdate({ links: updated });
    }
  };

  /* -----------------------------------------------------------------------------
     FILES
  -----------------------------------------------------------------------------*/
  const displayFiles: UploadedFile[] = selectedTask.files || [];

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || !files.length) return;
    if (isNewTask) {
      alert('Save the task first to upload files.');
      return;
    }

    setUploadingFiles(true);
    const currentFiles: UploadedFile[] = selectedTask.files || [];
    const uploadedFiles: UploadedFile[] = [...currentFiles];

    for (const file of Array.from(files)) {
      const path = `${selectedTask.id}/${Date.now()}-${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from('task-files')
        .upload(path, file);
      if (!uploadError) {
        const { data } = supabase.storage.from('task-files').getPublicUrl(path);
        uploadedFiles.push({
          name: file.name,
          url: data.publicUrl,
        });
      } else {
        console.error('Failed to upload file: ', uploadError);
      }
    }

    await handleUpdate({ files: uploadedFiles });
    setUploadingFiles(false);
    e.target.value = '';
  };

  /* -----------------------------------------------------------------------------
     SAVE / DELETE
  -----------------------------------------------------------------------------*/
  const handleSaveTask = async () => {
    try {
      const newTask = await createTask({
        title: selectedTask.title || 'New Task',
        description: selectedTask.description,
        lane: selectedTask.lane,
        assignee: selectedTask.assignee,
        due_date: selectedTask.due_date,
        order_rank: selectedTask.order_rank,
      });

      // Tags
      for (const tag of tempTags) {
        await addTagToTask(newTask.id, tag.id);
      }

      // Divisions
      for (const division of tempDivisions) {
        try {
          await addDivisionToTask(newTask.id, division.id);
        } catch (err) {
          console.warn('Skipping division add (policy):', err);
        }
      }

      // Subtasks
      for (const tempSub of tempSubtasks) {
        await createSubtask(newTask.id, tempSub.title, Date.now());
      }

      // Links
      if (tempLinks.length) {
        await updateTaskData(newTask.id, {
          links: tempLinks,
        });
      }

      removeTask(selectedTask.id);
      handleClose();
    } catch (error) {
      console.error('Error creating task:', error);
    }
  };

  const handleDeleteTask = async () => {
    if (isNewTask) {
      removeTask(selectedTask.id);
      handleClose();
      return;
    }

    showDeleteConfirmation(
      'Delete Task',
      'Are you sure you want to delete this task? This action cannot be undone.',
      async () => {
        const taskId = selectedTask.id;
        handleClose();
        removeTask(taskId);
        try {
          await deleteTask(taskId);
        } catch (error) {
          console.error('Failed to delete task:', error);
        }
      }
    );
  };

  /* -----------------------------------------------------------------------------
     DISPLAY SHORTHANDS
  -----------------------------------------------------------------------------*/
  const displayTags = isNewTask ? tempTags : selectedTask.tags || [];
  const displayDivisions = isNewTask ? tempDivisions : selectedTask.divisions || [];

  /* -----------------------------------------------------------------------------
     RENDER
  -----------------------------------------------------------------------------*/
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-end"
        onClick={handleClose}
      >
        <motion.div
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'spring', damping: 30, stiffness: 300 }}
          className="w-full max-w-2xl h-full bg-white shadow-2xl overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          {/* HEADER */}
          <div className="sticky top-0 z-10 bg-blue-600 border-b-2 border-blue-700 p-6 text-white">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <input
                  type="text"
                  value={selectedTask.title ?? ''}
                  onChange={(e) => handleUpdate({ title: e.target.value })}
                  className="w-full bg-transparent text-2xl font-bold outline-none placeholder-white/70"
                  placeholder="Task title"
                />
              </div>
              <button
                onClick={handleClose}
                className="p-2 hover:bg-white/20 rounded-lg transition-colors"
              >
                <X size={24} />
              </button>
            </div>
          </div>

          {/* BODY */}
          <div className="p-6 space-y-6">
            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Description
              </label>
              <textarea
                value={selectedTask.description ?? ''}
                onChange={(e) => handleUpdate({ description: e.target.value })}
                className="w-full px-4 py-3 rounded-lg border-2 border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                rows={4}
                placeholder="Add a description..."
              />
            </div>

            {/* Assignee & Due Date */}
            <div className="grid grid-cols-2 gap-4">
              {/* Assignee (select only; no create) */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  <User size={16} className="inline mr-1" />
                  Assignee
                </label>
                <select
                  value={selectedTask.assignee || ''}
                  onChange={(e) => handleUpdate({ assignee: e.target.value })}
                  className="w-full px-4 h-10 rounded-lg border-2 border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none bg-white"
                >
                  <option value="">Unassigned</option>
                  {people.map((person) => (
                    <option key={person.id} value={person.name}>
                      {person.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Due Date */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  <Calendar size={16} className="inline mr-1" />
                  Due Date
                </label>
                <input
                  type="date"
                  value={(selectedTask.due_date as string) || ''}
                  onChange={(e) => handleUpdate({ due_date: e.target.value || null })}
                  className="w-full px-4 h-10 rounded-lg border-2 border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Divisions (toggle only) */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                <Layers size={16} className="inline mr-1" />
                Divisions
              </label>

              <div className="flex flex-wrap gap-2">
                {(isAdmin ? divisions : filteredDivisions).map((division) => {
                  const isSelected = displayDivisions.some((d) => d.id === division.id);
                  const isDisabled = !isAdmin && division.organization_tag !== userOrgTag;
                  return (
                    <button
                      key={division.id}
                      onClick={() => !isDisabled && handleToggleDivision(division.id)}
                      className={`px-3 py-1.5 rounded-full text-sm font-medium border-2 transition-all ${
                        isSelected ? 'ring-2 ring-offset-1' : 'opacity-60 hover:opacity-100'
                      } ${isDisabled ? 'cursor-not-allowed opacity-40' : ''}`}
                      style={{
                        backgroundColor: `${division.color}20`,
                        color: division.color,
                        borderColor: division.color,
                      }}
                      title={
                        isDisabled
                          ? 'Division not available for your organization'
                          : undefined
                      }
                    >
                      {division.name}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Tags (toggle only) */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                <Tag size={16} className="inline mr-1" />
                Tags
              </label>
              <div className="flex flex-wrap gap-2">
                {tags.map((tag) => {
                  const isSelected = displayTags.some((t) => t.id === tag.id);
                  return (
                    <button
                      key={tag.id}
                      onClick={() => handleToggleTag(tag.id)}
                      className={`px-3 py-1.5 rounded-full text-sm font-medium border-2 transition-all ${
                        isSelected ? 'ring-2 ring-offset-1' : 'opacity-60 hover:opacity-100'
                      }`}
                      style={{
                        backgroundColor: `${tag.color}20`,
                        color: tag.color,
                        borderColor: tag.color,
                      }}
                    >
                      {tag.name}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Progress State */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Progress State
              </label>
              <select
                value={selectedTask.progress_state}
                onChange={(e) => handleUpdate({ progress_state: e.target.value })}
                className="w-full px-4 h-10 rounded-lg border-2 border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none bg-white"
              >
                {progressStates.map((state) => (
                  <option key={state.value} value={state.value}>
                    {state.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Subtasks */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                <CheckSquare size={16} className="inline mr-1" />
                Subtasks (
                {displaySubtasks.filter((st) => st.progress_state === 'completed').length}
                /{displaySubtasks.length})
              </label>
              <div className="space-y-2">
                {displaySubtasks.map((subtask) => (
                  <div
                    key={subtask.id}
                    className="flex items-center gap-2 bg-slate-50 p-3 rounded-lg border-2 border-slate-200"
                  >
                    <input
                      type="checkbox"
                      checked={subtask.progress_state === 'completed'}
                      onChange={(e) =>
                        handleUpdateSubtask(subtask.id, {
                          progress_state: e.target.checked
                            ? 'completed'
                            : 'not_started',
                        })
                      }
                      className="w-4 h-4 rounded border-slate-300"
                    />
                    <span className="flex-1">{subtask.title}</span>
                    <button
                      onClick={() => handleDeleteSubtask(subtask.id)}
                      className="p-1 hover:bg-red-100 rounded text-red-600"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newSubtask}
                    onChange={(e) => setNewSubtask(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddSubtask()}
                    className="flex-1 px-4 h-10 rounded-lg border-2 border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Add subtask..."
                  />
                  <button
                    onClick={handleAddSubtask}
                    className="px-4 h-10 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                  >
                    <Plus size={20} />
                  </button>
                </div>
              </div>
            </div>

            {/* Links */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                <Link2 size={16} className="inline mr-1" />
                Links
              </label>
              <div className="space-y-2">
                {displayLinks.map((link, idx) => (
                  <div
                    key={link.url + idx}
                    className="flex items-center justify-between bg-slate-50 p-3 rounded-lg border-2 border-slate-200"
                  >
                    <div className="flex flex-col gap-1">
                      <span className="font-medium text-slate-800">{link.label}</span>
                      <a
                        href={link.url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-sm text-blue-600 underline break-all"
                      >
                        {link.url}
                      </a>
                    </div>
                    <button
                      onClick={() => handleDeleteLink(idx)}
                      className="p-1 hover:bg-red-100 rounded text-red-600"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newLinkLabel}
                    onChange={(e) => setNewLinkLabel(e.target.value)}
                    className="flex-1 px-3 h-10 rounded-lg border-2 border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Link label (e.g. Figma, Doc, Drive)"
                  />
                  <input
                    type="url"
                    value={newLinkUrl}
                    onChange={(e) => setNewLinkUrl(e.target.value)}
                    className="flex-1 px-3 h-10 rounded-lg border-2 border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="https://example.com"
                  />
                  <button
                    onClick={handleAddLink}
                    className="px-3 h-10 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                  >
                    <Plus size={20} />
                  </button>
                </div>
              </div>
            </div>

            {/* Files */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                <Paperclip size={16} className="inline mr-1" />
                Files
              </label>
              <div className="space-y-2">
                {!isNewTask ? (
                  <input
                    type="file"
                    multiple
                    onChange={handleFileUpload}
                    className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                  />
                ) : (
                  <p className="text-sm text-slate-500 bg-slate-50 rounded-lg p-3 border border-slate-200">
                    Save this task first to upload files.
                  </p>
                )}
                {uploadingFiles && (
                  <p className="text-sm text-slate-400">Uploading…</p>
                )}
                {displayFiles.length > 0 && (
                  <ul className="space-y-1">
                    {displayFiles.map((file, idx) => (
                      <li key={file.url || idx} className="flex items-center gap-2">
                        <a
                          href={file.url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-blue-600 underline break-all"
                        >
                          {file.name}
                        </a>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

            {/* Notes */}
            {!isNewTask && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  <FileText size={16} className="inline mr-1" />
                  Notes
                </label>
                <div className="space-y-2">
                  {selectedTask.notes?.map((note: any) => (
                    <div
                      key={note.id}
                      className="bg-amber-50 p-4 rounded-lg border-2 border-amber-200"
                    >
                      <div className="flex justify-between items-start gap-2">
                        <textarea
                          value={note.content}
                          onChange={(e) => handleUpdateNote(note.id, e.target.value)}
                          className="flex-1 bg-transparent outline-none resize-none"
                          rows={2}
                        />
                        <button
                          onClick={() => handleDeleteNote(note.id)}
                          className="p-1 hover:bg-red-100 rounded text-red-600"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                      <div className="text-xs text-slate-500 mt-2">
                        {note.created_at
                          ? format(new Date(note.created_at), 'MMM d, yyyy h:mm a')
                          : ''}
                      </div>
                    </div>
                  ))}
                  <div className="flex gap-2">
                    <textarea
                      value={newNote}
                      onChange={(e) => setNewNote(e.target.value)}
                      className="flex-1 px-4 py-2 rounded-lg border-2 border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none h-[68px]"
                      placeholder="Add a note..."
                    />
                    <button
                      onClick={handleAddNote}
                      className="px-4 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors h-[68px]"
                    >
                      <Plus size={20} />
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Footer buttons */}
            <div className="pt-4 border-t space-y-3">
              <button
                onClick={handleSaveTask}
                className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg border-2 border-blue-700 hover:bg-blue-700 transition-colors font-medium"
              >
                Save Task
              </button>
              <button
                onClick={handleDeleteTask}
                className="w-full px-4 py-3 bg-red-500 text-white rounded-lg border-2 border-red-600 hover:bg-red-600 transition-colors font-medium"
              >
                {isNewTask ? 'Cancel' : 'Delete Task'}
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
