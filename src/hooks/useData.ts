import { useEffect, useCallback, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAppStore } from '../lib/store';
import type {
  Task,
  Division,
  Tag,
  Idea,
  Lane,
  Person,
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
    updateTask,
    addTask,
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

    const formattedTasks: Task[] = (tasks || []).map((task: any) => ({
      ...task,
      tags: task.tags?.map((t: any) => t.tag) || [],
      divisions: task.divisions?.map((d: any) => d.division) || [],
      subtasks: task.subtasks || [],
      notes: task.notes || [],
    }));

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
      .select(
        `
        *,
        tags:idea_tags(tag:tags(*))
      `
      )
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching ideas:', error);
      return;
    }

    const formattedIdeas: Idea[] = (ideas || []).map((idea: any) => ({
      ...idea,
      tags: idea.tags?.map((t: any) => t.tag) || [],
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

    const channels = [
      supabase
        .channel('tasks')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, fetchTasks)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'subtasks' }, fetchTasks)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'task_tags' }, fetchTasks)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'task_divisions' }, fetchTasks)
        .subscribe(),

      supabase
        .channel('tags')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'tags' }, fetchTags)
        .subscribe(),

      supabase
        .channel('divisions')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'divisions' }, fetchDivisions)
        .subscribe(),

      supabase
        .channel('ideas')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'ideas' }, fetchIdeas)
        .subscribe(),

      supabase
        .channel('people')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'people' }, fetchPeople)
        .subscribe(),

      supabase
        .channel('emails')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'inbound_emails' }, fetchEmails)
        .subscribe(),
    ];

    return () => channels.forEach((c) => c.unsubscribe());
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
  const { data: task, error } = await supabase
    .from('tasks')
    .insert({
      title: data.title,
      description: data.description || '',
      lane: data.lane || 'red',
      assignee: data.assignee || '',
      due_date: data.due_date || null,
      order_rank: data.order_rank || Date.now(),
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
  return formatTask(task);
}

export async function updateTaskData(id: string, updates: Partial<Task>) {
  const { error } = await supabase
    .from('tasks')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw error;
}

export async function deleteTask(id: string) {
  const { error } = await supabase.from('tasks').delete().eq('id', id);
  if (error) throw error;
}

export async function moveTask(id: string, lane: Lane, order_rank: number) {
  const updates: any = { lane, order_rank, updated_at: new Date().toISOString() };
  if (lane === 'green') {
    updates.completed_at = new Date().toISOString();
    updates.progress_state = 'completed';
  }
  const { error } = await supabase.from('tasks').update(updates).eq('id', id);
  if (error) throw error;
}

/* -------------------------------------------------------------------------- */
/*                             SUBTASK & NOTES CRUD                           */
/* -------------------------------------------------------------------------- */

export async function updateSubtask(id: string, updates: any) {
  const { error } = await supabase
    .from('subtasks')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id);
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

export async function updateDivisionData(id: string, updates: Partial<Division>) {
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

export async function updatePersonData(id: string, updates: { name?: string; email?: string }) {
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
