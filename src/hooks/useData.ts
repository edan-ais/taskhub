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

  /* ------------------------------ FETCH TASKS ----------------------------- */
  const fetchTasks = useCallback(async () => {
    const { data: tasks, error } = await supabase
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

    if (error) {
      console.error('Error fetching tasks:', error);
      return;
    }

    const formattedTasks: Task[] = (tasks || []).map((task: any) => formatTask(task));
    setTasks(formattedTasks);
  }, [setTasks]);

  /* ----------------------------- FETCH DIVISIONS ---------------------------- */
  const fetchDivisions = useCallback(async () => {
    const { data, error } = await supabase
      .from('divisions')
      .select('*')
      .order('order_index', { ascending: true });

    if (error) {
      console.error('Error fetching divisions:', error);
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
      console.error('Error fetching tags:', error);
      return;
    }

    setTags(data || []);
  }, [setTags]);

  /* ------------------------------ FETCH IDEAS ------------------------------ */
  const fetchIdeas = useCallback(async () => {
    const { data: ideas, error } = await supabase
      .from('ideas')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching ideas:', error);
      return;
    }

    const formattedIdeas: Idea[] = (ideas || []).map((idea: any) => ({
      ...idea,
      attachments: idea.attachments || [],
      links: idea.links || [],
      tag_ids: idea.tag_ids || [],
    }));

    setIdeas(formattedIdeas);
  }, [setIdeas]);

  /* ------------------------------ FETCH PEOPLE ----------------------------- */
  const fetchPeople = useCallback(async () => {
    const { data, error } = await supabase
      .from('people')
      .select('*')
      .order('name', { ascending: true });

    if (error) {
      console.error('Error fetching people:', error);
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
      console.error('Error fetching emails:', error);
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
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'tasks' }, fetchTasks)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'tasks' }, fetchTasks)
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'tasks' }, (payload) => {
        removeTask(payload.old.id);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'subtasks' }, fetchTasks)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notes' }, fetchTasks)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'task_tags' }, fetchTasks)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'task_divisions' }, fetchTasks)
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
  }, [fetchTasks, fetchDivisions, fetchTags, fetchIdeas, fetchPeople, fetchEmails, removeTask]);

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
/*                                 IDEA CRUD                                  */
/* -------------------------------------------------------------------------- */

export async function createIdea(data: {
  title: string;
  description?: string;
  attachments?: string[];
  links?: string[];
  tag_ids?: string[];
  submitted_by?: string | null;
  directed_to?: string | null;
  converted_to_task_id?: string | null;
}) {
  const { data: idea, error } = await supabase
    .from('ideas')
    .insert({
      title: data.title,
      description: data.description || '',
      attachments: data.attachments || [],
      links: data.links || [],
      tag_ids: data.tag_ids || [],
      submitted_by: data.submitted_by || null,
      directed_to: data.directed_to || null,
      converted_to_task_id: data.converted_to_task_id || null,
    })
    .select('*')
    .single();

  if (error) throw error;

  await supabase.from('event_log').insert({
    entity_type: 'idea',
    entity_id: idea.id,
    action: 'created',
    changes: { idea },
  });

  return {
    ...idea,
    attachments: idea.attachments || [],
    links: idea.links || [],
    tag_ids: idea.tag_ids || [],
  };
}

export async function updateIdeaData(id: string, updates: Partial<Idea>) {
  const { error } = await supabase
    .from('ideas')
    .update({ ...updates, updated_at: new Date().toISOString() })
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
