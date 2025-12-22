# Profile Creation Error Fix

## Problem Summary

The `auth_manager` function was failing with a 500 error when trying to create user profiles, returning "failed_to_create_user_profile". This occurred during the user creation flow at line 213-234 in `auth_manager/index.ts`.

## Root Cause

The `profiles` table had **Row Level Security (RLS) enabled without an INSERT policy**. This prevented the function from inserting new profile records, even when using the service role key.

### Evidence from Database Schema

In `supabase/migrations/0001_initial_schema.sql`:
- **Line 65**: RLS was enabled on profiles table
- **Lines 76-80**: Only SELECT and UPDATE policies existed
- **Missing**: No INSERT policy for creating new profiles

## Solution Implemented

### 1. Added Missing RLS Policy

Created migration `0002_add_profiles_insert_policy.sql` with two INSERT policies:

```sql
-- Allow service role to insert any profile (for backend operations)
CREATE POLICY "Allow service role to insert profiles" ON public.profiles
  FOR INSERT WITH CHECK (true);

-- Allow users to insert their own profile during registration
CREATE POLICY "Users can insert own profile during registration" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);
```

### 2. Enhanced Error Logging

Updated `auth_manager/index.ts` (lines 223-234) to log detailed error information:
- Error message
- Error details
- Error hint
- Error code

This helps diagnose future issues by providing complete error context.

### 3. Deployment Steps

1. Applied migration: `supabase db push`
2. Redeployed function: `supabase functions deploy auth_manager`

## Why This Happened

**RLS Policies are Required**: When RLS is enabled on a table, PostgreSQL requires explicit policies for each operation (SELECT, INSERT, UPDATE, DELETE). Without an INSERT policy, even service role operations fail.

**Service Role Limitations**: While the service role key can bypass some RLS restrictions, it still requires underlying policies to exist when RLS is enabled on a table.

## Verification

To verify the fix works:

1. Test user creation via the auth_manager function
2. Check that profiles are successfully inserted into the database
3. Review improved error messages in function logs if issues persist

## Prevention

For future tables with RLS:
- Always create policies for all required operations (SELECT, INSERT, UPDATE, DELETE)
- Document RLS policies in migration files
- Test with service role to ensure backend operations work correctly
- Include comprehensive error logging to catch similar issues early

## Related Files

- `supabase/functions/auth_manager/index.ts` - Main auth function
- `supabase/migrations/0001_initial_schema.sql` - Initial schema (missing INSERT policy)
- `supabase/migrations/0002_add_profiles_insert_policy.sql` - Fix migration
- `db/current_db.sql` - Current database schema reference