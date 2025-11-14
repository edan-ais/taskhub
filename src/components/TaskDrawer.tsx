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
  ShieldCheck,
  Building2,
  Link as LinkIcon,
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
  createPerson,
  addDivisionToTask,
  removeDivisionFromTask,
  // org/division management helper from updated useData.ts
  createOrganizationAndLinkToDivision,
  // linkDivisionToExistingOrg, // (unused currently)
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

export function TaskDrawer() {
  const {
    selectedTask,
    setSelectedTask,
    updateTask,
    removeTask,
    tags,
    divisions,
    showDeleteConfirmation,
  } = useAppStore();

  // tenancy state
  const [userOrgTag, setUserOrgTag] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);

  // new task temp state
  const [newSubtask, setNewSubtask] = useState('');
  const [tempSubtasks, setTempSubtasks] = useState<TempSubtask[]>([]);
  const [tempTags, setTempTags] = useState<TagType[]>([]);
  const [tempDivisions, setTempDivisions] = useState<Division[]>([]);
  const [newNote, setNewNote] = useState('');
  const [newTagName, setNewTagName] = useState('');
  const [newTagColor, setNewTagColor] = useState('#3B82F6');
  const [isCreatingTag, setIsCreatingTag] = useState(false);
  const [newDivisionName, setNewDivisionName] = useState('');
  const [newDivisionColor, setNewDivisionColor] = useState('#8B5CF6');
  const [isCreatingDivision, setIsCreatingDivision] = useState(false);
  const [newAssignee, setNewAssignee] = useState('');
  const [showAssigneeInput, setShowAssigneeInput] = useState(false);
  const [editingSubtask, setEditingSubtask] = useState<string | null>(null);
  const [editingSubtaskTitle, setEditingSubtaskTitle] = useState('');
  const [newLinkLabel, setNewLinkLabel] = useState('');
  const [newLinkUrl, setNewLinkUrl] = useState('');
  const [tempLinks, setTempLinks] = useState<LinkItem[]>([]);
  const [uploadingFiles, setUploadingFiles] = useState(false);
  const isNewTask = selectedTask?.id?.startsWith('temp-');
  const { people } = useAppStore.getState();

  // Admin panel (org creation/linking) state
  const [adminOrgName, setAdminOrgName] = useState('');
  const [adminTargetDivisionId, setAdminTargetDivisionId] = useState<string>('');
  const [adminBusy, setAdminBusy] = useState(false);
  const [adminInfo, setAdminInfo] = useState<string>('');

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
      } catch (err) {
        console.error('Auth bootstrap failed:', err);
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

  // React 310 guard: keep hooks order stable and avoid null field access.
  const safeSelectedTask = selectedTask ?? ({
    id: 'temp-null',
    title: '',
    description: '',
    lane: 'red',
    assignee: '',
    due_date: '',
    order_rank: 0,
    tags: [],
    divisions: [],
    subtasks: [],
    links: [],
    files: [],
    notes: [],
    progress_state: 'not_started',
  } as any);

  // If no real task, render nothing (component stays mounted to keep hook order stable)
  if (!selectedTask) return null;

  const handleClose = () => {
    setTempSubtasks([]);
    setTempTags([]);
    setTempDivisions([]);
    setTempLinks([]);
    setNewSubtask('');
    setNewNote('');
    setNewAssignee('');
    setShowAssigneeInput(false);
    setEditingSubtask(null);
    setEditingSubtaskTitle('');
    setAdminOrgName('');
    setAdminTargetDivisionId('');
    setAdminInfo('');
    setSelectedTask(null);
  };

  const handleUpdate = async (updates: any) => {
    try {
      if (isNewTask) {
        updateTask(safeSelectedTask.id, updates);
      } else {
        await updateTaskData(safeSelectedTask.id, updates);
        updateTask(safeSelectedTask.id, updates);
      }
    } catch (e) {
      console.error('handleUpdate failed:', e);
    }
  };

  /* -----------------------------------------------------------------------------
     REGULAR TAGS (not divisions)
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
      const hasTag = safeSelectedTask.tags?.some((t: any) => t.id === tagId);
      if (hasTag) {
        await removeTagFromTask(safeSelectedTask.id, tagId);
        updateTask(safeSelectedTask.id, {
          tags: safeSelectedTask.tags?.filter((t: any) => t.id !== tagId),
        });
      } else {
        await addTagToTask(safeSelectedTask.id, tagId);
        const tag = tags.find((t) => t.id === tagId);
        if (tag) {
          updateTask(safeSelectedTask.id, {
            tags: [...(safeSelectedTask.tags || []), tag],
          });
        }
      }
    }
  };

  const handleCreateTag = async () => {
    if (!newTagName.trim()) return;
    try {
      const { data: tag, error } = await supabase
        .from('tags')
        .insert({ name: newTagName, color: newTagColor })
        .select()
        .single();
      if (error) throw error;
      const { addTag } = useAppStore.getState();
      addTag(tag);
      setNewTagName('');
      setNewTagColor('#3B82F6');
      setIsCreatingTag(false);
    } catch (error) {
      console.error('Error creating tag:', error);
    }
  };

  /* -----------------------------------------------------------------------------
     DIVISIONS (org-scoped)
  -----------------------------------------------------------------------------*/
  const filteredDivisions = useMemo<Division[]>(() => {
    if (isAdmin) return divisions || [];
    if (!userOrgTag) return [];
    return (divisions || []).filter((d) => d.organization_tag === userOrgTag);
  }, [divisions, isAdmin, userOrgTag]);

  const handleToggleDivision = async (divisionId: string) => {
    if (!isAdmin) {
      const div = (divisions || []).find((d) => d.id === divisionId);
      if (div && div.organization_tag !== userOrgTag) {
        console.warn('Blocked: cannot tag another organization division.');
        return;
      }
    }

    if (isNewTask) {
      const hasDivision = tempDivisions.some((d) => d.id === divisionId);
      if (hasDivision) {
        setTempDivisions(tempDivisions.filter((d) => d.id !== divisionId));
      } else {
        const division = (divisions || []).find((d) => d.id === divisionId);
        if (division) setTempDivisions([...tempDivisions, division]);
      }
    } else {
      const hasDivision = safeSelectedTask.divisions?.some((d: any) => d.id === divisionId);
      if (hasDivision) {
        await removeDivisionFromTask(safeSelectedTask.id, divisionId);
        updateTask(safeSelectedTask.id, {
          divisions: safeSelectedTask.divisions?.filter((d: any) => d.id !== divisionId),
        });
      } else {
        try {
          await addDivisionToTask(safeSelectedTask.id, divisionId);
          const division = (divisions || []).find((d) => d.id === divisionId);
          if (division) {
            updateTask(safeSelectedTask.id, {
              divisions: [...(safeSelectedTask.divisions || []), division],
            });
          }
        } catch (err) {
          console.error(err);
        }
      }
    }
  };

  const handleCreateDivision = async () => {
    if (!isAdmin) {
      alert('Only admins can create new divisions.');
      return;
    }
    if (!newDivisionName.trim()) return;
    try {
      const { data: division, error } = await supabase
        .from('divisions')
        .insert({
          name: newDivisionName,
          color: newDivisionColor,
          order_index: Date.now(),
        })
        .select()
        .single();
      if (error) throw error;
      const { addDivision } = useAppStore.getState();
      addDivision(division);
      setNewDivisionName('');
      setNewDivisionColor('#8B5CF6');
      setIsCreatingDivision(false);
    } catch (error) {
      console.error('Error creating division:', error);
    }
  };

  /* -----------------------------------------------------------------------------
     DISPLAY SHORTHANDS
  -----------------------------------------------------------------------------*/
  const displayTags = isNewTask ? tempTags : safeSelectedTask.tags || [];
  const displayDivisions = isNewTask ? tempDivisions : safeSelectedTask.divisions || [];
  const displaySubtasks = isNewTask ? tempSubtasks : safeSelectedTask.subtasks || [];
  const displayLinks = isNewTask ? tempLinks : safeSelectedTask.links || [];
  const displayFiles: UploadedFile[] = safeSelectedTask.files || [];

  /* -----------------------------------------------------------------------------
     SUBTASKS
  -----------------------------------------------------------------------------*/
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
      const maxOrderRank = safeSelectedTask.subtasks?.length
        ? Math.max(...safeSelectedTask.subtasks.map((st: any) => st.order_rank || 0))
        : 0;
      const subtask = await createSubtask(
        safeSelectedTask.id,
        newSubtask,
        maxOrderRank + 1000
      );
      updateTask(safeSelectedTask.id, {
        subtasks: [...(safeSelectedTask.subtasks || []), subtask],
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
      updateTask(safeSelectedTask.id, {
        subtasks: safeSelectedTask.subtasks?.map((st: any) =>
          st.id === id ? { ...st, ...updates } : st
        ),
      });
    }
    setEditingSubtask(null);
    setEditingSubtaskTitle('');
  };

  const handleDeleteSubtask = async (id: string) => {
    if (isNewTask) {
      setTempSubtasks(tempSubtasks.filter((st) => st.id !== id));
    } else {
      await deleteSubtask(id);
      updateTask(safeSelectedTask.id, {
        subtasks: safeSelectedTask.subtasks?.filter((st: any) => st.id !== id),
      });
    }
  };

  /* -----------------------------------------------------------------------------
     NOTES
  -----------------------------------------------------------------------------*/
  const handleAddNote = async () => {
    if (!newNote.trim() || isNewTask) return;
    const note = await createNote(safeSelectedTask.id, newNote);
    updateTask(safeSelectedTask.id, {
      notes: [...(safeSelectedTask.notes || []), note],
    });
    setNewNote('');
  };

  const handleUpdateNote = async (id: string, content: string) => {
    await updateNote(id, content);
    updateTask(safeSelectedTask.id, {
      notes: safeSelectedTask.notes?.map((n: any) =>
        n.id === id ? { ...n, content } : n
      ),
    });
  };

  const handleDeleteNote = async (id: string) => {
    await deleteNote(id);
    updateTask(safeSelectedTask.id, {
      notes: safeSelectedTask.notes?.filter((n: any) => n.id !== id),
    });
  };

  /* -----------------------------------------------------------------------------
     LINKS
  -----------------------------------------------------------------------------*/
  const handleAddLink = async () => {
    if (!newLinkLabel.trim() || !newLinkUrl.trim()) return;
    const newLink = { label: newLinkLabel.trim(), url: newLinkUrl.trim() };

    if (isNewTask) {
      setTempLinks([...tempLinks, newLink]);
    } else {
      const updated = [...(safeSelectedTask.links || []), newLink];
      await handleUpdate({ links: updated });
    }

    setNewLinkLabel('');
    setNewLinkUrl('');
  };

  const handleDeleteLink = async (idx: number) => {
    if (isNewTask) {
      setTempLinks(tempLinks.filter((_, i) => i !== idx));
    } else {
      const updated = (safeSelectedTask.links || []).filter((_, i) => i !== idx);
      await handleUpdate({ links: updated });
    }
  };

  /* -----------------------------------------------------------------------------
     FILE UPLOADS
  -----------------------------------------------------------------------------*/
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || !files.length) return;
    if (isNewTask) {
      alert('Save the task first to upload files.');
      return;
    }

    setUploadingFiles(true);
    const currentFiles: UploadedFile[] = safeSelectedTask.files || [];
    const uploadedFiles: UploadedFile[] = [...currentFiles];

    for (const file of Array.from(files)) {
      const path = `${safeSelectedTask.id}/${Date.now()}-${file.name}`;
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
        title: safeSelectedTask.title || 'New Task',
        description: safeSelectedTask.description,
        lane: safeSelectedTask.lane,
        assignee: safeSelectedTask.assignee,
        due_date: safeSelectedTask.due_date,
        order_rank: safeSelectedTask.order_rank,
      });

      // Regular tags (UI tags)
      for (const tag of tempTags) {
        await addTagToTask(newTask.id, tag.id);
      }

      // Divisions (org scoped)
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

      removeTask(safeSelectedTask.id);
      handleClose();
    } catch (error) {
      console.error('Error creating task:', error);
    }
  };

  const handleDeleteTask = async () => {
    if (isNewTask) {
      removeTask(safeSelectedTask.id);
      handleClose();
      return;
    }

    showDeleteConfirmation(
      'Delete Task',
      'Are you sure you want to delete this task? This action cannot be undone.',
      async () => {
        const taskId = safeSelectedTask.id;
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
     ADMIN: Organization ↔ Division linking tool
     - Rule:
       • If orgName equals an existing division name (e.g., "Hubbalicious"),
         mint a new organization_tag and LINK it to that EXISTING division.
       • If orgName is a new name (e.g., "Hubbalicious Sweet Shoppe"),
         create a NEW division with that name and then link a brand new
         organization_tag to that new division.
  -----------------------------------------------------------------------------*/
  const handleAdminAddOrgForDivision = async () => {
    if (!isAdmin) return;
    const name = adminOrgName.trim();
    if (!name) {
      setAdminInfo('Enter an organization name.');
      return;
    }
    setAdminBusy(true);
    setAdminInfo('');

    try {
      const existingDivision = (divisions || []).find(
        (d) => d.name.trim().toLowerCase() === name.toLowerCase()
      );

      let divisionIdToLink = adminTargetDivisionId || '';

      if (existingDivision) {
        divisionIdToLink = existingDivision.id;
      } else if (!divisionIdToLink) {
        const { data: newDiv, error: divErr } = await supabase
          .from('divisions')
          .insert({
            name,
            color: '#0ea5e9',
            order_index: Date.now(),
          })
          .select()
          .single();
        if (divErr) throw divErr;
        const { addDivision } = useAppStore.getState();
        addDivision(newDiv as any);
        divisionIdToLink = newDiv.id;
      }

      if (!divisionIdToLink) {
        setAdminInfo('Select a division to link or enter a same-name org.');
        setAdminBusy(false);
        return;
      }

      const { organization_tag } = await createOrganizationAndLinkToDivision(
        name,
        divisionIdToLink
      );

      setAdminInfo(`Created and linked org "${name}" → ${organization_tag}`);
      setAdminOrgName('');
      setAdminTargetDivisionId('');
    } catch (e: any) {
      console.error(e);
      setAdminInfo(e?.message || 'Failed to add organization.');
    } finally {
      setAdminBusy(false);
    }
  };

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
                  value={safeSelectedTask.title ?? ''}
                  onChange={(e) => handleUpdate({ title: e.target.value })}
                  className="w-full bg-transparent text-2xl font-bold outline-none placeholder-white/70"
                  placeholder="Task title"
                />
                {isAdmin ? (
                  <div className="mt-1 text-xs text-blue-100 flex items-center gap-2">
                    <ShieldCheck size={14} />
                    <span>Admin mode — tasks are admin-only until you add divisions.</span>
                  </div>
                ) : userOrgTag ? (
                  <div className="mt-1 text-xs text-blue-100 flex items-center gap-2">
                    <Building2 size={14} />
                    <span>Organization: {userOrgTag}</span>
                  </div>
                ) : null}
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
                value={safeSelectedTask.description ?? ''}
                onChange={(e) => handleUpdate({ description: e.target.value })}
                className="w-full px-4 py-3 rounded-lg border-2 border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                rows={4}
                placeholder="Add a description..."
              />
            </div>

            {/* Assignee & Due Date */}
            <div className="grid grid-cols-2 gap-4">
              {/* Assignee */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  <User size={16} className="inline mr-1" />
                  Assignee
                </label>
                {!showAssigneeInput ? (
                  <select
                    value={safeSelectedTask.assignee || ''}
                    onChange={(e) => {
                      if (e.target.value === '__new__') {
                        setShowAssigneeInput(true);
                      } else {
                        handleUpdate({ assignee: e.target.value });
                      }
                    }}
                    className="w-full px-4 h-10 rounded-lg border-2 border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none bg-white"
                  >
                    <option value="">Unassigned</option>
                    {people.map((person) => (
                      <option key={person.id} value={person.name}>
                        {person.name}
                      </option>
                    ))}
                    <option value="__new__">+ Add New Person</option>
                  </select>
                ) : (
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newAssignee}
                      onChange={(e) => setNewAssignee(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && newAssignee.trim() && (async () => {
                        const person = await createPerson(newAssignee);
                        const { addPerson } = useAppStore.getState();
                        addPerson(person);
                        handleUpdate({ assignee: newAssignee });
                        setNewAssignee('');
                        setShowAssigneeInput(false);
                      })()}
                      className="flex-1 px-4 h-10 rounded-lg border-2 border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Enter name..."
                      autoFocus
                    />
                    <button
                      onClick={async () => {
                        if (!newAssignee.trim()) return;
                        const person = await createPerson(newAssignee);
                        const { addPerson } = useAppStore.getState();
                        addPerson(person);
                        handleUpdate({ assignee: newAssignee });
                        setNewAssignee('');
                        setShowAssigneeInput(false);
                      }}
                      className="px-4 h-10 bg-blue-600 text-white rounded-lg border-2 border-blue-700 hover:bg-blue-700 transition-colors"
                    >
                      Add
                    </button>
                    <button
                      onClick={() => {
                        setShowAssigneeInput(false);
                        setNewAssignee('');
                      }}
                      className="px-4 h-10 bg-slate-200 text-slate-700 rounded-lg border-2 border-slate-300 hover:bg-slate-300 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </div>

              {/* Due Date */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  <Calendar size={16} className="inline mr-1" />
                  Due Date
                </label>
                <input
                  type="date"
                  value={(safeSelectedTask.due_date as string) || ''}
                  onChange={(e) => handleUpdate({ due_date: e.target.value || null })}
                  className="w-full px-4 h-10 rounded-lg border-2 border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Divisions (org-scoped) */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                <Layers size={16} className="inline mr-1" />
                Divisions
              </label>

              {isAdmin ? (
                <p className="text-xs text-slate-500 mb-2">
                  Admin can apply any division. Leaving all divisions empty keeps the task visible only to admin accounts.
                </p>
              ) : (
                <p className="text-xs text-slate-500 mb-2">
                  You can only add your organization’s divisions.
                </p>
              )}

              <div className="space-y-2">
                <div className="flex flex-wrap gap-2">
                  {((isAdmin ? divisions : filteredDivisions) || []).map((division) => {
                    const isSelected = displayDivisions.some((d) => d.id === division.id);
                    const isDisabled = !isAdmin && division.organization_tag !== userOrgTag;
                    return (
                      <button
                        key={division.id}
                        onClick={() => !isDisabled && handleToggleDivision(division.id)}
                        className={`px-3 py-1.5 rounded-full text-sm font-medium border-2 transition-all ${
                          isSelected
                            ? 'ring-2 ring-offset-1'
                            : 'opacity-60 hover:opacity-100'
                        } ${isDisabled ? 'cursor-not-allowed opacity-40' : ''}`}
                        style={{
                          backgroundColor: `${division.color}20`,
                          color: division.color,
                          borderColor: division.color,
                        }}
                        title={
                          isDisabled
                            ? 'Cannot select another organization’s division'
                            : division.organization_tag
                            ? `Org: ${division.organization_tag}`
                            : 'No organization set'
                        }
                      >
                        {division.name}
                      </button>
                    );
                  })}

                  {/* Division creation restricted to admin */}
                  {isAdmin && (
                    <button
                      onClick={() => setIsCreatingDivision(!isCreatingDivision)}
                      className="px-3 py-1.5 rounded-full text-sm font-medium border-2 border-slate-300 bg-slate-50 text-slate-700 hover:bg-slate-100 transition-all"
                    >
                      + Create Division
                    </button>
                  )}
                </div>

                {isCreatingDivision && isAdmin && (
                  <div className="flex flex-col gap-3 p-3 bg-slate-50 rounded-lg border-2 border-slate-200">
                    <div className="flex gap-2 items-center">
                      <input
                        type="text"
                        value={newDivisionName}
                        onChange={(e) => setNewDivisionName(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleCreateDivision()}
                        placeholder="Division name"
                        className="flex-1 px-3 h-10 rounded-lg border-2 border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <input
                        type="color"
                        value={newDivisionColor}
                        onChange={(e) => setNewDivisionColor(e.target.value)}
                        className="w-12 h-10 rounded cursor-pointer"
                      />
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={handleCreateDivision}
                        className="px-4 h-10 bg-violet-600 text-white rounded-lg border-2 border-violet-700 hover:bg-violet-700 transition-colors"
                      >
                        Create
                      </button>
                      <button
                        onClick={() => {
                          setIsCreatingDivision(false);
                          setNewDivisionName('');
                          setNewDivisionColor('#8B5CF6');
                        }}
                        className="px-4 h-10 bg-slate-200 text-slate-700 rounded-lg border-2 border-slate-300 hover:bg-slate-300 transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Tags (regular, non-division) */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                <Tag size={16} className="inline mr-1" />
                Tags
              </label>
              <div className="space-y-2">
                <div className="flex flex-wrap gap-2">
                  {tags.map((tag) => {
                    const isSelected = displayTags.some((t) => t.id === tag.id);
                    return (
                      <button
                        key={tag.id}
                        onClick={() => handleToggleTag(tag.id)}
                        className={`px-3 py-1.5 rounded-full text-sm font-medium border-2 transition-all ${
                          isSelected
                            ? 'ring-2 ring-offset-1'
                            : 'opacity-60 hover:opacity-100'
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
                  <button
                    onClick={() => setIsCreatingTag(!isCreatingTag)}
                    className="px-3 py-1.5 rounded-full text-sm font-medium border-2 border-slate-300 bg-slate-50 text-slate-700 hover:bg-slate-100 transition-all"
                  >
                    + Add Tag
                  </button>
                </div>
                {isCreatingTag && (
                  <div className="flex gap-2 items-center p-3 bg-slate-50 rounded-lg border-2 border-slate-200">
                    <input
                      type="text"
                      value={newTagName}
                      onChange={(e) => setNewTagName(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleCreateTag()}
                      placeholder="Tag name"
                      className="flex-1 px-3 h-10 rounded-lg border-2 border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <input
                      type="color"
                      value={newTagColor}
                      onChange={(e) => setNewTagColor(e.target.value)}
                      className="w-12 h-10 rounded cursor-pointer"
                    />
                    <button
                      onClick={handleCreateTag}
                      className="px-4 h-10 bg-blue-600 text-white rounded-lg border-2 border-blue-700 hover:bg-blue-700 transition-colors"
                    >
                      Create
                    </button>
                    <button
                      onClick={() => {
                        setIsCreatingTag(false);
                        setNewTagName('');
                        setNewTagColor('#3B82F6');
                      }}
                      className="px-4 h-10 bg-slate-200 text-slate-700 rounded-lg border-2 border-slate-300 hover:bg-slate-300 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Progress State */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Progress State
              </label>
              <select
                value={safeSelectedTask.progress_state}
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
                {
                  displaySubtasks.filter((st) => st.progress_state === 'completed')
                    .length
                }
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
                    {editingSubtask === subtask.id ? (
                      <input
                        type="text"
                        value={editingSubtaskTitle}
                        onChange={(e) => setEditingSubtaskTitle(e.target.value)}
                        onBlur={() => {
                          if (editingSubtaskTitle.trim()) {
                            handleUpdateSubtask(subtask.id, {
                              title: editingSubtaskTitle.trim(),
                            });
                          } else {
                            setEditingSubtask(null);
                            setEditingSubtaskTitle('');
                          }
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            if (editingSubtaskTitle.trim()) {
                              handleUpdateSubtask(subtask.id, {
                                title: editingSubtaskTitle.trim(),
                              });
                            } else {
                              setEditingSubtask(null);
                              setEditingSubtaskTitle('');
                            }
                          }
                        }}
                        className="flex-1 px-2 py-1 bg-white border border-slate-300 rounded outline-none focus:ring-2 focus:ring-blue-500"
                        autoFocus
                      />
                    ) : (
                      <>
                        <span className="flex-1">{subtask.title}</span>
                        <button
                          onClick={() => {
                            setEditingSubtask(subtask.id);
                            setEditingSubtaskTitle(subtask.title);
                          }}
                          className="p-1 hover:bg-blue-100 rounded text-blue-600"
                        >
                          <Edit2 size={14} />
                        </button>
                      </>
                    )}
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
                  {safeSelectedTask.notes?.map((note: any) => (
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

            {/* -----------------------------------------------------------------
                ADMIN PANEL — add organization & link to divisions
               ----------------------------------------------------------------- */}
            {isAdmin && (
              <div className="mt-6 p-4 rounded-xl border-2 border-slate-200 bg-slate-50">
                <div className="flex items-center gap-2 mb-3">
                  <LinkIcon size={18} className="text-slate-600" />
                  <h3 className="text-sm font-semibold text-slate-700">
                    Organization Linking (Admin)
                  </h3>
                </div>

                <p className="text-xs text-slate-600 mb-3">
                  Rule: If the organization name matches an existing division name (e.g., <b>Hubbalicious</b>), a new organization tag is created and linked to that <em>same</em> division. Otherwise a new division is created using the organization name and then linked to a new organization tag (e.g., <b>Hubbalicious Sweet Shoppe</b>).
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-medium text-slate-700">
                      Organization name
                    </label>
                    <input
                      value={adminOrgName}
                      onChange={(e) => setAdminOrgName(e.target.value)}
                      placeholder="e.g. Hubbalicious"
                      className="px-3 h-10 rounded-lg border-2 border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-medium text-slate-700">
                      Target division (optional)
                    </label>
                    <select
                      value={adminTargetDivisionId}
                      onChange={(e) => setAdminTargetDivisionId(e.target.value)}
                      className="px-3 h-10 rounded-lg border-2 border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                    >
                      <option value="">Auto (use same-name division or create new)</option>
                      {(divisions || []).map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.name} {d.organization_tag ? `— ${d.organization_tag}` : '— (no org)'}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="flex gap-2 mt-3">
                  <button
                    onClick={handleAdminAddOrgForDivision}
                    disabled={adminBusy}
                    className="px-4 h-10 bg-blue-600 text-white rounded-lg border-2 border-blue-700 hover:bg-blue-700 transition-colors disabled:opacity-60"
                  >
                    {adminBusy ? 'Linking…' : 'Add Organization & Link'}
                  </button>
                  {adminInfo && (
                    <div className="text-xs text-slate-600 self-center">
                      {adminInfo}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
