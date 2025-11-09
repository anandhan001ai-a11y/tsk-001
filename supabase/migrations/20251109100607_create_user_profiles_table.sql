/*
  # Create user profiles table

  1. New Tables
    - `user_profiles`
      - `id` (uuid, primary key) - Unique identifier for each profile
      - `user_id` (uuid, foreign key) - Links to auth.users table
      - `profile_picture_url` (text) - URL to the profile picture in storage
      - `created_at` (timestamptz) - Timestamp when profile was created
      - `updated_at` (timestamptz) - Timestamp when profile was last updated

  2. Security
    - Enable RLS on `user_profiles` table
    - Add policy for authenticated users to view their own profile
    - Add policy for authenticated users to insert their own profile
    - Add policy for authenticated users to update their own profile

  3. Important Notes
    - Each user can have only one profile (enforced by unique constraint)
    - Default profile picture URL is null until user uploads one
    - RLS ensures users can only access their own profile data
*/

CREATE TABLE IF NOT EXISTS user_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  profile_picture_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
  ON user_profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own profile"
  ON user_profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own profile"
  ON user_profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON user_profiles(user_id);
