/*
  # Add People Table

  1. New Tables
    - `people`
      - `id` (uuid, primary key)
      - `name` (text, unique, required) - Person's name
      - `email` (text, optional) - Person's email address
      - `created_at` (timestamptz) - When person was added
      - `updated_at` (timestamptz) - When person was last modified

  2. Security
    - Enable RLS on `people` table
    - Add policies for public read/write access (matching existing pattern)

  3. Indexes
    - Index on name for efficient lookups
*/

-- Create people table
CREATE TABLE IF NOT EXISTS people (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  email text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_people_name ON people(name);

-- Enable Row Level Security
ALTER TABLE people ENABLE ROW LEVEL SECURITY;

-- Create permissive policies for people table (public access for MVP)
CREATE POLICY "Public read people" ON people FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Public write people" ON people FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);