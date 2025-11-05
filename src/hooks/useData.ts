import { useEffect, useCallback, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAppStore } from '../lib/store';
import type { Task, Division, Tag, Idea, Lane, Person, InboundEmail } from '../lib/types';

export function useData() {
  const { setTasks, setDivisions, setTags, setIdeas, setPeople, setEmails, updateTask, addTask, removeTask } = useAppStore();
  const [isLoading, setIsLoading] = useState(true);

  const fetchTasks = useCallback(async () => {
    const { data: tasks, error } = await supabase
      .from('tasks')
      .select(`
        *,
        tags:task_tags(tag:tags(*)),
        divisions:task_divisions(division:divisions(*)),
        subtasks(*),
        notes(*)
      `)
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

  const fetchDivisions = useCallback(async () => {
    const { data, error } = await supabase
      .from('divisions')
      .select('*')
      .order('name', { ascending: true });

    if (error) {
      console.error('Error fetching divisions:', error);
      return;
    }

    setDivisions(data || []);
  }, [setDivisions]);

  const fetchTags = useCallback(async () => {
    const { data, error } = await supabase
      .from('tags')
      .select('*')
      .order('name', { ascending: true });

    if (error) {
      console.error('Error fetching tags:', error);
      return;
    }

    setTags(data || []);
  }, [setTags]);

  const fetchIdeas = useCallback(async () => {
    const { data: ideas, error } = await supabase
      .from('ideas')
      .select(`
        *,
        tags:idea_tags(tag:tags(*))
      `)
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

  const fetchEmails = useCallback(async () => {
    const { data: emails, error } = await supabase
      .from('inbound_emails')
      .select(`
        *,
        attachments:email_attachments(*)
      `)
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

  useEffect(() => {
    const loadAllData = async () => {
      setIsLoading(true);
      await Promise.all([
        fetchTasks(),
        fetchDivisions(),
        fetchTags(),
        fetchIdeas(),
        fetchPeople(),
        fetchEmails()
      ]);
      setIsLoading(false);
    };

    loadAllData();

    const tasksChannel = supabase
      .channel('tasks-changes')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'tasks' }, () => {
        fetchTasks();
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'tasks' }, () => {
        fetchTasks();
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'tasks' }, (payload) => {
        removeTask(payload.old.id);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'subtasks' }, () => {
        fetchTasks();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notes' }, () => {
        fetchTasks();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'task_tags' }, () => {
        fetchTasks();
      })
      .subscribe();

    const ideasChannel = supabase
      .channel('ideas-changes')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'ideas' }, () => {
        fetchIdeas();
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'ideas' }, () => {
        fetchIdeas();
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'ideas' }, () => {
        fetchIdeas();
      })
      .subscribe();

    const peopleChannel = supabase
      .channel('people-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'people' }, () => {
        fetchPeople();
      })
      .subscribe();

    const tagsChannel = supabase
      .channel('tags-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tags' }, () => {
        fetchTags();
      })
      .subscribe();

    const emailsChannel = supabase
      .channel('emails-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'inbound_emails' }, () => {
        fetchEmails();
      })
      .subscribe();

    return () => {
      tasksChannel.unsubscribe();
      ideasChannel.unsubscribe();
      peopleChannel.unsubscribe();
      tagsChannel.unsubscribe();
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
    .select(`
      *,
      tags:task_tags(tag:tags(*)),
      divisions:task_divisions(division:divisions(*)),
      subtasks(*),
      notes(*)
    `)
    .single();

  if (error) throw error;

  supabase.from('event_log').insert({
    entity_type: 'task',
    entity_id: task.id,
    action: 'created',
    changes: { task },
  });

  return {
    ...task,
    tags: task.tags?.map((t: any) => t.tag) || [],
    divisions: task.divisions?.map((d: any) => d.division) || [],
    subtasks: task.subtasks || [],
    notes: task.notes || [],
  };
}

export async function updateTaskData(id: string, updates: Partial<Task>) {
  const { error } = await supabase
    .from('tasks')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id);

  if (error) throw error;

  supabase.from('event_log').insert({
    entity_type: 'task',
    entity_id: id,
    action: 'updated',
    changes: updates,
  });
}

export async function deleteTask(id: string) {
  const { error } = await supabase.from('tasks').delete().eq('id', id);

  if (error) throw error;

  supabase.from('event_log').insert({
    entity_type: 'task',
    entity_id: id,
    action: 'deleted',
    changes: {},
  });
}

export async function moveTask(id: string, lane: Lane, order_rank: number) {
  const updates: any = { lane, order_rank, updated_at: new Date().toISOString() };

  if (lane === 'green') {
    updates.completed_at = new Date().toISOString();
    updates.progress_state = 'completed';
  }

  const { error } = await supabase.from('tasks').update(updates).eq('id', id);

  if (error) throw error;

  supabase.from('event_log').insert({
    entity_type: 'task',
    entity_id: id,
    action: 'moved',
    changes: { lane, order_rank },
  });
}

export async function createIdea(data: { title: string; description?: string }) {
  const { data: idea, error } = await supabase
    .from('ideas')
    .insert({
      title: data.title,
      description: data.description || '',
    })
    .select()
    .single();

  if (error) throw error;

  await supabase.from('event_log').insert({
    entity_type: 'idea',
    entity_id: idea.id,
    action: 'created',
    changes: { idea },
  });

  return idea;
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

  supabase.from('event_log').insert({
    entity_type: 'idea',
    entity_id: id,
    action: 'deleted',
    changes: {},
  });
}

export async function addTagToTask(taskId: string, tagId: string) {
  const { error } = await supabase.from('task_tags').insert({ task_id: taskId, tag_id: tagId });

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

export async function createSubtask(taskId: string, title: string, order_rank?: number) {
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
