/*
  # Task Management System - Complete Database Schema

  ## Overview
  Comprehensive task management system with persistent state tracking for all interactions,
  supporting tasks, subtasks, tags, divisions, ideas, and complete audit logging.

  ## 1. New Tables

  ### `divisions`
  Company divisions/departments for organizing work
  - `id` (uuid, primary key)
  - `name` (text, unique) - Division name (Hubbalicious, We Grow With, Marketing, Lead Gen)
  - `color` (text) - Display color for UI
  - `created_at` (timestamptz)

  ### `tags`
  Flexible tagging system for categorization
  - `id` (uuid, primary key)
  - `name` (text, unique)
  - `color` (text)
  - `created_at` (timestamptz)

  ### `tasks`
  Main task records with full metadata
  - `id` (uuid, primary key)
  - `title` (text, required)
  - `description` (text)
  - `lane` (text) - red/yellow/green (Master/Pending/Completed)
  - `progress_state` (text) - not_started/working/blocked/needs_review/completed
  - `assignee` (text) - Person assigned to task
  - `due_date` (date) - When task is due
  - `order_rank` (double precision) - For drag-drop ordering within lane
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)
  - `completed_at` (timestamptz) - When moved to completed

  ### `task_tags`
  Many-to-many relationship between tasks and tags
  - `task_id` (uuid, foreign key)
  - `tag_id` (uuid, foreign key)
  - `created_at` (timestamptz)
  - Primary key on (task_id, tag_id)

  ### `task_divisions`
  Many-to-many relationship between tasks and divisions
  - `task_id` (uuid, foreign key)
  - `division_id` (uuid, foreign key)
  - `created_at` (timestamptz)
  - Primary key on (task_id, division_id)

  ### `subtasks`
  Sub-items within tasks with their own progress
  - `id` (uuid, primary key)
  - `task_id` (uuid, foreign key)
  - `title` (text, required)
  - `progress_state` (text)
  - `order_rank` (double precision)
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### `notes`
  Freeform notes attached to tasks
  - `id` (uuid, primary key)
  - `task_id` (uuid, foreign key)
  - `content` (text, required)
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### `ideas`
  Intake board for new ideas and requests
  - `id` (uuid, primary key)
  - `title` (text, required)
  - `description` (text)
  - `status` (text) - not_addressed/in_progress/completed
  - `converted_to_task_id` (uuid, nullable foreign key) - Links to task if converted
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### `idea_tags`
  Tags for ideas
  - `idea_id` (uuid, foreign key)
  - `tag_id` (uuid, foreign key)
  - `created_at` (timestamptz)

  ### `event_log`
  Complete audit trail of all modifications
  - `id` (uuid, primary key)
  - `entity_type` (text) - task/subtask/idea/note
  - `entity_id` (uuid)
  - `action` (text) - created/updated/deleted/moved/reordered
  - `changes` (jsonb) - Detailed change data
  - `created_at` (timestamptz)

  ## 2. Security
  - Enable RLS on all tables
  - Public read/write policies for MVP (can be restricted later with auth)

  ## 3. Indexes
  - Performance indexes on foreign keys and frequently queried columns
  - Order rank indexes for efficient sorting
*/

-- Create divisions table
CREATE TABLE IF NOT EXISTS divisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  color text NOT NULL DEFAULT '#3B82F6',
  created_at timestamptz DEFAULT now()
);

-- Create tags table
CREATE TABLE IF NOT EXISTS tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  color text NOT NULL DEFAULT '#6B7280',
  created_at timestamptz DEFAULT now()
);

-- Create tasks table
CREATE TABLE IF NOT EXISTS tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text DEFAULT '',
  lane text NOT NULL DEFAULT 'red' CHECK (lane IN ('red', 'yellow', 'green')),
  progress_state text NOT NULL DEFAULT 'not_started' CHECK (progress_state IN ('not_started', 'working', 'blocked', 'needs_review', 'completed')),
  assignee text DEFAULT '',
  due_date date,
  order_rank double precision NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  completed_at timestamptz
);

-- Create task_tags junction table
CREATE TABLE IF NOT EXISTS task_tags (
  task_id uuid REFERENCES tasks(id) ON DELETE CASCADE,
  tag_id uuid REFERENCES tags(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (task_id, tag_id)
);

-- Create task_divisions junction table
CREATE TABLE IF NOT EXISTS task_divisions (
  task_id uuid REFERENCES tasks(id) ON DELETE CASCADE,
  division_id uuid REFERENCES divisions(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (task_id, division_id)
);

-- Create subtasks table
CREATE TABLE IF NOT EXISTS subtasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid REFERENCES tasks(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  progress_state text NOT NULL DEFAULT 'not_started' CHECK (progress_state IN ('not_started', 'working', 'blocked', 'needs_review', 'completed')),
  order_rank double precision NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create notes table
CREATE TABLE IF NOT EXISTS notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid REFERENCES tasks(id) ON DELETE CASCADE NOT NULL,
  content text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create ideas table
CREATE TABLE IF NOT EXISTS ideas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text DEFAULT '',
  status text NOT NULL DEFAULT 'not_addressed' CHECK (status IN ('not_addressed', 'in_progress', 'completed')),
  converted_to_task_id uuid REFERENCES tasks(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create idea_tags junction table
CREATE TABLE IF NOT EXISTS idea_tags (
  idea_id uuid REFERENCES ideas(id) ON DELETE CASCADE,
  tag_id uuid REFERENCES tags(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (idea_id, tag_id)
);

-- Create event_log table
CREATE TABLE IF NOT EXISTS event_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type text NOT NULL CHECK (entity_type IN ('task', 'subtask', 'idea', 'note', 'tag', 'division')),
  entity_id uuid NOT NULL,
  action text NOT NULL CHECK (action IN ('created', 'updated', 'deleted', 'moved', 'reordered', 'tagged', 'untagged')),
  changes jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_tasks_lane ON tasks(lane);
CREATE INDEX IF NOT EXISTS idx_tasks_assignee ON tasks(assignee);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date);
CREATE INDEX IF NOT EXISTS idx_tasks_order_rank ON tasks(lane, order_rank);
CREATE INDEX IF NOT EXISTS idx_subtasks_task_id ON subtasks(task_id);
CREATE INDEX IF NOT EXISTS idx_subtasks_order_rank ON subtasks(task_id, order_rank);
CREATE INDEX IF NOT EXISTS idx_notes_task_id ON notes(task_id);
CREATE INDEX IF NOT EXISTS idx_ideas_status ON ideas(status);
CREATE INDEX IF NOT EXISTS idx_event_log_entity ON event_log(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_event_log_created_at ON event_log(created_at DESC);

-- Enable Row Level Security
ALTER TABLE divisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_divisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE subtasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE ideas ENABLE ROW LEVEL SECURITY;
ALTER TABLE idea_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_log ENABLE ROW LEVEL SECURITY;

-- Create permissive policies for all tables (public access for MVP)
CREATE POLICY "Public read divisions" ON divisions FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Public write divisions" ON divisions FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Public read tags" ON tags FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Public write tags" ON tags FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Public read tasks" ON tasks FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Public write tasks" ON tasks FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Public read task_tags" ON task_tags FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Public write task_tags" ON task_tags FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Public read task_divisions" ON task_divisions FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Public write task_divisions" ON task_divisions FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Public read subtasks" ON subtasks FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Public write subtasks" ON subtasks FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Public read notes" ON notes FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Public write notes" ON notes FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Public read ideas" ON ideas FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Public write ideas" ON ideas FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Public read idea_tags" ON idea_tags FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Public write idea_tags" ON idea_tags FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Public read event_log" ON event_log FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Public write event_log" ON event_log FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- Insert default divisions
INSERT INTO divisions (name, color) VALUES
  ('Hubbalicious', '#3B82F6'),
  ('We Grow With', '#10B981'),
  ('Marketing', '#F59E0B'),
  ('Lead Gen', '#EF4444')
ON CONFLICT (name) DO NOTHING;

-- Insert default tags
INSERT INTO tags (name, color) VALUES
  ('Urgent', '#DC2626'),
  ('High Priority', '#F97316'),
  ('Low Priority', '#22C55E'),
  ('Bug', '#EF4444'),
  ('Feature', '#3B82F6'),
  ('Research', '#8B5CF6')
ON CONFLICT (name) DO NOTHING;