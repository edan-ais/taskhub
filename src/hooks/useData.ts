import { useEffect, useCallback, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAppStore } from '../lib/store';
import type {
  Task,
  Division,
  Tag,
  Idea,
  Lane,
  InboundEmail,
} from '../lib/types';

/* -------------------------------------------------------------------------- */
/*                               HELPER FUNCTION                              */
/* -------------------------------------------------------------------------- */
export async function getOrgTagForUser(): Promise<string | null> {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    console.warn('⚠️ No user session found.');
    return null;
  }

  // Try by user_id first
  let { data: profile, error } = await supabase
    .from('profiles')
    .select('organization_tag, email')
    .eq('user_id', user.id)
    .maybeSingle();

  // Fallback to email if no result
  if ((!profile || !profile.organization_tag) && user.email) {
    const { data: emailMatch } = await supabase
      .from('profiles')
      .select('organization_tag')
      .eq('email', user.email)
      .maybeSingle();
    profile = emailMatch;
  }

  if (error) console.warn('Error fetching organization tag:', error.message);
  console.log('✅ getOrgTagForUser found:', profile?.organization_tag);

  return profile?.organization_tag || null;
}

/* -------------------------------------------------------------------------- */
/*                                  useData                                   */
/* -------------------------------------------------------------------------- */
export function useData() {
  const {
    setTasks,
    setDivisions,
    setTags,
    setIdeas,
    setPeople,
    setEmails,
    removeTask,
  } = useAppStore();

  const [isLoading, setIsLoading] = useState(true);
  const [userOrgTag, setUserOrgTag] = useState<string | null>(null);

  /* ----------------------------- FETCH USER TAG ---------------------------- */
  const fetchUserOrgTag = useCallback(async () => {
    const tag = await getOrgTagForUser();
    setUserOrgTag(tag);
    return tag;
  }, []);

  /* --------------------------- TASK DEDUPLICATION -------------------------- */
  function deduplicateTasks(tasks: Task[]): Task[] {
    const uniqueMap = new Map<string, Task>();

    for (const task of tasks) {
      const key = `${task.title?.trim().toLowerCase() || ''}|${
        task.description?.trim().toLowerCase() || ''
      }`;

      const existing = uniqueMap.get(key);

      if (!existing) {
        uniqueMap.set(key, task);
      } else {
        const currentScore =
          (existing.tags?.length || 0) +
          (existing.divisions?.length || 0) +
          (existing.subtasks?.length || 0) +
          (existing.notes?.length || 0);

        const newScore =
          (task.tags?.length || 0) +
          (task.divisions?.length || 0) +
          (task.subtasks?.length || 0) +
          (task.notes?.length || 0);

        if (newScore > currentScore) {
          uniqueMap.set(key, task);
        }
      }
    }

    return Array.from(uniqueMap.values());
  }

  /* ------------------------------ FETCH TASKS ----------------------------- */
  const fetchTasks = useCallback(async () => {
    try {
      const orgTag = userOrgTag || (await fetchUserOrgTag());
      if (!orgTag) {
        console.warn('⚠️ No organization tag found. Skipping task load.');
        setTasks([]);
        return;
      }

      const isAdminOrg = orgTag === 'WW529400';
      const query = supabase
        .from('tasks')
        .select(
          `
          *,
          tags:task_tags(tag:tags(*)),
          divisions:task_divisions(division:divisions(*)),
          subtasks(*),
          notes(*)
        `
        )
        .order('order_rank', { ascending: true });

      if (!isAdminOrg) query.eq('organization_tag', orgTag);

      const { data: tasks, error } = await query;
      if (error) throw error;

      const formattedTasks: Task[] = (tasks || []).map((task: any) =>
        formatTask(task)
      );

      const uniqueTasks = deduplicateTasks(formattedTasks);
      setTasks(uniqueTasks);
    } catch (err) {
      console.error('❌ Error fetching tasks:', err);
    }
  }, [setTasks, userOrgTag, fetchUserOrgTag]);

  /* ----------------------------- FETCH DIVISIONS ---------------------------- */
  const fetchDivisions = useCallback(async () => {
    const { data, error } = await supabase
      .from('divisions')
      .select('*')
      .order('order_index', { ascending: true });

    if (error) {
      console.error('❌ Error fetching divisions:', error);
      return;
    }

    setDivisions(data || []);
  }, [setDivisions]);

  /* ------------------------------- FETCH TAGS ------------------------------ */
  const fetchTags = useCallback(async () => {
    const { data, error } = await supabase
      .from('tags')
      .select('*')
      .order('order_index', { ascending: true });

    if (error) {
      console.error('❌ Error fetching tags:', error);
      return;
    }

    setTags(data || []);
  }, [setTags]);

  /* ------------------------------ FETCH IDEAS ------------------------------ */
  const fetchIdeas = useCallback(async () => {
    const orgTag = userOrgTag || (await fetchUserOrgTag());
    const isAdminOrg = orgTag === 'WW529400';

    const query = supabase
      .from('ideas')
      .select(
        `
        *,
        tags:idea_tags(tag:tags(*))
      `
      )
      .order('created_at', { ascending: false });

    if (!isAdminOrg) query.eq('organization_tag', orgTag);

    const { data: ideas, error } = await query;
    if (error) {
      console.error('❌ Error fetching ideas:', error);
      return;
    }

    const formattedIdeas: Idea[] = (ideas || []).map((idea: any) => ({
      ...idea,
      tags: idea.tags?.map((t: any) => t.tag) || [],
    }));

    setIdeas(formattedIdeas);
  }, [setIdeas, userOrgTag, fetchUserOrgTag]);

  /* ------------------------------ FETCH PEOPLE ----------------------------- */
  const fetchPeople = useCallback(async () => {
    const { data, error } = await supabase
      .from('people')
      .select('*')
      .order('name', { ascending: true });

    if (error) {
      console.error('❌ Error fetching people:', error);
      return;
    }

    setPeople(data || []);
  }, [setPeople]);

  /* ------------------------------ FETCH EMAILS ----------------------------- */
  const fetchEmails = useCallback(async () => {
    const { data: emails, error } = await supabase
      .from('inbound_emails')
      .select(
        `
        *,
        attachments:email_attachments(*)
      `
      )
      .order('received_at', { ascending: false });

    if (error) {
      console.error('❌ Error fetching emails:', error);
      return;
    }

    const formattedEmails: InboundEmail[] = (emails || []).map((email: any) => ({
      ...email,
      attachments: email.attachments || [],
    }));

    setEmails(formattedEmails);
  }, [setEmails]);

  /* ------------------------------ LIVE CHANNELS ---------------------------- */
  useEffect(() => {
    const loadAllData = async () => {
      setIsLoading(true);
      await fetchUserOrgTag();
      await Promise.all([
        fetchTasks(),
        fetchDivisions(),
        fetchTags(),
        fetchIdeas(),
        fetchPeople(),
        fetchEmails(),
      ]);
      setIsLoading(false);
    };

    loadAllData();

    const tasksChannel = supabase
      .channel('tasks-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, fetchTasks)
      .subscribe();

    const tagsChannel = supabase
      .channel('tags-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tags' }, fetchTags)
      .subscribe();

    const divisionsChannel = supabase
      .channel('divisions-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'divisions' }, fetchDivisions)
      .subscribe();

    const ideasChannel = supabase
      .channel('ideas-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ideas' }, fetchIdeas)
      .subscribe();

    const peopleChannel = supabase
      .channel('people-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'people' }, fetchPeople)
      .subscribe();

    const emailsChannel = supabase
      .channel('emails-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'inbound_emails' }, fetchEmails)
      .subscribe();

    return () => {
      tasksChannel.unsubscribe();
      tagsChannel.unsubscribe();
      divisionsChannel.unsubscribe();
      ideasChannel.unsubscribe();
      peopleChannel.unsubscribe();
      emailsChannel.unsubscribe();
    };
  }, [
    fetchTasks,
    fetchDivisions,
    fetchTags,
    fetchIdeas,
    fetchPeople,
    fetchEmails,
    fetchUserOrgTag,
    removeTask,
  ]);

  return {
    fetchTasks,
    fetchDivisions,
    fetchTags,
    fetchIdeas,
    fetchPeople,
    fetchEmails,
    isLoading,
  };
}

/* -------------------------------------------------------------------------- */
/*                             TASK CRUD OPERATIONS                           */
/* -------------------------------------------------------------------------- */

export async function createTask(data: {
  title: string;
  description?: string;
  lane?: Lane;
  assignee?: string;
  due_date?: string | null;
  order_rank?: number;
}) {
  const orgTag = await getOrgTagForUser();

  const { data: task, error } = await supabase
    .from('tasks')
    .insert({
      title: data.title,
      description: data.description || '',
      lane: data.lane || 'red',
      assignee: data.assignee || '',
      due_date: data.due_date || null,
      order_rank: data.order_rank || Date.now(),
      organization_tag: orgTag,
    })
    .select(
      `
      *,
      tags:task_tags(tag:tags(*)),
      divisions:task_divisions(division:divisions(*)),
      subtasks(*),
      notes(*)
    `
    )
    .single();

  if (error) throw error;

  await supabase.from('event_log').insert({
    entity_type: 'task',
    entity_id: task.id,
    action: 'created',
    changes: { task },
  });

  return formatTask(task);
}

export async function updateTaskData(id: string, updates: Partial<Task>) {
  const { error } = await supabase
    .from('tasks')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id);

  if (error) throw error;

  await supabase.from('event_log').insert({
    entity_type: 'task',
    entity_id: id,
    action: 'updated',
    changes: updates,
  });
}

export async function deleteTask(id: string) {
  const { error } = await supabase.from('tasks').delete().eq('id', id);
  if (error) throw error;

  await supabase.from('event_log').insert({
    entity_type: 'task',
    entity_id: id,
    action: 'deleted',
    changes: {},
  });
}

export async function moveTask(id: string, lane: Lane, order_rank: number) {
  const updates: any = {
    lane,
    order_rank,
    updated_at: new Date().toISOString(),
  };

  if (lane === 'green') {
    updates.completed_at = new Date().toISOString();
    updates.progress_state = 'completed';
  }

  const { error } = await supabase.from('tasks').update(updates).eq('id', id);
  if (error) throw error;

  await supabase.from('event_log').insert({
    entity_type: 'task',
    entity_id: id,
    action: 'moved',
    changes: { lane, order_rank },
  });
}

/* -------------------------------------------------------------------------- */
/*                           TAG/TASK LINKING HELPERS                         */
/* -------------------------------------------------------------------------- */

export async function addTagToTask(taskId: string, tagId: string) {
  const { error } = await supabase
    .from('task_tags')
    .insert({ task_id: taskId, tag_id: tagId });
  if (error) throw error;

  await supabase.from('event_log').insert({
    entity_type: 'task',
    entity_id: taskId,
    action: 'tagged',
    changes: { tag_id: tagId },
  });
}

export async function removeTagFromTask(taskId: string, tagId: string) {
  const { error } = await supabase
    .from('task_tags')
    .delete()
    .eq('task_id', taskId)
    .eq('tag_id', tagId);
  if (error) throw error;

  await supabase.from('event_log').insert({
    entity_type: 'task',
    entity_id: taskId,
    action: 'untagged',
    changes: { tag_id: tagId },
  });
}

/* -------------------------------------------------------------------------- */
/*                         DIVISION/TASK LINKING HELPERS                      */
/* -------------------------------------------------------------------------- */

export async function addDivisionToTask(taskId: string, divisionId: string) {
  const { error } = await supabase
    .from('task_divisions')
    .insert({ task_id: taskId, division_id: divisionId });
  if (error) throw error;

  await supabase.from('event_log').insert({
    entity_type: 'task',
    entity_id: taskId,
    action: 'division_added',
    changes: { division_id: divisionId },
  });
}

export async function removeDivisionFromTask(taskId: string, divisionId: string) {
  const { error } = await supabase
    .from('task_divisions')
    .delete()
    .eq('task_id', taskId)
    .eq('division_id', divisionId);
  if (error) throw error;

  await supabase.from('event_log').insert({
    entity_type: 'task',
    entity_id: taskId,
    action: 'division_removed',
    changes: { division_id: divisionId },
  });
}

/* -------------------------------------------------------------------------- */
/*                               SUBTASKS CRUD                                */
/* -------------------------------------------------------------------------- */

export async function createSubtask(
  taskId: string,
  title: string,
  order_rank?: number
) {
  const { data: subtask, error } = await supabase
    .from('subtasks')
    .insert({
      task_id: taskId,
      title,
      order_rank: order_rank || Date.now(),
    })
    .select()
    .single();

  if (error) throw error;
  return subtask;
}

export async function updateSubtask(id: string, updates: any) {
  const { error } = await supabase
    .from('subtasks')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw error;
}

export async function deleteSubtask(id: string) {
  const { error } = await supabase.from('subtasks').delete().eq('id', id);
  if (error) throw error;
}

/* -------------------------------------------------------------------------- */
/*                                 NOTES CRUD                                 */
/* -------------------------------------------------------------------------- */

export async function createNote(taskId: string, content: string) {
  const { data: note, error } = await supabase
    .from('notes')
    .insert({ task_id: taskId, content })
    .select()
    .single();

  if (error) throw error;
  return note;
}

export async function updateNote(id: string, content: string) {
  const { error } = await supabase
    .from('notes')
    .update({ content, updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw error;
}

export async function deleteNote(id: string) {
  const { error } = await supabase.from('notes').delete().eq('id', id);
  if (error) throw error;
}

/* -------------------------------------------------------------------------- */
/*                             TAG & DIVISION CRUD                            */
/* -------------------------------------------------------------------------- */

export async function createTag(name: string, color: string) {
  const { data, error } = await supabase
    .from('tags')
    .insert({ name, color, order_index: Date.now() })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateTagData(id: string, updates: Partial<Tag>) {
  const { error } = await supabase
    .from('tags')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw error;
}

export async function deleteTag(id: string) {
  const { error } = await supabase.from('tags').delete().eq('id', id);
  if (error) throw error;
}

export async function createDivision(name: string, color: string) {
  const { data, error } = await supabase
    .from('divisions')
    .insert({ name, color, order_index: Date.now() })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateDivisionData(
  id: string,
  updates: Partial<Division>
) {
  const { error } = await supabase
    .from('divisions')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw error;
}

export async function deleteDivision(id: string) {
  const { error } = await supabase.from('divisions').delete().eq('id', id);
  if (error) throw error;
}

/* -------------------------------------------------------------------------- */
/*                                 PEOPLE CRUD                                */
/* -------------------------------------------------------------------------- */

export async function createPerson(name: string, email?: string) {
  const { data: person, error } = await supabase
    .from('people')
    .insert({ name, email: email || null })
    .select()
    .single();

  if (error) throw error;
  return person;
}

export async function updatePersonData(
  id: string,
  updates: { name?: string; email?: string }
) {
  const { error } = await supabase
    .from('people')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw error;
}

export async function deletePerson(id: string) {
  const { error } = await supabase.from('people').delete().eq('id', id);
  if (error) throw error;
}

/* -------------------------------------------------------------------------- */
/*                                 IDEA CRUD                                  */
/* -------------------------------------------------------------------------- */

export async function updateIdeaData(id: string, updates: Partial<Idea>) {
  const { error } = await supabase
    .from('ideas')
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
      attachments: updates.attachments || [],
      links: updates.links || [],
      tag_ids: updates.tag_ids || [],
      submitted_by: updates.submitted_by || null,
      directed_to: updates.directed_to || null,
    })
    .eq('id', id);

  if (error) throw error;

  await supabase.from('event_log').insert({
    entity_type: 'idea',
    entity_id: id,
    action: 'updated',
    changes: updates,
  });
}

export async function deleteIdea(id: string) {
  const { error } = await supabase.from('ideas').delete().eq('id', id);
  if (error) throw error;

  await supabase.from('event_log').insert({
    entity_type: 'idea',
    entity_id: id,
    action: 'deleted',
    changes: {},
  });
}

/* -------------------------------------------------------------------------- */
/*                                   HELPERS                                  */
/* -------------------------------------------------------------------------- */

function formatTask(task: any): Task {
  return {
    ...task,
    tags: task.tags?.map((t: any) => t.tag) || [],
    divisions: task.divisions?.map((d: any) => d.division) || [],
    subtasks: task.subtasks || [],
    notes: task.notes || [],
  };
}
