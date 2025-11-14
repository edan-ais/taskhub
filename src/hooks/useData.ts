import { useEffect, useCallback, useMemo, useRef, useState } from "react";
import { supabase } from "../lib/supabase";
import { useAppStore } from "../lib/store";
import type {
  Task,
  Division,
  Tag,
  Idea,
  Lane,
  InboundEmail,
  Subtask as SubtaskType,
  Note as NoteType,
} from "../lib/types";

/* ---------------------------------- Consts --------------------------------- */

const ADMIN_ORG_TAG = "WW529400";

/* ------------------------------- Type helpers ------------------------------ */

type UUID = string;

type Maybe<T> = T | null | undefined;

type DeepTask = Task & {
  divisions?: Array<{ division: Division }>;
  tags?: Array<{ tag: Tag }>;
  subtasks?: SubtaskType[];
  notes?: NoteType[];
};

type DeepIdea = Idea & {
  tags?: Array<{ tag: Tag }>;
};

type FetchState = {
  isLoading: boolean;
  lastLoadedAt?: number;
};

/* ------------------------------ Narrowing utils ---------------------------- */

const isArray = (v: any): v is any[] => Array.isArray(v);
const isObj = (v: any): v is Record<string, any> =>
  v !== null && typeof v === "object";

/* ---------------------------- Safe format mappers -------------------------- */

function safeFormatTask(task: any): Task {
  const rawTags = isArray(task?.tags) ? task.tags : [];
  const rawDivisions = isArray(task?.divisions) ? task.divisions : [];
  const subtasks = isArray(task?.subtasks) ? task.subtasks : [];
  const notes = isArray(task?.notes) ? task.notes : [];
  const files = isArray(task?.files) ? task.files : [];

  return {
    ...task,
    tags: rawTags
      .map((t: any) => (t?.tag ? t.tag : t))
      .filter(Boolean),
    divisions: rawDivisions
      .map((d: any) => (d?.division ? d.division : d))
      .filter(Boolean),
    subtasks,
    notes,
    files,
  };
}

function safeFormatIdea(idea: any): Idea {
  const rawTags = isArray(idea?.tags) ? idea.tags : [];
  return {
    ...idea,
    tags: rawTags.map((t: any) => (t?.tag ? t.tag : t)).filter(Boolean),
  };
}

/* ----------------------------- Tenant utilities ---------------------------- */

async function getCurrentUserAndOrg(): Promise<{
  user: any | null;
  orgTag: string | null;
  isAdmin: boolean;
}> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { user: null, orgTag: null, isAdmin: false };

  const { data: profile } = await supabase
    .from("profiles")
    .select("organization_tag")
    .eq("user_id", user.id)
    .maybeSingle();

  const orgTag = profile?.organization_tag || null;
  const isAdmin = orgTag === ADMIN_ORG_TAG;
  return { user, orgTag, isAdmin };
}

async function getMyOrgDivisionId(orgTag: string): Promise<Maybe<UUID>> {
  if (!orgTag) return null;
  const { data } = await supabase
    .from("divisions")
    .select("id")
    .eq("organization_tag", orgTag)
    .limit(1)
    .maybeSingle();
  return data?.id ?? null;
}

/* ------------------------------- Dedupe utils ------------------------------ */

function dedupeByTitleAndDesc<T extends { title?: string; description?: string }>(
  items: T[]
): T[] {
  const map = new Map<string, T>();
  for (const it of items) {
    const key = `${(it.title || "").trim().toLowerCase()}|${(it.description || "")
      .trim()
      .toLowerCase()}`;
    if (!map.has(key)) {
      map.set(key, it);
      continue;
    }
    // keep richer item
    const existing = map.get(key)! as any;
    const richness =
      (Array.isArray((existing as any).tags) ? (existing as any).tags.length : 0) +
      (Array.isArray((existing as any).divisions)
        ? (existing as any).divisions.length
        : 0) +
      (Array.isArray((existing as any).subtasks)
        ? (existing as any).subtasks.length
        : 0) +
      (Array.isArray((existing as any).notes) ? (existing as any).notes.length : 0);

    const candidateRichness =
      (Array.isArray((it as any).tags) ? (it as any).tags.length : 0) +
      (Array.isArray((it as any).divisions) ? (it as any).divisions.length : 0) +
      (Array.isArray((it as any).subtasks) ? (it as any).subtasks.length : 0) +
      (Array.isArray((it as any).notes) ? (it as any).notes.length : 0);

    if (candidateRichness > richness) {
      map.set(key, it);
    }
  }
  return Array.from(map.values());
}

/* ------------------------------- useData hook ------------------------------ */

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

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [userOrgTag, setUserOrgTag] = useState<string | null>(null);
  const fetchState = useRef<FetchState>({ isLoading: false });

  /* ----------------------------- bootstrap org ----------------------------- */
  const fetchUserOrgTag = useCallback(async () => {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();
    if (error || !user) {
      setUserOrgTag(null);
      return null;
    }
    const { data: profile, error: pErr } = await supabase
      .from("profiles")
      .select("organization_tag")
      .eq("user_id", user.id)
      .maybeSingle();

    if (pErr) {
      console.error("profiles lookup failed:", pErr.message);
      setUserOrgTag(null);
      return null;
    }
    setUserOrgTag(profile?.organization_tag || null);
    return profile?.organization_tag || null;
  }, []);

  /* ------------------------------- fetch tasks ----------------------------- */
  const fetchTasks = useCallback(async () => {
    try {
      const orgTag = userOrgTag || (await fetchUserOrgTag());
      if (!orgTag) {
        setTasks([]);
        return;
      }

      const isAdmin = orgTag === ADMIN_ORG_TAG;

      let query = supabase
        .from("tasks")
        .select(
          `
          *,
          tags:task_tags(tag:tags(*)),
          divisions:task_divisions(division:divisions(*)),
          subtasks(*),
          notes(*)
        `
        )
        .order("order_rank", { ascending: true });

      if (!isAdmin) {
        query = query.eq("organization_tag", orgTag);
      }

      let { data: rows, error } = await query;
      if (error) {
        // fallback plain
        console.warn("tasks deep select failed, using plain:", error.message);
        let plainQuery = supabase.from("tasks").select("*").order("order_rank", {
          ascending: true,
        });
        if (!isAdmin) plainQuery = plainQuery.eq("organization_tag", orgTag);
        const plain = await plainQuery;
        if (plain.error) {
          console.error("tasks fallback failed:", plain.error.message);
          setTasks([]);
          return;
        }
        rows = plain.data || [];
      }

      let tasks: DeepTask[] = (rows || []) as any[];

      // Non-admin users must only see tasks that have at least one division
      // that belongs to their org
      if (!isAdmin) {
        const { data: myDivisions } = await supabase
          .from("divisions")
          .select("id")
          .eq("organization_tag", orgTag);

        const allowedDivisionIds = new Set((myDivisions || []).map((d) => d.id));

        tasks = tasks.filter((t) =>
          (t.divisions || []).some((d) => allowedDivisionIds.has(d?.division?.id))
        );
      }

      const formatted = tasks.map(safeFormatTask);
      setTasks(dedupeByTitleAndDesc(formatted));
    } catch (e: any) {
      console.error("fetchTasks fatal:", e?.message || e);
      setTasks([]);
    }
  }, [setTasks, userOrgTag, fetchUserOrgTag]);

  /* ----------------------------- fetch divisions --------------------------- */
  const fetchDivisions = useCallback(async () => {
    const { data, error } = await supabase
      .from("divisions")
      .select("*")
      .order("order_index", { ascending: true });
    if (error) {
      console.error("fetchDivisions:", error.message);
      setDivisions([]);
      return;
    }
    setDivisions(data || []);
  }, [setDivisions]);

  /* -------------------------------- fetch tags ----------------------------- */
  const fetchTags = useCallback(async () => {
    const { data, error } = await supabase
      .from("tags")
      .select("*")
      .order("order_index", { ascending: true });
    if (error) {
      console.error("fetchTags:", error.message);
      setTags([]);
      return;
    }
    setTags(data || []);
  }, [setTags]);

  /* -------------------------------- fetch ideas ---------------------------- */
  const fetchIdeas = useCallback(async () => {
    const orgTag = userOrgTag || (await fetchUserOrgTag());
    if (!orgTag) {
      setIdeas([]);
      return;
    }
    const isAdmin = orgTag === ADMIN_ORG_TAG;

    let query = supabase
      .from("ideas")
      .select(
        `
        *,
        tags:idea_tags(tag:tags(*))
      `
      )
      .order("created_at", { ascending: false });

    if (!isAdmin) query = query.eq("organization_tag", orgTag);

    let { data: rows, error } = await query;

    if (error) {
      console.warn("ideas deep select failed, using plain:", error.message);
      let plain = supabase.from("ideas").select("*").order("created_at", {
        ascending: false,
      });
      if (!isAdmin) plain = plain.eq("organization_tag", orgTag);
      const res = await plain;
      if (res.error) {
        console.error("ideas fallback failed:", res.error.message);
        setIdeas([]);
        return;
      }
      rows = res.data || [];
    }

    const ideas = (rows || []).map(safeFormatIdea);
    setIdeas(ideas);
  }, [setIdeas, userOrgTag, fetchUserOrgTag]);

  /* ------------------------------- fetch people ---------------------------- */
  const fetchPeople = useCallback(async () => {
    const { data, error } = await supabase
      .from("people")
      .select("*")
      .order("name", { ascending: true });
    if (error) {
      console.error("fetchPeople:", error.message);
      setPeople([]);
      return;
    }
    setPeople(data || []);
  }, [setPeople]);

  /* ------------------------------- fetch emails ---------------------------- */
  const fetchEmails = useCallback(async () => {
    const orgTag = userOrgTag || (await fetchUserOrgTag());
    if (!orgTag) {
      setEmails([]);
      return;
    }
    const isAdmin = orgTag === ADMIN_ORG_TAG;

    let query = supabase
      .from("inbound_emails")
      .select(
        `
        *,
        attachments:email_attachments(*)
      `
      )
      .order("received_at", { ascending: false });

    if (!isAdmin) {
      query = query.eq("organization_tag", orgTag);
    }

    const { data, error } = await query;

    if (error) {
      console.error("fetchEmails:", error.message);
      setEmails([]);
      return;
    }

    const formatted: InboundEmail[] = (data || []).map((email: any) => ({
      ...email,
      attachments: Array.isArray(email.attachments)
        ? email.attachments
        : [],
    }));

    setEmails(formatted);
  }, [setEmails, userOrgTag, fetchUserOrgTag]);

  /* --------------------------------- lifecyle ------------------------------ */
  useEffect(() => {
    const loadAll = async () => {
      fetchState.current.isLoading = true;
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
      fetchState.current.isLoading = false;
      fetchState.current.lastLoadedAt = Date.now();
      setIsLoading(false);
    };
    loadAll();

    // realtime
    const rt = [
      ["tasks", fetchTasks],
      ["divisions", fetchDivisions],
      ["tags", fetchTags],
      ["ideas", fetchIdeas],
      ["people", fetchPeople],
      ["inbound_emails", fetchEmails],
      ["task_divisions", fetchTasks],
      ["task_tags", fetchTasks],
      ["subtasks", fetchTasks],
      ["notes", fetchTasks],
      ["idea_tags", fetchIdeas],
      ["email_attachments", fetchEmails],
    ].map(([table, fn]) =>
      supabase
        .channel(`${table}-changes`)
        .on("postgres_changes", { event: "*", schema: "public", table }, fn)
        .subscribe()
    );

    return () => {
      rt.forEach((c) => c.unsubscribe());
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

/* =============================================================================
   CRUD + Linking Helpers (Org-aware)
   ========================================================================== */

/* --------------------------------- Tasks ---------------------------------- */

export async function createTask(payload: {
  title: string;
  description?: string;
  lane?: Lane;
  assignee?: string;
  due_date?: string | null;
  order_rank?: number;
}) {
  const { user, orgTag, isAdmin } = await getCurrentUserAndOrg();

  const insertBody: any = {
    title: payload.title,
    description: payload.description || "",
    lane: payload.lane || "red",
    assignee: payload.assignee || "",
    due_date: payload.due_date || null,
    order_rank: payload.order_rank || Date.now(),
    organization_tag: orgTag || null,
  };

  // Admin tasks default to admin org and **no divisions** (admin-only visibility)
  if (isAdmin) {
    insertBody.organization_tag = ADMIN_ORG_TAG;
  }

  // Try deep select
  let { data: task, error } = await supabase
    .from("tasks")
    .insert(insertBody)
    .select(
      `
      *,
      tags:task_tags(tag:tags(*)),
      divisions:task_divisions(division:divisions(*)),
      subtasks(*),
      notes(*)
    `
    )
    .maybeSingle();

  if (error) throw error;

  // Non-admin users: auto-link their org division
  if (!isAdmin && orgTag) {
    const divisionId = await getMyOrgDivisionId(orgTag);
    if (divisionId) {
      await supabase.from("task_divisions").insert({
        task_id: task!.id,
        division_id: divisionId,
      });
      // Re-select to include divisions
      const { data: refreshed } = await supabase
        .from("tasks")
        .select(
          `
          *,
          tags:task_tags(tag:tags(*)),
          divisions:task_divisions(division:divisions(*)),
          subtasks(*),
          notes(*)
        `
        )
        .eq("id", task!.id)
        .maybeSingle();
      if (refreshed) task = refreshed as any;
    }
  }

  await supabase.from("event_log").insert({
    entity_type: "task",
    entity_id: task?.id,
    action: "created",
    changes: { task },
  });

  return safeFormatTask(task);
}

export async function updateTaskData(id: UUID, updates: Partial<Task>) {
  const { error } = await supabase
    .from("tasks")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;

  await supabase.from("event_log").insert({
    entity_type: "task",
    entity_id: id,
    action: "updated",
    changes: updates,
  });
}

export async function deleteTask(id: UUID) {
  const { error } = await supabase.from("tasks").delete().eq("id", id);
  if (error) throw error;

  await supabase.from("event_log").insert({
    entity_type: "task",
    entity_id: id,
    action: "deleted",
    changes: {},
  });
}

export async function moveTask(id: UUID, lane: Lane, order_rank: number) {
  const updates: any = {
    lane,
    order_rank,
    updated_at: new Date().toISOString(),
  };
  if (lane === "green") {
    updates.completed_at = new Date().toISOString();
    updates.progress_state = "completed";
  }

  const { error } = await supabase.from("tasks").update(updates).eq("id", id);
  if (error) throw error;

  await supabase.from("event_log").insert({
    entity_type: "task",
    entity_id: id,
    action: "moved",
    changes: { lane, order_rank },
  });
}

/* ---------------------------- Task <-> Tags (UI) --------------------------- */
/* (These are "regular" tags; no special org restriction beyond RLS assumed)  */

export async function addTagToTask(taskId: UUID, tagId: UUID) {
  const { error } = await supabase
    .from("task_tags")
    .insert({ task_id: taskId, tag_id: tagId });
  if (error) throw error;

  await supabase.from("event_log").insert({
    entity_type: "task",
    entity_id: taskId,
    action: "tagged",
    changes: { tag_id: tagId },
  });
}

export async function removeTagFromTask(taskId: UUID, tagId: UUID) {
  const { error } = await supabase
    .from("task_tags")
    .delete()
    .eq("task_id", taskId)
    .eq("tag_id", tagId);
  if (error) throw error;

  await supabase.from("event_log").insert({
    entity_type: "task",
    entity_id: taskId,
    action: "untagged",
    changes: { tag_id: tagId },
  });
}

/* ------------------------- Task <-> Divisions (SCOPED) --------------------- */

export async function addDivisionToTask(taskId: UUID, divisionId: UUID) {
  const { orgTag, isAdmin } = await getCurrentUserAndOrg();

  if (!isAdmin) {
    const { data: div, error: dErr } = await supabase
      .from("divisions")
      .select("organization_tag")
      .eq("id", divisionId)
      .maybeSingle();
    if (dErr) throw dErr;
    if (div?.organization_tag !== orgTag) {
      throw new Error(
        "Unauthorized: cannot tag task with another organization's division."
      );
    }
  }

  const { error } = await supabase
    .from("task_divisions")
    .insert({ task_id: taskId, division_id: divisionId });
  if (error) throw error;

  await supabase.from("event_log").insert({
    entity_type: "task",
    entity_id: taskId,
    action: "division_added",
    changes: { division_id: divisionId },
  });
}

export async function removeDivisionFromTask(taskId: UUID, divisionId: UUID) {
  const { error } = await supabase
    .from("task_divisions")
    .delete()
    .eq("task_id", taskId)
    .eq("division_id", divisionId);
  if (error) throw error;

  await supabase.from("event_log").insert({
    entity_type: "task",
    entity_id: taskId,
    action: "division_removed",
    changes: { division_id: divisionId },
  });
}

/* -------------------------------- Subtasks -------------------------------- */

export async function createSubtask(
  taskId: UUID,
  title: string,
  order_rank?: number
) {
  const { data, error } = await supabase
    .from("subtasks")
    .insert({
      task_id: taskId,
      title,
      order_rank: order_rank || Date.now(),
    })
    .select()
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function updateSubtask(id: UUID, updates: Partial<SubtaskType>) {
  const { error } = await supabase
    .from("subtasks")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}

export async function deleteSubtask(id: UUID) {
  const { error } = await supabase.from("subtasks").delete().eq("id", id);
  if (error) throw error;
}

/* ---------------------------------- Notes --------------------------------- */

export async function createNote(taskId: UUID, content: string) {
  const { data, error } = await supabase
    .from("notes")
    .insert({ task_id: taskId, content })
    .select()
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function updateNote(id: UUID, content: string) {
  const { error } = await supabase
    .from("notes")
    .update({ content, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}

export async function deleteNote(id: UUID) {
  const { error } = await supabase.from("notes").delete().eq("id", id);
  if (error) throw error;
}

/* ---------------------------------- Tags ---------------------------------- */

export async function createTag(name: string, color: string) {
  const { data, error } = await supabase
    .from("tags")
    .insert({ name, color, order_index: Date.now() })
    .select()
    .maybeSingle();
  if (error) throw error;
  return data as Tag;
}

export async function updateTagData(id: UUID, updates: Partial<Tag>) {
  const { error } = await supabase
    .from("tags")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}

export async function deleteTag(id: UUID) {
  const { error } = await supabase.from("tags").delete().eq("id", id);
  if (error) throw error;
}

/* -------------------------------- Divisions ------------------------------- */

export async function createDivision(name: string, color: string) {
  const { data, error } = await supabase
    .from("divisions")
    .insert({ name, color, order_index: Date.now() })
    .select()
    .maybeSingle();
  if (error) throw error;
  return data as Division;
}

export async function updateDivisionData(
  id: UUID,
  updates: Partial<Division>
) {
  const { error } = await supabase
    .from("divisions")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}

export async function deleteDivision(id: UUID) {
  const { error } = await supabase.from("divisions").delete().eq("id", id);
  if (error) throw error;
}

/* --------------------------------- People --------------------------------- */

export async function createPerson(name: string, email?: string) {
  const { data, error } = await supabase
    .from("people")
    .insert({ name, email: email || null })
    .select()
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function updatePersonData(
  id: UUID,
  updates: { name?: string; email?: string }
) {
  const { error } = await supabase
    .from("people")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}

export async function deletePerson(id: UUID) {
  const { error } = await supabase.from("people").delete().eq("id", id);
  if (error) throw error;
}

/* ---------------------------------- Ideas --------------------------------- */

export async function createIdea(data: {
  title: string;
  description?: string;
  attachments?: string[];
  links?: string[];
  tag_ids?: string[];
  submitted_by?: string | null;
  directed_to?: string | null;
}) {
  const { orgTag, isAdmin } = await getCurrentUserAndOrg();

  const insertBody: any = {
    title: data.title,
    description: data.description || "",
    attachments: data.attachments || [],
    links: data.links || [],
    tag_ids: data.tag_ids || [],
    submitted_by: data.submitted_by || null,
    directed_to: data.directed_to || null,
    organization_tag: orgTag || null,
  };

  if (isAdmin) {
    insertBody.organization_tag = ADMIN_ORG_TAG;
  }

  let { data: idea, error } = await supabase
    .from("ideas")
    .insert(insertBody)
    .select(
      `
      *,
      tags:idea_tags(tag:tags(*))
    `
    )
    .maybeSingle();

  if (error) throw error;

  await supabase.from("event_log").insert({
    entity_type: "idea",
    entity_id: idea?.id,
    action: "created",
    changes: { idea },
  });

  return safeFormatIdea(idea);
}

export async function updateIdeaData(id: UUID, updates: Partial<Idea>) {
  const patch: any = {
    ...updates,
    updated_at: new Date().toISOString(),
  };

  if ("attachments" in updates && !updates.attachments) patch.attachments = [];
  if ("links" in updates && !updates.links) patch.links = [];
  if ("tag_ids" in updates && !updates.tag_ids) patch.tag_ids = [];
  if ("submitted_by" in updates && !updates.submitted_by) patch.submitted_by = null;
  if ("directed_to" in updates && !updates.directed_to) patch.directed_to = null;

  const { error } = await supabase.from("ideas").update(patch).eq("id", id);
  if (error) throw error;

  await supabase.from("event_log").insert({
    entity_type: "idea",
    entity_id: id,
    action: "updated",
    changes: updates,
  });
}

export async function deleteIdea(id: UUID) {
  const { error } = await supabase.from("ideas").delete().eq("id", id);
  if (error) throw error;

  await supabase.from("event_log").insert({
    entity_type: "idea",
    entity_id: id,
    action: "deleted",
    changes: {},
  });
}

/* --------------------------------- Emails --------------------------------- */
/* If you later add UI to compose/outbound, use these helpers to keep org     */
/* scoping consistent.                                                        */

export async function recordInboundEmail(payload: {
  subject: string;
  from_address: string;
  received_at?: string;
  body_text?: string;
  attachments?: Array<{ name: string; url: string }>;
}) {
  const { orgTag, isAdmin } = await getCurrentUserAndOrg();

  const row = {
    subject: payload.subject,
    from_address: payload.from_address,
    received_at: payload.received_at || new Date().toISOString(),
    body_text: payload.body_text || "",
    organization_tag: isAdmin ? ADMIN_ORG_TAG : orgTag,
  };

  const { data, error } = await supabase
    .from("inbound_emails")
    .insert(row)
    .select()
    .maybeSingle();

  if (error) throw error;

  if (payload.attachments?.length) {
    const insert = payload.attachments.map((a) => ({
      email_id: data!.id,
      name: a.name,
      url: a.url,
    }));
    const { error: aErr } = await supabase
      .from("email_attachments")
      .insert(insert);
    if (aErr) throw aErr;
  }

  await supabase.from("event_log").insert({
    entity_type: "email",
    entity_id: data?.id,
    action: "created",
    changes: row,
  });

  return data;
}

/* ------------------------------ Bulk operations --------------------------- */

export async function reorderTasksInLane(
  lane: Lane,
  orderedIds: UUID[]
): Promise<void> {
  // naive sequential updates (can be optimized by RPC)
  for (let i = 0; i < orderedIds.length; i++) {
    const id = orderedIds[i];
    const { error } = await supabase
      .from("tasks")
      .update({ order_rank: i * 1000, lane, updated_at: new Date().toISOString() })
      .eq("id", id);
    if (error) throw error;
  }
  await supabase.from("event_log").insert({
    entity_type: "task",
    entity_id: "bulk",
    action: "reordered",
    changes: { lane, orderedIdsCount: orderedIds.length },
  });
}

/* ---------------------- Organization / Division management ---------------- */

export async function createOrganizationAndLinkToDivision(
  orgName: string,
  divisionId: UUID
): Promise<{ organization_tag: string }> {
  // Mint a unique org tag
  const base = orgName.replace(/[^a-z0-9]+/gi, "").toUpperCase();
  const organization_tag = `${base}-${Date.now()}`;

  // Link existing division to this new organization
  const { error } = await supabase
    .from("divisions")
    .update({ organization_tag })
    .eq("id", divisionId);

  if (error) throw error;

  await supabase.from("event_log").insert({
    entity_type: "organization",
    entity_id: organization_tag,
    action: "created_linked",
    changes: { divisionId },
  });

  return { organization_tag };
}

export async function linkDivisionToExistingOrg(
  organization_tag: string,
  divisionId: UUID
): Promise<void> {
  const { error } = await supabase
    .from("divisions")
    .update({ organization_tag })
    .eq("id", divisionId);

  if (error) throw error;

  await supabase.from("event_log").insert({
    entity_type: "organization",
    entity_id: organization_tag,
    action: "linked_division",
    changes: { divisionId },
  });
}

/* ------------------------------ Guarded utilities ------------------------- */

export async function ensureTaskVisibilityRules(taskId: UUID) {
  // For admins we do nothing; for non-admins we ensure the task has a division under their org
  const { orgTag, isAdmin } = await getCurrentUserAndOrg();
  if (isAdmin || !orgTag) return;

  // Does this task already have a division for my org?
  const { data: divisions } = await supabase
    .from("task_divisions")
    .select(
      `
      division:divisions(id, organization_tag)
    `
    )
    .eq("task_id", taskId);

  const hasMine = (divisions || []).some(
    (d: any) => d?.division?.organization_tag === orgTag
  );
  if (hasMine) return;

  const myDivId = await getMyOrgDivisionId(orgTag);
  if (!myDivId) return;

  await supabase.from("task_divisions").insert({
    task_id: taskId,
    division_id: myDivId,
  });
}
