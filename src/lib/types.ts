export type Lane = 'red' | 'yellow' | 'green';

export type ProgressState = 'not_started' | 'working' | 'blocked' | 'needs_review' | 'completed';

export type IdeaStatus = 'not_addressed' | 'in_progress' | 'completed';

export interface Division {
  id: string;
  name: string;
  color: string;
  created_at: string;
}

export interface Tag {
  id: string;
  name: string;
  color: string;
  created_at: string;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  lane: Lane;
  progress_state: ProgressState;
  assignee: string;
  due_date: string | null;
  order_rank: number;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
  source_email_id?: string | null;
  tags?: Tag[];
  divisions?: Division[];
  subtasks?: Subtask[];
  notes?: Note[];
}

export interface Subtask {
  id: string;
  task_id: string;
  title: string;
  progress_state: ProgressState;
  order_rank: number;
  created_at: string;
  updated_at: string;
}

export interface Note {
  id: string;
  task_id: string;
  content: string;
  created_at: string;
  updated_at: string;
}

export interface Idea {
  id: string;
  title: string;
  description: string;
  status: IdeaStatus;
  converted_to_task_id: string | null;
  source_email_id?: string | null;
  created_at: string;
  updated_at: string;
  tags?: Tag[];
}

export interface Person {
  id: string;
  name: string;
  email: string | null;
  created_at: string;
  updated_at: string;
}

export interface EventLog {
  id: string;
  entity_type: 'task' | 'subtask' | 'idea' | 'note' | 'tag' | 'division';
  entity_id: string;
  action: 'created' | 'updated' | 'deleted' | 'moved' | 'reordered' | 'tagged' | 'untagged';
  changes: Record<string, unknown>;
  created_at: string;
}

export interface InboundEmail {
  id: string;
  sender_email: string;
  sender_name: string;
  subject: string;
  body_text: string;
  body_html: string;
  raw_body: string;
  received_at: string;
  processed_at: string | null;
  processing_status: 'pending' | 'processed' | 'failed' | 'manual';
  parsed_metadata: Record<string, unknown>;
  created_task_id: string | null;
  created_idea_id: string | null;
  error_message: string | null;
  created_at: string;
  updated_at: string;
  attachments?: EmailAttachment[];
}

export interface EmailAttachment {
  id: string;
  email_id: string;
  filename: string;
  file_url: string;
  file_size: number;
  mime_type: string;
  created_at: string;
}

export type TabName = 'home' | 'people' | 'tags' | 'calendar' | 'ideas' | 'analytics';
