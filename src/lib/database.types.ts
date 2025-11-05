export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      divisions: {
        Row: {
          id: string
          name: string
          color: string
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          color?: string
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          color?: string
          created_at?: string
        }
      }
      tags: {
        Row: {
          id: string
          name: string
          color: string
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          color?: string
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          color?: string
          created_at?: string
        }
      }
      tasks: {
        Row: {
          id: string
          title: string
          description: string
          lane: 'red' | 'yellow' | 'green'
          progress_state: 'not_started' | 'working' | 'blocked' | 'needs_review' | 'completed'
          assignee: string
          due_date: string | null
          order_rank: number
          created_at: string
          updated_at: string
          completed_at: string | null
          source_email_id: string | null
        }
        Insert: {
          id?: string
          title: string
          description?: string
          lane?: 'red' | 'yellow' | 'green'
          progress_state?: 'not_started' | 'working' | 'blocked' | 'needs_review' | 'completed'
          assignee?: string
          due_date?: string | null
          order_rank?: number
          created_at?: string
          updated_at?: string
          completed_at?: string | null
          source_email_id?: string | null
        }
        Update: {
          id?: string
          title?: string
          description?: string
          lane?: 'red' | 'yellow' | 'green'
          progress_state?: 'not_started' | 'working' | 'blocked' | 'needs_review' | 'completed'
          assignee?: string
          due_date?: string | null
          order_rank?: number
          created_at?: string
          updated_at?: string
          completed_at?: string | null
          source_email_id?: string | null
        }
      }
      task_tags: {
        Row: {
          task_id: string
          tag_id: string
          created_at: string
        }
        Insert: {
          task_id: string
          tag_id: string
          created_at?: string
        }
        Update: {
          task_id?: string
          tag_id?: string
          created_at?: string
        }
      }
      task_divisions: {
        Row: {
          task_id: string
          division_id: string
          created_at: string
        }
        Insert: {
          task_id: string
          division_id: string
          created_at?: string
        }
        Update: {
          task_id?: string
          division_id?: string
          created_at?: string
        }
      }
      subtasks: {
        Row: {
          id: string
          task_id: string
          title: string
          progress_state: 'not_started' | 'working' | 'blocked' | 'needs_review' | 'completed'
          order_rank: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          task_id: string
          title: string
          progress_state?: 'not_started' | 'working' | 'blocked' | 'needs_review' | 'completed'
          order_rank?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          task_id?: string
          title?: string
          progress_state?: 'not_started' | 'working' | 'blocked' | 'needs_review' | 'completed'
          order_rank?: number
          created_at?: string
          updated_at?: string
        }
      }
      notes: {
        Row: {
          id: string
          task_id: string
          content: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          task_id: string
          content: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          task_id?: string
          content?: string
          created_at?: string
          updated_at?: string
        }
      }
      ideas: {
        Row: {
          id: string
          title: string
          description: string
          status: 'not_addressed' | 'in_progress' | 'completed'
          converted_to_task_id: string | null
          source_email_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          title: string
          description?: string
          status?: 'not_addressed' | 'in_progress' | 'completed'
          converted_to_task_id?: string | null
          source_email_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          title?: string
          description?: string
          status?: 'not_addressed' | 'in_progress' | 'completed'
          converted_to_task_id?: string | null
          source_email_id?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      idea_tags: {
        Row: {
          idea_id: string
          tag_id: string
          created_at: string
        }
        Insert: {
          idea_id: string
          tag_id: string
          created_at?: string
        }
        Update: {
          idea_id?: string
          tag_id?: string
          created_at?: string
        }
      }
      event_log: {
        Row: {
          id: string
          entity_type: 'task' | 'subtask' | 'idea' | 'note' | 'tag' | 'division'
          entity_id: string
          action: 'created' | 'updated' | 'deleted' | 'moved' | 'reordered' | 'tagged' | 'untagged'
          changes: Json
          created_at: string
        }
        Insert: {
          id?: string
          entity_type: 'task' | 'subtask' | 'idea' | 'note' | 'tag' | 'division'
          entity_id: string
          action: 'created' | 'updated' | 'deleted' | 'moved' | 'reordered' | 'tagged' | 'untagged'
          changes?: Json
          created_at?: string
        }
        Update: {
          id?: string
          entity_type?: 'task' | 'subtask' | 'idea' | 'note' | 'tag' | 'division'
          entity_id?: string
          action?: 'created' | 'updated' | 'deleted' | 'moved' | 'reordered' | 'tagged' | 'untagged'
          changes?: Json
          created_at?: string
        }
      }
      inbound_emails: {
        Row: {
          id: string
          sender_email: string
          sender_name: string
          subject: string
          body_text: string
          body_html: string
          raw_body: string
          received_at: string
          processed_at: string | null
          processing_status: 'pending' | 'processed' | 'failed' | 'manual'
          parsed_metadata: Json
          created_task_id: string | null
          created_idea_id: string | null
          error_message: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          sender_email: string
          sender_name?: string
          subject?: string
          body_text?: string
          body_html?: string
          raw_body?: string
          received_at?: string
          processed_at?: string | null
          processing_status?: 'pending' | 'processed' | 'failed' | 'manual'
          parsed_metadata?: Json
          created_task_id?: string | null
          created_idea_id?: string | null
          error_message?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          sender_email?: string
          sender_name?: string
          subject?: string
          body_text?: string
          body_html?: string
          raw_body?: string
          received_at?: string
          processed_at?: string | null
          processing_status?: 'pending' | 'processed' | 'failed' | 'manual'
          parsed_metadata?: Json
          created_task_id?: string | null
          created_idea_id?: string | null
          error_message?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      email_attachments: {
        Row: {
          id: string
          email_id: string
          filename: string
          file_url: string
          file_size: number
          mime_type: string
          created_at: string
        }
        Insert: {
          id?: string
          email_id: string
          filename: string
          file_url?: string
          file_size?: number
          mime_type?: string
          created_at?: string
        }
        Update: {
          id?: string
          email_id?: string
          filename?: string
          file_url?: string
          file_size?: number
          mime_type?: string
          created_at?: string
        }
      }
    }
  }
}
