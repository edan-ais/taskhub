/*
  # Email Integration System

  ## Overview
  Complete email integration for TaskHUB allowing automatic task/idea creation from inbound emails
  sent to tasks@hubbalicious.com. Includes smart parsing for tags, assignees, due dates, and 
  attachment handling with full audit trail.

  ## 1. New Tables

  ### `inbound_emails`
  Stores all incoming email messages with processing metadata
  - `id` (uuid, primary key)
  - `sender_email` (text, required) - Email address of sender
  - `sender_name` (text) - Display name of sender
  - `subject` (text) - Email subject line
  - `body_text` (text) - Plain text body content
  - `body_html` (text) - HTML body content
  - `raw_body` (text) - Complete raw email content
  - `received_at` (timestamptz) - When email was received
  - `processed_at` (timestamptz) - When email was processed
  - `processing_status` (text) - pending/processed/failed/manual
  - `parsed_metadata` (jsonb) - Extracted tags, assignees, dates, priority
  - `created_task_id` (uuid, nullable foreign key) - Link to created task
  - `created_idea_id` (uuid, nullable foreign key) - Link to created idea
  - `error_message` (text) - Error details if processing failed
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### `email_attachments`
  Stores references to email attachments
  - `id` (uuid, primary key)
  - `email_id` (uuid, foreign key) - Reference to inbound_emails
  - `filename` (text, required) - Original filename
  - `file_url` (text) - Storage URL for the file
  - `file_size` (bigint) - File size in bytes
  - `mime_type` (text) - MIME type of the file
  - `created_at` (timestamptz)

  ## 2. Schema Changes

  ### Add to `tasks` table
  - `source_email_id` (uuid, nullable foreign key) - Link to originating email

  ### Add to `ideas` table
  - `source_email_id` (uuid, nullable foreign key) - Link to originating email

  ## 3. Security
  - Enable RLS on all new tables
  - Public access policies for MVP (can be restricted later)
  - Secure webhook endpoint for email ingestion

  ## 4. Indexes
  - Performance indexes on email processing status
  - Indexes on received timestamps for sorting
  - Foreign key indexes for relationships

  ## 5. Important Notes
  - All email data is stored permanently for audit trail
  - Smart parsing extracts #tags, @mentions, and due date keywords
  - Emails are automatically routed to tasks or ideas based on content analysis
  - Real-time sync ensures changes propagate across all views
  - Attachment metadata stored but files hosted externally
*/

-- Create inbound_emails table
CREATE TABLE IF NOT EXISTS inbound_emails (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_email text NOT NULL,
  sender_name text DEFAULT '',
  subject text DEFAULT '',
  body_text text DEFAULT '',
  body_html text DEFAULT '',
  raw_body text DEFAULT '',
  received_at timestamptz DEFAULT now(),
  processed_at timestamptz,
  processing_status text NOT NULL DEFAULT 'pending' CHECK (processing_status IN ('pending', 'processed', 'failed', 'manual')),
  parsed_metadata jsonb DEFAULT '{}',
  created_task_id uuid REFERENCES tasks(id) ON DELETE SET NULL,
  created_idea_id uuid REFERENCES ideas(id) ON DELETE SET NULL,
  error_message text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create email_attachments table
CREATE TABLE IF NOT EXISTS email_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email_id uuid REFERENCES inbound_emails(id) ON DELETE CASCADE NOT NULL,
  filename text NOT NULL,
  file_url text DEFAULT '',
  file_size bigint DEFAULT 0,
  mime_type text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

-- Add source_email_id to tasks table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tasks' AND column_name = 'source_email_id'
  ) THEN
    ALTER TABLE tasks ADD COLUMN source_email_id uuid REFERENCES inbound_emails(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Add source_email_id to ideas table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'ideas' AND column_name = 'source_email_id'
  ) THEN
    ALTER TABLE ideas ADD COLUMN source_email_id uuid REFERENCES inbound_emails(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_inbound_emails_status ON inbound_emails(processing_status);
CREATE INDEX IF NOT EXISTS idx_inbound_emails_received_at ON inbound_emails(received_at DESC);
CREATE INDEX IF NOT EXISTS idx_inbound_emails_sender ON inbound_emails(sender_email);
CREATE INDEX IF NOT EXISTS idx_email_attachments_email_id ON email_attachments(email_id);
CREATE INDEX IF NOT EXISTS idx_tasks_source_email ON tasks(source_email_id);
CREATE INDEX IF NOT EXISTS idx_ideas_source_email ON ideas(source_email_id);

-- Enable Row Level Security
ALTER TABLE inbound_emails ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_attachments ENABLE ROW LEVEL SECURITY;

-- Create permissive policies for all tables (public access for MVP)
CREATE POLICY "Public read inbound_emails" ON inbound_emails FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Public write inbound_emails" ON inbound_emails FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Public read email_attachments" ON email_attachments FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Public write email_attachments" ON email_attachments FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
